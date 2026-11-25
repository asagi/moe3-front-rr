import type { GamePlayer } from "~/lib/game";

/** ストーリー用の参加者 */
export const player = (
  name: string,
  overrides: Partial<GamePlayer> = {},
): GamePlayer => ({
  user: {
    discord_user_id: name,
    username: name,
    global_name: name,
    avatar_url: null,
  },
  is_owner: false,
  requested_power: null,
  power: null,
  is_eliminated: false,
  ...overrides,
});
