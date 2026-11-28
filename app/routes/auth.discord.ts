import { redirect } from "react-router";
import {
  buildDiscordAuthorizeUrl,
  discordReturnCookie,
  discordStateCookie,
  getDiscordCallbackOrigin,
  safeReturnPath,
} from "~/lib/discord.server";
import type { Route } from "./+types/auth.discord";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Discord の認可画面へリダイレクトする。
 * ?returnTo=（ログインを始めたページのパス）を Cookie に覚えておき、
 * ログイン後とキャンセル時にそのページへ戻す
 */
export async function loader({ request }: Route.LoaderArgs) {
  // 開発環境で 127.0.0.1 と localhost のように、コールバックと別のホストで開かれた場合は
  // state の Cookie がコールバックに届かないので、先にコールバック側のホストへ移る。
  // 本番ではリバースプロキシの後ろにいるため request.url のプロトコルやホストが
  // ブラウザから見たものと一致せず、比べるとリダイレクトがループする。
  // そのため、両方がループバックのとき（＝ローカル開発）だけ行う
  const url = new URL(request.url);
  const callbackUrl = new URL(getDiscordCallbackOrigin());
  if (
    LOOPBACK_HOSTNAMES.has(url.hostname) &&
    LOOPBACK_HOSTNAMES.has(callbackUrl.hostname) &&
    url.origin !== callbackUrl.origin
  ) {
    return redirect(
      new URL(`${url.pathname}${url.search}`, callbackUrl.origin).toString(),
    );
  }

  const state = crypto.randomUUID();
  const headers = new Headers();
  headers.append("Set-Cookie", await discordStateCookie.serialize(state));
  headers.append(
    "Set-Cookie",
    await discordReturnCookie.serialize(
      safeReturnPath(url.searchParams.get("returnTo")),
    ),
  );
  return redirect(buildDiscordAuthorizeUrl(state), { headers });
}
