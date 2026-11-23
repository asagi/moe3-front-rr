import { useEffect, useId, useRef, useState } from "react";
import { DiscordLoginButton } from "~/components/discord-login-button/DiscordLoginButton";
import { PowerChoices } from "~/components/power-choices/PowerChoices";
import { PowerImage } from "~/components/power-image/PowerImage";
import {
  type GameRegulation,
  POWER_LABELS,
  type PowerCode,
} from "~/lib/game";
import styles from "./GameInfo.module.css";

export interface GameJoinValues {
  /** 希望国。希望なしは "" */
  requestedPower: PowerCode | "";
  /** 鍵卓のキーワード（鍵なしは ""） */
  keyword: string;
}

export interface GameJoinFormProps {
  faceType: GameRegulation["face_type"];
  /** 選択肢から外す国（卓主の希望国） */
  excludePowers?: readonly PowerCode[];
  /** 鍵卓か（キーワード欄を出す） */
  isPrivate: boolean;
  /** 申請中か（ボタンを無効にする） */
  submitting?: boolean;
  /** 申請に失敗したときのエラーメッセージ */
  error?: string | null;
  /** 確認ダイアログで「申請する」を押したときの処理 */
  onSubmit?: (values: GameJoinValues) => void;
}

const KEYWORD_PATTERN = /^[0-9A-Za-z]+$/;

/** 参加登録フォーム。送信前に「取り消せない」旨の確認ダイアログを出す */
export const GameJoinForm = ({
  faceType,
  excludePowers = [],
  isPrivate,
  submitting = false,
  error,
  onSubmit,
}: GameJoinFormProps) => {
  const id = useId();
  const [values, setValues] = useState<GameJoinValues>({
    requestedPower: "",
    keyword: "",
  });
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 卓主の希望国と重なったら（再読み込みで変わった場合など）希望なしに戻す
  useEffect(() => {
    if (
      values.requestedPower &&
      excludePowers.includes(values.requestedPower)
    ) {
      setValues((v) => ({ ...v, requestedPower: "" }));
    }
  }, [excludePowers, values.requestedPower]);

  const power = values.requestedPower || null;

  return (
    <section className={styles.section} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.sectionTitle}>
        参加登録フォーム
      </h3>
      <form
        className={styles.joinForm}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (isPrivate) {
            const keyword = values.keyword.trim();
            if (!keyword) {
              setKeywordError("鍵を入力してください");
              return;
            }
            if (!KEYWORD_PATTERN.test(keyword)) {
              setKeywordError("鍵は半角英数字で入力してください");
              return;
            }
          }
          dialogRef.current?.showModal();
        }}
      >
        <div className={styles.joinField}>
          <div id={`${id}-power`} className={styles.fieldTitle}>
            希望国
          </div>
          <PowerChoices
            faceType={faceType}
            name="requestedPower"
            labelledBy={`${id}-power`}
            value={values.requestedPower}
            exclude={excludePowers}
            onChange={(v) => setValues((s) => ({ ...s, requestedPower: v }))}
          />
        </div>

        {isPrivate && (
          <div className={styles.keywordRow}>
            <label htmlFor={`${id}-keyword`}>鍵</label>
            <div>
              <input
                id={`${id}-keyword`}
                type="text"
                name="keyword"
                className={styles.control}
                placeholder="半角英数字"
                autoComplete="off"
                aria-invalid={!!keywordError}
                aria-describedby={keywordError ? `${id}-keyword-error` : undefined}
                value={values.keyword}
                onChange={(e) => {
                  setValues((s) => ({ ...s, keyword: e.target.value }));
                  setKeywordError(null);
                }}
              />
              {keywordError && (
                <p id={`${id}-keyword-error`} className={styles.error}>
                  {keywordError}
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={submitting}
          >
            {submitting ? "申請中…" : "参加を申請する"}
          </button>
        </div>
      </form>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={`${id}-dialog-title`}
        // 枠の外（背景）をクリックしたら閉じる
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <h4 id={`${id}-dialog-title`} className={styles.dialogTitle}>
          参加を申請しますか？
        </h4>
        <div className={styles.dialogPower}>
          <PowerImage faceType={faceType} code={power} size={48} />
          <span>{power ? `希望国：${POWER_LABELS[power]}` : "希望国：なし"}</span>
        </div>
        <p className={styles.dialogNote}>
          申請後は取り消すことができません。
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => dialogRef.current?.close()}
          >
            キャンセル
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              dialogRef.current?.close();
              onSubmit?.({ ...values, keyword: values.keyword.trim() });
            }}
          >
            申請する
          </button>
        </div>
      </dialog>
    </section>
  );
};

export interface GameJoinLoginPromptProps {
  onLogin?: () => void;
}

/** 未ログインの人にフォームの代わりに出すログインの案内 */
export const GameJoinLoginPrompt = ({ onLogin }: GameJoinLoginPromptProps) => (
  <section className={styles.section} aria-labelledby="game-join-login-title">
    <h3 id="game-join-login-title" className={styles.sectionTitle}>
      参加登録
    </h3>
    <div className={styles.loginPrompt}>
      <p>この卓に参加するには、Discord アカウントでログインしてください。</p>
      <DiscordLoginButton onClick={onLogin} />
    </div>
  </section>
);
