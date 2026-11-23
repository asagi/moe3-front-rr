import { Outlet, useMatches } from "react-router";
import { GameHeader } from "~/components/game-nav/GameHeader";
import { GameTabBar } from "~/components/game-nav/GameTabBar";
import { gameNumberLabel, isStarted } from "~/lib/game";
import {
  canMaintainGame,
  gameContext,
  loadGameDetail,
  requireGame,
} from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import type { Route } from "./+types/games.$gameUuid";

/** 卓内の各ページが handle に入れる情報 */
export interface GameRouteHandle {
  /** 卓ヘッダに出すページ名（「卓情報」など） */
  gameTitle: string;
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
    maintenanceEnabled: await canMaintainGame(request, game),
  };
}

export default function GameLayout({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  // いちばん深いページの handle からページ名を取る
  const title =
    matches
      .map((m) => (m.handle as GameRouteHandle | undefined)?.gameTitle)
      .filter((t) => t != null)
      .at(-1) ?? "";

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
