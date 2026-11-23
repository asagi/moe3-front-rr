import { type ApiAuth, listGames } from "~/lib/api.server";

/**
 * 自分が卓主のアクティブな卓（Aborted・Closed 以外）があるか。
 * あるうちは新しい卓を立てられない（API 側では制限していないので画面側で止める）
 */
export const hasActiveOwnedGame = async (user: string, auth: ApiAuth) => {
  const { games } = await listGames(
    { user, status: "active", per_page: 100 },
    auth,
  );
  return games.some((g) => g.is_owner);
};
