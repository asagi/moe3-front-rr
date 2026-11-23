import { redirect } from "react-router";
import { isStarted } from "~/lib/game";
import { requireGame } from "~/lib/game.server";
import { PlaceholderPage } from "~/components/placeholder-page/PlaceholderPage";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.orders";

export const handle: GameRouteHandle = { gameTitle: "命令" };

export function meta({}: Route.MetaArgs) {
  return [{ title: "命令 | Diplomacy MOE" }];
}

/** 開始前は開けないので卓情報へ戻す */
export async function loader({ params, context }: Route.LoaderArgs) {
  if (!isStarted(requireGame(context))) {
    throw redirect(`/games/${params.gameUuid}`);
  }
  return null;
}

/** 命令（仮ページ） */
export default function GameOrders() {
  return <PlaceholderPage title="命令" />;
}
