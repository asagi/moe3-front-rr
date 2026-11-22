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
    return data({
      user: null as HeaderUser | null,
      adminMode: false,
      impersonateUserId: null as string | null,
    });
  }

  try {
    const me = await getMe(accessToken);
    const user: HeaderUser = {
      name: me.global_name ?? me.username,
      avatarUrl: me.avatar_url,
      isAdmin: session.get("isAdmin") ?? false,
    };
    const adminMode = user.isAdmin && (session.get("adminMode") ?? false);
    const impersonateUserId = adminMode
      ? (session.get("impersonateUserId") ?? null)
      : null;
    return data({ user, adminMode, impersonateUserId });
  } catch (e) {
    // トークンが無効になっていればセッションを破棄してログアウト状態にする
    if (e instanceof ApiError && e.status === 401) {
      return data(
        { user: null, adminMode: false, impersonateUserId: null },
        {
          headers: {
            "Set-Cookie": await sessionStorage.destroySession(session),
          },
        },
      );
    }
    // API 側の一時的な障害などではページ自体は表示する
    console.error("ユーザー情報の取得に失敗しました", e);
    return data({ user: null, adminMode: false, impersonateUserId: null });
  }
}

export default function WithHeaderLayout({ loaderData }: Route.ComponentProps) {
  const logoutFetcher = useFetcher();
  const adminModeFetcher = useFetcher();
  // 送信中は送った値を先に反映して、トグルの反応を待たせない
  const pendingAdminMode = adminModeFetcher.formData?.get("enabled");
  const adminMode =
    pendingAdminMode != null
      ? pendingAdminMode === "true"
      : loaderData.adminMode;
  const impersonateFetcher = useFetcher();
  // 送信中は送った値を先に反映して、切替・解除の反応を待たせない
  const impersonateUserId = (() => {
    const form = impersonateFetcher.formData;
    if (!adminMode) return null;
    if (form?.get("intent") === "set") return String(form.get("userId"));
    if (form?.get("intent") === "clear") return null;
    return loaderData.impersonateUserId;
  })();

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
        adminMode={adminMode}
        onAdminModeChange={(enabled) => {
          adminModeFetcher.submit(
            { enabled: String(enabled) },
            { method: "post", action: "/admin-mode" },
          );
        }}
        impersonateUserId={impersonateUserId}
        onImpersonate={(userId) => {
          impersonateFetcher.submit(
            { intent: "set", userId },
            { method: "post", action: "/admin-impersonate" },
          );
        }}
        onClearImpersonate={() => {
          impersonateFetcher.submit(
            { intent: "clear" },
            { method: "post", action: "/admin-impersonate" },
          );
        }}
      />
      <main className="flex flex-col items-center justify-center pt-0 pb-4">
        <Outlet />
      </main>
    </>
  );
}
