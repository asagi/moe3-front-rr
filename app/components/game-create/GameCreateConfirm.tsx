import type { ReactNode } from "react";
import {
  MAIN_PHASE_LENGTH_LABELS,
  FACE_TYPE_LABELS,
  POWER_LABELS,
  PROGRESS_MODE_LABELS,
} from "~/lib/game";
import { type GameFormValues, formatStartTime } from "~/lib/game-form";
import { PowerImage } from "~/components/power-image/PowerImage";
import styles from "./GameCreate.module.css";

export interface GameCreateConfirmProps {
  /** 入力フォームで確定した値 */
  values: GameFormValues;
  /** 作成中か（ボタンを無効にする） */
  submitting?: boolean;
  /** 作成に失敗したときのエラーメッセージ */
  error?: string | null;
  /** 「戻る」押下時の処理（入力フォームへ戻る） */
  onBack?: () => void;
  /** 「この内容で作成する」押下時の処理 */
  onCreate?: () => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-11-25" → "2026 年 11 月 25 日（水）" */
const formatDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y} 年 ${m} 月 ${d} 日（${weekday}）`;
};

/** 新規募集の確認画面 */
export const GameCreateConfirm = ({
  values,
  submitting = false,
  error,
  onBack,
  onCreate,
}: GameCreateConfirmProps) => {
  const power = values.requestedPower || null;

  return (
    <div className={styles.form}>
      <p className={styles.lead}>以下の内容で募集を作成します。</p>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <dl className={styles.summary}>
        <Row label="フェイスタイプ">{FACE_TYPE_LABELS[values.faceType]}</Row>
        <Row label="希望国">
          <span className={styles.withImage}>
            <PowerImage faceType={values.faceType} code={power} size={40} />
            {power ? POWER_LABELS[power] : "希望なし"}
          </span>
        </Row>
        <Row label="進行モード">
          {PROGRESS_MODE_LABELS[values.progressMode]}
        </Row>
        <Row label="メインフェイズの長さ">
          {MAIN_PHASE_LENGTH_LABELS[values.durationType]}
        </Row>
        <Row label="開始日">{formatDate(values.startDate)}</Row>
        <Row label="開始時刻">{formatStartTime(values)}</Row>
        <Row label="鍵">
          {values.locked ? `あり（キーワード: ${values.keyword}）` : "なし"}
        </Row>
      </dl>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={submitting}
          onClick={() => onBack?.()}
        >
          戻る
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={submitting}
          onClick={() => onCreate?.()}
        >
          {submitting ? "作成中…" : "この内容で作成する"}
        </button>
      </div>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className={styles.summaryRow}>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);
