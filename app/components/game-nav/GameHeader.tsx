import styles from "./GameNav.module.css";

export interface GameHeaderProps {
  /** 卓番号（"#001"）。採番前は null */
  numberLabel: string | null;
  /** ページ名やシーズン（「卓情報」「1901 年春」など） */
  title: string;
}

/** サイトヘッダの下に出す卓ヘッダ（「#001： 卓情報」） */
export const GameHeader = ({ numberLabel, title }: GameHeaderProps) => (
  <div className={styles.header}>
    <h2>{numberLabel ? `${numberLabel}： ${title}` : title}</h2>
  </div>
);
