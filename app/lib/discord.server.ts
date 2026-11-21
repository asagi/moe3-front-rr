import { createCookie } from "react-router";
import { requireEnv } from "~/lib/env.server";

const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_SCOPES = ["identify"];

/** OAuth2 の state を一時的に保持する Cookie（CSRF 対策） */
export const discordStateCookie = createCookie("discord_oauth_state", {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/auth/discord",
  maxAge: 60 * 10,
});

/**
 * コールバックを受けるオリジン（DISCORD_REDIRECT_URI のオリジン）。
 * state の Cookie はホスト単位なので、ログイン開始もこのオリジンで行う必要がある。
 */
export const getDiscordCallbackOrigin = (): string =>
  new URL(requireEnv("DISCORD_REDIRECT_URI")).origin;

/** Discord の認可 URL を組み立てる */
export const buildDiscordAuthorizeUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: requireEnv("DISCORD_CLIENT_ID"),
    redirect_uri: requireEnv("DISCORD_REDIRECT_URI"),
    response_type: "code",
    scope: DISCORD_SCOPES.join(" "),
    state,
  });
  return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
};

/** Discord のトークン交換で失敗したときのエラー */
export class DiscordTokenError extends Error {
  constructor(
    /** Discord が返した HTTP ステータス */
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DiscordTokenError";
  }
}

/** 認可コードを Discord のアクセストークンに交換する */
export const exchangeDiscordCode = async (code: string): Promise<string> => {
  const res = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("DISCORD_CLIENT_ID"),
      client_secret: requireEnv("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: requireEnv("DISCORD_REDIRECT_URI"),
    }),
  });
  if (!res.ok) {
    throw new DiscordTokenError(
      res.status,
      `Discord のトークン交換に失敗しました: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
};
