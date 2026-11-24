import { type RouterContextProvider, data } from "react-router";
import { ApiError, getGameLogs } from "~/lib/api.server";
import { type GameDetail, type PowerCode, isEnded } from "~/lib/game";
import { meContext } from "~/lib/me.server";
import { getSessionStorage } from "~/lib/session.server";

/**
 * チャットをどの画面で見るか。
 * - channels: チャンネル一覧とチャンネル画面で見る。power がメンバーのチャンネルだけ見える
 *   - 参加者: power は担当国（決まる前は null でオープンチャンネルだけ）
 *   - 参加者でない管理者モード中の管理者: power は null でオープンチャンネルだけ。
 *     独り言や密談を見るには、関わっているアカウントに視点変更する
 * - viewer: 第三者・終了した卓。第三者用ログビューアーで見る
 *
 * canPostAsAdmin は、オープンチャンネルに管理人発言を書き込めるか
 */
export type ChatViewer =
  | { kind: "channels"; power: PowerCode | null; canPostAsAdmin: boolean }
  | { kind: "viewer" };

/**
 * 見ている人の権限からチャットの見せ方を決める。
 * 視点変更中は切り替え先のアカウントとして扱う（参加者でなければ第三者）
 */
export const resolveChatViewer = async (
  request: Request,
  context: Readonly<RouterContextProvider>,
  game: GameDetail,
): Promise<ChatViewer> => {
  if (isEnded(game)) return { kind: "viewer" };
  const state = context.get(meContext);
  if (state.kind !== "ok") return { kind: "viewer" };

  // 管理人発言は、視点変更していない管理者モード中の管理者だけ
  let canPostAsAdmin = false;
  if (!state.auth.impersonateUsername) {
    const session = await getSessionStorage().getSession(
      request.headers.get("Cookie"),
    );
    canPostAsAdmin = !!session.get("isAdmin") && !!session.get("adminMode");
  }

  const player = game.players.find(
    (p) => p.user.discord_user_id === state.me.discord_user_id,
  );
  if (player) return { kind: "channels", power: player.power, canPostAsAdmin };
  // 参加者でない管理者は、オープンチャンネルだけのチャンネル一覧にする（管理人発言のため）
  if (canPostAsAdmin) return { kind: "channels", power: null, canPostAsAdmin };
  return { kind: "viewer" };
};


/** シーズンのメッセージを取得する */
export const loadSeasonMessages = async (
  context: Readonly<RouterContextProvider>,
  game: GameDetail,
  season: string,
) => {
  const state = context.get(meContext);
  try {
    const { messages } = await getGameLogs(
      game.game_uuid,
      season,
      state.kind === "ok" ? state.auth : null,
    );
    return messages;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      throw data("シーズンが見つかりませんでした", { status: 404 });
    }
    throw e;
  }
};

