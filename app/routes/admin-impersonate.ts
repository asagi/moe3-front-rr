import { data, redirect } from "react-router";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/admin-impersonate";

/**
 * 「視点変更」の対象ユーザー ID をセッションに保存・解除する
 * （フォーム値 intent: "set" | "clear"、set のときは userId も送る）
 * ID の存在チェックはまだ行わない
 */
export async function action({ request }: Route.ActionArgs) {
  const sessionStorage = getSessionStorage();
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  if (!session.get("isAdmin") || !session.get("adminMode")) {
    throw data("管理者モードではありません", { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "set") {
    const userId = String(formData.get("userId") ?? "").trim();
    if (!userId) {
      throw data("ユーザー ID を入力してください", { status: 400 });
    }
    session.set("impersonateUserId", userId);
  } else if (intent === "clear") {
    session.unset("impersonateUserId");
  } else {
    throw data("不正なリクエストです", { status: 400 });
  }

  return data(null, {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  });
}

/** GET で直接開かれた場合は何もせずトップへ戻す */
export function loader() {
  return redirect("/");
}
