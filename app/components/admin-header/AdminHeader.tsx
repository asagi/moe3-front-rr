import { useId, useState } from "react";
import styles from "./AdminHeader.module.css";

export interface AdminHeaderProps {
  /** 「視点変更」で表示中のユーザー ID。未設定なら null */
  impersonateUserId?: string | null;
  /** 「切替」押下時の処理（入力されたユーザー ID を受け取る） */
  onImpersonate?: (userId: string) => void;
  /** 「解除」押下時の処理 */
  onClearImpersonate?: () => void;
}

/** 管理者モード ON のときに通常ヘッダの下に表示するヘッダ */
export const AdminHeader = ({
  impersonateUserId,
  onImpersonate,
  onClearImpersonate,
}: AdminHeaderProps) => {
  const [userId, setUserId] = useState("");
  const inputId = useId();
  const trimmed = userId.trim();

  return (
    <div className={styles.root} role="region" aria-label="管理者メニュー">
      <span className={styles.label}>管理者モード</span>
      {impersonateUserId ? (
        <div className={styles.impersonate}>
          <span>
            <span className={styles.userId}>{impersonateUserId}</span>{" "}
            の視点で表示中
          </span>
          <button
            type="button"
            className={styles.button}
            onClick={() => onClearImpersonate?.()}
          >
            解除
          </button>
        </div>
      ) : (
        <form
          className={styles.impersonate}
          onSubmit={(e) => {
            e.preventDefault();
            if (!trimmed) return;
            onImpersonate?.(trimmed);
            setUserId("");
          }}
        >
          <label htmlFor={inputId}>視点変更</label>
          <input
            id={inputId}
            className={styles.input}
            type="text"
            placeholder="ユーザー ID"
            autoComplete="off"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button type="submit" className={styles.button} disabled={!trimmed}>
            切替
          </button>
        </form>
      )}
    </div>
  );
};
