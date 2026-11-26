import { useId } from "react";
import { type BoardUnit, baseCode } from "~/lib/board";
import { POWER_LABELS } from "~/lib/game";
import {
  type OrderInput,
  type OrderPhaseKind,
  type UnitOptions,
  locationLabel,
  locationOptionLabel,
} from "~/lib/orders";
import styles from "./OrderEditor.module.css";

export interface UnitOrderEditorProps {
  phaseKind: Exclude<OrderPhaseKind, "adjustment">;
  /** 命令を出すユニットの候補 */
  option: UnitOptions;
  /** 今の命令 */
  order: OrderInput;
  /** 盤面のユニット（支援・輸送の対象ユニットの表示に使う） */
  units: BoardUnit[];
  onChange: (order: OrderInput) => void;
}

/** 命令の種類の選択肢（海路移動は移動と分けて出す） */
type Choice = "hold" | "move" | "convoy_move" | "support" | "convoy" | "retreat" | "disband";

const CHOICE_LABELS: Record<Choice, string> = {
  hold: "維持",
  move: "移動",
  convoy_move: "海路移動",
  support: "支援",
  convoy: "輸送",
  retreat: "撤退",
  disband: "解体",
};

/** そのユニットが選べる命令の種類 */
const choicesOf = (phaseKind: UnitOrderEditorProps["phaseKind"], option: UnitOptions): Choice[] => {
  if (phaseKind === "retreat") {
    return option.retreat_dests?.length ? ["retreat", "disband"] : ["disband"];
  }
  const choices: Choice[] = ["hold"];
  if (option.move_dests?.length) choices.push("move");
  if (option.convoy_dests?.length) choices.push("convoy_move");
  if (option.support_targets?.length) choices.push("support");
  if (option.convoy_targets?.length) choices.push("convoy");
  return choices;
};

const choiceOf = (order: OrderInput): Choice =>
  order.order_kind === "move" && order.via_convoy ? "convoy_move" : (order.order_kind as Choice);

/** 命令の種類を切り替えたときの命令（行き先などは候補の先頭にする） */
const orderFor = (choice: Choice, option: UnitOptions): OrderInput => {
  const base = { unit_power: option.unit_power, unit_kind: option.unit_kind, location: option.location };
  switch (choice) {
    case "move":
      return { ...base, order_kind: "move", dest: option.move_dests?.[0], via_convoy: false };
    case "convoy_move":
      return { ...base, order_kind: "move", dest: option.convoy_dests?.[0], via_convoy: true };
    case "support": {
      const target = option.support_targets?.[0];
      return withTargetDest({ ...base, order_kind: "support", target_location: target?.target_location }, target?.target_dests[0] ?? null);
    }
    case "convoy": {
      const target = option.convoy_targets?.[0];
      return { ...base, order_kind: "convoy", target_location: target?.target_location, target_dest: target?.target_dests[0] };
    }
    case "retreat":
      return { ...base, order_kind: "retreat", dest: option.retreat_dests?.[0] };
    default:
      return { ...base, order_kind: choice };
  }
};

/** 支援先を付ける（null なら維持の支援なので target_dest を付けない） */
const withTargetDest = (order: OrderInput, dest: string | null): OrderInput => {
  const { target_dest: _, ...rest } = order;
  return dest == null ? rest : { ...rest, target_dest: dest };
};

/** 対象ユニットの表示（"A Par（フランス）"） */
const unitLabel = (units: BoardUnit[], location: string) => {
  const unit =
    units.find((u) => u.location === location) ??
    units.find((u) => baseCode(u.location) === baseCode(location));
  return unit
    ? `${unit.kind.toUpperCase()} ${locationLabel(location)}（${POWER_LABELS[unit.power]}）`
    : locationLabel(location);
};

/** 1 つのユニットへの命令を選ぶフォーム（命令の種類と、行き先・対象） */
export const UnitOrderEditor = ({ phaseKind, option, order, units, onChange }: UnitOrderEditorProps) => {
  const id = useId();
  const choice = choiceOf(order);
  const choices = choicesOf(phaseKind, option);

  const supportTarget = option.support_targets?.find((t) => t.target_location === order.target_location);
  const convoyTarget = option.convoy_targets?.find((t) => t.target_location === order.target_location);

  return (
    <div className={styles.editor}>
      <fieldset className={styles.choices}>
        <legend className="sr-only">命令の種類</legend>
        {choices.map((c) => (
          <label key={c} className={styles.choice}>
            <input
              type="radio"
              name={`${id}-kind`}
              value={c}
              checked={c === choice}
              onChange={() => onChange(orderFor(c, option))}
            />
            <span>{CHOICE_LABELS[c]}</span>
          </label>
        ))}
      </fieldset>

      {choice === "move" && (
        <Select
          label="移動先"
          value={order.dest ?? ""}
          options={(option.move_dests ?? []).map((d) => ({ value: d, label: locationOptionLabel(d) }))}
          onChange={(dest) => onChange({ ...order, dest })}
        />
      )}
      {choice === "convoy_move" && (
        <Select
          label="移動先（海路）"
          value={order.dest ?? ""}
          options={(option.convoy_dests ?? []).map((d) => ({ value: d, label: locationOptionLabel(d) }))}
          onChange={(dest) => onChange({ ...order, dest })}
        />
      )}
      {choice === "retreat" && (
        <Select
          label="撤退先"
          value={order.dest ?? ""}
          options={(option.retreat_dests ?? []).map((d) => ({ value: d, label: locationOptionLabel(d) }))}
          onChange={(dest) => onChange({ ...order, dest })}
        />
      )}
      {choice === "support" && (
        <>
          <Select
            label="支援するユニット"
            value={order.target_location ?? ""}
            options={(option.support_targets ?? []).map((t) => ({
              value: t.target_location,
              label: unitLabel(units, t.target_location),
            }))}
            onChange={(target) => {
              const next = option.support_targets?.find((t) => t.target_location === target);
              onChange(withTargetDest({ ...order, target_location: target }, next?.target_dests[0] ?? null));
            }}
          />
          <Select
            label="支援の内容"
            value={order.target_dest ?? ""}
            options={(supportTarget?.target_dests ?? []).map((d) => ({
              value: d ?? "",
              label: d == null ? "その場で維持" : `${locationOptionLabel(d)} へ移動`,
            }))}
            onChange={(dest) => onChange(withTargetDest(order, dest === "" ? null : dest))}
          />
        </>
      )}
      {choice === "convoy" && (
        <>
          <Select
            label="輸送する陸軍"
            value={order.target_location ?? ""}
            options={(option.convoy_targets ?? []).map((t) => ({
              value: t.target_location,
              label: unitLabel(units, t.target_location),
            }))}
            onChange={(target) => {
              const next = option.convoy_targets?.find((t) => t.target_location === target);
              onChange({ ...order, target_location: target, target_dest: next?.target_dests[0] });
            }}
          />
          <Select
            label="輸送先"
            value={order.target_dest ?? ""}
            options={(convoyTarget?.target_dests ?? []).map((d) => ({ value: d, label: locationOptionLabel(d) }))}
            onChange={(dest) => onChange({ ...order, target_dest: dest })}
          />
        </>
      )}
    </div>
  );
};

const Select = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => (
  <label className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);
