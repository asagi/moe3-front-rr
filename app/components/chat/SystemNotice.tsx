import { useId, useState } from "react";
import { PowerImage } from "~/components/power-image/PowerImage";
import type { ChatMessage } from "~/lib/chat";
import { type GameRegulation, POWER_LABELS } from "~/lib/game";
import {
  type NoticeSegment,
  isMilestone,
  noticeSegments,
} from "~/lib/system-notice";
import styles from "./SystemNotice.module.css";

/** チャンネル画面（アイコン 32px）とログビューアー（40px）で、左の余白と文字の大きさを変える */
export type SystemNoticeVariant = "channel" | "log";

interface CommonProps {
  faceType: GameRegulation["face_type"];
  variant: SystemNoticeVariant;
}

const Time = ({ value }: { value: string }) => (
  <time className={styles.time} dateTime={value}>
    {value.slice(11)}
  </time>
);

/** 本文（国は小さな画像と国名で出す）。種類が分からなければサーバーの本文 */
const NoticeText = ({
  message,
  faceType,
}: {
  message: ChatMessage;
  faceType: CommonProps["faceType"];
}) => {
  const segments = message.notice ? noticeSegments(message.notice) : null;
  if (!segments) return <>{message.context}</>;
  return (
    <>
      {segments.map((s: NoticeSegment, i) =>
        typeof s === "string" ? (
          <span key={i}>{s}</span>
        ) : (
          <span key={i} className={styles.power}>
            <PowerImage
              faceType={faceType}
              code={s.power}
              size={14}
              className={styles.powerImage}
            />
            {POWER_LABELS[s.power]}
          </span>
        ),
      )}
    </>
  );
};

/**
 * システムメッセージ 1 件。
 * 区切り（シーズン開始・単独勝利など）は画面幅の帯、それ以外は点線の枠で中央に出す
 */
export const SystemNoticeItem = ({
  message,
  faceType,
  variant,
}: CommonProps & { message: ChatMessage }) =>
  isMilestone(message) ? (
    // 時刻は帯の上の中央に出す
    <li className={styles.milestone} data-variant={variant}>
      <Time value={message.created_at} />
      <div className={styles.milestoneBand}>
        <span className={styles.milestoneLine} aria-hidden="true" />
        <p className={styles.milestoneText}>
          <NoticeText message={message} faceType={faceType} />
        </p>
        <span className={styles.milestoneLine} aria-hidden="true" />
      </div>
    </li>
  ) : (
    <li className={styles.row} data-variant={variant}>
      <p className={styles.notice}>
        <NoticeText message={message} faceType={faceType} />
      </p>
      <Time value={message.created_at} />
    </li>
  );

/** 続いた盤面編集の通知を 1 行にまとめたもの。押すと中身を開く */
export const BoardEditGroup = ({
  messages,
  faceType,
  variant,
}: CommonProps & { messages: ChatMessage[] }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const last = messages[messages.length - 1];
  return (
    <li className={styles.group} data-variant={variant}>
      <div className={styles.row} data-variant={variant}>
        <button
          type="button"
          className={styles.groupToggle}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? "▾" : "▸"}</span>
          盤面が編集されました（{messages.length} 件）
        </button>
        <Time value={last.created_at} />
      </div>
      {open && (
        <ul id={id} className={styles.groupItems}>
          {messages.map((m) => (
            <SystemNoticeItem
              key={m.message_uuid}
              message={m}
              faceType={faceType}
              variant={variant}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
