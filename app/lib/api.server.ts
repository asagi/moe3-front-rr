import { requireEnv } from "~/lib/env.server";
import type { BoardSnapshot, UnitKind } from "~/lib/board";
import type { ChatMessage } from "~/lib/chat";
import type { GameDetail, GameSummary } from "~/lib/game";
import type { OrdersResponse, PutOrdersBody, SeasonResult } from "~/lib/orders";

/** API サーバーが返すエラー形式 */
export interface ApiErrorBody {
  code: string;
  message: string;
  /** 命令の確定（PUT /orders）の invalid_order で、だめだった命令の対象地域 */
  location?: string;
}

/** API サーバーがエラーを返したときの例外 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** だめだった命令の対象地域（PUT /orders の invalid_order のみ） */
    readonly location: string | null = null,
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
      body?.location ?? null,
    );
  }
  return (await res.json()) as T;
};

/** 認証が必要な API の呼び出しに使う情報 */
export interface ApiAuth {
  accessToken: string;
  /** 管理者が「視点変更」で成り代わるユーザーの Discord ユーザー名。未設定なら本人として呼ぶ */
  impersonateUsername?: string | null;
}

/** 成り代わり先の指定が不正なときに API が返すエラーコード */
export const IMPERSONATE_ERROR_CODES = [
  "invalid_impersonate_user_name",
  "impersonate_user_not_found",
];

/** 成り代わり先の指定が原因のエラーか */
export const isImpersonateError = (e: unknown): e is ApiError =>
  e instanceof ApiError && IMPERSONATE_ERROR_CODES.includes(e.code);

const authHeaders = ({ accessToken, impersonateUsername }: ApiAuth) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (impersonateUsername) headers["X-Impersonate-User-Name"] = impersonateUsername;
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
  /** 管理者か（視点変更中は切り替え先のユーザーの値）。API が返すまでは未定義 */
  is_admin?: boolean;
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

export interface GetGameLogsResponse {
  messages: ChatMessage[];
}

/**
 * GET /games/{uuid}/logs/{season}: シーズンの外交メッセージを取得する。
 * 進行中の卓では、見ている人の権限で内容が絞られる（他国間の密談は masked）
 * @param after 指定すると、このメッセージより後のものだけ返す
 */
export const getGameLogs = (
  gameUuid: string,
  season: string,
  auth?: ApiAuth | null,
  after?: string,
) => {
  const query = after ? `?${new URLSearchParams({ after })}` : "";
  return request<GetGameLogsResponse>(
    `/games/${encodeURIComponent(gameUuid)}/logs/${encodeURIComponent(season)}${query}`,
    { headers: auth ? authHeaders(auth) : {} },
  );
};

export interface PostMessageBody {
  kind: "public" | "confidential" | "personal";
  /** confidential のときだけ必須。宛先の国コード（自国を含めない） */
  recipients: string[] | null;
  /** 本文（最大 2000 文字） */
  context: string;
  /** 管理人発言か（管理者本人のみ。視点変更中は不可） */
  as_admin: boolean;
}

/** POST /games/{uuid}/messages: 発言する。作ったメッセージを返す */
export const postMessage = (gameUuid: string, body: PostMessageBody, auth: ApiAuth) =>
  request<ChatMessage>(`/games/${encodeURIComponent(gameUuid)}/messages`, {
    method: "POST",
    headers: { ...authHeaders(auth), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/**
 * GET /games/{uuid}/messages/stream: 新しいメッセージの SSE を開く。
 * レスポンスをそのまま返すので、呼び出し側でブラウザへ中継する
 */
export const openMessageStream = (
  gameUuid: string,
  auth: ApiAuth | null,
  options: { lastEventId?: string | null; after?: string | null; signal?: AbortSignal },
) => {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    ...(auth ? authHeaders(auth) : {}),
  };
  if (options.lastEventId) headers["Last-Event-ID"] = options.lastEventId;
  const query = options.after ? `?${new URLSearchParams({ after: options.after })}` : "";
  return fetch(
    new URL(
      `/games/${encodeURIComponent(gameUuid)}/messages/stream${query}`,
      requireEnv("API_BASE_URL"),
    ),
    { headers, signal: options.signal },
  );
};

/* ---- 盤面の編集（卓主と管理者） ---- */

const adminGamePath = (gameUuid: string, kind: "units" | "territories", code: string) =>
  `/admin/games/${encodeURIComponent(gameUuid)}/${kind}/${encodeURIComponent(code)}`;

/**
 * GET /games/{uuid}/board: 盤面（ユニット配置・占領情報・国ごとの状況）を取得する。
 * @param season 指定すればそのシーズンの最後のフェイズ、省略すれば最新フェイズ
 */
export const getBoard = (gameUuid: string, auth?: ApiAuth | null, season?: string | null) =>
  request<BoardSnapshot>(
    `/games/${encodeURIComponent(gameUuid)}/board${season ? `?${new URLSearchParams({ season })}` : ""}`,
    { headers: auth ? authHeaders(auth) : {} },
  );

/**
 * PUT /admin/games/{uuid}/units/{location}: ユニットを置く（同じ地域のユニットは置き換える）。
 * 新しいユニットには維持命令が付き、置き換えた古いユニットの命令は消える
 * @param season 最新フェイズのシーズン。食い違うと 409 phase_conflict
 */
export const putUnit = (
  gameUuid: string,
  location: string,
  unit: { power: string; kind: UnitKind },
  season: string,
  auth: ApiAuth,
) =>
  request<unknown>(adminGamePath(gameUuid, "units", location), {
    method: "PUT",
    headers: { ...authHeaders(auth), "Content-Type": "application/json" },
    body: JSON.stringify({ unit, season }),
  });

/** DELETE /admin/games/{uuid}/units/{location}: ユニットを消す（そのユニットの命令も消える） */
export const deleteUnit = (gameUuid: string, location: string, season: string, auth: ApiAuth) =>
  request<unknown>(
    `${adminGamePath(gameUuid, "units", location)}?${new URLSearchParams({ season })}`,
    { method: "DELETE", headers: authHeaders(auth) },
  );

/** PUT /admin/games/{uuid}/territories/{code}: 地域の占領国を設定する */
export const putTerritory = (
  gameUuid: string,
  code: string,
  power: string,
  season: string,
  auth: ApiAuth,
) =>
  request<unknown>(adminGamePath(gameUuid, "territories", code), {
    method: "PUT",
    headers: { ...authHeaders(auth), "Content-Type": "application/json" },
    body: JSON.stringify({ power, season }),
  });

/** DELETE /admin/games/{uuid}/territories/{code}: 地域の占領を解除する */
export const deleteTerritory = (gameUuid: string, code: string, season: string, auth: ApiAuth) =>
  request<unknown>(
    `${adminGamePath(gameUuid, "territories", code)}?${new URLSearchParams({ season })}`,
    { method: "DELETE", headers: authHeaders(auth) },
  );

/* ---- 命令 ---- */

/** GET /games/{uuid}/result/{season}: シーズンの命令と解決結果（進行中のフェイズの命令は空） */
export const getSeasonResult = (gameUuid: string, season: string) =>
  request<SeasonResult>(
    `/games/${encodeURIComponent(gameUuid)}/result/${encodeURIComponent(season)}`,
    { headers: {} },
  );

/** GET /games/{uuid}/orders: 自分の命令と候補（担当国のある参加者だけ。メイン・撤退・調整のみ） */
export const getOrders = (gameUuid: string, auth: ApiAuth) =>
  request<OrdersResponse>(`/games/${encodeURIComponent(gameUuid)}/orders`, {
    headers: authHeaders(auth),
  });

/** PUT /games/{uuid}/orders: 自分の命令を丸ごと置き換えて確定する。確定後の状態が返る */
export const putOrders = (gameUuid: string, body: PutOrdersBody, auth: ApiAuth) =>
  request<OrdersResponse>(`/games/${encodeURIComponent(gameUuid)}/orders`, {
    method: "PUT",
    headers: { ...authHeaders(auth), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** PUT /games/{uuid}/progress-consensus: 即時進行への合意を表明・撤回する（合意進行の卓だけ） */
export const putProgressConsensus = (gameUuid: string, agreed: boolean, auth: ApiAuth) =>
  request<{ game_uuid: string; agreed: boolean }>(
    `/games/${encodeURIComponent(gameUuid)}/progress-consensus`,
    {
      method: "PUT",
      headers: { ...authHeaders(auth), "Content-Type": "application/json" },
      body: JSON.stringify({ agreed }),
    },
  );
