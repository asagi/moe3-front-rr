import { type ReactNode, useId, useState } from "react";
import { Link } from "react-router";
import {
  MAIN_PHASE_LENGTH_LABELS,
  FACE_TYPE_LABELS,
  type GameRegulation,
  POWERS,
  PROGRESS_MODE_LABELS,
  type PowerCode,
} from "~/lib/game";
import {
  type GameFormErrors,
  type GameFormValues,
  START_MINUTES,
  validateGameForm,
} from "~/lib/game-form";
import { PowerImage } from "~/components/power-image/PowerImage";
import styles from "./GameCreate.module.css";

export interface GameCreateFormProps {
  /** 初期値（確認画面から戻ったときは直前の入力値） */
  defaultValues: GameFormValues;
  /** 今日（JST、"YYYY-MM-DD"）。開始日の下限になる */
  today: string;
  /** 入力に問題がなければ呼ばれる（確認画面へ進む） */
  onConfirm?: (values: GameFormValues) => void;
}

const FACE_TYPES: GameRegulation["face_type"][] = ["girls", "flags"];
const PROGRESS_MODES: GameRegulation["progress_mode"][] = [
  "scheduled",
  "consensus",
];
const DURATION_TYPES: GameRegulation["duration_type"][] = ["normal", "short"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** 新規募集の入力フォーム */
export const GameCreateForm = ({
  defaultValues,
  today,
  onConfirm,
}: GameCreateFormProps) => {
  const [values, setValues] = useState(defaultValues);
  const [errors, setErrors] = useState<GameFormErrors>({});
  const id = useId();

  const update = <K extends keyof GameFormValues>(
    key: K,
    value: GameFormValues[K],
  ) => {
    setValues((v) => ({ ...v, [key]: value }));
    // 直した項目のエラーは消す
    setErrors(({ [key]: _, ...rest }) => rest);
  };

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const found = validateGameForm(values, today);
        setErrors(found);
        if (Object.keys(found).length === 0) onConfirm?.(values);
      }}
    >
      <Field title="フェイスタイプ" titleId={`${id}-face`}>
        <Segmented
          labelledBy={`${id}-face`}
          name="faceType"
          options={FACE_TYPES}
          labels={FACE_TYPE_LABELS}
          value={values.faceType}
          onChange={(v) => update("faceType", v)}
        />
      </Field>

      {/* フェイスタイプに合わせて希望国のアイコンが切り替わる */}
      <Field title="希望国" titleId={`${id}-power`}>
        <div
          role="radiogroup"
          aria-labelledby={`${id}-power`}
          className={styles.powerChoices}
        >
          {[null, ...POWERS.map((p) => p.code)].map((code) => (
            <PowerChoice
              key={code ?? "none"}
              faceType={values.faceType}
              code={code}
              checked={values.requestedPower === (code ?? "")}
              onChange={() => update("requestedPower", code ?? "")}
            />
          ))}
        </div>
      </Field>

      <div className={styles.grid}>
        <Field title="進行モード" titleId={`${id}-progress`}>
          <Segmented
            labelledBy={`${id}-progress`}
            name="progressMode"
            options={PROGRESS_MODES}
            labels={PROGRESS_MODE_LABELS}
            value={values.progressMode}
            onChange={(v) => update("progressMode", v)}
          />
        </Field>

        <Field title="メインフェイズの長さ" titleId={`${id}-duration`}>
          <Segmented
            labelledBy={`${id}-duration`}
            name="durationType"
            options={DURATION_TYPES}
            labels={MAIN_PHASE_LENGTH_LABELS}
            value={values.durationType}
            onChange={(v) => update("durationType", v)}
          />
        </Field>

        <Field
          title="開始日"
          titleId={`${id}-date`}
          error={errors.startDate}
          errorId={`${id}-date-error`}
        >
          <input
            type="date"
            name="startDate"
            className={styles.control}
            aria-labelledby={`${id}-date`}
            aria-invalid={!!errors.startDate}
            aria-describedby={errors.startDate ? `${id}-date-error` : undefined}
            min={today}
            value={values.startDate}
            onChange={(e) => update("startDate", e.target.value)}
          />
        </Field>

        <Field
          title="開始時刻"
          titleId={`${id}-hour`}
          error={errors.firstPeriodHour ?? errors.firstPeriodMinute}
          errorId={`${id}-hour-error`}
        >
          <div className={styles.timeRow}>
            <select
              name="firstPeriodHour"
              className={`${styles.control} ${styles.timeControl}`}
              aria-label="開始時刻（時）"
              aria-invalid={!!errors.firstPeriodHour}
              aria-describedby={
                errors.firstPeriodHour ? `${id}-hour-error` : undefined
              }
              value={values.firstPeriodHour}
              onChange={(e) => update("firstPeriodHour", e.target.value)}
            >
              {HOURS.map((h) => (
                <option key={h} value={String(h)}>
                  {h}
                </option>
              ))}
            </select>
            <span aria-hidden="true">時</span>
            <select
              name="firstPeriodMinute"
              className={`${styles.control} ${styles.timeControl}`}
              aria-label="開始時刻（分）"
              aria-invalid={!!errors.firstPeriodMinute}
              value={values.firstPeriodMinute}
              onChange={(e) => update("firstPeriodMinute", e.target.value)}
            >
              {START_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m.padStart(2, "0")}
                </option>
              ))}
            </select>
            <span aria-hidden="true">分</span>
          </div>
        </Field>

        <Field
          title={
            <label className={styles.switchLabel}>
              鍵
              <input
                type="checkbox"
                className={styles.visuallyHidden}
                name="locked"
                checked={values.locked}
                onChange={(e) => update("locked", e.target.checked)}
              />
              <span className={styles.switch} aria-hidden="true" />
            </label>
          }
          error={errors.keyword}
          errorId={`${id}-keyword-error`}
        >
          <input
            type="text"
            name="keyword"
            className={styles.control}
            aria-label="キーワード"
            aria-invalid={!!errors.keyword}
            aria-describedby={
              errors.keyword ? `${id}-keyword-error` : undefined
            }
            placeholder="半角英数字"
            autoComplete="off"
            disabled={!values.locked}
            value={values.keyword}
            onChange={(e) => update("keyword", e.target.value)}
          />
        </Field>
      </div>

      <div className={styles.actions}>
        <Link to="/mypage" className={styles.secondaryButton}>
          戻る
        </Link>
        <button type="submit" className={styles.primaryButton}>
          確認へ進む
        </button>
      </div>
    </form>
  );
};

/** 文字だけの選択肢を並べたセグメントボタン（中身はラジオボタン） */
const Segmented = <T extends string>({
  labelledBy,
  name,
  options,
  labels,
  value,
  onChange,
}: {
  labelledBy: string;
  name: keyof GameFormValues;
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) => (
  <div
    role="radiogroup"
    aria-labelledby={labelledBy}
    className={styles.segmented}
  >
    {options.map((option) => (
      <label key={option} className={styles.segment}>
        <input
          type="radio"
          className={styles.visuallyHidden}
          name={name}
          value={option}
          checked={value === option}
          onChange={() => onChange(option)}
        />
        <span>{labels[option]}</span>
      </label>
    ))}
  </div>
);

/** 見出し付きの入力欄 */
export const Field = ({
  title,
  titleId,
  error,
  errorId,
  note,
  className,
  children,
}: {
  title: ReactNode;
  titleId?: string;
  error?: string;
  errorId?: string;
  note?: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={`${styles.field} ${className ?? ""}`}>
    <div id={titleId} className={styles.fieldTitle}>
      {title}
    </div>
    <div className={styles.fieldBody}>
      {children}
      {note && <p className={styles.note}>{note}</p>}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  </div>
);

const PowerChoice = ({
  faceType,
  code,
  checked,
  onChange,
}: {
  faceType: GameRegulation["face_type"];
  code: PowerCode | null;
  checked: boolean;
  onChange: () => void;
}) => {
  const label = code ? POWERS.find((p) => p.code === code)!.label : "希望なし";
  return (
    <label className={styles.imageChoice} data-checked={checked}>
      <input
        type="radio"
        className={styles.visuallyHidden}
        name="requestedPower"
        value={code ?? ""}
        checked={checked}
        onChange={onChange}
      />
      <PowerImage faceType={faceType} code={code} size={60} />
      <span>{label}</span>
    </label>
  );
};
