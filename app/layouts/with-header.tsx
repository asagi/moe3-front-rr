import { Outlet, data, useFetcher, useNavigate } from "react-router";
import { Header, type HeaderUser } from "~/components/header/Header";
import { loadMe, meContext } from "~/lib/me.server";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/with-header";

/** ログインユーザーを 1 回だけ取得して、レイアウトと子ルートの loader に渡す */
export const middleware: Route.MiddlewareFunction[] = [
  async ({ request, context }) => {
    const session = await getSessionStorage().getSession(
      request.headers.get("Cookie"),
    );
    context.set(meContext, await loadMe(session));
  },
];

const loggedOut = {
  user: null as HeaderUser | null,
  adminMode: false,
  impersonateUsername: null as string | null,
  /** 視点変更のユーザー名が不正で、本人として取得し直したときのエラーメッセージ */
  impersonateError: null as string | null,
};

/** ヘッダ表示用のログイン中ユーザー情報を返す */
export async function loader({ request, context }: Route.LoaderArgs) {
  const state = context.get(meContext);
  if (state.kind !== "ok") {
    if (state.kind === "unauthorized") {
      // トークンが無効になっていればセッションを破棄してログアウト状態にする
      const sessionStorage = getSessionStorage();
      const session = await sessionStorage.getSession(
        request.headers.get("Cookie"),
      );
      return data(loggedOut, {
        headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
      });
    }
    // API 側の一時的な障害などではページ自体は表示する
    return data(loggedOut);
  }

  const session = await getSessionStorage().getSession(
    request.headers.get("Cookie"),
  );
  const { me, auth, impersonateError } = state;
  const isAdmin = session.get("isAdmin") ?? false;
  const user: HeaderUser = {
    name: me.global_name ?? me.username,
    avatarUrl: me.avatar_url,
    isAdmin,
  };
  return data({
    user,
    adminMode: isAdmin && (session.get("adminMode") ?? false),
    // 不正なユーザー名のときは auth から外してあるので、表示用にはセッションの値を返す
    impersonateUsername: impersonateError
      ? (session.get("impersonateUsername") ?? null)
      : (auth.impersonateUsername ?? null),
    impersonateError,
  });
}

export default function WithHeaderLayout({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
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
  const impersonateForm = impersonateFetcher.formData;
  const impersonateUsername = (() => {
    if (!adminMode) return null;
    if (impersonateForm?.get("intent") === "set")
      return String(impersonateForm.get("username"));
    if (impersonateForm?.get("intent") === "clear") return null;
    return loaderData.impersonateUsername;
  })();
  // 送信中は前回のエラーを出さない
  const impersonateError = impersonateForm
    ? null
    : loaderData.impersonateError;

  return (
    <>
      <Header
        user={loaderData.user}
        onLogin={() => {
          window.location.href = "/auth/discord";
        }}
        onHome={() => {
          navigate("/");
        }}
        onMyPage={() => {
          navigate("/mypage");
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
        impersonateUsername={impersonateUsername}
        impersonateError={impersonateError}
        onImpersonate={(username) => {
          impersonateFetcher.submit(
            { intent: "set", username },
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
