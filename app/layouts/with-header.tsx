import { Outlet, data, useFetcher, useNavigate } from "react-router";
import { Header, type HeaderUser } from "~/components/header/Header";
import {
  ApiError,
  type UserMe,
  getMe,
  isImpersonateError,
} from "~/lib/api.server";
import { getApiAuth, getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/with-header";

const loggedOut = {
  /** /users/me の結果（視点変更中なら成り代わり先のユーザー）。子ルートからも使う */
  me: null as UserMe | null,
  user: null as HeaderUser | null,
  adminMode: false,
  impersonateUserId: null as string | null,
  /** 視点変更の ID が不正で、本人として取得し直したときのエラーメッセージ */
  impersonateError: null as string | null,
};

/** セッションのトークンでログイン中ユーザーを取得する */
export async function loader({ request }: Route.LoaderArgs) {
  const sessionStorage = getSessionStorage();
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const auth = getApiAuth(session);
  if (!auth) {
    return data(loggedOut);
  }

  try {
    let me: UserMe;
    let impersonateError: string | null = null;
    try {
      me = await getMe(auth);
    } catch (e) {
      // ID の正常性はチェックせずに保存しているので、不正なら本人として取り直す。
      // ここでログアウト扱いにすると管理者ヘッダが消えて解除できなくなる
      if (!isImpersonateError(e)) throw e;
      impersonateError = e.message;
      me = await getMe({ ...auth, impersonateUserId: null });
    }

    const isAdmin = session.get("isAdmin") ?? false;
    const user: HeaderUser = {
      name: me.global_name ?? me.username,
      avatarUrl: me.avatar_url,
      isAdmin,
    };
    return data({
      me,
      user,
      adminMode: isAdmin && (session.get("adminMode") ?? false),
      impersonateUserId: auth.impersonateUserId ?? null,
      impersonateError,
    });
  } catch (e) {
    // トークンが無効になっていればセッションを破棄してログアウト状態にする
    if (e instanceof ApiError && e.status === 401) {
      return data(loggedOut, {
        headers: {
          "Set-Cookie": await sessionStorage.destroySession(session),
        },
      });
    }
    // API 側の一時的な障害などではページ自体は表示する
    console.error("ユーザー情報の取得に失敗しました", e);
    return data(loggedOut);
  }
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
  const impersonateUserId = (() => {
    if (!adminMode) return null;
    if (impersonateForm?.get("intent") === "set")
      return String(impersonateForm.get("userId"));
    if (impersonateForm?.get("intent") === "clear") return null;
    return loaderData.impersonateUserId;
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
        impersonateUserId={impersonateUserId}
        impersonateError={impersonateError}
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
