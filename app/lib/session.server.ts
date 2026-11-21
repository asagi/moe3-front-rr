import { createCookieSessionStorage } from "react-router";
import { requireEnv } from "~/lib/env.server";

interface SessionData {
  /** API サーバーのアクセストークン */
  accessToken: string;
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
