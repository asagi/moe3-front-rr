import { PowerImage } from "~/components/power-image/PowerImage";
import { POWER_LABELS, type GameRegulation } from "~/lib/game";
import {
  ORDER_STATUS_LABELS,
  type PhaseResult,
  displayStatus,
  isSuccessStatus,
  orderNotation,
  sortOrdersByPower,
} from "~/lib/orders";
import styles from "./Orders.module.css";

export interface OrderResultListProps {
  /** 見出し（「全軍の行軍命令結果」など） */
  title: string;
  faceType: GameRegulation["face_type"];
  /** フェイズの結果。進行中（open）なら命令の代わりに「—」を出す */
  result: PhaseResult;
}

/** 全軍の命令と、それぞれ成功したか失敗したかの一覧（表示専用） */
export const OrderResultList = ({ title, faceType, result }: OrderResultListProps) => {
  const orders = result.status === "open" ? [] : sortOrdersByPower(result.orders);
  return (
    <section className={styles.panel} aria-label={title}>
      <h3 className={styles.panelTitle}>{title}</h3>
      {orders.length === 0 ? (
        <p className={styles.panelEmpty}>
          {result.status === "open" ? "—" : "命令はありません"}
        </p>
      ) : (
        <ul className={styles.resultList}>
          {orders.map((order, i) => (
            <li key={`${order.power}-${order.location}-${i}`} className={styles.resultItem}>
              <PowerImage faceType={faceType} code={order.power} size={24} />
              <span className="sr-only">{POWER_LABELS[order.power]}</span>
              <span className={styles.resultNotation}>{orderNotation(order)}</span>
              <span
                className={styles.resultStatus}
                data-success={isSuccessStatus(displayStatus(order))}
              >
                {ORDER_STATUS_LABELS[displayStatus(order)]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
