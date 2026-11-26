import { Fragment } from "react";
import { AdminImage, PowerImage } from "~/components/power-image/PowerImage";
import { UserAvatar } from "~/components/user-avatar/UserAvatar";
import {
  type ChatMessage,
  type ChatSelf,
  isGhost,
  isMine,
  senderName,
} from "~/lib/chat";
import { type GameRegulation, formatMonthDayJa } from "~/lib/game";
import {
  firstMessageOf,
  groupChatItems,
  itemKey,
  lastMessageOf,
} from "~/lib/system-notice";
import styles from "./Chat.module.css";
import { BoardEditGroup, SystemNoticeItem } from "./SystemNotice";

export interface ChatMessageListProps {
  /** 古い順のメッセージ */
  messages: ChatMessage[];
  faceType: GameRegulation["face_type"];
  /** 見ている人（自分の発言の色と位置を変える） */
  self: ChatSelf;
}

/** チャンネルのメッセージ一覧 */
export const ChatMessageList = ({
  messages,
  faceType,
  self,
}: ChatMessageListProps) => {
  if (messages.length === 0) {
    return <p className={styles.empty}>このシーズンの発言はまだありません</p>;
  }
  // 盤面編集の通知が続いたら 1 行にまとめる
  const items = groupChatItems(messages);
  return (
    <ol className={styles.messages} aria-label="メッセージ">
      {items.map((item, i) => {
        const m = firstMessageOf(item);
        const prev = i > 0 ? lastMessageOf(items[i - 1]) : null;
        const date = m.created_at.slice(0, 10);
        const newDay = prev == null || prev.created_at.slice(0, 10) !== date;
        // 同じ人の続けての発言は、2 つ目からアイコンと名前を省く
        const continued =
          !newDay && prev != null && senderKey(prev) === senderKey(m);
        return (
          <Fragment key={itemKey(item)}>
            {newDay && (
              <li className={styles.date} aria-hidden="true">
                {formatMonthDayJa(date)}
              </li>
            )}
            {item.kind === "boardEdits" ? (
              <BoardEditGroup
                messages={item.messages}
                faceType={faceType}
                variant="channel"
              />
            ) : (
              <MessageItem
                message={m}
                faceType={faceType}
                self={self}
                continued={continued}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
};

/** 発言者を区別するキー（システムメッセージは毎回別） */
const senderKey = (m: ChatMessage) =>
  m.sender_kind === "system"
    ? m.message_uuid
    : [m.sender_kind, m.sender ?? "", m.sender_user?.username ?? ""].join(":");

const MessageItem = ({
  message: m,
  faceType,
  self,
  continued,
}: {
  message: ChatMessage;
  faceType: GameRegulation["face_type"];
  self: ChatSelf;
  continued: boolean;
}) => {
  const time = (
    <time className={styles.time} dateTime={m.created_at}>
      {m.created_at.slice(11)}
    </time>
  );
  const name = senderName(m);
  if (m.sender_kind === "system" || name == null) {
    return (
      <SystemNoticeItem message={m} faceType={faceType} variant="channel" />
    );
  }
  if (isMine(m, self)) {
    // 自分の発言はアイコンと名前を出さず、右に寄せる（時刻は吹き出しの左下）
    const mineClasses = [
      styles.message,
      styles.mine,
      isGhost(m) ? styles.ghost : "",
      continued ? styles.continued : "",
    ].join(" ");
    return (
      <li className={mineClasses}>
        {time}
        <p className={styles.bubble}>
          <span className="sr-only">{name}: </span>
          {m.context}
        </p>
      </li>
    );
  }
  const classes = [
    styles.message,
    m.kind === "masked" ? styles.masked : "",
    isGhost(m) ? styles.ghost : "",
    continued ? styles.continued : "",
  ].join(" ");
  return (
    <li className={classes}>
      <span className={styles.icon}>
        {!continued && (
          <SenderIcon message={m} faceType={faceType} name={name} />
        )}
      </span>
      <div className={styles.messageBody}>
        {continued ? (
          <span className="sr-only">{name}</span>
        ) : (
          <span className={styles.sender}>{name}</span>
        )}
        <div className={styles.bubbleRow}>
          <p className={styles.bubble}>{m.context ?? "（内容は非公開）"}</p>
          {time}
        </div>
      </div>
    </li>
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
        <UserAvatar
          name={name}
          avatarUrl={message.sender_user?.avatar_url}
          size={32}
        />
      );
    default:
      // Ghost 発言（滅亡した国）は白黒の画像
      return (
        <PowerImage
          faceType={faceType}
          code={message.sender}
          size={32}
          defeated={isGhost(message)}
        />
      );
  }
};
