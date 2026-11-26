import { useState } from "react";
import { formatDateTimeJa } from "~/lib/game";
import styles from "./GameAdmin.module.css";

/** 各操作の送信状態 */
export interface ControlState {
  submitting: boolean;
  /** 失敗したときの文言 */
  error: string | null;
}

/* ---- 次回更新時刻 ---- */

export interface NextUpdateFormProps extends ControlState {
  /** 今の次回更新時刻（JST、"YYYY-MM-DD HH:mm"）。未設定なら null */
  current: string | null;
  /** 新しい次回更新時刻（JST、"YYYY-MM-DD HH:mm"）を渡す */
  onSubmit: (value: string) => void;
}

/** "YYYY-MM-DD HH:mm" ⇔ <input type="datetime-local"> の値 */
const toInputValue = (value: string) => value.replace(" ", "T");
const fromInputValue = (value: string) => value.replace("T", " ");

/** 分が 5 分刻みか */
const isFiveMinuteStep = (value: string) => Number(value.slice(-2)) % 5 === 0;

/**
 * 次回更新時刻の変更。延長しかできない（今より前には戻せない）。分は 5 分刻み
 */
export const NextUpdateForm = ({ current, submitting, error, onSubmit }: NextUpdateFormProps) => {
  const [value, setValue] = useState(current ? toInputValue(current) : "");
  const next = fromInputValue(value);
  const problem =
    value === ""
      ? "日時を入力してください"
      : current != null && next < current
        ? "今の次回更新時刻より前には変更できません"
        : !isFiveMinuteStep(next)
          ? "分は 5 分刻みで指定してください"
          : null;
  const unchanged = current != null && next === current;

  return (
    <section className={styles.section} aria-labelledby="next-update-title">
      <h3 id="next-update-title" className={styles.title}>
        次回更新時刻
      </h3>
      <p className={styles.current}>
        今の設定：{current ? formatDateTimeJa(current) : "未設定"}
      </p>
      <form
        className={styles.row}
        onSubmit={(e) => {
          e.preventDefault();
          if (!problem && !unchanged) onSubmit(next);
        }}
      >
        <label className="sr-only" htmlFor="next-update-input">
          新しい次回更新時刻
        </label>
        <input
          id="next-update-input"
          type="datetime-local"
          className={styles.input}
          value={value}
          min={current ? toInputValue(current) : undefined}
          step={300}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className={styles.primary} disabled={submitting || !!problem || unchanged}>
          {submitting ? "変更中…" : "延長する"}
        </button>
      </form>
      {value !== "" && problem && <p className={styles.hint}>{problem}</p>}
      <p className={styles.note}>延長だけできます。変更するとシステムメッセージで全員に知らされます。</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
};

/* ---- 和平終了（講和） ---- */

export interface DrawProposalControlProps extends ControlState {
  /** 講和を宣言しているか */
  current: boolean;
  onChange: (value: boolean) => void;
}

/**
 * 和平終了（講和）の宣言・撤回。宣言すると、次の更新で講和が成立して終戦する（それまでは撤回できる）
 */
export const DrawProposalControl = ({ current, submitting, error, onChange }: DrawProposalControlProps) => {
  const [confirming, setConfirming] = useState<boolean | null>(null);

  return (
    <section className={styles.section} aria-labelledby="draw-title">
      <h3 id="draw-title" className={styles.title}>
        和平終了
      </h3>
      <p className={styles.current}>
        {current
          ? "講和を宣言しています。次の更新で講和が成立して終戦します。"
          : "講和は宣言していません。宣言すると、次の更新で講和が成立して終戦します。"}
      </p>
      {confirming == null ? (
        <div className={styles.buttons}>
          {!current && (
            <button type="button" className={styles.danger} disabled={submitting} onClick={() => setConfirming(true)}>
              講和を宣言する
            </button>
          )}
          {current && (
            <button type="button" className={styles.secondary} disabled={submitting} onClick={() => setConfirming(false)}>
              講和を撤回する
            </button>
          )}
        </div>
      ) : (
        <div className={styles.confirm} role="alertdialog" aria-label="確認">
          <p>
            {confirming
              ? "講和を宣言します。次の更新で終戦になります。よろしいですか？"
              : "講和を撤回します。よろしいですか？"}
          </p>
          <div className={styles.buttons}>
            <button
              type="button"
              className={confirming ? styles.danger : styles.primary}
              onClick={() => {
                onChange(confirming);
                setConfirming(null);
              }}
            >
              {confirming ? "宣言する" : "撤回する"}
            </button>
            <button type="button" className={styles.secondary} onClick={() => setConfirming(null)}>
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
    </section>
  );
};

/* ---- 進行モード ---- */

export interface ProgressModeControlProps extends ControlState {
  current: "scheduled" | "consensus";
  onSwitch: () => void;
}

/** 定時進行から合意進行への切り替え（元には戻せない） */
export const ProgressModeControl = ({ current, submitting, error, onSwitch }: ProgressModeControlProps) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <section className={styles.section} aria-labelledby="progress-mode-title">
      <h3 id="progress-mode-title" className={styles.title}>
        進行モード
      </h3>
      <p className={styles.current}>今の設定：{current === "consensus" ? "合意進行" : "定時進行"}</p>
      {current === "scheduled" &&
        (confirming ? (
          <div className={styles.confirm} role="alertdialog" aria-label="確認">
            <p>合意進行に切り替えます。定時進行には戻せません。よろしいですか？</p>
            <div className={styles.buttons}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  onSwitch();
                  setConfirming(false);
                }}
              >
                切り替える
              </button>
              <button type="button" className={styles.secondary} onClick={() => setConfirming(false)}>
                戻る
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.buttons}>
            <button type="button" className={styles.primary} disabled={submitting} onClick={() => setConfirming(true)}>
              {submitting ? "切り替え中…" : "合意進行に切り替える"}
            </button>
          </div>
        ))}
      <p className={styles.note}>
        合意進行では、操作が必要な国の全員が即時進行に合意すると、次回更新時刻を待たずに進みます。
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
};
