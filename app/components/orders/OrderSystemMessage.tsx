import styles from "./Orders.module.css";

export interface OrderSystemMessageProps {
  /** 出す文言（orderSystemMessage で作る） */
  message: string;
}

/** 命令画面のシステムメッセージ枠（次回更新時刻や、操作のお願い） */
export const OrderSystemMessage = ({ message }: OrderSystemMessageProps) => (
  <p className={styles.systemMessage} role="status">
    {message}
  </p>
);
