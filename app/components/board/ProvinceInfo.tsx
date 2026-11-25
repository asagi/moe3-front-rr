import type { Province } from "~/components/board/types";
import { type BoardUnit, provinceNames, unitNotation } from "~/lib/board";
import { POWER_LABELS, type PowerCode } from "~/lib/game";
import styles from "./ProvinceInfo.module.css";

export interface ProvinceInfoProps {
  province: Province;
  /** 占領している国（なければ null） */
  owner: PowerCode | null;
  /** 駐留しているユニット（なければ null） */
  unit: BoardUnit | null;
}

/** 地図で選んだ地域の情報（地域コード・占領国・名前・駐留ユニット） */
export const ProvinceInfo = ({ province, owner, unit }: ProvinceInfoProps) => (
  <section className={styles.card} aria-live="polite" aria-label={`${province.jname}の情報`}>
    <h3 className={styles.title}>
      <span className={styles.code}>{province.code}</span>
      {owner && <span className={styles.owner}>（{POWER_LABELS[owner]}領）</span>}
    </h3>
    <p className={styles.names}>{provinceNames(province)}</p>
    <p className={styles.unit}>
      駐留ユニット： {unit ? unitNotation(unit) : "なし"}
    </p>
  </section>
);
