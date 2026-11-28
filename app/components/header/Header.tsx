import {
  AdminHeader,
  type AdminViewpoints,
  type ImpersonateUser,
} from "~/components/admin-header/AdminHeader";
import { DiscordLoginButton } from "~/components/discord-login-button/DiscordLoginButton";
import { UserMenu } from "~/components/user-menu/UserMenu";
import styles from "./Header.module.css";

export type HeaderUser = {
  name: string;
  avatarUrl?: string | null;
  /** 管理者か */
  isAdmin?: boolean;
};

export interface HeaderProps {
  user?: HeaderUser | null;
  onLogin?: () => void;
  /** タイトル（ロゴ）クリック時の処理。未指定なら通常のリンクとして / へ遷移する */
  onHome?: () => void;
  onLogout?: () => void;
  onMyPage?: () => void;
  /** 管理者モードが ON か。ON なら通常ヘッダの下に管理者用ヘッダを表示する */
  adminMode?: boolean;
  onAdminModeChange?: (enabled: boolean) => void;
  /** 「視点変更」で表示中のユーザー名（管理者用ヘッダに表示する） */
  impersonateUsername?: string | null;
  /** 視点変更先のユーザー（管理者用ヘッダにアイコンを出す） */
  impersonateUser?: ImpersonateUser | null;
  /** 視点変更のユーザー名が不正だったときのエラーメッセージ */
  impersonateError?: string | null;
  onImpersonate?: (username: string) => void;
  onClearImpersonate?: () => void;
  /** 視点変更で第三者として見ているか */
  impersonateThirdParty?: boolean;
  onImpersonateThirdParty?: () => void;
  /** 卓内のページなら、視点変更に選べる国（管理者用ヘッダに選択リストを出す） */
  adminViewpoints?: AdminViewpoints | null;
}

export const Header = ({
  user,
  onLogin,
  onHome,
  onLogout,
  onMyPage,
  adminMode = false,
  onAdminModeChange,
  impersonateUsername,
  impersonateUser,
  impersonateError,
  onImpersonate,
  onClearImpersonate,
  impersonateThirdParty = false,
  onImpersonateThirdParty,
  adminViewpoints = null,
}: HeaderProps) => (
  <header>
    <div className={styles["header"]}>
      <div>
        <a
          href="/"
          className={styles.home}
          onClick={(e) => {
            // 新しいタブで開く操作（修飾キー・中クリック）はブラウザに任せる
            if (!onHome || e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            onHome();
          }}
        >
          <img src="/favicon.ico" width="30" height="30" alt="" />
          <h1>Diplomacy MOE</h1>
        </a>
      </div>
      <div>
        {user ? (
          <UserMenu
            name={user.name}
            avatarUrl={user.avatarUrl}
            onLogout={onLogout}
            onMyPage={onMyPage}
            isAdmin={user.isAdmin}
            adminMode={adminMode}
            onAdminModeChange={onAdminModeChange}
          />
        ) : (
          <DiscordLoginButton onClick={onLogin} />
        )}
      </div>
    </div>
    {user?.isAdmin && adminMode && (
      <AdminHeader
        impersonateUsername={impersonateUsername}
        impersonateUser={impersonateUser}
        impersonateError={impersonateError}
        onImpersonate={onImpersonate}
        onClearImpersonate={onClearImpersonate}
        thirdParty={impersonateThirdParty}
        onThirdParty={onImpersonateThirdParty}
        viewpoints={adminViewpoints}
      />
    )}
  </header>
);
