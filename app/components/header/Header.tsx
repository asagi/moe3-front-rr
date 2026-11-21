import { DiscordLoginButton } from "~/components/discord-login-button/DiscordLoginButton";
import { UserMenu } from "~/components/user-menu/UserMenu";
import styles from "./Header.module.css";

export type HeaderUser = {
  name: string;
  avatarUrl?: string | null;
};

export interface HeaderProps {
  user?: HeaderUser | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Header = ({ user, onLogin, onLogout }: HeaderProps) => (
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
          />
        ) : (
          <DiscordLoginButton onClick={onLogin} />
        )}
      </div>
    </div>
  </header>
);
