import { PowerImage } from "~/components/power-image/PowerImage";
import type { ChatMessage } from "~/lib/chat";
import { type GameRegulation, type PowerCode, POWER_LABELS } from "~/lib/game";
import styles from "./Chat.module.css";

export interface ChatMessageListProps {
  /** 古い順のメッセージ */
  messages: ChatMessage[];
  faceType: GameRegulation["face_type"];
  /** 見ている参加者の担当国（自分の発言の色を変える）。第三者は null */
  myPower: PowerCode | null;
}

/** チャンネルのメッセージ一覧 */
export const ChatMessageList = ({
  messages,
  faceType,
  myPower,
}: ChatMessageListProps) => {
  if (messages.length === 0) {
    return <p className={styles.empty}>このシーズンの発言はまだありません</p>;
  }
  return (
    <ol className={styles.messages} aria-label="メッセージ">
      {messages.map((m) => {
        if (m.sender == null) {
          return (
            <li key={m.message_uuid} className={styles.system}>
              {m.context}
              <span className={styles.time}> {m.created_at.slice(11)}</span>
            </li>
          );
        }
        if (m.sender === myPower) {
          // 自分の発言はアイコンと名前を出さず、右に寄せる（時刻は吹き出しの左）
          return (
            <li key={m.message_uuid} className={`${styles.message} ${styles.mine}`}>
              <time className={styles.time} dateTime={m.created_at}>
                {m.created_at.slice(5)}
              </time>
              <p className={styles.bubble}>
                <span className="sr-only">{POWER_LABELS[m.sender]}: </span>
                {m.context}
              </p>
            </li>
          );
        }
        const classes = [
          styles.message,
          m.kind === "masked" ? styles.masked : "",
        ].join(" ");
        return (
          <li key={m.message_uuid} className={classes}>
            <PowerImage faceType={faceType} code={m.sender} size={32} />
            <div className={styles.messageBody}>
              <div className={styles.messageHead}>
                <span className={styles.sender}>{POWER_LABELS[m.sender]}</span>
                <time className={styles.time} dateTime={m.created_at}>
                  {m.created_at.slice(5)}
                </time>
              </div>
              <p className={styles.bubble}>{m.context ?? "（内容は非公開）"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
