import { Button } from "~/components/button/Button";
import { DiscordLoginButton } from "~/components/discord-login-button/DiscordLoginButton";
import styles from "./Header.module.css";

type User = {
  name: string;
};

export interface HeaderProps {
  user?: User;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Header = ({
  user,
  onLogin,
  onLogout,
}: HeaderProps) => (
  <header>
    <div className={styles["header"]}>
      <div>
        <img src="/favicon.ico" width="24" height="24" alt="" />
        <h1>Diplomacy MOE</h1>
      </div>
      <div>
        {user ? (
          <>
            <span className={styles.welcome}>
              Welcome, <b>{user.name}</b>!
            </span>
            <Button size="small" onClick={onLogout} label="Log out" />
          </>
        ) : (
          <DiscordLoginButton onClick={onLogin} />
        )}
      </div>
    </div>
  </header>
);
