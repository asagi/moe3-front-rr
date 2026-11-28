import { Fragment } from "react";
import { Link } from "react-router";
import { AdminImage, PowerImage } from "~/components/power-image/PowerImage";
import { UserAvatar } from "~/components/user-avatar/UserAvatar";
import {
  type ChatMessage,
  type ChatSelf,
  channelIdOf,
  isGhost,
  isMine,
  logCategoryOf,
  recipientsOf,
  senderName,
} from "~/lib/chat";
import {
  type GameRegulation,
  POWER_LABELS,
  formatMonthDayJa,
} from "~/lib/game";
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
  /**
   * オープンチャンネルに密談を混ぜて出すときの、グループチャンネルの URL。
   * 指定すると、密談に宛先を出して青系の吹き出しに、自分の独り言は暗いグレーの吹き出しにし、
   * 本文が読める密談と独り言はそのチャンネルへのリンクにする
   */
  channelHref?: (channelId: string) => string;
  /** 何も出すものがないときの文言 */
  emptyText?: string;
}

/** チャンネルのメッセージ一覧 */
export const ChatMessageList = ({
  messages,
  faceType,
  self,
  channelHref,
  emptyText = "このシーズンの発言はまだありません",
}: ChatMessageListProps) => {
  if (messages.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
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
                channelHref={channelHref}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
};

/** 発言者を区別するキー（システムメッセージは毎回別。密談は宛先が変わったら別） */
const senderKey = (m: ChatMessage) =>
  m.sender_kind === "system"
    ? m.message_uuid
    : [
        m.sender_kind,
        m.sender ?? "",
        m.sender_user?.username ?? "",
        logCategoryOf(m),
        recipientsOf(m).join(""),
      ].join(":");

/** 密談の宛先（「オーストリア、フランス」） */
const recipientsLabel = (m: ChatMessage) =>
  recipientsOf(m)
    .map((c) => POWER_LABELS[c])
    .join("、");

/** 吹き出しの中身。内容が見えない密談は「……」 */
const BubbleText = ({ message: m }: { message: ChatMessage }) =>
  m.kind === "masked" ? (
    <>
      <span aria-hidden="true">……</span>
      <span className="sr-only">（内容は非公開）</span>
    </>
  ) : (
    <>{m.context}</>
  );

const MessageItem = ({
  message: m,
  faceType,
  self,
  continued,
  channelHref,
}: {
  message: ChatMessage;
  faceType: GameRegulation["face_type"];
  self: ChatSelf;
  continued: boolean;
  channelHref?: (channelId: string) => string;
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
  // オープンチャンネルに混ぜて出す密談（宛先を出し、青系の吹き出しにする）と
  // 自分の独り言（暗いグレーの吹き出しにする）
  const category = logCategoryOf(m);
  const mixedPrivate = channelHref != null && category === "private";
  const mixedPersonal = channelHref != null && category === "personal";
  // 本文が読める密談と独り言は、押すとそのチャンネルへ移る
  const groupId =
    (mixedPrivate || mixedPersonal) && m.kind !== "masked"
      ? channelIdOf(m)
      : null;
  const bubbleClass = [
    styles.bubble,
    category === "open" ? styles.open : "",
    mixedPrivate ? styles.private : "",
    // 独り言は、独り言のチャンネルでもログビューアーと同じ暗いグレー地に白字にする
    category === "personal" ? styles.personal : "",
  ].join(" ");
  const bubble = (srLabel: string) => {
    const content = (
      <p className={bubbleClass}>
        {srLabel && <span className="sr-only">{srLabel}</span>}
        <BubbleText message={m} />
      </p>
    );
    return groupId && channelHref ? (
      <Link to={channelHref(groupId)} className={styles.bubbleLink}>
        {content}
        <span className="sr-only">
          {mixedPersonal ? "（独り言を開く）" : "（グループチャンネルを開く）"}
        </span>
      </Link>
    ) : (
      content
    );
  };

  if (isMine(m, self)) {
    // 自分の発言はアイコンと名前を出さず、右に寄せる（時刻は吹き出しの左下）
    const mineClasses = [
      styles.message,
      styles.mine,
      isGhost(m) ? styles.ghost : "",
      continued ? styles.continued : "",
    ].join(" ");
    if (mixedPrivate || mixedPersonal) {
      // 自分の密談は吹き出しの上に宛先だけを、独り言は「独り言」と出す
      const head = mixedPrivate ? `to: ${recipientsLabel(m)}` : "独り言";
      return (
        <li className={mineClasses}>
          {time}
          <div className={styles.mineBody}>
            {!continued && (
              <span className={styles.sender} aria-hidden="true">
                {head}
              </span>
            )}
            {bubble(mixedPrivate ? `${name} ${head}: ` : `${name}（独り言）: `)}
          </div>
        </li>
      );
    }
    return (
      <li className={mineClasses}>
        {time}
        {bubble(`${name}: `)}
      </li>
    );
  }
  const label = mixedPrivate ? `${name} to: ${recipientsLabel(m)}` : name;
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
          <span className="sr-only">{label}</span>
        ) : (
          <span className={styles.sender}>{label}</span>
        )}
        <div className={styles.bubbleRow}>
          {bubble("")}
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
