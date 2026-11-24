import { PlaceholderPage } from "~/components/placeholder-page/PlaceholderPage";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.calendar";

export const handle: GameRouteHandle = { gameTitle: "カレンダー", seasonal: true };

export function meta({}: Route.MetaArgs) {
  return [{ title: "カレンダー | Diplomacy MOE" }];
}

/** カレンダー（仮ページ） */
export default function GameCalendar() {
  return <PlaceholderPage title="カレンダー" />;
}
