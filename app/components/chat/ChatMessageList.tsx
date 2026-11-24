import { AdminImage, PowerImage } from "~/components/power-image/PowerImage";
import { UserAvatar } from "~/components/user-avatar/UserAvatar";
import { type ChatMessage, type ChatSelf, isMine, senderName } from "~/lib/chat";
import type { GameRegulation } from "~/lib/game";
import styles from "./Chat.module.css";

export interface ChatMessageListProps {
  /** 古い順のメッセージ */
  messages: ChatMessage[];
  faceType: GameRegulation["face_type"];
  /** 見ている人（自分の発言の色と位置を変える） */
  self: ChatSelf;
}

/** チャンネルのメッセージ一覧 */
export const ChatMessageList = ({ messages, faceType, self }: ChatMessageListProps) => {
  if (messages.length === 0) {
    return <p className={styles.empty}>このシーズンの発言はまだありません</p>;
  }
  return (
    <ol className={styles.messages} aria-label="メッセージ">
      {messages.map((m) => {
        const name = senderName(m);
        if (m.sender_kind === "system" || name == null) {
          return (
            <li key={m.message_uuid} className={styles.system}>
              {m.context}
              <span className={styles.time}> {m.created_at.slice(11)}</span>
            </li>
          );
        }
        if (isMine(m, self)) {
          // 自分の発言はアイコンと名前を出さず、右に寄せる（時刻は吹き出しの左）
          return (
            <li key={m.message_uuid} className={`${styles.message} ${styles.mine}`}>
              <time className={styles.time} dateTime={m.created_at}>
                {m.created_at.slice(5)}
              </time>
              <p className={styles.bubble}>
                <span className="sr-only">{name}: </span>
                {m.context}
              </p>
            </li>
          );
        }
        const classes = [styles.message, m.kind === "masked" ? styles.masked : ""].join(" ");
        return (
          <li key={m.message_uuid} className={classes}>
            <SenderIcon message={m} faceType={faceType} name={name} />
            <div className={styles.messageBody}>
              <div className={styles.messageHead}>
                <span className={styles.sender}>{name}</span>
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

const SenderIcon = ({
  message,
  faceType,
  name,
}: {
  message: ChatMessage;
  faceType: GameRegulation["face_type"];
  name: string;
}) => {
  switch (message.sender_kind) {
    case "admin":
      return <AdminImage faceType={faceType} size={32} />;
    case "user":
      return (
        <UserAvatar name={name} avatarUrl={message.sender_user?.avatar_url} size={32} />
      );
    default:
      return <PowerImage faceType={faceType} code={message.sender} size={32} />;
  }
};
