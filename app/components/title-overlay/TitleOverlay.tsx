import styles from "./TitleOverlay.module.css";

export interface TitleOverlayProps {
  /** 閉じたとき（✕ でも、膜のどこを押しても閉じる） */
  onClose: () => void;
}

/**
 * トップページの地図に重ねるタイトル。
 * 地図全体を半透明の白い膜で覆い、そのあいだは地図の地域を押せない。
 * 親（position: relative）いっぱいに広がる
 */
export const TitleOverlay = ({ onClose }: TitleOverlayProps) => (
  // 膜のどこを押しても閉じる（キーボードでは ✕ ボタンで閉じる）
  <div className={styles.veil} onClick={onClose}>
    <div className={styles.card}>
      <button
        type="button"
        className={styles.close}
        aria-label="タイトルを閉じる"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <h2 className={styles.title}>Diplomacy MOE</h2>
    </div>
  </div>
);
