import { PowerImage } from "~/components/power-image/PowerImage";
import { POWER_LABELS, type GameRegulation } from "~/lib/game";
import type { PowerStatus } from "~/lib/orders";
import styles from "./Orders.module.css";

export interface PowerSummaryCardProps {
  faceType: GameRegulation["face_type"];
  /** 自国の状況 */
  status: Pick<PowerStatus, "power" | "supply_centers" | "armies" | "fleets" | "is_eliminated">;
}

/** 自国のまとめ（国の画像と、補給都市・陸軍・海軍の数） */
export const PowerSummaryCard = ({ faceType, status }: PowerSummaryCardProps) => (
  <section className={styles.summaryCard} aria-label={`${POWER_LABELS[status.power]}の状況`}>
    <PowerImage
      faceType={faceType}
      code={status.power}
      size={80}
      defeated={status.is_eliminated}
    />
    <dl className={styles.summaryList}>
      <dt>補給都市</dt>
      <dd>{status.supply_centers}</dd>
      <dt>陸軍</dt>
      <dd>{status.armies}</dd>
      <dt>海軍</dt>
      <dd>{status.fleets}</dd>
    </dl>
  </section>
);
