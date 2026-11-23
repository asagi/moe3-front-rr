import { PowerImage } from "~/components/power-image/PowerImage";
import { UserAvatar } from "~/components/user-avatar/UserAvatar";
import {
  type GamePlayer,
  type GameRegulation,
  POWER_LABELS,
  displayName,
} from "~/lib/game";
import styles from "./GameInfo.module.css";

export interface GamePlayerListProps {
  /** 表示する参加者（卓主は別に出すので含めない） */
  players: GamePlayer[];
  faceType: GameRegulation["face_type"];
  /** 募集中ならあと何名参加できるか。募集中でなければ null */
  remaining: number | null;
}

/** 参加者の一覧（開始後は担当国も出す） */
export const GamePlayerList = ({
  players,
  faceType,
  remaining,
}: GamePlayerListProps) => (
  <section className={styles.section} aria-labelledby="game-players-title">
    <h3 id="game-players-title" className={styles.sectionTitle}>
      参加者
      {remaining != null && (
        <span className={styles.remaining}>（あと {remaining} 名）</span>
      )}
    </h3>
    {players.length === 0 ? (
      <p className={styles.empty}>まだ参加者はいません</p>
    ) : (
      <ul className={styles.players}>
        {players.map((player) => {
          const name = displayName(player.user);
          return (
            <li key={player.user.discord_user_id} className={styles.player}>
              <UserAvatar
                name={name}
                avatarUrl={player.user.avatar_url}
                size={32}
              />
              <span className={styles.playerName}>
                <span className={styles.userName}>{name}</span>
                <span className={styles.userId}>@{player.user.username}</span>
              </span>
              {player.power && (
                <span className={styles.playerPower}>
                  <PowerImage faceType={faceType} code={player.power} size={32} />
                  <span>{POWER_LABELS[player.power]}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
