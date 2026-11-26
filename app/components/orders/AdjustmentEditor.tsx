import { type BoardUnit, UNIT_KIND_LABELS, baseCode } from "~/lib/board";
import type { PowerCode } from "~/lib/game";
import { disbandOf } from "~/lib/order-draft";
import {
  type AdjustmentOptions,
  type OrderInput,
  locationLabel,
  locationOptionLabel,
} from "~/lib/orders";
import styles from "./OrderEditor.module.css";

export interface AdjustmentEditorProps {
  power: PowerCode;
  adjustment: AdjustmentOptions;
  /** 自国のユニット（解体の選択肢） */
  myUnits: BoardUnit[];
  builds: OrderInput[];
  disbands: OrderInput[];
  onChange: (next: { builds: OrderInput[]; disbands: OrderInput[] }) => void;
}

/** ユニットの表示（"A Par"） */
const unitText = (unit: Pick<BoardUnit, "kind" | "location">) =>
  `${unit.kind.toUpperCase()} ${locationLabel(unit.location)}`;

/** 増設の選択肢の値（"bre:f"） */
const buildValue = (location: string, kind: string) => `${location}:${kind}`;

/**
 * 調整フェイズの命令。
 * - 増設：n/m を出し、m 個まで追加できる。同じ地域（海岸違いを含む）には 1 つまで
 * - 解体：ちょうど m 個。減らせないので、どのユニットを解体するかの差し替えだけできる
 */
export const AdjustmentEditor = ({
  power,
  adjustment,
  myUnits,
  builds,
  disbands,
  onChange,
}: AdjustmentEditorProps) => {
  // 増設の選択肢（場所 × 種類）
  const buildChoices = adjustment.buildable.flatMap((b) =>
    b.unit_kinds.map((kind) => ({
      value: buildValue(b.location, kind),
      label: `${UNIT_KIND_LABELS[kind]} ${locationOptionLabel(b.location)}`,
      location: b.location,
      kind,
    })),
  );
  // ほかの増設命令が使っている地域（同じ地域には 1 つまで）
  const usedBy = (index: number) =>
    new Set(builds.filter((_, i) => i !== index).map((b) => baseCode(b.location)));
  const toBuild = (value: string): OrderInput => {
    const choice = buildChoices.find((c) => c.value === value);
    return {
      unit_power: power,
      unit_kind: choice?.kind ?? "a",
      location: choice?.location ?? "",
      order_kind: "build",
    };
  };
  const freeChoices = (index: number) => buildChoices.filter((c) => !usedBy(index).has(baseCode(c.location)));

  return (
    <div className={styles.adjustment}>
      {adjustment.build_count > 0 && (
        <section className={styles.list} aria-label="増設命令">
          <h3 className={styles.listTitle}>
            増設命令（{builds.length}/{adjustment.build_count}）
          </h3>
          <ul className={styles.rows}>
            {builds.map((build, i) => (
              <li key={i} className={styles.adjustRow}>
                <label className={styles.field}>
                  <span className="sr-only">増設 {i + 1}</span>
                  <select
                    className={styles.select}
                    value={buildValue(build.location, build.unit_kind)}
                    onChange={(e) =>
                      onChange({
                        builds: builds.map((b, j) => (j === i ? toBuild(e.target.value) : b)),
                        disbands,
                      })
                    }
                  >
                    {freeChoices(i).map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => onChange({ builds: builds.filter((_, j) => j !== i), disbands })}
                >
                  取り消し
                </button>
              </li>
            ))}
          </ul>
          {builds.length < adjustment.build_count && freeChoices(-1).length > 0 && (
            <button
              type="button"
              className={styles.addButton}
              onClick={() =>
                onChange({ builds: [...builds, toBuild(freeChoices(-1)[0].value)], disbands })
              }
            >
              ＋ 増設を追加
            </button>
          )}
          {buildChoices.length === 0 && (
            <p className={styles.note}>空いている本国の補給都市がないので、増設できません</p>
          )}
        </section>
      )}

      {adjustment.disband_count > 0 && (
        <section className={styles.list} aria-label="解体命令">
          <h3 className={styles.listTitle}>
            解体命令（{disbands.length}/{adjustment.disband_count}）
          </h3>
          <ul className={styles.rows}>
            {disbands.map((disband, i) => {
              // ほかの解体命令で選んでいるユニットは選べない
              const taken = new Set(disbands.filter((_, j) => j !== i).map((d) => d.location));
              return (
                <li key={i} className={styles.adjustRow}>
                  <label className={styles.field}>
                    <span className="sr-only">解体 {i + 1}</span>
                    <select
                      className={styles.select}
                      value={disband.location}
                      onChange={(e) => {
                        const unit = myUnits.find((u) => u.location === e.target.value);
                        if (!unit) return;
                        onChange({
                          builds,
                          disbands: disbands.map((d, j) => (j === i ? disbandOf(unit) : d)),
                        });
                      }}
                    >
                      {myUnits
                        .filter((u) => !taken.has(u.location))
                        .map((u) => (
                          <option key={u.location} value={u.location}>
                            {unitText(u)}
                          </option>
                        ))}
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className={styles.note}>解体する数は減らせません。どのユニットを解体するかを選び直せます</p>
        </section>
      )}
    </div>
  );
};
