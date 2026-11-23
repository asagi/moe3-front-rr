import {
  type GameRegulation,
  POWERS,
  POWER_LABELS,
  type PowerCode,
} from "~/lib/game";
import { PowerImage } from "~/components/power-image/PowerImage";
import styles from "./PowerChoices.module.css";

export interface PowerChoicesProps {
  faceType: GameRegulation["face_type"];
  /** ラジオボタンの name */
  name: string;
  /** 選択中の国コード。希望なしは "" */
  value: PowerCode | "";
  onChange: (value: PowerCode | "") => void;
  /** 選択肢から外す国（卓主の希望国など） */
  exclude?: readonly PowerCode[];
  /** 見出しの要素の ID（radiogroup の名前になる） */
  labelledBy?: string;
}

/** 「希望なし」と各国の画像を並べた希望国の選択欄（中身はラジオボタン） */
export const PowerChoices = ({
  faceType,
  name,
  value,
  onChange,
  exclude = [],
  labelledBy,
}: PowerChoicesProps) => {
  const codes = POWERS.map((p) => p.code).filter((c) => !exclude.includes(c));
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={styles.choices}
    >
      {[null, ...codes].map((code) => {
        const checked = value === (code ?? "");
        return (
          <label
            key={code ?? "none"}
            className={styles.choice}
            data-checked={checked}
          >
            <input
              type="radio"
              className={styles.visuallyHidden}
              name={name}
              value={code ?? ""}
              checked={checked}
              onChange={() => onChange(code ?? "")}
            />
            <PowerImage faceType={faceType} code={code} size={60} />
            <span>{code ? POWER_LABELS[code] : "希望なし"}</span>
          </label>
        );
      })}
    </div>
  );
};
