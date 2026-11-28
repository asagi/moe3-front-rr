import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useMatches } from "react-router";
import type { AdminViewpoints } from "~/components/admin-header/AdminHeader";
import { GameHeader, type SeasonNav } from "~/components/game-nav/GameHeader";
import { GameTabBar } from "~/components/game-nav/GameTabBar";
import { isBoardEditable } from "~/lib/board";
import { summarizeChannels, unreadCandidatesOf } from "~/lib/chat";
import { loadSeasonMessages, resolveChatViewer } from "~/lib/chat.server";
import {
  type GameDetail,
  POWERS,
  gameNumberLabel,
  isOffGameSeason,
  isRecruiting,
  isWritableSeason,
  phaseLabel,
  seasonLabel,
} from "~/lib/game";
import { useUnreadCounts } from "~/lib/read-state";
import {
  canMaintainGame,
  gameContext,
  loadGameDetail,
  requireGame,
  resolveSeason,
} from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import { useStickyHeight } from "~/lib/use-sticky-height";
import type { Route } from "./+types/games.$gameUuid";

/** 卓内の各ページが handle に入れる情報 */
export interface GameRouteHandle {
  /** ページ名（「卓情報」など）。seasonal でなければ卓ヘッダに出す */
  gameTitle: string;
  /**
   * ターンの中のページ（カレンダー・チャット・命令）か。
   * そうなら卓ヘッダにはページ名でなく、表示しているシーズン（「開戦前夜」など）を出す
   */
  seasonal?: boolean;
}

/** 卓の詳細を 1 回だけ取得して、レイアウトと子ルートに渡す */
export const middleware: Route.MiddlewareFunction[] = [
  async ({ params, context }) => {
    const state = context.get(meContext);
    const ok = state.kind === "ok" ? state : null;
    context.set(
      gameContext,
      await loadGameDetail(params.gameUuid, ok?.auth ?? null),
    );
  },
];

/** 卓ヘッダとタブバーの表示に使う情報 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const game = requireGame(context);
  return {
    gameUuid: game.game_uuid,
    numberLabel: gameNumberLabel(game),
    // 開戦前夜から開ける（初期配置を見る）
    ordersEnabled: !isRecruiting(game),
    // 盤面の編集は、卓主か管理者モード中の管理者が、開戦前夜かメインフェイズのときだけ
    maintenanceEnabled:
      isBoardEditable(game) && (await canMaintainGame(context, game)),
    // ターンの中のページで卓ヘッダに出すシーズン（?season= が不正ならページ側で 404 にする）
    season: (() => {
      try {
        return resolveSeason(request, game);
      } catch {
        return null;
      }
    })(),
    // 卓ヘッダのシーズン切り替えに使う、これまでのシーズン
    seasons: game.seasons,
    // 卓ヘッダにシーズンと並べて出す今のフェイズ名（現在のシーズンを見ているときだけ出す）
    phase: game.status === "in_progress" ? phaseLabel(game.phase_kind) : null,
    // タブバーのチャットに未読の印を出すための材料
    chatUnread: await loadChatUnread(request, context, game),
    // 管理者用ヘッダの視点変更で選べる国（管理者モード中だけ）
    adminViewpoints: adminViewpointsOf(context, game),
  };
}

/**
 * 管理者モード中なら、視点変更で選べる国を返す（そうでなければ null）。
 * サイトヘッダのレイアウトが useMatches で読んで、管理者用ヘッダに渡す
 */
const adminViewpointsOf = (
  context: Route.LoaderArgs["context"],
  game: GameDetail,
): AdminViewpoints | null => {
  const state = context.get(meContext);
  if (state.kind !== "ok" || !state.adminMode) return null;
  return {
    faceType: game.regulation.face_type,
    powers: POWERS.flatMap(({ code }) => {
      const player = game.players.find((p) => p.power === code);
      return player
        ? [
            {
              power: code,
              username: player.user.username,
              eliminated: player.is_eliminated,
            },
          ]
        : [];
    }),
  };
};

/**
 * タブバーの未読の印の材料（最新のシーズンの、見ている人のチャンネルの発言）。
 * チャンネル一覧を使う人（参加者と管理者モード中の管理者）が、書き込めるシーズンにいるときだけ。
 * 既読の位置はブラウザに持つので、未読かどうかは画面側で決める
 */
const loadChatUnread = async (
  request: Request,
  context: Route.LoaderArgs["context"],
  game: GameDetail,
) => {
  const season = game.seasons.at(-1) ?? null;
  if (season == null || !isWritableSeason(game, season)) return null;
  const viewer = await resolveChatViewer(context, game);
  if (viewer.kind !== "channels") return null;
  const messages = await loadSeasonMessages(context, game, season);
  const channels = summarizeChannels(
    messages,
    isOffGameSeason(season) ? null : viewer.power,
  );
  return {
    candidates: unreadCandidatesOf(
      messages,
      { power: viewer.power, username: viewer.username },
      channels.map((c) => c.channel.id),
    ),
    latest: messages.at(-1)?.message_uuid ?? null,
  };
};

/**
 * 卓ヘッダのシーズン切り替えのリンク先。
 * 今のページのまま ?season= だけを変える（最新のシーズンは ?season= を付けない）
 */
const useSeasonNav = (
  season: string | null,
  seasons: string[],
): SeasonNav | undefined => {
  const location = useLocation();
  if (season == null) return undefined;
  const index = seasons.indexOf(season);
  if (index < 0) return undefined;
  const latestIndex = seasons.length - 1;
  const href = (i: number) => {
    const params = new URLSearchParams(location.search);
    if (i === latestIndex) params.delete("season");
    else params.set("season", seasons[i]);
    const query = params.toString();
    return `${location.pathname}${query ? `?${query}` : ""}`;
  };
  return {
    first: index > 0 ? href(0) : null,
    prev: index > 0 ? href(index - 1) : null,
    next: index < latestIndex ? href(index + 1) : null,
    latest: index < latestIndex ? href(latestIndex) : null,
  };
};

/**
 * 最後に開いていたチャットのページ（チャンネル画面なら "/games/:uuid/chat/efg"、クエリ込み）。
 * 命令ページなどに移ってからチャットのタブで戻ったときに、同じチャンネルを開くために使う。
 * 見ているシーズンが違えば使わない（タブはそのシーズンのチャンネル一覧へ）
 */
const useLastChatPath = (gameUuid: string, season: string | null) => {
  const location = useLocation();
  const [last, setLast] = useState<{
    gameUuid: string;
    path: string;
    season: string | null;
  } | null>(null);
  useEffect(() => {
    if (!location.pathname.startsWith(`/games/${gameUuid}/chat`)) return;
    setLast({
      gameUuid,
      path: `${location.pathname}${location.search}`,
      season: new URLSearchParams(location.search).get("season"),
    });
  }, [gameUuid, location.pathname, location.search]);
  return last && last.gameUuid === gameUuid && last.season === season
    ? last.path
    : null;
};

export default function GameLayout({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  // いちばん深いページの handle からページ名を取る
  const handle = matches
    .map((m) => m.handle as GameRouteHandle | undefined)
    .filter((h) => h != null)
    .at(-1);
  const seasonal = handle?.seasonal ?? false;
  const title =
    (seasonal && loaderData.season ? seasonLabel(loaderData.season) : null) ??
    handle?.gameTitle ??
    "";
  const location = useLocation();
  const seasonParam = new URLSearchParams(location.search).get("season");
  const headerRef = useRef<HTMLDivElement>(null);
  useStickyHeight(headerRef, "--game-header-height");
  const seasonNav = useSeasonNav(
    seasonal ? loaderData.season : null,
    loaderData.seasons,
  );
  const unreadCounts = useUnreadCounts(
    loaderData.gameUuid,
    loaderData.chatUnread?.candidates ?? null,
    loaderData.chatUnread?.latest ?? null,
  );
  const chatTo = useLastChatPath(
    loaderData.gameUuid,
    seasonal ? seasonParam : null,
  );

  return (
    // 画面下のタブバーに隠れないよう、下に余白を取る
    <div className="w-full pb-[calc(56px+env(safe-area-inset-bottom))]">
      {/* 卓ヘッダはサイトヘッダのすぐ下に固定する（高さを測るまでは、管理者の帯がないときの 47px） */}
      {/* 地図の情報カード（z-index 20）より上、サイトヘッダ（30）より下 */}
      <div
        ref={headerRef}
        className="sticky top-(--site-header-height,47px) z-[25]"
      >
        <GameHeader
          numberLabel={loaderData.numberLabel}
          title={title}
          seasonNav={seasonNav}
          // 過去のシーズンにはフェイズ名を出さない
          phase={
            seasonal &&
            loaderData.season != null &&
            loaderData.season === loaderData.seasons.at(-1)
              ? loaderData.phase
              : null
          }
        />
      </div>
      <Outlet />
      <GameTabBar
        gameUuid={loaderData.gameUuid}
        ordersEnabled={loaderData.ordersEnabled}
        maintenanceEnabled={loaderData.maintenanceEnabled}
        // 過去のシーズンを見ているときは、カレンダー・チャット・命令のあいだでシーズンを引き継ぐ
        season={seasonal ? seasonParam : null}
        // ほかのタブからチャットに戻ったら、最後に開いていたチャンネルを開く
        chatTo={chatTo}
        chatUnread={Object.keys(unreadCounts).length > 0}
      />
    </div>
  );
}
