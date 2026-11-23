import { useId, useState } from "react";
import styles from "./AdminHeader.module.css";

export interface AdminHeaderProps {
  /** 「視点変更」で表示中のユーザー名。未設定なら null */
  impersonateUsername?: string | null;
  /** 視点変更のユーザー名が不正だったときのエラーメッセージ（本人として表示している） */
  impersonateError?: string | null;
  /** 「切替」押下時の処理（入力されたユーザー名を受け取る。先頭の @ は外す） */
  onImpersonate?: (username: string) => void;
  /** 「解除」押下時の処理 */
  onClearImpersonate?: () => void;
}

/** 管理者モード ON のときに通常ヘッダの下に表示するヘッダ */
export const AdminHeader = ({
  impersonateUsername,
  impersonateError,
  onImpersonate,
  onClearImpersonate,
}: AdminHeaderProps) => {
  const [username, setUsername] = useState("");
  const inputId = useId();
  // 「@asagix」のように @ 付きで入力されても受け付ける
  const trimmed = username.trim().replace(/^@/, "");

  return (
    <div className={styles.root} role="region" aria-label="管理者メニュー">
      <span className={styles.label}>管理者モード</span>
      {impersonateUsername ? (
        <div className={styles.impersonate}>
          {impersonateError ? (
            <span className={styles.status} role="alert">
              <span className={styles.username}>@{impersonateUsername}</span>{" "}
              に切り替えられませんでした（{impersonateError}）
            </span>
          ) : (
            <span className={styles.status}>
              <span className={styles.username}>@{impersonateUsername}</span>{" "}
              <span className={styles.nowrap}>の視点で表示中</span>
            </span>
          )}
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              // 解除後も直前のユーザー名を入力欄に残す（再読み込み後でも戻るよう、解除時に入れ直す）
              setUsername(impersonateUsername);
              onClearImpersonate?.();
            }}
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
          }}
        >
          <label htmlFor={inputId}>視点変更</label>
          <input
            id={inputId}
            className={styles.input}
            type="text"
            placeholder="Discord ユーザー名"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button type="submit" className={styles.button} disabled={!trimmed}>
            切替
          </button>
        </form>
      )}
    </div>
  );
};
