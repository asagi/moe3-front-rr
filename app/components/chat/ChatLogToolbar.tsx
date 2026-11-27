import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { type LogCategory, LOG_CATEGORIES } from "~/lib/chat";
import { POWERS, POWER_LABELS, type PowerCode } from "~/lib/game";
import styles from "./ChatLog.module.css";

export interface ChatLogToolbarProps {
  /** 視点にしている国（null なら指定なし） */
  pov?: PowerCode | null;
  /** 視点変更を使えるか（開戦前夜・感想戦は国ごとの密談がないので使えない） */
  povEnabled?: boolean;
  /** 出さない種類 */
  hidden: ReadonlySet<LogCategory>;
  /** フィルタに出す種類（進行中の卓は独り言が見えないので出さない） */
  categories: LogCategory[];
  /** 視点を変えたとき。指定しなければ視点変更のボタンを出さない（オープンチャンネル） */
  onPovChange?: (pov: PowerCode | null) => void;
  onHiddenChange: (hidden: Set<LogCategory>) => void;
  /**
   * bar: 卓ヘッダの下に固定するバーとして出す（ログビューアー）。
   * inline: ボタンだけを出す（チャンネル画面の見出しのバーの右端に置く）
   */
  variant?: "bar" | "inline";
}

/** ログビューアーの上のツールバー（視点変更とフィルタ）。オープンチャンネルではフィルタだけを使う */
export const ChatLogToolbar = ({
  pov = null,
  povEnabled = false,
  hidden,
  categories,
  onPovChange,
  onHiddenChange,
  variant = "bar",
}: ChatLogToolbarProps) => {
  const [open, setOpen] = useState<"pov" | "filter" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // メニューの外側クリック・Escape で閉じる
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const activePov = povEnabled ? pov : null;
  const filtering = categories.some((c) => hidden.has(c));
  const toggle = (menu: "pov" | "filter") =>
    setOpen((v) => (v === menu ? null : menu));

  const toolbar = (
    <div
      ref={rootRef}
      className={variant === "inline" ? styles.toolbarInline : styles.toolbar}
    >
      {activePov && (
        <span className={styles.toolbarStatus}>
          {POWER_LABELS[activePov]}の視点
        </span>
      )}
      {onPovChange && (
        <ToolButton
          label="視点変更"
          title={
            povEnabled ? "視点変更" : "開戦前夜と感想戦では視点変更できません"
          }
          active={activePov != null}
          disabled={!povEnabled}
          expanded={open === "pov"}
          controls={open === "pov" ? panelId : undefined}
          onClick={() => toggle("pov")}
        >
          <EyeIcon />
        </ToolButton>
      )}
      <ToolButton
        label="フィルタ"
        title="フィルタ"
        active={filtering}
        expanded={open === "filter"}
        controls={open === "filter" ? panelId : undefined}
        onClick={() => toggle("filter")}
      >
        <FilterIcon />
      </ToolButton>

      {open === "pov" && onPovChange && (
        <fieldset id={panelId} className={styles.menu}>
          <legend className={styles.menuTitle}>視点</legend>
          <p className={styles.menuNote}>
            選んだ国が進行中に読めなかった発言を隠します
          </p>
          {[{ code: null, label: "指定なし" }, ...POWERS].map((p) => (
            <label key={p.code ?? "none"} className={styles.menuItem}>
              <input
                type="radio"
                name={`${panelId}-pov`}
                checked={activePov === p.code}
                onChange={() => {
                  onPovChange(p.code);
                  setOpen(null);
                }}
              />
              {p.label}
            </label>
          ))}
        </fieldset>
      )}
      {open === "filter" && (
        <fieldset id={panelId} className={styles.menu}>
          <legend className={styles.menuTitle}>表示する発言</legend>
          {LOG_CATEGORIES.filter((c) => categories.includes(c.value)).map(
            (c) => (
              <label key={c.value} className={styles.menuItem}>
                <input
                  type="checkbox"
                  checked={!hidden.has(c.value)}
                  onChange={(e) => {
                    const next = new Set(hidden);
                    if (e.target.checked) next.delete(c.value);
                    else next.add(c.value);
                    onHiddenChange(next);
                  }}
                />
                {c.label}
              </label>
            ),
          )}
        </fieldset>
      )}
    </div>
  );
  if (variant === "inline") return toolbar;
  // 卓ヘッダのすぐ下に固定するバー（中身はページと同じ幅にそろえる）
  return <div className={styles.toolbarBar}>{toolbar}</div>;
};

const ToolButton = ({
  label,
  title,
  active,
  disabled = false,
  expanded,
  controls,
  onClick,
  children,
}: {
  label: string;
  title: string;
  active: boolean;
  disabled?: boolean;
  expanded: boolean;
  controls: string | undefined;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    className={`${styles.toolButton} ${active ? styles.toolButtonActive : ""}`}
    aria-label={label}
    title={title}
    aria-pressed={active}
    aria-expanded={expanded}
    aria-controls={controls}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);

const Svg = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const EyeIcon = () => (
  <Svg>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </Svg>
);

const FilterIcon = () => (
  <Svg>
    <path d="M3 4.5h18l-7 8.2v6.3l-4 1.5v-7.8z" />
  </Svg>
);
