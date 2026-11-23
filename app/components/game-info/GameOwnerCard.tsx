import { PowerImage } from "~/components/power-image/PowerImage";
import { UserAvatar } from "~/components/user-avatar/UserAvatar";
import {
  type GamePlayer,
  type GameRegulation,
  POWER_LABELS,
  displayName,
} from "~/lib/game";
import styles from "./GameInfo.module.css";

export interface GameOwnerCardProps {
  owner: GamePlayer;
  faceType: GameRegulation["face_type"];
}

/** 卓主のアカウントと希望国（開始後は担当国） */
export const GameOwnerCard = ({ owner, faceType }: GameOwnerCardProps) => {
  const name = displayName(owner.user);
  // 開始後は担当国、開始前は希望国を出す
  const power = owner.power ?? owner.requested_power;
  const powerLabel = owner.power
    ? POWER_LABELS[owner.power]
    : owner.requested_power
      ? `希望：${POWER_LABELS[owner.requested_power]}`
      : "希望なし";

  return (
    <section className={styles.ownerCard} aria-labelledby="game-owner-title">
      <h3 id="game-owner-title" className={styles.ownerTitle}>
        卓主
      </h3>
      <div className={styles.ownerBody}>
        <div className={styles.ownerUser}>
          <UserAvatar name={name} avatarUrl={owner.user.avatar_url} size={48} />
          <span className={styles.userName}>{name}</span>
          <span className={styles.userId}>@{owner.user.username}</span>
        </div>
        <div className={styles.ownerPower}>
          <PowerImage faceType={faceType} code={power} size={48} />
          <span>{powerLabel}</span>
        </div>
      </div>
    </section>
  );
};
