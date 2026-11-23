import { type Session, createContext } from "react-router";
import {
  ApiError,
  type ApiAuth,
  type UserMe,
  getMe,
  isImpersonateError,
} from "~/lib/api.server";
import { type SessionData, getApiAuth } from "~/lib/session.server";

/** リクエスト中のログインユーザーの取得結果 */
export type MeState =
  | { kind: "loggedOut" }
  /** トークンが無効（セッションを破棄すべき） */
  | { kind: "unauthorized" }
  /** API の一時的な障害など */
  | { kind: "failed" }
  | {
      kind: "ok";
      /** /users/me の結果（視点変更中なら成り代わり先のユーザー） */
      me: UserMe;
      /** 以降の API 呼び出しに使う認証情報（視点変更が不正なら外してある） */
      auth: ApiAuth;
      /** 視点変更のユーザー名が不正で、本人として取得し直したときのエラーメッセージ */
      impersonateError: string | null;
    };

/**
 * レイアウトのミドルウェアで 1 回だけ /users/me を取得して入れておく。
 * レイアウトと子ルートの loader はここから読む（loader 同士は並行に動くため直接渡せない）
 */
export const meContext = createContext<MeState>({ kind: "loggedOut" });

/** セッションのトークンでログインユーザーを取得する */
export const loadMe = async (
  session: Session<SessionData>,
): Promise<MeState> => {
  const auth = getApiAuth(session);
  if (!auth) return { kind: "loggedOut" };

  try {
    try {
      return {
        kind: "ok",
        me: await getMe(auth),
        auth,
        impersonateError: null,
      };
    } catch (e) {
      // ユーザー名の存在はチェックせずに保存しているので、不正なら本人として取り直す。
      // ここでログアウト扱いにすると管理者ヘッダが消えて解除できなくなる
      if (!isImpersonateError(e)) throw e;
      const ownAuth = { ...auth, impersonateUsername: null };
      return {
        kind: "ok",
        me: await getMe(ownAuth),
        auth: ownAuth,
        impersonateError: e.message,
      };
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return { kind: "unauthorized" };
    console.error("ユーザー情報の取得に失敗しました", e);
    return { kind: "failed" };
  }
};
