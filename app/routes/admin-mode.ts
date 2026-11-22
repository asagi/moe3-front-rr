import { data, redirect } from "react-router";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/admin-mode";

/** 管理者モードの ON/OFF をセッションに保存する（フォーム値 enabled: "true" | "false"） */
export async function action({ request }: Route.ActionArgs) {
  const sessionStorage = getSessionStorage();
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  if (!session.get("isAdmin")) {
    throw data("管理者ではありません", { status: 403 });
  }

  const formData = await request.formData();
  session.set("adminMode", formData.get("enabled") === "true");
  return data(null, {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  });
}

/** GET で直接開かれた場合は何もせずトップへ戻す */
export function loader() {
  return redirect("/");
}
