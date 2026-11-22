import { AdminHeader } from "~/components/admin-header/AdminHeader";
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
  onLogout?: () => void;
  /** 管理者モードが ON か。ON なら通常ヘッダの下に管理者用ヘッダを表示する */
  adminMode?: boolean;
  onAdminModeChange?: (enabled: boolean) => void;
  /** 「視点変更」で表示中のユーザー ID（管理者用ヘッダに表示する） */
  impersonateUserId?: string | null;
  onImpersonate?: (userId: string) => void;
  onClearImpersonate?: () => void;
}

export const Header = ({
  user,
  onLogin,
  onLogout,
  adminMode = false,
  onAdminModeChange,
  impersonateUserId,
  onImpersonate,
  onClearImpersonate,
}: HeaderProps) => (
  <header>
    <div className={styles["header"]}>
      <div>
        <img src="/favicon.ico" width="24" height="24" alt="" />
        <h1>Diplomacy MOE</h1>
      </div>
      <div>
        {user ? (
          <UserMenu
            name={user.name}
            avatarUrl={user.avatarUrl}
            onLogout={onLogout}
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
        impersonateUserId={impersonateUserId}
        onImpersonate={onImpersonate}
        onClearImpersonate={onClearImpersonate}
      />
    )}
  </header>
);
