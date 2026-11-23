import { data, redirect } from "react-router";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/admin-impersonate";

/**
 * 「視点変更」の対象ユーザー名をセッションに保存・解除する
 * （フォーム値 intent: "set" | "clear"、set のときは username も送る）
 * 存在チェックは API 側で行う（存在しなければ本人の視点に戻してエラーを出す）
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
    const username = String(formData.get("username") ?? "").trim();
    if (!username) {
      throw data("ユーザー名を入力してください", { status: 400 });
    }
    session.set("impersonateUsername", username);
  } else if (intent === "clear") {
    session.unset("impersonateUsername");
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
