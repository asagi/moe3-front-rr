import type { UnitKind } from "~/lib/board";
import {
  type GameDetail,
  type PhaseKind,
  POWER_LABELS,
  type PowerCode,
  formatDateTimeJa,
} from "~/lib/game";

// 命令画面で使う型と表示用の関数。
// API の形は依頼書（moe3-server-rust/issues/20261126-01-request-orders-api.md）の案に合わせている。
// サーバーの実装で名前が変わったら、ここを直す。

/** 命令の種類（GET /result の order_kind） */
export type OrderKind = "hold" | "move" | "support" | "convoy" | "retreat" | "build" | "disband";

/** 命令の解決結果（GET /result の status） */
export type OrderStatus =
  | "unresolved"
  | "success"
  | "failure"
  | "dislodged"
  | "cut"
  | "valid"
  | "invalid"
  | "unreachable";

/** 結果一覧に出す命令（GET /games/{uuid}/result/{season} の OrderEntry） */
export interface ResultOrder {
  /** 命令を出した国 */
  power: PowerCode;
  unit_kind: UnitKind;
  /** ユニットの位置（増設なら増設する場所） */
  location: string;
  order_kind: OrderKind;
  status: OrderStatus;
  /** 移動先・撤退先 */
  dest?: string;
  /** 支援・輸送の対象ユニットの位置 */
  target_location?: string;
  /** 支援・輸送の対象ユニットの移動先（維持の支援なら省略） */
  target_dest?: string;
  /** 海路移動か（移動のみ） */
  via_convoy?: boolean;
}

/** フェイズごとの結果（GET /result の PhaseResult）。進行中（open）は orders が空 */
export interface PhaseResult {
  status: "open" | "closed";
  orders: ResultOrder[];
}

/** シーズンの結果（GET /games/{uuid}/result/{season}） */
export interface SeasonResult {
  main_phase: PhaseResult;
  retreat_phase: PhaseResult | null;
  adjustment_phase: PhaseResult | null;
}

/** 国ごとの状況（GET /games/{uuid}/board の powers） */
export interface PowerStatus {
  power: PowerCode;
  supply_centers: number;
  armies: number;
  fleets: number;
  /** このフェイズで操作が必要か */
  needs_action: boolean;
  /** 即時進行に合意しているか。過去のシーズンは記録がないので null */
  progress_consented: boolean | null;
  /** 無政府状態か。過去のシーズンは記録がないので null */
  is_idle: boolean | null;
  is_eliminated: boolean;
}

export const ORDER_KIND_LABELS: Record<OrderKind, string> = {
  hold: "維持",
  move: "移動",
  support: "支援",
  convoy: "輸送",
  retreat: "撤退",
  build: "増設",
  disband: "解体",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  unresolved: "未解決",
  success: "成功",
  failure: "失敗",
  dislodged: "撃退",
  cut: "カット",
  valid: "有効",
  invalid: "無効",
  unreachable: "到達不能",
};

/** 成功とみなす結果（色分けに使う） */
export const isSuccessStatus = (status: OrderStatus) => status === "success" || status === "valid";

/** 地域コードの表示（"spa_nc" → "Spa (nc)"、"lon" → "Lon"） */
export const locationLabel = (location: string) => {
  const [base, coast] = location.split("_");
  const name = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  return coast ? `${name} (${coast.toLowerCase()})` : name;
};

/**
 * 命令の表記。
 * 例：「A Par → Bur」「A Lon → Hol（海路）」「F Nth 支援 Lon → Hol」「A Mun 支援 Boh 維持」
 *     「F Nth 輸送 Lon → Hol」「A Bur 撤退 → Pic」「F Bre 増設」「A War 解体」
 */
export const orderNotation = (
  order: Pick<
    ResultOrder,
    "unit_kind" | "location" | "order_kind" | "dest" | "target_location" | "target_dest" | "via_convoy"
  >,
) => {
  const unit = `${order.unit_kind.toUpperCase()} ${locationLabel(order.location)}`;
  const target = () =>
    order.target_location == null
      ? ""
      : order.target_dest == null
        ? `${locationLabel(order.target_location)} 維持`
        : `${locationLabel(order.target_location)} → ${locationLabel(order.target_dest)}`;
  switch (order.order_kind) {
    case "hold":
      return `${unit} 維持`;
    case "move":
      return `${unit} → ${order.dest ? locationLabel(order.dest) : "?"}${order.via_convoy ? "（海路）" : ""}`;
    case "support":
      return `${unit} 支援 ${target()}`;
    case "convoy":
      return `${unit} 輸送 ${target()}`;
    case "retreat":
      return `${unit} 撤退 → ${order.dest ? locationLabel(order.dest) : "?"}`;
    case "build":
      return `${unit} 増設`;
    case "disband":
      return `${unit} 解体`;
  }
};

/** 国の並び順（POWERS の順）で命令を並べる。同じ国の中は元の順 */
export const sortOrdersByPower = <T extends { power: PowerCode }>(orders: T[]) => {
  const rank = Object.keys(POWER_LABELS);
  return [...orders].sort((a, b) => rank.indexOf(a.power) - rank.indexOf(b.power));
};

/** システムメッセージ枠の文言を決めるための情報 */
export interface OrderSystemMessageInput {
  game: Pick<GameDetail, "status" | "phase_kind" | "next_update_at">;
  /** 現在のシーズンを見ているか（過去のシーズンなら false） */
  isLive: boolean;
  /**
   * 見ている人の国が、このフェイズで操作が必要か。
   * 参加者でない（第三者など）なら null
   */
  needsAction: boolean | null;
}

/** 撤退・調整フェイズの名前（メインフェイズなどは null） */
const subPhaseLabel = (phaseKind: PhaseKind) =>
  phaseKind === "retreat" ? "撤退フェイズ" : phaseKind === "adjustment" ? "調整フェイズ" : null;

/**
 * システムメッセージ枠の文言。出すものがなければ null。
 * - メインフェイズ：次回更新時刻
 * - 撤退・調整フェイズ：操作が必要な国には「何時までに操作してね」、ほかの国には「ほかの人を待ってね」
 */
export const orderSystemMessage = ({ game, isLive, needsAction }: OrderSystemMessageInput) => {
  if (!isLive || game.status !== "in_progress") return null;
  const deadline = game.next_update_at ? formatDateTimeJa(game.next_update_at) : null;
  const sub = subPhaseLabel(game.phase_kind);
  if (sub == null) {
    if (game.phase_kind !== "main") return null;
    return deadline ? `次回更新は ${deadline} です` : null;
  }
  if (needsAction === true) {
    return deadline
      ? `${sub}です。${deadline} までに命令を確定してください`
      : `${sub}です。命令を確定してください`;
  }
  if (needsAction === false) {
    return `${sub}です。あなたの国は操作がありません。ほかの国の操作が終わるまでお待ちください`;
  }
  return deadline ? `${sub}です。次回更新は ${deadline} です` : `${sub}です`;
};
