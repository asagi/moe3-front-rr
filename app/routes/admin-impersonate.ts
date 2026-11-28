import { data, redirect } from "react-router";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/admin-impersonate";

/**
 * 「視点変更」の対象をセッションに保存・解除する
 * （フォーム値 intent: "set" | "third_party" | "clear"、set のときは username も送る）。
 * third_party は、ユーザーに切り替えず第三者として見る
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
    session.unset("viewAsThirdParty");
  } else if (intent === "third_party") {
    // 第三者として見る（ユーザー名の視点変更とは同時に使わない）
    session.unset("impersonateUsername");
    session.set("viewAsThirdParty", true);
  } else if (intent === "clear") {
    session.unset("impersonateUsername");
    session.unset("viewAsThirdParty");
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
