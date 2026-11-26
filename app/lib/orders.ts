import { type UnitKind, findProvince } from "~/lib/board";
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
  dislodged: "敗退",
  cut: "カット",
  // 調整フェイズの命令のほか、メインフェイズでカットも敗退もされずに働いた支援・輸送にも使う
  valid: "有効",
  invalid: "無効",
  unreachable: "到達不能",
};

/**
 * 結果一覧に出す結果。
 * 解体（撤退・調整）と増設は失敗しようがない（候補にない命令はサーバーが受け付けず、
 * 調整フェイズのあいだは盤面も変わらない）ので、成功として出す。
 * サーバーは撤退フェイズの解体を「未解決」のまま、調整フェイズの命令を「有効」で返す。
 * 「無効」が返ってきたときだけは、そのまま出す
 */
export const displayStatus = (order: Pick<ResultOrder, "order_kind" | "status">): OrderStatus =>
  (order.order_kind === "disband" || order.order_kind === "build") &&
  (order.status === "unresolved" || order.status === "valid")
    ? "success"
    : order.status;

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

/* ---- 命令の取得・確定（GET / PUT /games/{uuid}/orders） ---- */

/**
 * 命令（GET /orders の OrderEntry、PUT /orders の Order）。
 * unit_power が担当国と違えば仮定命令
 */
export interface OrderInput {
  /** 命令の対象ユニットの国 */
  unit_power: PowerCode;
  unit_kind: UnitKind;
  /** 対象ユニットの位置（増設は増設先） */
  location: string;
  order_kind: OrderKind;
  dest?: string;
  target_location?: string;
  target_dest?: string;
  via_convoy?: boolean;
}

/** 支援できるユニットと支援先（null は維持の支援） */
export interface SupportTarget {
  target_location: string;
  target_dests: (string | null)[];
}

/** 輸送できる陸軍と移動先 */
export interface ConvoyTarget {
  target_location: string;
  target_dests: string[];
}

/** ユニットごとの命令の候補（フェイズに関係しないフィールドは省略される） */
export interface UnitOptions {
  unit_power: PowerCode;
  unit_kind: UnitKind;
  location: string;
  /** 陸路（海軍は海路）で移動できる地域（メイン） */
  move_dests?: string[];
  /** 海路移動できる海岸（メイン。海軍と内陸の陸軍は空） */
  convoy_dests?: string[];
  support_targets?: SupportTarget[];
  /** 輸送できる陸軍（メイン。海にいる海軍だけ） */
  convoy_targets?: ConvoyTarget[];
  /** 撤退できる地域（撤退） */
  retreat_dests?: string[];
}

/** 調整フェイズの候補 */
export interface AdjustmentOptions {
  /** 増設できる最大数 */
  build_count: number;
  /** 解体しなければならない数（自国ユニットならどれでも選べる） */
  disband_count: number;
  /** 増設できる場所と種類（海岸が複数ある地域は海岸ごと） */
  buildable: { location: string; unit_kinds: UnitKind[] }[];
}

/** 命令を出すフェイズ */
export type OrderPhaseKind = "main" | "retreat" | "adjustment";

/** GET /games/{uuid}/orders（PUT の成功レスポンスも同じ形） */
export interface OrdersResponse {
  season: string;
  phase_kind: OrderPhaseKind;
  /** 担当国 */
  power: PowerCode;
  /** このフェイズで操作が必要か（false なら確定できない） */
  needs_action: boolean;
  /** 今出している命令（自国ユニットへの命令と、メインでは自分の仮定命令） */
  orders: OrderInput[];
  /** 命令を出せるユニットごとの候補（メイン：全ユニット、撤退：自国の敗退したユニット、調整：空） */
  options: UnitOptions[];
  adjustment: AdjustmentOptions | null;
}

/** PUT /games/{uuid}/orders のリクエスト */
export interface PutOrdersBody {
  season: string;
  phase_kind: OrderPhaseKind;
  orders: OrderInput[];
}

/** 地域コードの表示に日本語名を添えたもの（"Bur（ブルゴーニュ）"） */
export const locationOptionLabel = (location: string) => {
  const province = findProvince(location);
  return province ? `${locationLabel(location)}（${province.jname}）` : locationLabel(location);
};
