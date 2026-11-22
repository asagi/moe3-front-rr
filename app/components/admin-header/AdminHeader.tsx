import styles from "./AdminHeader.module.css";

/** 管理者モード ON のときに通常ヘッダの下に表示するヘッダ */
export const AdminHeader = () => (
  <div className={styles.root} role="region" aria-label="管理者メニュー">
    <span className={styles.label}>管理者モード</span>
  </div>
);
