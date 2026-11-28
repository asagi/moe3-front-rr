import { useId, useState } from "react";
import { PowerImage } from "~/components/power-image/PowerImage";
import { UserAvatar } from "~/components/user-avatar/UserAvatar";
import { type GameRegulation, POWER_LABELS, type PowerCode } from "~/lib/game";
import styles from "./AdminHeader.module.css";

/** 卓内のページで、視点変更に選べる国 */
export interface AdminViewpoints {
  faceType: GameRegulation["face_type"];
  /** 担当国が決まっている参加者（国の並び順）。国の割り当て前は空 */
  powers: { power: PowerCode; username: string; eliminated: boolean }[];
}

/** 視点変更先のユーザー（アイコン表示用） */
export interface ImpersonateUser {
  name: string;
  avatarUrl?: string | null;
}

export interface AdminHeaderProps {
  /** 「視点変更」で表示中のユーザー名。未設定なら null */
  impersonateUsername?: string | null;
  /** 視点変更先のユーザー。切り替え済みならアイコンを出す（切替中・失敗時は null） */
  impersonateUser?: ImpersonateUser | null;
  /** 視点変更のユーザー名が不正だったときのエラーメッセージ（本人として表示している） */
  impersonateError?: string | null;
  /** 「切替」押下時の処理（入力されたユーザー名を受け取る。先頭の @ は外す） */
  onImpersonate?: (username: string) => void;
  /** 「解除」押下時の処理 */
  onClearImpersonate?: () => void;
  /** 第三者として見ているか */
  thirdParty?: boolean;
  /** 「第三者」を選んだときの処理 */
  onThirdParty?: () => void;
  /**
   * 卓内のページなら、視点変更に選べる国（管理人・第三者・国名の選択リストを出す）。
   * 卓の外のページでは null（ユーザー名の入力欄を出す）
   */
  viewpoints?: AdminViewpoints | null;
}

/** 選択リストの値（管理人・第三者・国・リストにないユーザー） */
type ViewpointValue = "admin" | "third_party" | "other" | PowerCode;

/** 管理者モード ON のときに通常ヘッダの下に表示するヘッダ */
export const AdminHeader = ({
  impersonateUsername,
  impersonateUser,
  impersonateError,
  onImpersonate,
  onClearImpersonate,
  thirdParty = false,
  onThirdParty,
  viewpoints = null,
}: AdminHeaderProps) => {
  const [username, setUsername] = useState("");
  const inputId = useId();
  const selectId = useId();
  // 「@asagix」のように @ 付きで入力されても受け付ける
  const trimmed = username.trim().replace(/^@/, "");

  // 入力欄（国の割り当て前の卓内と、卓の外で使う）
  const usernameForm = (label: string) => (
    <form
      className={styles.impersonate}
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        onImpersonate?.(trimmed);
      }}
    >
      <label htmlFor={inputId} className={label ? undefined : "sr-only"}>
        {label || "視点変更するユーザー名"}
      </label>
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
  );

  // 卓内のページ：管理人・第三者・国名から選ぶ（国を選ぶと、内部ではその担当者に切り替える）
  if (viewpoints) {
    const selected = viewpoints.powers.find(
      (p) => impersonateUsername != null && p.username === impersonateUsername,
    );
    const value: ViewpointValue = thirdParty
      ? "third_party"
      : selected
        ? selected.power
        : impersonateUsername
          ? "other"
          : "admin";
    return (
      <div className={styles.root} role="region" aria-label="管理者メニュー">
        <span className={styles.label}>管理者モード</span>
        <div className={styles.impersonate}>
          {impersonateError && (
            <span className={styles.status} role="alert">
              <span className={styles.username}>@{impersonateUsername}</span>{" "}
              に切り替えられませんでした（{impersonateError}）
            </span>
          )}
          <label htmlFor={selectId}>視点</label>
          {selected && (
            <PowerImage
              faceType={viewpoints.faceType}
              code={selected.power}
              size={24}
              defeated={selected.eliminated}
            />
          )}
          <select
            id={selectId}
            className={styles.select}
            value={value}
            onChange={(e) => {
              const next = e.target.value as ViewpointValue;
              if (next === "admin") onClearImpersonate?.();
              else if (next === "third_party") onThirdParty?.();
              else if (next !== "other") {
                const target = viewpoints.powers.find((p) => p.power === next);
                if (target) onImpersonate?.(target.username);
              }
            }}
          >
            <option value="admin">管理人</option>
            <option value="third_party">第三者</option>
            {viewpoints.powers.map((p) => (
              <option key={p.power} value={p.power}>
                {POWER_LABELS[p.power]}
                {p.eliminated ? "（滅亡）" : ""}
              </option>
            ))}
            {/* 卓の外で、参加者でないユーザーに切り替えてきたとき */}
            {value === "other" && (
              <option value="other" disabled>
                @{impersonateUsername}
              </option>
            )}
          </select>
          {/* 国の割り当て前は国を選べないので、ユーザー名でも切り替えられるようにする */}
          {viewpoints.powers.length === 0 &&
            value === "admin" &&
            usernameForm("")}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root} role="region" aria-label="管理者メニュー">
      <span className={styles.label}>管理者モード</span>
      {thirdParty ? (
        <div className={styles.impersonate}>
          <span className={styles.status}>
            第三者<span className={styles.nowrap}>として表示中</span>
          </span>
          <button
            type="button"
            className={styles.button}
            onClick={() => onClearImpersonate?.()}
          >
            解除
          </button>
        </div>
      ) : impersonateUsername ? (
        <div className={styles.impersonate}>
          {impersonateError ? (
            <span className={styles.status} role="alert">
              <span className={styles.username}>@{impersonateUsername}</span>{" "}
              に切り替えられませんでした（{impersonateError}）
            </span>
          ) : (
            <>
              {impersonateUser && (
                <UserAvatar
                  name={impersonateUser.name}
                  avatarUrl={impersonateUser.avatarUrl}
                  size={24}
                />
              )}
              <span className={styles.status}>
                <span className={styles.username}>@{impersonateUsername}</span>{" "}
                <span className={styles.nowrap}>の視点で表示中</span>
              </span>
            </>
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
        usernameForm("視点変更")
      )}
    </div>
  );
};
