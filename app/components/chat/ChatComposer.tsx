import { useEffect, useId, useState } from "react";
import { AdminImage, PowerImage } from "~/components/power-image/PowerImage";
import { UserAvatar } from "~/components/user-avatar/UserAvatar";
import { type GameRegulation, type PowerCode, POWER_LABELS } from "~/lib/game";
import styles from "./Chat.module.css";

/** 本文の最大文字数（API の上限） */
export const MAX_MESSAGE_LENGTH = 2000;

/** 誰として発言するか（入力欄の左のアイコン） */
export type ChatComposerSender =
  /** 開戦前夜・感想戦など担当国で発言しないとき（Discord のアバター） */
  | { kind: "user"; name: string; avatarUrl: string | null }
  /** 担当国として発言するとき */
  | { kind: "power"; faceType: GameRegulation["face_type"]; power: PowerCode }
  /** 管理者モード中の管理人発言 */
  | { kind: "admin"; faceType: GameRegulation["face_type"] };

export interface ChatComposerProps {
  sender: ChatComposerSender;
  /** 書き込めない理由。指定すると入力欄と送信ボタンを無効にして、入力欄にこの文言を出す */
  disabledReason?: string;
  /** 送信中か */
  submitting?: boolean;
  /** 送信に失敗したときの文言 */
  error?: string | null;
  /** 変わったら入力欄を空にする（送信に成功したときに増やす） */
  resetKey?: number;
  /** 送信ボタン（または Ctrl / ⌘ + Enter）で呼ばれる */
  onSend?: (context: string) => void;
}

/** 発言の送信フォーム（画面下に固定して使う入力欄） */
export const ChatComposer = ({
  sender,
  disabledReason,
  submitting = false,
  error,
  resetKey = 0,
  onSend,
}: ChatComposerProps) => {
  const id = useId();
  const [text, setText] = useState("");
  useEffect(() => setText(""), [resetKey]);

  const disabled = disabledReason != null;
  const tooLong = text.length > MAX_MESSAGE_LENGTH;
  const canSend = !disabled && !submitting && !tooLong && text.trim() !== "";
  const send = () => {
    if (canSend) onSend?.(text);
  };

  return (
    <form
      className={styles.composer}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      aria-label="発言する"
    >
      {(error || tooLong) && (
        <p className={styles.composerError} role="alert">
          {tooLong ? `${MAX_MESSAGE_LENGTH} 文字までです（${text.length} 文字）` : error}
        </p>
      )}
      <div className={styles.composerRow}>
        <SenderIcon sender={sender} />
        <label htmlFor={id} className="sr-only">
          {`${senderLabel(sender)}として発言`}
        </label>
        <textarea
          id={id}
          name="context"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // 改行は Enter、送信は Ctrl / ⌘ + Enter
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send();
            }
          }}
          disabled={disabled}
          placeholder={disabledReason ?? "発言を入力"}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!canSend}
          aria-label="送信"
          title="送信（Ctrl + Enter）"
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
};

const senderLabel = (sender: ChatComposerSender) => {
  switch (sender.kind) {
    case "user":
      return sender.name;
    case "power":
      return POWER_LABELS[sender.power];
    case "admin":
      return "管理人";
  }
};

const SenderIcon = ({ sender }: { sender: ChatComposerSender }) => {
  const title = senderLabel(sender);
  switch (sender.kind) {
    case "user":
      return (
        <span title={title}>
          <UserAvatar name={sender.name} avatarUrl={sender.avatarUrl} size={28} />
        </span>
      );
    case "power":
      return (
        <span title={title}>
          <PowerImage faceType={sender.faceType} code={sender.power} size={28} />
        </span>
      );
    case "admin":
      return (
        <span title={title}>
          <AdminImage faceType={sender.faceType} size={28} />
        </span>
      );
  }
};

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M2.5 21 23 12 2.5 3 2.5 10l14 2-14 2z" />
  </svg>
);
