import { Fragment } from "react";
import { AdminImage, PowerImage } from "~/components/power-image/PowerImage";
import { UserAvatar } from "~/components/user-avatar/UserAvatar";
import {
  type ChatMessage,
  logCategoryOf,
  recipientsOf,
  senderName,
} from "~/lib/chat";
import { type GameRegulation, POWER_LABELS, formatMonthDayJa } from "~/lib/game";
import styles from "./ChatLog.module.css";

export interface ChatLogListProps {
  /** 古い順のメッセージ（視点・フィルタで絞ったあと） */
  messages: ChatMessage[];
  faceType: GameRegulation["face_type"];
  /** 何も出すものがないときの文言 */
  emptyText?: string;
}

/**
 * 第三者用ログビューアーの発言一覧。
 * チャンネルに分けず、すべての発言を時系列に 1 列で並べる
 */
export const ChatLogList = ({
  messages,
  faceType,
  emptyText = "このシーズンの発言はまだありません",
}: ChatLogListProps) => {
  if (messages.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }
  return (
    <ol className={styles.log} aria-label="メッセージ">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const date = m.created_at.slice(0, 10);
        const newDay = prev == null || prev.created_at.slice(0, 10) !== date;
        return (
          <Fragment key={m.message_uuid}>
            {newDay && (
              <li className={styles.date} aria-hidden="true">
                {formatMonthDayJa(date)}
              </li>
            )}
            <LogItem
              message={m}
              faceType={faceType}
              // 同じ人が同じ宛先に続けて発言したら、2 つ目からはアイコンと名前を省く
              continued={!newDay && prev != null && groupKey(prev) === groupKey(m)}
            />
          </Fragment>
        );
      })}
    </ol>
  );
};

/** 発言者と宛先が同じ発言をまとめるためのキー */
const groupKey = (m: ChatMessage) =>
  [
    m.sender_kind,
    m.sender ?? "",
    m.sender_user?.username ?? "",
    logCategoryOf(m),
    recipientsOf(m).join(""),
  ].join(":");

/** 発言者名の行（密談は宛先も出す） */
const headLabel = (m: ChatMessage, name: string) => {
  if (logCategoryOf(m) !== "private") return name;
  return `${name} to: ${recipientsOf(m)
    .map((c) => POWER_LABELS[c])
    .join("、")}`;
};

const LogItem = ({
  message: m,
  faceType,
  continued,
}: {
  message: ChatMessage;
  faceType: GameRegulation["face_type"];
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
      <li className={styles.systemRow}>
        <p className={styles.system}>{m.context}</p>
        {time}
      </li>
    );
  }

  const category = logCategoryOf(m);
  const bubbleClass = [
    styles.bubble,
    category === "private" ? styles.private : "",
    category === "personal" ? styles.personal : "",
  ].join(" ");
  const label = headLabel(m, name);
  return (
    <li className={`${styles.item} ${continued ? styles.continued : ""}`}>
      <span className={styles.icon}>
        {!continued && <SenderIcon message={m} faceType={faceType} name={name} />}
      </span>
      <div className={styles.body}>
        {continued ? (
          <span className="sr-only">{label}</span>
        ) : (
          <span className={styles.head}>
            {label}
            {category === "personal" && <span className="sr-only">（独り言）</span>}
          </span>
        )}
        <div className={styles.bubbleRow}>
          {m.kind === "masked" ? (
            <p className={bubbleClass}>
              <span aria-hidden="true">……</span>
              <span className="sr-only">（内容は非公開）</span>
            </p>
          ) : (
            <p className={bubbleClass}>{m.context}</p>
          )}
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
      return <AdminImage faceType={faceType} size={40} />;
    case "user":
      return (
        <UserAvatar name={name} avatarUrl={message.sender_user?.avatar_url} size={40} />
      );
    default:
      return <PowerImage faceType={faceType} code={message.sender} size={40} />;
  }
};
