import { useState } from "react";
import styles from "./OrderEditor.module.css";

export interface OrderControlsProps {
  /** 即時進行のトグルを出すか（合意進行の卓だけ） */
  showProgress: boolean;
  /** 即時進行に合意するか（確定前の値） */
  progressConsented: boolean;
  onProgressChange: (value: boolean) => void;
  /** 確定済みから変わっているか（変わっていなければ更新・キャンセルを押せない） */
  dirty: boolean;
  /** 送信中か */
  submitting: boolean;
  /** 確定に失敗したときのメッセージ */
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

type Confirming = "submit" | "cancel" | null;

/**
 * 即時進行のトグルと、更新・キャンセルのボタン。
 * どちらのボタンも、押したらその場で確認を出してから実行する
 */
export const OrderControls = ({
  showProgress,
  progressConsented,
  onProgressChange,
  dirty,
  submitting,
  error,
  onSubmit,
  onCancel,
}: OrderControlsProps) => {
  const [confirming, setConfirming] = useState<Confirming>(null);

  return (
    <div className={styles.controls}>
      {showProgress && (
        <label className={styles.toggle}>
          <span>即時進行</span>
          <input
            type="checkbox"
            role="switch"
            checked={progressConsented}
            disabled={submitting}
            onChange={(e) => onProgressChange(e.target.checked)}
          />
        </label>
      )}

      {confirming == null ? (
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!dirty || submitting}
            onClick={() => setConfirming("submit")}
          >
            {submitting ? "送信中…" : "更新"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!dirty || submitting}
            onClick={() => setConfirming("cancel")}
          >
            キャンセル
          </button>
        </div>
      ) : (
        <div className={styles.confirm} role="alertdialog" aria-label="確認">
          <p>
            {confirming === "submit"
              ? "この内容で命令を確定します。よろしいですか？"
              : "確定していない変更をすべて破棄します。よろしいですか？"}
          </p>
          <div className={styles.buttons}>
            <button
              type="button"
              className={confirming === "submit" ? styles.primaryButton : styles.dangerButton}
              onClick={() => {
                setConfirming(null);
                if (confirming === "submit") onSubmit();
                else onCancel();
              }}
            >
              {confirming === "submit" ? "確定する" : "破棄する"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setConfirming(null)}>
              戻る
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
