import { Link } from "react-router";
import { PowerImage } from "~/components/power-image/PowerImage";
import { type ChannelSummary, channelName, senderName } from "~/lib/chat";
import type { GameRegulation, PowerCode } from "~/lib/game";
import styles from "./Chat.module.css";

export interface ChannelListProps {
  channels: ChannelSummary[];
  faceType: GameRegulation["face_type"];
  /** 参加者の担当国（チャンネル名とアイコンから自国を省く）。担当国が決まる前は null */
  myPower: PowerCode | null;
  /** チャンネル画面の URL */
  channelHref: (channelId: string) => string;
}

/** チャンネル一覧（先頭はオープンチャンネル、以降は新しく発言があった順） */
export const ChannelList = ({
  channels,
  faceType,
  myPower,
  channelHref,
}: ChannelListProps) => (
  <ul className={styles.channels} aria-label="チャンネル一覧">
    {channels.map(({ channel, lastMessage }) => {
      const name = channelName(channel, myPower);
      return (
        <li key={channel.id}>
          <Link to={channelHref(channel.id)} className={styles.channel}>
            <span className={styles.channelIcons} aria-hidden="true">
              {channel.kind === "open" ? (
                <span className={styles.openIcon}>全体</span>
              ) : channel.kind === "personal" ? (
                <PowerImage faceType={faceType} code={channel.power} size={40} />
              ) : (
                channel.members
                  .filter((c) => c !== myPower)
                  .map((c) => (
                    <PowerImage key={c} faceType={faceType} code={c} size={24} />
                  ))
              )}
            </span>
            <span className={styles.channelBody}>
              <span className={styles.channelHead}>
                <span className={styles.channelName}>{name}</span>
                {lastMessage && (
                  <span className={styles.time}>
                    {lastMessage.created_at.slice(5)}
                  </span>
                )}
              </span>
              <span className={styles.channelPreview}>
                {lastMessage ? preview(lastMessage) : "まだ発言はありません"}
              </span>
            </span>
          </Link>
        </li>
      );
    })}
  </ul>
);

const preview = (m: NonNullable<ChannelSummary["lastMessage"]>) => {
  if (m.context == null) return "（内容は非公開）";
  const name = senderName(m);
  return name ? `${name}: ${m.context}` : m.context;
};
