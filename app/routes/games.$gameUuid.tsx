import { Outlet, useMatches } from "react-router";
import { GameHeader } from "~/components/game-nav/GameHeader";
import { GameTabBar } from "~/components/game-nav/GameTabBar";
import { gameNumberLabel, isStarted, seasonLabel } from "~/lib/game";
import {
  canMaintainGame,
  gameContext,
  loadGameDetail,
  requireGame,
  resolveSeason,
} from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
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
    maintenanceEnabled: await canMaintainGame(request, context, game),
    // ターンの中のページで卓ヘッダに出すシーズン（?season= が不正ならページ側で 404 にする）
    seasonLabel: (() => {
      try {
        const season = resolveSeason(request, game);
        return season ? seasonLabel(season) : null;
      } catch {
        return null;
      }
    })(),
  };
}

export default function GameLayout({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  // いちばん深いページの handle からページ名を取る
  const handle = matches
    .map((m) => m.handle as GameRouteHandle | undefined)
    .filter((h) => h != null)
    .at(-1);
  const title =
    (handle?.seasonal ? loaderData.seasonLabel : null) ?? handle?.gameTitle ?? "";

  return (
    // 画面下のタブバーに隠れないよう、下に余白を取る
    <div className="w-full pb-[calc(56px+env(safe-area-inset-bottom))]">
      <GameHeader numberLabel={loaderData.numberLabel} title={title} />
      <Outlet />
      <GameTabBar
        gameUuid={loaderData.gameUuid}
        ordersEnabled={loaderData.ordersEnabled}
        maintenanceEnabled={loaderData.maintenanceEnabled}
      />
    </div>
  );
}
