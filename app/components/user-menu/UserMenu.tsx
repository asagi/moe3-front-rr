import { useEffect, useId, useRef, useState } from "react";
import styles from "./UserMenu.module.css";

export interface UserMenuProps {
  /** 表示名 */
  name: string;
  /** アバター画像の URL。未設定なら頭文字を表示する */
  avatarUrl?: string | null;
  /** 「ログアウト」選択時の処理 */
  onLogout?: () => void;
}

/** ログイン中ユーザーのアバターと、クリックで開くメニュー */
export const UserMenu = ({ name, avatarUrl, onLogout }: UserMenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // メニューの外側クリック・Escape で閉じる
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`${name} のメニュー`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={name} avatarUrl={avatarUrl} />
      </button>
      {open && (
        <div id={menuId} role="menu" className={styles.menu}>
          <div className={styles.name}>{name}</div>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
};

const Avatar = ({
  name,
  avatarUrl,
}: Pick<UserMenuProps, "name" | "avatarUrl">) => {
  const [failed, setFailed] = useState(false);
  if (avatarUrl && !failed) {
    return (
      <img
        className={styles.avatar}
        src={avatarUrl}
        alt=""
        width={32}
        height={32}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={`${styles.avatar} ${styles.fallback}`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
};
