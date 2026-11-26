import { Link } from "react-router";
import {
  DURATION_TYPE_LABELS,
  FACE_TYPE_LABELS,
  GAME_STATUS_LABELS,
  type GameStatus,
  type GameSummary,
  MAX_PLAYERS,
  PROGRESS_MODE_LABELS,
  gameTitle,
} from "~/lib/game";
import styles from "./GameList.module.css";

export interface GameListProps {
  /** 表示する卓。null なら取得に失敗したものとしてエラーを出す */
  games: GameSummary[] | null;
  /** 0 件のときに表示するメッセージ */
  emptyMessage: string;
}

/** 卓の一覧（各行は卓のページへのリンク。卓の状態に合わせたページが開く） */
export const GameList = ({ games, emptyMessage }: GameListProps) => {
  if (games == null) {
    return (
      <p className={styles.message} role="alert">
        卓の一覧を取得できませんでした。時間をおいて再度お試しください。
      </p>
    );
  }
  if (games.length === 0) {
    return <p className={styles.message}>{emptyMessage}</p>;
  }

  return (
    <ul className={styles.list}>
      {games.map((game) => (
        <li key={game.game_uuid}>
          {/* 卓の状態に合わせたページ（卓情報・チャット・命令）に、入口のルートから移る */}
          <Link to={`/games/${game.game_uuid}/enter`} className={styles.item}>
            <div className={styles.head}>
              <span className={styles.title}>{gameTitle(game)}</span>
              <StatusBadge status={game.status} />
            </div>
            <dl className={styles.meta}>
              <div>
                <dt>シーズン</dt>
                <dd>{game.season ?? "開始前"}</dd>
              </div>
              <div>
                <dt>次回更新</dt>
                <dd>{game.next_update_at ?? "未定"}</dd>
              </div>
              <div>
                <dt>参加</dt>
                <dd>
                  {game.player_count} / {MAX_PLAYERS} 人
                </dd>
              </div>
            </dl>
            <ul className={styles.tags} aria-label="レギュレーション">
              <li>{FACE_TYPE_LABELS[game.regulation.face_type]}</li>
              <li>{DURATION_TYPE_LABELS[game.regulation.duration_type]}</li>
              <li>{PROGRESS_MODE_LABELS[game.regulation.progress_mode]}</li>
            </ul>
          </Link>
        </li>
      ))}
    </ul>
  );
};

const StatusBadge = ({ status }: { status: GameStatus }) => (
  <span className={styles.status} data-status={status}>
    {GAME_STATUS_LABELS[status] ?? status}
  </span>
);
