import { Link } from "react-router";
import styles from "./GameNav.module.css";

/** 前後のシーズンへのリンク先。そのシーズンがない（今いる）ときは null でグレーアウトする */
export interface SeasonNav {
  /** 開戦前夜 */
  first: string | null;
  /** 直前のシーズン */
  prev: string | null;
  /** 直後のシーズン */
  next: string | null;
  /** 最新のシーズン */
  latest: string | null;
}

export interface GameHeaderProps {
  /** 卓番号（"#001"）。採番前は null */
  numberLabel: string | null;
  /** ページ名やシーズン（「卓情報」「1901 年春」など） */
  title: string;
  /** 指定すると、タイトルの左右にシーズンを切り替えるボタンを出す（カレンダー・チャット・命令） */
  seasonNav?: SeasonNav;
}

/** サイトヘッダの下に出す卓ヘッダ（「#001： 卓情報」） */
export const GameHeader = ({ numberLabel, title, seasonNav }: GameHeaderProps) => {
  const heading = <h2>{numberLabel ? `${numberLabel}： ${title}` : title}</h2>;
  if (!seasonNav) return <div className={styles.header}>{heading}</div>;
  return (
    <div className={`${styles.header} ${styles.withSeasonNav}`}>
      <nav className={styles.seasonNav} aria-label="前のシーズン">
        <NavButton to={seasonNav.first} label="開戦前夜へ" icon="first" />
        <NavButton to={seasonNav.prev} label="直前のシーズンへ" icon="prev" />
      </nav>
      {heading}
      <nav className={styles.seasonNav} aria-label="後のシーズン">
        <NavButton to={seasonNav.next} label="直後のシーズンへ" icon="next" />
        <NavButton to={seasonNav.latest} label="最新のシーズンへ" icon="latest" />
      </nav>
    </div>
  );
};

type Icon = "first" | "prev" | "next" | "latest";

/** |<  <  >  >| のアイコン（右向きは左向きを反転する） */
const NavIcon = ({ icon }: { icon: Icon }) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    aria-hidden="true"
    style={icon === "next" || icon === "latest" ? { transform: "scaleX(-1)" } : undefined}
  >
    <path
      d={icon === "first" || icon === "latest" ? "M11 3 6 8l5 5M3.5 3v10" : "M10 3 5 8l5 5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NavButton = ({ to, label, icon }: { to: string | null; label: string; icon: Icon }) =>
  to == null ? (
    <span className={styles.seasonNavButton} aria-disabled="true" aria-label={label} role="link">
      <NavIcon icon={icon} />
    </span>
  ) : (
    <Link to={to} className={styles.seasonNavButton} aria-label={label} preventScrollReset>
      <NavIcon icon={icon} />
    </Link>
  );
