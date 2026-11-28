/**
 * Discord ログインを始める URL。今のページ（パスとクエリ）を returnTo に付けて、
 * ログイン後とキャンセル時にこのページへ戻れるようにする（ブラウザでだけ呼ぶ）
 */
export const discordLoginPath = () => {
  const here = `${window.location.pathname}${window.location.search}`;
  return `/auth/discord?${new URLSearchParams({ returnTo: here })}`;
};
