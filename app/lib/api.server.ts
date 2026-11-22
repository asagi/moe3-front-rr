import { requireEnv } from "~/lib/env.server";

/** API サーバーが返すエラー形式 */
export interface ApiErrorBody {
  code: string;
  message: string;
}

/** API サーバーがエラーを返したときの例外 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const res = await fetch(new URL(path, requireEnv("API_BASE_URL")), init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      body?.code ?? "unknown",
      body?.message ?? `API エラー: ${res.status}`,
    );
  }
  return (await res.json()) as T;
};

export interface User {
  uuid: string;
  discord_user_id: string;
  username: string;
  global_name: string | null;
  avatar_hash: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

export interface AuthLoginResponse {
  access_token: string;
  user: User;
}

/** POST /auth/login: Discord アクセストークンでログインする */
export const login = (discordAccessToken: string) =>
  request<AuthLoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ discord_access_token: discordAccessToken }),
  });

export interface UserMe {
  discord_user_id: string;
  username: string;
  global_name: string | null;
  avatar_url: string | null;
}

/** GET /users/me: ログイン中ユーザーのプロフィールを取得する */
export const getMe = (accessToken: string) =>
  request<UserMe>("/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
