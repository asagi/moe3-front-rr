import boardDefaults from "~/components/board/boardDefaults.json";
import type { BoardUnit } from "~/lib/board";
import type { OrdersResponse } from "~/lib/orders";

/** 1901 年春の初期配置 */
export const initialUnits = boardDefaults.initialUnits as BoardUnit[];

/** メインフェイズ（フランス・1901 年春）。候補は一部のユニットだけ。サーバーは他国ユニットの候補と仮定命令も返す */
export const mainResponse: OrdersResponse = {
  season: "1901s",
  phase_kind: "main",
  power: "f",
  needs_action: true,
  orders: [
    { unit_power: "f", unit_kind: "a", location: "par", order_kind: "move", dest: "bur", via_convoy: false },
    { unit_power: "f", unit_kind: "a", location: "mar", order_kind: "support", target_location: "par", target_dest: "bur" },
    { unit_power: "f", unit_kind: "f", location: "bre", order_kind: "hold" },
    { unit_power: "g", unit_kind: "a", location: "mun", order_kind: "move", dest: "bur", via_convoy: false },
  ],
  options: [
    { unit_power: "e", unit_kind: "f", location: "lon", move_dests: ["eng", "nth", "wal", "yor"], convoy_dests: [], support_targets: [], convoy_targets: [] },
    {
      unit_power: "f", unit_kind: "f", location: "bre",
      move_dests: ["eng", "gas", "mao", "pic"], convoy_dests: [],
      support_targets: [{ target_location: "par", target_dests: [null, "gas", "pic"] }],
      convoy_targets: [],
    },
    {
      unit_power: "f", unit_kind: "a", location: "mar",
      move_dests: ["bur", "gas", "pie", "spa"], convoy_dests: ["spa", "pie", "tus", "naf"],
      support_targets: [
        { target_location: "par", target_dests: [null, "bur", "gas"] },
        { target_location: "mun", target_dests: ["bur"] },
      ],
      convoy_targets: [],
    },
    {
      unit_power: "f", unit_kind: "a", location: "par",
      move_dests: ["bre", "bur", "gas", "pic"], convoy_dests: [],
      support_targets: [{ target_location: "mar", target_dests: [null, "bur", "gas"] }],
      convoy_targets: [],
    },
    { unit_power: "g", unit_kind: "a", location: "mun", move_dests: ["ber", "boh", "bur", "kie", "ruh", "sil", "tyr"], convoy_dests: [], support_targets: [], convoy_targets: [] },
    { unit_power: "r", unit_kind: "f", location: "stp_sc", move_dests: ["bot", "fin", "lvn"], convoy_dests: [], support_targets: [], convoy_targets: [] },
  ],
  adjustment: null,
};

/** 撤退フェイズ（フランスのブルゴーニュの陸軍がミュンヘンから攻められて敗退した） */
export const retreatResponse: OrdersResponse = {
  season: "1901s",
  phase_kind: "retreat",
  power: "f",
  needs_action: true,
  orders: [{ unit_power: "f", unit_kind: "a", location: "bur", order_kind: "disband" }],
  options: [{ unit_power: "f", unit_kind: "a", location: "bur", retreat_dests: ["bel", "gas", "pic", "ruh"] }],
  adjustment: null,
};

/** 撤退フェイズの盤面のユニット（敗退したユニットと攻めてきたユニットが同じ地域に並ぶ） */
export const retreatUnits: BoardUnit[] = [
  { power: "f", kind: "a", location: "bur" },
  { power: "g", kind: "a", location: "bur" },
  { power: "f", kind: "a", location: "mar" },
];

/** 調整フェイズ（ロシア・増設 2） */
export const buildResponse: OrdersResponse = {
  season: "1901f",
  phase_kind: "adjustment",
  power: "r",
  needs_action: true,
  orders: [],
  options: [],
  adjustment: {
    build_count: 2,
    disband_count: 0,
    buildable: [
      { location: "mos", unit_kinds: ["a"] },
      { location: "sev", unit_kinds: ["a", "f"] },
      { location: "stp", unit_kinds: ["a"] },
      { location: "stp_nc", unit_kinds: ["f"] },
      { location: "stp_sc", unit_kinds: ["f"] },
    ],
  },
};

/** 調整フェイズ（オーストリア・解体 1。サーバーが自動で選んだ解体が入っている） */
export const disbandResponse: OrdersResponse = {
  season: "1901f",
  phase_kind: "adjustment",
  power: "a",
  needs_action: true,
  orders: [{ unit_power: "a", unit_kind: "f", location: "tri", order_kind: "disband" }],
  options: [],
  adjustment: { build_count: 0, disband_count: 1, buildable: [] },
};
