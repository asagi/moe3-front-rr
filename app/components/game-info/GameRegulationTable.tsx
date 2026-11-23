import type { ReactNode } from "react";
import {
  FACE_TYPE_LABELS,
  type GameRegulation,
  MAIN_PHASE_LENGTH_LABELS,
  PROGRESS_MODE_LABELS,
  formatDateTimeJa,
} from "~/lib/game";
import styles from "./GameInfo.module.css";

export interface GameRegulationTableProps {
  regulation: GameRegulation;
  /** 開始日時（JST、"YYYY-MM-DD HH:mm"）。不明なら null */
  startAt: string | null;
  /** 鍵卓か */
  isPrivate: boolean;
}

/** 卓のレギュレーション */
export const GameRegulationTable = ({
  regulation,
  startAt,
  isPrivate,
}: GameRegulationTableProps) => (
  <section className={styles.section} aria-labelledby="game-regulation-title">
    <h3 id="game-regulation-title" className={styles.sectionTitle}>
      レギュレーション
    </h3>
    <dl className={styles.table}>
      <Row label="フェイスタイプ">{FACE_TYPE_LABELS[regulation.face_type]}</Row>
      <Row label="進行モード">
        {PROGRESS_MODE_LABELS[regulation.progress_mode]}
      </Row>
      <Row label="メインフェイズの長さ">
        {MAIN_PHASE_LENGTH_LABELS[regulation.duration_type]}
      </Row>
      <Row label="開始日時">{startAt ? formatDateTimeJa(startAt) : "—"}</Row>
      <Row label="鍵">{isPrivate ? "あり" : "なし"}</Row>
    </dl>
  </section>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className={styles.tableRow}>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);
