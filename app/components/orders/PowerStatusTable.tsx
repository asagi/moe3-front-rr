import { PowerImage } from "~/components/power-image/PowerImage";
import { POWERS, POWER_LABELS, type GameRegulation } from "~/lib/game";
import type { PowerStatus } from "~/lib/orders";
import styles from "./Orders.module.css";

export interface PowerStatusTableProps {
  faceType: GameRegulation["face_type"];
  /** 国ごとの状況。含まれていない国は出さない */
  powers: PowerStatus[];
  /** 即時進行の列を出すか（合意進行の卓だけ） */
  showProgress: boolean;
}

/** 即時進行の表示（○ / × / —） */
const progressMark = (status: PowerStatus) => {
  if (status.is_eliminated || status.progress_consented == null) return "—";
  return status.progress_consented ? "○" : "×";
};

const progressLabel = (status: PowerStatus) => {
  if (status.is_eliminated || status.progress_consented == null) return "記録なし";
  return status.progress_consented ? "合意" : "未合意";
};

/**
 * 7 か国の状況表（補給都市・陸軍・海軍・即時進行）。
 * 無政府状態の国は赤、滅亡した国はグレーにする
 */
export const PowerStatusTable = ({ faceType, powers, showProgress }: PowerStatusTableProps) => {
  const rows = POWERS.flatMap(({ code }) => powers.find((p) => p.power === code) ?? []);
  return (
    <table className={styles.statusTable}>
      <caption className="sr-only">各国の状況</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">国</span>
          </th>
          <th scope="col">補給都市</th>
          <th scope="col">陸軍</th>
          <th scope="col">海軍</th>
          {showProgress && <th scope="col">即時進行</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((status) => {
          const state = status.is_eliminated ? "eliminated" : status.is_idle ? "idle" : "normal";
          return (
            <tr key={status.power} className={styles.statusRow} data-state={state}>
              <th scope="row" className={styles.statusPower}>
                <PowerImage
                  faceType={faceType}
                  code={status.power}
                  size={40}
                  defeated={status.is_eliminated}
                />
                <span className="sr-only">
                  {POWER_LABELS[status.power]}
                  {status.is_eliminated ? "（滅亡）" : status.is_idle ? "（無政府）" : ""}
                </span>
              </th>
              <td>{status.supply_centers}</td>
              <td>{status.armies}</td>
              <td>{status.fleets}</td>
              {showProgress && (
                <td>
                  <span aria-hidden="true">{progressMark(status)}</span>
                  <span className="sr-only">{progressLabel(status)}</span>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
