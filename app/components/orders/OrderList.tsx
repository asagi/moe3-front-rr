import { PowerImage } from "~/components/power-image/PowerImage";
import type { BoardUnit } from "~/lib/board";
import { POWER_LABELS, type GameRegulation } from "~/lib/game";
import { type OrderInput, type OrderPhaseKind, type UnitOptions, orderNotation } from "~/lib/orders";
import styles from "./OrderEditor.module.css";
import { UnitOrderEditor } from "./UnitOrderEditor";

export interface OrderListItem {
  option: UnitOptions;
  order: OrderInput;
}

export interface OrderListProps {
  /** 見出し（「自軍ユニットへの命令」など） */
  title: string;
  faceType: GameRegulation["face_type"];
  phaseKind: Exclude<OrderPhaseKind, "adjustment">;
  items: OrderListItem[];
  /** 盤面のユニット（支援・輸送の対象ユニットの表示に使う） */
  units: BoardUnit[];
  /** 編集フォームを開いているユニットの位置（地図でユニットを選んだときも開く） */
  openLocation: string | null;
  onOpenChange: (location: string | null) => void;
  /** 確定済みから変わったユニットの位置 */
  changed: Set<string>;
  onChange: (order: OrderInput) => void;
}

/** ユニットごとの命令の一覧。「変更」を押すと、その行の下に命令を選ぶフォームを開く */
export const OrderList = ({
  title,
  faceType,
  phaseKind,
  items,
  units,
  openLocation,
  onOpenChange,
  changed,
  onChange,
}: OrderListProps) => (
  <section className={styles.list} aria-label={title}>
    <h3 className={styles.listTitle}>{title}</h3>
    <ul className={styles.rows}>
      {items.map(({ option, order }) => {
        const open = openLocation === option.location;
        const editorId = `order-editor-${option.location}`;
        return (
          <li key={option.location} className={styles.row} data-open={open}>
            <div className={styles.rowHead}>
              <PowerImage faceType={faceType} code={option.unit_power} size={24} />
              <span className="sr-only">{POWER_LABELS[option.unit_power]}</span>
              <span className={styles.notation}>{orderNotation(order)}</span>
              {changed.has(option.location) && <span className={styles.changed}>未確定</span>}
              <button
                type="button"
                className={styles.editButton}
                aria-expanded={open}
                aria-controls={editorId}
                onClick={() => onOpenChange(open ? null : option.location)}
              >
                {open ? "閉じる" : "変更"}
              </button>
            </div>
            {open && (
              <div id={editorId}>
                <UnitOrderEditor
                  phaseKind={phaseKind}
                  option={option}
                  order={order}
                  units={units}
                  onChange={onChange}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  </section>
);
