import { useEffect, useId, useState } from "react";
import type { Province } from "~/components/board/types";
import {
  type BoardUnit,
  type UnitKind,
  UNIT_KIND_LABELS,
  coastsOf,
  isInland,
  isWater,
} from "~/lib/board";
import { POWERS, POWER_LABELS, type PowerCode } from "~/lib/game";
import styles from "./BoardEdit.module.css";

/** 保存する内容（その地域のユニットと占領国。null は「なし」） */
export interface BoardEditValue {
  unit: BoardUnit | null;
  territory: PowerCode | null;
}

export interface BoardEditPanelProps {
  province: Province;
  /** 今その地域にあるユニット */
  unit: BoardUnit | null;
  /** 今の占領国 */
  territory: PowerCode | null;
  submitting?: boolean;
  error?: string | null;
  onSave: (value: BoardEditValue) => void;
  onClose: () => void;
}

/** 地図で選んだ地域の、ユニットと占領国を編集するパネル */
export const BoardEditPanel = ({
  province,
  unit,
  territory,
  submitting = false,
  error,
  onSave,
  onClose,
}: BoardEditPanelProps) => {
  const id = useId();
  const water = isWater(province);
  const coasts = coastsOf(province.code);

  const [kind, setKind] = useState<UnitKind | "none">(unit?.kind ?? "none");
  const [unitPower, setUnitPower] = useState<PowerCode>(unit?.power ?? territory ?? "a");
  const [coast, setCoast] = useState<string>(
    unit?.location.includes("_") ? unit.location : (coasts[0]?.code ?? ""),
  );
  const [owner, setOwner] = useState<PowerCode | "none">(territory ?? "none");

  // 別の地域を選んだり、保存して盤面が変わったりしたら、今の状態に戻す
  useEffect(() => {
    setKind(unit?.kind ?? "none");
    setUnitPower(unit?.power ?? territory ?? "a");
    setCoast(unit?.location.includes("_") ? unit.location : (coasts[0]?.code ?? ""));
    setOwner(territory ?? "none");
    // coasts は province から決まる
  }, [province.code, unit, territory]);

  const nextUnit: BoardUnit | null =
    kind === "none"
      ? null
      : {
          power: unitPower,
          kind,
          // 海岸が 2 つある地域の海軍は海岸を指定する。陸軍はベースのコード
          location: kind === "f" && coasts.length > 0 ? coast : province.code,
        };
  const nextTerritory = water || owner === "none" ? null : owner;

  const unitChanged =
    (unit == null) !== (nextUnit == null) ||
    (unit != null &&
      nextUnit != null &&
      (unit.kind !== nextUnit.kind ||
        unit.power !== nextUnit.power ||
        unit.location !== nextUnit.location));
  const territoryChanged = !water && (territory ?? null) !== nextTerritory;
  const changed = unitChanged || territoryChanged;

  const save = () => {
    // 消すときだけ確認する
    const removals = [
      unit && !nextUnit ? `${POWER_LABELS[unit.power]}の${UNIT_KIND_LABELS[unit.kind]}` : null,
      territory && !nextTerritory && !water ? `${POWER_LABELS[territory]}の占領` : null,
    ].filter(Boolean);
    if (
      removals.length > 0 &&
      !window.confirm(`${province.jname}の${removals.join("と")}を消します。よろしいですか？`)
    ) {
      return;
    }
    onSave({ unit: nextUnit, territory: water ? territory : nextTerritory });
  };

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <div className={styles.panelHead}>
        <h3 id={`${id}-title`}>{province.jname}</h3>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          閉じる
        </button>
      </div>

      <fieldset className={styles.field} disabled={submitting}>
        <legend>ユニット</legend>
        <div className={styles.choices}>
          {(["none", "a", "f"] as const).map((k) => {
            // 陸軍は海に、海軍は内陸に置けない
            const impossible = (k === "a" && water) || (k === "f" && isInland(province));
            return (
              <label key={k} className={styles.choice}>
                <input
                  type="radio"
                  name={`${id}-kind`}
                  checked={kind === k}
                  disabled={impossible}
                  onChange={() => setKind(k)}
                />
                {k === "none" ? "なし" : UNIT_KIND_LABELS[k]}
              </label>
            );
          })}
        </div>
        {kind !== "none" && (
          <div className={styles.row}>
            <label htmlFor={`${id}-unit-power`}>国</label>
            <select
              id={`${id}-unit-power`}
              value={unitPower}
              onChange={(e) => setUnitPower(e.target.value as PowerCode)}
            >
              {POWERS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {kind === "f" && coasts.length > 0 && (
          <div className={styles.row}>
            <label htmlFor={`${id}-coast`}>海岸</label>
            <select id={`${id}-coast`} value={coast} onChange={(e) => setCoast(e.target.value)}>
              {coasts.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.jname}
                </option>
              ))}
            </select>
          </div>
        )}
      </fieldset>

      {!water && (
        <fieldset className={styles.field} disabled={submitting}>
          <legend>占領</legend>
          <div className={styles.row}>
            <label htmlFor={`${id}-owner`} className="sr-only">
              占領している国
            </label>
            <select
              id={`${id}-owner`}
              value={owner}
              onChange={(e) => setOwner(e.target.value as PowerCode | "none")}
            >
              <option value="none">なし</option>
              {POWERS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.saveButton}
          disabled={!changed || submitting}
          onClick={save}
        >
          {submitting ? "保存中…" : "保存"}
        </button>
      </div>
    </section>
  );
};
