import { redirect } from "react-router";
import { canMaintainGame, requireGame } from "~/lib/game.server";
import { PlaceholderPage } from "~/components/placeholder-page/PlaceholderPage";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.maintenance";

export const handle: GameRouteHandle = { gameTitle: "メンテナンス" };

export function meta({}: Route.MetaArgs) {
  return [{ title: "メンテナンス | Diplomacy MOE" }];
}

/** 管理者とその卓の卓主以外は開けないので卓情報へ戻す */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  if (!(await canMaintainGame(request, requireGame(context)))) {
    throw redirect(`/games/${params.gameUuid}`);
  }
  return null;
}

/** メンテナンス（仮ページ） */
export default function GameMaintenance() {
  return <PlaceholderPage title="メンテナンス" />;
}
