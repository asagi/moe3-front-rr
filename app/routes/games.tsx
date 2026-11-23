import { PlaceholderPage } from "~/components/placeholder-page/PlaceholderPage";
import type { Route } from "./+types/games";

export function meta({}: Route.MetaArgs) {
  return [{ title: "すべての卓 | Diplomacy MOE" }];
}

/** すべての卓一覧（仮ページ） */
export default function Games() {
  return <PlaceholderPage title="すべての卓" />;
}
