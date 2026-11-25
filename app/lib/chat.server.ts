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
  | {
      kind: "channels";
      power: PowerCode | null;
      /** 見ている人の Discord ユーザー名（開戦前夜・感想戦の自分の発言の判定に使う） */
      username: string;
      /** 担当国が滅亡しているか（オープンチャンネルへの発言が Ghost 発言になり、密談は書けない） */
      eliminated: boolean;
      canPostAsAdmin: boolean;
    }
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
  const username = state.me.username;
  if (player) {
    return {
      kind: "channels",
      power: player.power,
      username,
      eliminated: player.is_eliminated,
      canPostAsAdmin,
    };
  }
  // 参加者でない管理者は、オープンチャンネルだけのチャンネル一覧にする（管理人発言のため）
  if (canPostAsAdmin) {
    return { kind: "channels", power: null, username, eliminated: false, canPostAsAdmin };
  }
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


/** SSE をつなぎ直すきっかけ（見ている人が変わったら変わる） */
export const streamConnectionKey = (viewer: Extract<ChatViewer, { kind: "channels" }>) =>
  `${viewer.username}:${viewer.power ?? "-"}:${viewer.canPostAsAdmin}`;

/** 発言 API のエラーコードごとの文言 */
const POST_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "ログイン情報を確認できませんでした。もう一度ログインしてください。",
  invalid_kind: "このチャンネルには書き込めません。",
  invalid_recipients: "宛先が正しくありません。",
  empty_context: "発言を入力してください。",
  context_too_long: "発言は 2000 文字までです。",
  not_a_player: "この卓の参加者ではないため、書き込めません。",
  power_eliminated: "担当国が滅亡したため、密談には書き込めません。",
  admin_post_not_allowed: "管理人発言は、視点変更していない管理者モード中だけできます。",
  game_not_accepting_messages: "この卓にはもう書き込めません。",
  phase_not_accepting_messages: "撤退フェイズと調整フェイズのあいだは書き込めません。",
  not_found: "卓が見つかりませんでした。",
};

/** 発言 API のエラーを画面に出す文言にする */
export const postErrorMessage = (e: ApiError) =>
  POST_ERROR_MESSAGES[e.code] ?? `発言に失敗しました（${e.code}）: ${e.message}`;
