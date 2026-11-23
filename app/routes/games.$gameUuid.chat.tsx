import { PlaceholderPage } from "~/components/placeholder-page/PlaceholderPage";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.chat";

export const handle: GameRouteHandle = { gameTitle: "チャット" };

export function meta({}: Route.MetaArgs) {
  return [{ title: "チャット | Diplomacy MOE" }];
}

/** チャット（仮ページ） */
export default function GameChat() {
  return <PlaceholderPage title="チャット" />;
}
