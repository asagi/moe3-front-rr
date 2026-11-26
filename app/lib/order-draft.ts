import type { BoardUnit } from "~/lib/board";
import type { OrderInput, OrdersResponse, UnitOptions } from "~/lib/orders";

// 命令画面で、確定前の命令をブラウザの中で持つための関数。
// 「更新」を押すまでサーバーには送らず、「キャンセル」で createDraft の状態に戻す。
// 仮定命令（他国ユニットへの命令）は解決に使われず、支援・輸送の候補にも関係しないので扱わない。
// 確定すると命令が丸ごと置き換わるので、以前の仮定命令が残っていても消える。

/** 確定前の命令 */
export interface OrderDraft {
  /**
   * メイン・撤退フェイズの自国ユニットごとの命令（キーはユニットの位置）。
   * メインは自国の全ユニット、撤退は自国の敗退したユニット
   */
  units: Record<string, OrderInput>;
  /** 調整フェイズの増設命令 */
  builds: OrderInput[];
  /** 調整フェイズの解体命令（ちょうど disband_count 個） */
  disbands: OrderInput[];
}

/** 維持命令 */
const holdOf = (option: UnitOptions): OrderInput => ({
  unit_power: option.unit_power,
  unit_kind: option.unit_kind,
  location: option.location,
  order_kind: "hold",
});

/** 解体命令 */
export const disbandOf = (unit: Pick<BoardUnit, "power" | "kind" | "location">): OrderInput => ({
  unit_power: unit.power,
  unit_kind: unit.kind,
  location: unit.location,
  order_kind: "disband",
});

/** サーバーから受け取った命令から、確定前の命令の初期状態を作る */
export const createDraft = (res: OrdersResponse): OrderDraft => {
  const units: Record<string, OrderInput> = {};
  if (res.phase_kind !== "adjustment") {
    for (const option of res.options.filter((o) => o.unit_power === res.power)) {
      const current = res.orders.find((o) => o.location === option.location);
      // 命令がないユニット：メインは維持、撤退は解体
      units[option.location] =
        current ??
        (res.phase_kind === "main"
          ? holdOf(option)
          : disbandOf({ power: option.unit_power, kind: option.unit_kind, location: option.location }));
    }
  }
  return {
    units,
    builds: res.orders.filter((o) => o.order_kind === "build"),
    disbands: res.orders.filter((o) => o.order_kind === "disband" && res.phase_kind === "adjustment"),
  };
};

/** 確定前の命令から PUT /orders で送る命令を作る */
export const draftToOrders = (draft: OrderDraft, phaseKind: OrdersResponse["phase_kind"]) =>
  phaseKind === "adjustment" ? [...draft.builds, ...draft.disbands] : Object.values(draft.units);

/** 命令を比べるための文字列（フィールドの順番や省略の違いを吸収する） */
const orderKey = (o: OrderInput) =>
  [
    o.unit_power,
    o.unit_kind,
    o.location,
    o.order_kind,
    o.dest ?? "",
    o.target_location ?? "",
    o.target_dest ?? "",
    o.order_kind === "move" && o.via_convoy ? "c" : "",
  ].join("|");

/** 2 つの命令が同じか */
export const isSameOrder = (a: OrderInput, b: OrderInput) => orderKey(a) === orderKey(b);

/** 確定前の命令が、確定済みの命令から変わっているか */
export const isDraftDirty = (
  draft: OrderDraft,
  saved: OrderDraft,
  phaseKind: OrdersResponse["phase_kind"],
) => {
  const keys = (d: OrderDraft) => draftToOrders(d, phaseKind).map(orderKey).sort().join("\n");
  return keys(draft) !== keys(saved);
};

/** 変わったユニットの位置（一覧に「変更あり」の印を付けるため） */
export const changedLocations = (draft: OrderDraft, saved: OrderDraft) =>
  new Set(
    Object.entries(draft.units)
      .filter(([location, order]) => {
        const before = saved.units[location];
        return before == null || !isSameOrder(order, before);
      })
      .map(([location]) => location),
  );
