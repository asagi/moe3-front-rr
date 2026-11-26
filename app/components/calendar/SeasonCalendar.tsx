import { Link } from "react-router";
import { type PhaseKind, chatClosedPhaseLabel } from "~/lib/game";
import styles from "./SeasonCalendar.module.css";

export interface SeasonCalendarProps {
  /** これまでのシーズン（"ready" / "1901s" / "1901f" / … / "debrief"）。最後が最新 */
  seasons: string[];
  /** 見ているシーズン */
  selected: string | null;
  /** 最新のシーズンのフェイズ（撤退・調整なら「現在」に添える） */
  phaseKind: PhaseKind;
  /** シーズンを選んだときのリンク先 */
  hrefFor: (season: string) => string;
}

/** 年ごとの春・秋 */
interface YearRow {
  year: string;
  spring: string | null;
  fall: string | null;
}

const toYearRows = (seasons: string[]) => {
  const rows: YearRow[] = [];
  for (const season of seasons) {
    const m = /^(\d{4})([sf])$/.exec(season);
    if (!m) continue;
    let row = rows.find((r) => r.year === m[1]);
    if (!row) {
      row = { year: m[1], spring: null, fall: null };
      rows.push(row);
    }
    if (m[2] === "s") row.spring = season;
    else row.fall = season;
  }
  return rows;
};

/**
 * シーズンのカレンダー。開戦前夜・年ごとの春と秋・感想戦を、上から古い順に並べる。
 * まだ来ていないシーズンは空欄にする
 */
export const SeasonCalendar = ({ seasons, selected, phaseKind, hrefFor }: SeasonCalendarProps) => {
  const latest = seasons.at(-1) ?? null;
  const rows = toYearRows(seasons);
  const subPhase = chatClosedPhaseLabel(phaseKind);

  const cell = (season: string | null, label: string, wide = false) => {
    if (season == null) return <span className={styles.empty} aria-hidden="true" />;
    const isLatest = season === latest;
    return (
      <Link
        to={hrefFor(season)}
        className={`${styles.cell} ${wide ? styles.wide : ""}`}
        aria-current={season === selected ? "page" : undefined}
        aria-label={`${label}${isLatest ? "（現在）" : ""}`}
      >
        <span>{label.replace(/^\d{4} 年/, "")}</span>
        {isLatest && <span className={styles.now}>{subPhase ? `現在・${subPhase}` : "現在"}</span>}
      </Link>
    );
  };

  return (
    <nav className={styles.calendar} aria-label="シーズン">
      {seasons.includes("ready") && <div className={styles.single}>{cell("ready", "開戦前夜", true)}</div>}
      {rows.length > 0 && (
        <table className={styles.table}>
          <caption className="sr-only">年ごとの春と秋</caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year}>
                <th scope="row" className={styles.year}>
                  {row.year} 年
                </th>
                <td>{cell(row.spring, `${row.year} 年春`)}</td>
                <td>{cell(row.fall, `${row.year} 年秋`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {seasons.includes("debrief") && <div className={styles.single}>{cell("debrief", "感想戦", true)}</div>}
    </nav>
  );
};
