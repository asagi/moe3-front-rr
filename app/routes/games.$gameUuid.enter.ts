import { redirect } from "react-router";
import { gameEntryPath } from "~/lib/game";
import { requireGame } from "~/lib/game.server";
import type { Route } from "./+types/games.$gameUuid.enter";

/**
 * 卓一覧から開いたときの入口。卓の状態（募集中・開戦前夜・進行中のフェイズ・感想戦）に合わせて、
 * 最初に出すページへ移す。卓の詳細はレイアウトのミドルウェアで取得済み
 */
export async function loader({ context }: Route.LoaderArgs) {
  throw redirect(gameEntryPath(requireGame(context)));
}
