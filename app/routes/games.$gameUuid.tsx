import { useRef } from "react";
import { Outlet, useLocation, useMatches } from "react-router";
import { GameHeader, type SeasonNav } from "~/components/game-nav/GameHeader";
import { GameTabBar } from "~/components/game-nav/GameTabBar";
import { isBoardEditable } from "~/lib/board";
import { gameNumberLabel, isStarted, seasonLabel } from "~/lib/game";
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
    ordersEnabled: isStarted(game),
    // 盤面の編集は、卓主か管理者モード中の管理者が、開戦前夜かメインフェイズのときだけ
    maintenanceEnabled:
      isBoardEditable(game) && (await canMaintainGame(request, context, game)),
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
  };
}

/**
 * 卓ヘッダのシーズン切り替えのリンク先。
 * 今のページのまま ?season= だけを変える（最新のシーズンは ?season= を付けない）
 */
const useSeasonNav = (season: string | null, seasons: string[]): SeasonNav | undefined => {
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
  const seasonNav = useSeasonNav(seasonal ? loaderData.season : null, loaderData.seasons);

  return (
    // 画面下のタブバーに隠れないよう、下に余白を取る
    <div className="w-full pb-[calc(56px+env(safe-area-inset-bottom))]">
      {/* 卓ヘッダはサイトヘッダのすぐ下に固定する（高さを測るまでは、管理者の帯がないときの 47px） */}
      {/* 地図の情報カード（z-index 20）より上、サイトヘッダ（30）より下 */}
      <div ref={headerRef} className="sticky top-(--site-header-height,47px) z-[25]">
        <GameHeader numberLabel={loaderData.numberLabel} title={title} seasonNav={seasonNav} />
      </div>
      <Outlet />
      <GameTabBar
        gameUuid={loaderData.gameUuid}
        ordersEnabled={loaderData.ordersEnabled}
        maintenanceEnabled={loaderData.maintenanceEnabled}
        // 過去のシーズンを見ているときは、カレンダー・チャット・命令のあいだでシーズンを引き継ぐ
        season={seasonal ? seasonParam : null}
      />
    </div>
  );
}
