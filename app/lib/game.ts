/** 卓のステータス（一覧 API は finished、詳細 API は solo / draw を返す） */
export type GameStatus =
  | "preparing"
  | "ready"
  | "in_progress"
  | "finished"
  | "solo"
  | "draw"
  | "closed"
  | "aborted";

export interface GameRegulation {
  face_type: "girls" | "flags";
  progress_mode: "scheduled" | "consensus";
  duration_type: "short" | "normal";
}

/** GET /games の一覧に含まれる卓 */
export interface GameSummary {
  game_uuid: string;
  /** 卓番号（採番前は null） */
  game_number: number | null;
  status: GameStatus;
  /** 現在のシーズン（例: "1901 年春"）。開始前は null */
  season: string | null;
  /** 次回更新日時（JST、"YYYY-MM-DD HH:mm"） */
  next_update_at: string | null;
  regulation: GameRegulation;
  player_count: number;
  /** リクエスト者がその卓の卓主か（未認証時は false） */
  is_owner: boolean;
}

/** 1 卓あたりの最大人数 */
export const MAX_PLAYERS = 7;

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  preparing: "募集中",
  ready: "開始待ち",
  in_progress: "進行中",
  finished: "終了",
  solo: "単独勝利",
  draw: "引き分け",
  closed: "クローズ",
  aborted: "中止",
};

export const FACE_TYPE_LABELS: Record<GameRegulation["face_type"], string> = {
  girls: "娘",
  flags: "旗",
};

export const PROGRESS_MODE_LABELS: Record<
  GameRegulation["progress_mode"],
  string
> = {
  scheduled: "定時進行",
  consensus: "合意進行",
};

/** 期間タイプの呼び名（卓一覧のタグなど） */
export const DURATION_TYPE_LABELS: Record<
  GameRegulation["duration_type"],
  string
> = {
  short: "短期",
  normal: "標準",
};

/** 期間タイプごとのメインフェイズの長さ（募集画面の選択肢など） */
export const MAIN_PHASE_LENGTH_LABELS: Record<
  GameRegulation["duration_type"],
  string
> = {
  short: "30 分",
  normal: "24 時間",
};

/** 卓の表示名（採番前は「番号未定」） */
export const gameTitle = (game: Pick<GameSummary, "game_number">) =>
  game.game_number == null ? "番号未定" : `第 ${game.game_number} 卓`;

/** 国（1 文字コードは API の requested_power と画像ファイル名に使う） */
export const POWERS = [
  { code: "a", label: "オーストリア" },
  { code: "e", label: "イギリス" },
  { code: "f", label: "フランス" },
  { code: "g", label: "ドイツ" },
  { code: "i", label: "イタリア" },
  { code: "r", label: "ロシア" },
  { code: "t", label: "トルコ" },
] as const;

export type PowerCode = (typeof POWERS)[number]["code"];

export const POWER_LABELS = Object.fromEntries(
  POWERS.map((p) => [p.code, p.label]),
) as Record<PowerCode, string>;

/**
 * 国の画像 URL。"x" は管理人の画像（国未定・希望なしの画像ではない）
 * @param size 60 または 100（px）
 */
export const powerImageUrl = (
  faceType: GameRegulation["face_type"],
  code: PowerCode | "x",
  size: 60 | 100 = 60,
) =>
  `/images/power/${faceType === "girls" ? "girl" : "flag"}/pl${code}${size}.png`;

/** 卓に参加しているユーザー（Discord のプロフィール） */
export interface GamePlayerUser {
  discord_user_id: string;
  username: string;
  global_name: string | null;
  avatar_url: string | null;
}

/** 卓の参加者 */
export interface GamePlayer {
  user: GamePlayerUser;
  /** 卓主か */
  is_owner: boolean;
  /** 希望国（希望なしは null）。卓主以外の希望国は本人にしか返らない（ほかの人には null） */
  requested_power: PowerCode | null;
  /** 担当国（開始前は null） */
  power: PowerCode | null;
}

/** 卓の詳細（GET /games/{uuid}） */
export interface GameDetail {
  game_uuid: string;
  game_number: number | null;
  status: GameStatus;
  /** これまでのシーズン（"ready" / "1901s" / "1901f" / "debrief"） */
  seasons: string[];
  /** 現在のフェイズ種別 */
  phase_kind: "ready" | "main" | "retreat" | "adjustment" | "debrief";
  /** 次回更新日時（JST、"YYYY-MM-DD HH:mm"） */
  next_update_at: string | null;
  /** 鍵卓か */
  is_private: boolean;
  /** 見ているユーザーがその卓の卓主か */
  is_owner: boolean;
  regulation: GameRegulation;
  /** 開始日時（JST、"YYYY-MM-DD HH:mm"） */
  start_at: string;
  /** 参加者（卓主を含む、参加申請順） */
  players: GamePlayer[];
  /** 見ているユーザーがその卓に参加（申請）済みか */
  is_joined: boolean;
}

/** 参加者を受け付けている（開始前で募集中の）卓か */
export const isRecruiting = (game: Pick<GameDetail, "status">) =>
  game.status === "preparing";

/** 開始済み（開戦前夜より後）の卓か */
export const isStarted = (game: Pick<GameDetail, "status">) =>
  game.status !== "preparing" && game.status !== "ready";

/** 卓ヘッダ用の卓番号（"#001"）。採番前は null */
export const gameNumberLabel = (game: Pick<GameDetail, "game_number">) =>
  game.game_number == null
    ? null
    : `#${String(game.game_number).padStart(3, "0")}`;

/** ユーザーの表示名（Discord の表示名、なければユーザー名） */
export const displayName = (user: Pick<GamePlayerUser, "username" | "global_name">) =>
  user.global_name ?? user.username;

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-11-25" → "2026 年 11 月 25 日（水）" */
export const formatDateJa = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y} 年 ${m} 月 ${d} 日（${weekday}）`;
};

/** "2026-11-25 09:00" → "2026 年 11 月 25 日（水） 9:00" */
export const formatDateTimeJa = (value: string) => {
  const [date, time = "0:00"] = value.split(" ");
  const [h, m] = time.split(":");
  return `${formatDateJa(date)} ${Number(h)}:${m}`;
};

/** "1901s" → "1901 年春"、"ready" → "開戦前夜" などのシーズン表示名 */
export const seasonLabel = (season: string) => {
  if (season === "ready") return "開戦前夜";
  if (season === "debrief") return "感想戦";
  const m = /^(\d{4})([sf])$/.exec(season);
  if (!m) return season;
  return `${m[1]} 年${m[2] === "s" ? "春" : "秋"}`;
};

/**
 * 終わった卓（Closed・Aborted）か。
 * Solo・Draw（一覧 API では Finished）は感想戦の最中なので、まだ終わっていない扱い
 */
export const isEnded = (game: Pick<GameDetail, "status">) =>
  game.status === "closed" || game.status === "aborted";
