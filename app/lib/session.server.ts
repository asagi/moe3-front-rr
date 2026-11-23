import { type Session, createCookieSessionStorage } from "react-router";
import type { ApiAuth } from "~/lib/api.server";
import { requireEnv } from "~/lib/env.server";

export interface SessionData {
  /** API サーバーのアクセストークン */
  accessToken: string;
  /** 管理者かどうか（ログイン時の API レスポンスの is_admin） */
  isAdmin: boolean;
  /** 管理者モードが ON か（isAdmin のユーザーのみ有効） */
  adminMode: boolean;
  /** 「視点変更」で表示する対象のユーザー名（管理者モード中のみ有効） */
  impersonateUsername: string;
}

let storage: ReturnType<typeof createCookieSessionStorage<SessionData>>;

/** ログインセッション（署名付き Cookie）。環境変数は初回利用時に読む */
export const getSessionStorage = () => {
  storage ??= createCookieSessionStorage<SessionData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secrets: [requireEnv("SESSION_SECRET")],
    },
  });
  return storage;
};

/**
 * セッションから API 呼び出し用の認証情報を作る。未ログインなら null。
 * 視点変更は管理者モード中の管理者のときだけ付ける
 */
export const getApiAuth = (session: Session<SessionData>): ApiAuth | null => {
  const accessToken = session.get("accessToken");
  if (!accessToken) return null;
  const adminMode = !!session.get("isAdmin") && !!session.get("adminMode");
  return {
    accessToken,
    impersonateUsername: adminMode
      ? (session.get("impersonateUsername") ?? null)
      : null,
  };
};
