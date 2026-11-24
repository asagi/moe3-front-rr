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
      /** ログインしている本人の /users/me（視点変更していなければ me と同じ） */
      self: UserMe;
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
    if (!auth.impersonateUsername) {
      const me = await getMe(auth);
      return { kind: "ok", me, self: me, auth, impersonateError: null };
    }
    // 視点変更中は、ヘッダに出す本人の情報も並行して取る
    const ownAuth = { ...auth, impersonateUsername: null };
    const [target, self] = await Promise.allSettled([
      getMe(auth),
      getMe(ownAuth),
    ]);
    if (self.status === "rejected") throw self.reason;
    if (target.status === "fulfilled") {
      return {
        kind: "ok",
        me: target.value,
        self: self.value,
        auth,
        impersonateError: null,
      };
    }
    // ユーザー名の存在はチェックせずに保存しているので、不正なら本人として表示する。
    // ここでログアウト扱いにすると管理者ヘッダが消えて解除できなくなる
    if (!isImpersonateError(target.reason)) throw target.reason;
    return {
      kind: "ok",
      me: self.value,
      self: self.value,
      auth: ownAuth,
      impersonateError: target.reason.message,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return { kind: "unauthorized" };
    console.error("ユーザー情報の取得に失敗しました", e);
    return { kind: "failed" };
  }
};
