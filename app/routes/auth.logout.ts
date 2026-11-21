import { redirect } from "react-router";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/auth.logout";

/** セッションを破棄してトップへ戻す */
export async function action({ request }: Route.ActionArgs) {
  const sessionStorage = getSessionStorage();
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}

/** GET で直接開かれた場合は何もせずトップへ戻す */
export function loader() {
  return redirect("/");
}
