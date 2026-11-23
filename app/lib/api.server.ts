import { requireEnv } from "~/lib/env.server";
import type { GameDetail, GameSummary } from "~/lib/game";

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

export interface ListGamesParams {
  /** active: Aborted・Closed 以外 / closed / aborted。未指定なら active */
  status?: "active" | "closed" | "aborted";
  /** 参加している卓で絞り込む Discord ユーザー ID（指定時は認証必須） */
  user?: string;
  page?: number;
  /** 1〜100（デフォルト 20） */
  per_page?: number;
}

export interface ListGamesResponse {
  games: GameSummary[];
  total: number;
  page: number;
  per_page: number;
}

/** GET /games: 卓一覧を取得する（user を指定するときは auth が必須） */
export const listGames = (params: ListGamesParams, auth?: ApiAuth | null) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) query.set(key, String(value));
  }
  return request<ListGamesResponse>(`/games?${query}`, {
    headers: auth ? authHeaders(auth) : {},
  });
};

export interface CreateGameBody {
  /** 1 = 娘, 2 = 旗 */
  face_type: 1 | 2;
  /** 1 = 定時進行, 2 = 合意進行（省略時は定時進行） */
  progress_mode: 1 | 2;
  /** 1 = 短期（メインフェイズ 30 分）, 2 = 標準（メインフェイズ 24 時間） */
  duration_type: 1 | 2;
  /** 開始日（JST、"YYYY-MM-DD"） */
  start_date: string;
  /** 開始時刻の時（JST、0〜23） */
  first_period_hour: number;
  /** 希望国の 1 文字コード。希望なしは null */
  requested_power: string | null;
  /** 鍵卓のキーワード（英数字のみ）。鍵なしは null */
  keyword: string | null;
}

export interface CreateGameResponse {
  game_uuid: string;
  owner_user_uuid: string;
  requested_power: string | null;
}

/** POST /games: 新しい卓（募集）を作成する */
export const createGame = (body: CreateGameBody, auth: ApiAuth) =>
  request<CreateGameResponse>("/games", {
    method: "POST",
    headers: { ...authHeaders(auth), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** GET /games/{uuid} のレスポンス */
export interface GetGameResponse {
  game: GameDetail;
}

/** GET /games/{uuid}: 卓の詳細を取得する（auth を付けると is_owner が入る） */
export const getGame = (gameUuid: string, auth?: ApiAuth | null) =>
  request<GetGameResponse>(`/games/${encodeURIComponent(gameUuid)}`, {
    headers: auth ? authHeaders(auth) : {},
  });

export interface JoinGameBody {
  /** 希望国の 1 文字コード。希望なしは null */
  requested_power: string | null;
  /** 鍵卓のキーワード。鍵なしは null */
  keyword: string | null;
}

export interface JoinGameResponse {
  game_uuid: string;
  user_uuid: string;
  requested_power: string | null;
}

/** POST /games/{uuid}/players: 卓に参加を申請する */
export const joinGame = (gameUuid: string, body: JoinGameBody, auth: ApiAuth) =>
  request<JoinGameResponse>(
    `/games/${encodeURIComponent(gameUuid)}/players`,
    {
      method: "POST",
      headers: { ...authHeaders(auth), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
