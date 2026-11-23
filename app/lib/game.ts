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
 * 国の画像 URL。code が null なら「国未定」の画像を返す
 * @param size 60 または 100（px）
 */
export const powerImageUrl = (
  faceType: GameRegulation["face_type"],
  code: PowerCode | null,
  size: 60 | 100 = 60,
) =>
  `/images/power/${faceType === "girls" ? "girl" : "flag"}/pl${code ?? "x"}${size}.png`;
