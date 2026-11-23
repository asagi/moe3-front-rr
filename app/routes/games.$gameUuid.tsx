import { PlaceholderPage } from "~/components/placeholder-page/PlaceholderPage";
import type { Route } from "./+types/games.$gameUuid";

export function meta({}: Route.MetaArgs) {
  return [{ title: "卓 | Diplomacy MOE" }];
}

/** 卓の詳細（仮ページ） */
export default function Game({ params }: Route.ComponentProps) {
  return <PlaceholderPage title={`卓 ${params.gameUuid}`} />;
}
