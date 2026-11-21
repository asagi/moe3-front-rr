import { Outlet, data, useFetcher } from "react-router";
import { Header, type HeaderUser } from "~/components/header/Header";
import { ApiError, getMe } from "~/lib/api.server";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/with-header";

/** セッションのトークンでログイン中ユーザーを取得する */
export async function loader({ request }: Route.LoaderArgs) {
  const sessionStorage = getSessionStorage();
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");
  if (!accessToken) {
    return data({ user: null as HeaderUser | null });
  }

  try {
    const me = await getMe(accessToken);
    const user: HeaderUser = {
      name: me.global_name ?? me.username,
      avatarUrl: me.avatar_url,
    };
    return data({ user });
  } catch (e) {
    // トークンが無効になっていればセッションを破棄してログアウト状態にする
    if (e instanceof ApiError && e.status === 401) {
      return data(
        { user: null },
        {
          headers: {
            "Set-Cookie": await sessionStorage.destroySession(session),
          },
        },
      );
    }
    // API 側の一時的な障害などではページ自体は表示する
    console.error("ユーザー情報の取得に失敗しました", e);
    return data({ user: null });
  }
}

export default function WithHeaderLayout({ loaderData }: Route.ComponentProps) {
  const logoutFetcher = useFetcher();

  return (
    <>
      <Header
        user={loaderData.user}
        onLogin={() => {
          window.location.href = "/auth/discord";
        }}
        onLogout={() => {
          logoutFetcher.submit(null, { method: "post", action: "/auth/logout" });
        }}
      />
      <main className="flex flex-col items-center justify-center pt-0 pb-4">
        <Outlet />
      </main>
    </>
  );
}
