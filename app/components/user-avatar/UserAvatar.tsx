import { useState } from "react";
import styles from "./UserAvatar.module.css";

export interface UserAvatarProps {
  /** 表示名（画像がないときは頭文字を出す） */
  name: string;
  avatarUrl?: string | null;
  /** 一辺（px） */
  size?: number;
  className?: string;
}

/** Discord のアバター。画像がない・読み込めないときは頭文字の丸を出す */
export const UserAvatar = ({
  name,
  avatarUrl,
  size = 32,
  className,
}: UserAvatarProps) => {
  const [failed, setFailed] = useState(false);
  if (avatarUrl && !failed) {
    return (
      <img
        className={`${styles.avatar} ${className ?? ""}`}
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className={`${styles.avatar} ${styles.fallback} ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
      aria-hidden="true"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
};
