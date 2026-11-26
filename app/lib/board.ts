import boardDefaults from "~/components/board/boardDefaults.json";
import type { Province } from "~/components/board/types";
import type { GameDetail, PowerCode } from "~/lib/game";
import type { PowerStatus } from "~/lib/orders";

/** ユニットの種類（a: 陸軍、f: 海軍） */
export type UnitKind = "a" | "f";

/** 盤面のユニット。location は地域コード（海岸が 2 つある地域の海軍は "spa_nc" など） */
export interface BoardUnit {
  power: PowerCode;
  kind: UnitKind;
  location: string;
}

/** GET /games/{uuid}/board のユニット（撤退フェイズの敗退の情報つき） */
export interface BoardSnapshotUnit extends BoardUnit {
  /** 敗退したユニットか（撤退フェイズでのみ true になりうる） */
  dislodged: boolean;
  /** 攻撃元の地域。敗退していない・海路で攻められたときは null */
  dislodged_from: string | null;
}

/** 地域の占領情報（補給都市でない陸地を含む。地図の色分けに使う） */
export interface BoardTerritory {
  power: PowerCode;
  code: string;
}

/** 盤面（GET /games/{uuid}/board）。シーズンを指定すればそのシーズンの最後のフェイズ */
export interface BoardSnapshot {
  /** 返したフェイズのシーズン（"ready" / "1901s" など） */
  season: string;
  phase_kind: GameDetail["phase_kind"];
  /** ユニット。撤退フェイズでは、敗退したユニットと攻めてきたユニットが同じ地域に並ぶ */
  units: BoardSnapshotUnit[];
  territories: BoardTerritory[];
  /** 国ごとの状況（7 か国、国コード順）。フェイズがない卓では空 */
  powers: PowerStatus[];
}

export const UNIT_KIND_LABELS: Record<UnitKind, string> = { a: "陸軍", f: "海軍" };

const PROVINCES = boardDefaults.provinces as Province[];

/** 地域コードのベース部分（"spa_nc" → "spa"） */
export const baseCode = (location: string) => location.split("_")[0];

/** 地図で選べる地域（海岸の区分 "spa_nc" などは除く） */
export const SELECTABLE_PROVINCES = PROVINCES.filter((p) => !p.code.includes("_"));

/** 地域（ベースコードで探す） */
export const findProvince = (code: string) =>
  PROVINCES.find((p) => p.code === baseCode(code)) ?? null;

/** 海岸が 2 つある地域の、海岸ごとの地域（スペインなら spa_nc と spa_sc）。ほかは空 */
export const coastsOf = (code: string) =>
  PROVINCES.filter((p) => p.code.startsWith(`${baseCode(code)}_`));

/** 海か */
export const isWater = (province: Province) => province.kind === "Water";

/** 内陸か（海軍を置けない） */
export const isInland = (province: Province) => province.kind === "Inland";

/**
 * 盤面を編集できるか。
 * 終わっていない卓の、開戦前夜かメインフェイズのときだけ（撤退・調整・感想戦は不可）
 */
export const isBoardEditable = (game: Pick<GameDetail, "status" | "phase_kind">) =>
  game.status !== "closed" &&
  game.status !== "aborted" &&
  (game.phase_kind === "ready" || game.phase_kind === "main");

/** 盤面を編集できないときの理由 */
export const boardNotEditableReason = (game: Pick<GameDetail, "status" | "phase_kind">) => {
  if (game.status === "closed" || game.status === "aborted") {
    return "終了した卓の盤面は編集できません";
  }
  switch (game.phase_kind) {
    case "retreat":
      return "撤退フェイズのあいだは盤面を編集できません";
    case "adjustment":
      return "調整フェイズのあいだは盤面を編集できません";
    case "debrief":
      return "感想戦では盤面を編集できません";
    default:
      return null;
  }
};

/** 国の英語の形容詞（ユニットの表記 "Russian F stp (sc)" に使う） */
export const POWER_ADJECTIVES: Record<PowerCode, string> = {
  a: "Austrian",
  e: "English",
  f: "French",
  g: "German",
  i: "Italian",
  r: "Russian",
  t: "Turkish",
};

/** ユニットの表記（"Russian F stp (sc)"、"French A par"） */
export const unitNotation = (unit: Pick<BoardUnit, "power" | "kind" | "location">) => {
  const [base, coast] = unit.location.split("_");
  return `${POWER_ADJECTIVES[unit.power]} ${unit.kind.toUpperCase()} ${base}${coast ? ` (${coast})` : ""}`;
};

/** 地域の名前（"St. Petersburg / サンクトペテルブルク"） */
export const provinceNames = (province: Province) => `${province.full} / ${province.jname}`;
