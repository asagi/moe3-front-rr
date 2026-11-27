import { useEffect, useState } from "react";
import { PowerImage } from "~/components/power-image/PowerImage";
import { POWERS, POWER_LABELS, type GameRegulation } from "~/lib/game";
import { type PowerStatus, formatAbsentMinutes } from "~/lib/orders";
import styles from "./Orders.module.css";

export interface PowerStatusTableProps {
  faceType: GameRegulation["face_type"];
  /** 国ごとの状況。含まれていない国は出さない */
  powers: PowerStatus[];
  /** 即時進行の列を出すか（合意進行の卓だけ） */
  showProgress: boolean;
  /**
   * 無政府と判定されるまでの時間（分）。不在時間の表示はこれより手前で止める。
   * null なら不在時間の列を出さない（進行中の卓の現在のシーズン以外）
   */
  idleLimitMinutes: number | null;
}

/**
 * データを受け取ってから何分たったか。1 分ごとに数え進める（10 秒おきに確かめる）。
 * key が変わったら（読み直したら）0 に戻す
 */
const useMinutesSince = (key: unknown) => {
  const [since, setSince] = useState(() => Date.now());
  const [now, setNow] = useState(since);
  useEffect(() => {
    const start = Date.now();
    setSince(start);
    setNow(start);
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [key]);
  return Math.max(0, Math.floor((now - since) / 60_000));
};

/**
 * 不在時間の表示（12分 / 3時間 / 無政府 / —）。
 * 無政府かどうかはサーバーの判定（is_idle）に従う。数え進めて放置上限時間に届いても、
 * サーバーが無政府と判定するまでは上限の手前の表示で止める
 */
const absentText = (status: PowerStatus, elapsed: number, limit: number) => {
  if (status.is_eliminated) return "—";
  if (status.is_idle) return "無政府";
  if (status.absent_minutes == null) return "—";
  return formatAbsentMinutes(
    Math.min(status.absent_minutes + elapsed, limit - 1),
  );
};

/** 即時進行の表示（○ / × / —） */
const progressMark = (status: PowerStatus) => {
  if (status.is_eliminated || status.progress_consented == null) return "—";
  return status.progress_consented ? "○" : "×";
};

const progressLabel = (status: PowerStatus) => {
  if (status.is_eliminated || status.progress_consented == null)
    return "記録なし";
  return status.progress_consented ? "合意" : "未合意";
};

/**
 * 7 か国の状況表（不在時間・補給都市・陸軍・海軍・即時進行）。
 * 無政府状態の国は赤、滅亡した国はグレーにする。過去のシーズンは不在時間の列を出さない
 */
export const PowerStatusTable = ({
  faceType,
  powers,
  showProgress,
  idleLimitMinutes,
}: PowerStatusTableProps) => {
  const rows = POWERS.flatMap(
    ({ code }) => powers.find((p) => p.power === code) ?? [],
  );
  // 過去のシーズンは無政府の記録もない（is_idle が null）
  const showAbsent =
    idleLimitMinutes != null && powers.some((p) => p.is_idle != null);
  const elapsed = useMinutesSince(powers);
  return (
    <table className={styles.statusTable}>
      <caption className="sr-only">各国の状況</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="sr-only">国</span>
          </th>
          {showAbsent && <th scope="col">不在時間</th>}
          <th scope="col">補給都市</th>
          <th scope="col">陸軍</th>
          <th scope="col">海軍</th>
          {showProgress && <th scope="col">即時進行</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((status) => {
          const state = status.is_eliminated
            ? "eliminated"
            : status.is_idle
              ? "idle"
              : "normal";
          return (
            <tr
              key={status.power}
              className={styles.statusRow}
              data-state={state}
            >
              <th scope="row" className={styles.statusPower}>
                <PowerImage
                  faceType={faceType}
                  code={status.power}
                  size={40}
                  defeated={status.is_eliminated}
                />
                <span className="sr-only">
                  {POWER_LABELS[status.power]}
                  {status.is_eliminated
                    ? "（滅亡）"
                    : status.is_idle
                      ? "（無政府）"
                      : ""}
                </span>
              </th>
              {showAbsent && (
                <td>{absentText(status, elapsed, idleLimitMinutes ?? 0)}</td>
              )}
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
