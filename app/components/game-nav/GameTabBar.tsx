import type { ReactNode } from "react";
import { NavLink } from "react-router";
import styles from "./GameNav.module.css";

export interface GameTabBarProps {
  gameUuid: string;
  /** 命令ページを開けるか（開始前は開けない） */
  ordersEnabled: boolean;
  /** 盤面の編集ページを開けるか（卓主と管理者モード中の管理者が、開戦前夜かメインフェイズのときだけ） */
  maintenanceEnabled: boolean;
  /**
   * 見ているシーズン（URL の ?season=。最新のシーズンなら null）。
   * カレンダー・チャット・命令のあいだを移るときに引き継ぐ
   */
  season?: string | null;
  /**
   * チャットのタブのリンク先を、これに差し替える（最後に開いていたチャンネルに戻すため）。
   * 指定しなければチャンネル一覧（ログビューアー）
   */
  chatTo?: string | null;
}

/** 卓内のページを切り替える画面下のタブバー */
export const GameTabBar = ({
  gameUuid,
  ordersEnabled,
  maintenanceEnabled,
  season = null,
  chatTo = null,
}: GameTabBarProps) => {
  const base = `/games/${gameUuid}`;
  const query = season ? `?${new URLSearchParams({ season })}` : "";
  return (
    <nav className={styles.tabBar} aria-label="卓のメニュー">
      <ul>
        <Tab to={`${base}/calendar${query}`} label="カレンダー" icon={<CalendarIcon />} />
        <Tab to={chatTo ?? `${base}/chat${query}`} label="チャット" icon={<ChatIcon />} />
        <Tab
          to={`${base}/orders${query}`}
          label="命令"
          icon={<QuillIcon />}
          disabled={!ordersEnabled}
        />
        <Tab to={base} end label="卓情報" icon={<InfoIcon />} />
        <Tab
          to={`${base}/maintenance`}
          label="盤面の編集"
          icon={<GearIcon />}
          disabled={!maintenanceEnabled}
        />
      </ul>
    </nav>
  );
};

const Tab = ({
  to,
  end = false,
  label,
  icon,
  disabled = false,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
}) => (
  <li>
    {disabled ? (
      <span
        className={styles.tab}
        role="link"
        aria-disabled="true"
        aria-label={label}
        title={label}
      >
        {icon}
      </span>
    ) : (
      <NavLink
        to={to}
        end={end}
        className={styles.tab}
        aria-label={label}
        title={label}
      >
        {icon}
      </NavLink>
    )}
  </li>
);

const Svg = ({ children }: { children: ReactNode }) => (
  <svg
    className={styles.icon}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    fill="currentColor"
  >
    {children}
  </svg>
);

const CalendarIcon = () => (
  <Svg>
    <path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2zM5 9v10h14V9H5z" />
    <rect x="7" y="11" width="2" height="2" />
    <rect x="11" y="11" width="2" height="2" />
    <rect x="15" y="11" width="2" height="2" />
    <rect x="7" y="15" width="2" height="2" />
    <rect x="11" y="15" width="2" height="2" />
    <rect x="15" y="15" width="2" height="2" />
  </Svg>
);

const ChatIcon = () => (
  <Svg>
    <path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.6V21l4.1-2.5c.9.2 1.9.3 2.9.3 5.5 0 10-3.6 10-8S17.5 3 12 3zm0 2c4.4 0 8 2.7 8 6s-3.6 6-8 6c-.9 0-1.8-.1-2.6-.3l-.8-.2L7 17.4v-1.8l-.8-.6C4.8 13.9 4 12.5 4 11c0-3.3 3.6-6 8-6z" />
    <circle cx="8" cy="11" r="1.3" />
    <circle cx="12" cy="11" r="1.3" />
    <circle cx="16" cy="11" r="1.3" />
  </Svg>
);

const QuillIcon = () => (
  <Svg>
    <path d="M21 2c-5.5.6-10.4 4-12.6 9.4L7 15l1.6 1.6 3.4-1.5C17.4 12.9 20.6 7.8 21 2zm-9.6 10.2c1.3-2.6 3.4-4.8 6-6.3-1.4 2.6-3.6 4.8-6.3 6.1l.3.2z" />
    <path d="M5 17.5 3.5 19l1.5 1.5L6.5 19z" />
    <path d="M9 19h11v2H9z" />
  </Svg>
);

const InfoIcon = () => (
  <Svg>
    <path
      fillRule="evenodd"
      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 8.5h2.4V17h-2.4v-6.5zm0-3.5h2.4v2.3h-2.4V7z"
    />
  </Svg>
);

const GearIcon = () => (
  <Svg>
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </Svg>
);
