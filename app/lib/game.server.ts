import { type RouterContextProvider, createContext, data } from "react-router";
import { ApiError, type ApiAuth, getGame, listGames } from "~/lib/api.server";
import type { GameDetail } from "~/lib/game";
import { meContext } from "~/lib/me.server";

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

/**
 * 卓レイアウトのミドルウェアで 1 回だけ卓の詳細を取得して入れておく。
 * レイアウトと子ルートの loader・action はここから読む
 */
export const gameContext = createContext<GameDetail | null>(null);

/** 卓の詳細を取得する。卓が見つからなければ null */
export const loadGameDetail = async (
  gameUuid: string,
  auth: ApiAuth | null,
): Promise<GameDetail | null> => {
  try {
    return (await getGame(gameUuid, auth)).game;
  } catch (e) {
    // 不正な UUID も「卓が見つからない」として扱う
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
      return null;
    }
    throw e;
  }
};

/** 参加申請の API エラーコードごとの文言 */
const JOIN_ERROR_MESSAGES: Record<string, string> = {
  unauthorized:
    "ログイン情報を確認できませんでした。もう一度ログインしてください。",
  not_found: "卓が見つかりませんでした。",
  keyword_mismatch: "鍵が違います。",
  already_in_another_game: "ほかの卓に参加中のため、参加できません。",
  not_accepting_players: "この卓は参加者の募集を締め切りました。",
  game_full: "この卓は定員に達しています。",
};

/** 参加申請の API エラーを画面に出す文言にする */
export const joinErrorMessage = (e: ApiError) =>
  JOIN_ERROR_MESSAGES[e.code] ??
  `参加の申請に失敗しました（${e.code}）: ${e.message}`;

/**
 * ミドルウェアで取得した卓を読む。見つからなければ 404 にする
 * （loader 同士は並行に動くので、レイアウトと各ページの両方で呼ぶ）
 */
export const requireGame = (context: Readonly<RouterContextProvider>) => {
  const game = context.get(gameContext);
  if (!game) throw data("卓が見つかりませんでした", { status: 404 });
  return game;
};

/**
 * 盤面の編集ページを開けるか。その卓の卓主か、管理者モード中の管理者のとき。
 * 管理者モードでない管理者は一般のアカウントと同じ扱い。
 * 視点変更中は切り替え先のアカウントで判定する（is_owner も切り替え先の値が返る）。
 * 切り替え先は管理者モードではないので、卓主でなければ開けない。
 * 視点変更で「第三者」を選んでいるときは開けない
 */
export const canMaintainGame = async (
  context: Readonly<RouterContextProvider>,
  game: GameDetail,
) => {
  const state = context.get(meContext);
  // 管理者モードの視点変更で「第三者」を選んでいれば、卓主でも開けない
  if (state.kind === "ok" && state.thirdParty) return false;
  if (game.is_owner) return true;
  return state.kind === "ok" && state.adminActive;
};

/**
 * ターンの中のページ（カレンダー・チャット・命令）で表示するシーズン。
 * URL の ?season= で選び、指定がなければ現在のシーズン。シーズンがまだなければ null。
 * 卓に無いシーズンを指定されたら 404 にする
 */
export const resolveSeason = (request: Request, game: GameDetail) => {
  const requested = new URL(request.url).searchParams.get("season");
  if (requested != null) {
    if (!game.seasons.includes(requested)) {
      throw data("シーズンが見つかりませんでした", { status: 404 });
    }
    return requested;
  }
  return game.seasons.at(-1) ?? null;
};
