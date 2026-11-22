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

/** 認証が必要な API の呼び出しに使う情報 */
export interface ApiAuth {
  accessToken: string;
  /** 管理者が「視点変更」で成り代わるユーザーの Discord ユーザー ID。未設定なら本人として呼ぶ */
  impersonateUserId?: string | null;
}

/** 成り代わり先の指定が不正なときに API が返すエラーコード */
export const IMPERSONATE_ERROR_CODES = [
  "invalid_impersonate_user_id",
  "impersonate_user_not_found",
];

/** 成り代わり先の指定が原因のエラーか */
export const isImpersonateError = (e: unknown): e is ApiError =>
  e instanceof ApiError && IMPERSONATE_ERROR_CODES.includes(e.code);

const authHeaders = ({ accessToken, impersonateUserId }: ApiAuth) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (impersonateUserId) headers["X-Impersonate-User-Id"] = impersonateUserId;
  return headers;
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
export const getMe = (auth: ApiAuth) =>
  request<UserMe>("/users/me", { headers: authHeaders(auth) });
