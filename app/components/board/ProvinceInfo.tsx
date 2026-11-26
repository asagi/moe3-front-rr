import type { ReactNode } from "react";
import type { Province } from "~/components/board/types";
import { type BoardUnit, unitNotation } from "~/lib/board";
import { POWER_LABELS, type PowerCode } from "~/lib/game";
import styles from "./ProvinceInfo.module.css";

/** 地域にいるユニット（撤退フェイズでは、敗退したユニットと攻めてきたユニットが並ぶ） */
export type ProvinceInfoUnit = BoardUnit & { dislodged?: boolean };

export interface ProvinceInfoProps {
  province: Province;
  /** 占領している国（なければ null） */
  owner: PowerCode | null;
  /** 駐留しているユニット（なければ空） */
  units: ProvinceInfoUnit[];
  /** 指定すると右上に「閉じる」を出す */
  onClose?: () => void;
  /** カードの下に並べる操作（命令画面の「命令を変更」など） */
  actions?: ReactNode;
}

/** 地図で選んだ地域の情報（地域コード・名前・占領国・駐留ユニット） */
export const ProvinceInfo = ({ province, owner, units, onClose, actions }: ProvinceInfoProps) => (
  <section className={styles.card} aria-live="polite" aria-label={`${province.jname}の情報`}>
    <header className={styles.header}>
      <h3 className={styles.title}>
        <span className={styles.code}>{province.code}</span>
        <span className={styles.jname}>{province.jname}</span>
      </h3>
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose}>
          閉じる
        </button>
      )}
    </header>
    <p className={styles.full}>{province.full}</p>
    <dl className={styles.facts}>
      <dt>占領</dt>
      <dd>{owner ? `${POWER_LABELS[owner]}領` : "なし"}</dd>
      <dt>駐留ユニット</dt>
      <dd>
        {units.length === 0 ? (
          "なし"
        ) : (
          <ul>
            {units.map((unit) => (
              <li key={`${unit.power}-${unit.location}-${unit.dislodged ? "d" : ""}`}>
                {unitNotation(unit)}
                {unit.dislodged && <span className={styles.dislodged}>敗退</span>}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </dl>
    {actions && <div className={styles.actions}>{actions}</div>}
  </section>
);
