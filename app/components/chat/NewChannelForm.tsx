import { useId, useState } from "react";
import { PowerImage } from "~/components/power-image/PowerImage";
import { type GameRegulation, POWER_LABELS, type PowerCode } from "~/lib/game";
import styles from "./Chat.module.css";

export interface NewChannelFormProps {
  faceType: GameRegulation["face_type"];
  /** メンバーに選べる国（自国と滅亡した国を除いた、担当者のいる国） */
  candidates: PowerCode[];
  /** 「作成」で、選んだ国（自国を含まない）を渡す */
  onCreate: (members: PowerCode[]) => void;
}

/**
 * グループチャンネルを作るフォーム。
 * 「＋ 新しいグループチャンネル」を押すと、メンバーの国を選ぶ欄を開く。
 * 同じ顔ぶれのチャンネルがすでにあれば、そのチャンネルが開く（チャンネル ID が顔ぶれで決まるため）
 */
export const NewChannelForm = ({ faceType, candidates, onCreate }: NewChannelFormProps) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PowerCode[]>([]);
  const titleId = useId();

  if (!open) {
    return (
      <button type="button" className={styles.newChannelButton} onClick={() => setOpen(true)}>
        ＋ 新しいグループチャンネル
      </button>
    );
  }

  const toggle = (code: PowerCode) =>
    setSelected((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]));
  const close = () => {
    setOpen(false);
    setSelected([]);
  };

  return (
    <form
      className={styles.newChannel}
      aria-labelledby={titleId}
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.length > 0) onCreate(selected);
      }}
    >
      <h4 id={titleId} className={styles.newChannelTitle}>
        グループチャンネルのメンバーを選んでください
      </h4>
      {candidates.length === 0 ? (
        <p className={styles.newChannelNote}>メンバーに選べる国がありません</p>
      ) : (
        <fieldset className={styles.newChannelChoices}>
          <legend className="sr-only">グループチャンネルのメンバー</legend>
          {candidates.map((code) => (
            <label key={code} className={styles.newChannelChoice} data-checked={selected.includes(code)}>
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.includes(code)}
                onChange={() => toggle(code)}
              />
              <PowerImage faceType={faceType} code={code} size={40} />
              <span>{POWER_LABELS[code]}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className={styles.newChannelButtons}>
        <button type="submit" className={styles.newChannelSubmit} disabled={selected.length === 0}>
          作成
        </button>
        <button type="button" className={styles.newChannelCancel} onClick={close}>
          やめる
        </button>
      </div>
    </form>
  );
};
