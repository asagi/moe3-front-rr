import { redirect } from "react-router";
import {
  buildDiscordAuthorizeUrl,
  discordStateCookie,
  getDiscordCallbackOrigin,
} from "~/lib/discord.server";
import type { Route } from "./+types/auth.discord";

/** Discord の認可画面へリダイレクトする */
export async function loader({ request }: Route.LoaderArgs) {
  // 127.0.0.1 と localhost のように、コールバックと別のホストで開かれた場合は
  // state の Cookie がコールバックに届かないので、先にコールバック側のホストへ移る
  const url = new URL(request.url);
  const callbackOrigin = getDiscordCallbackOrigin();
  if (url.origin !== callbackOrigin) {
    return redirect(new URL(url.pathname, callbackOrigin).toString());
  }

  const state = crypto.randomUUID();
  return redirect(buildDiscordAuthorizeUrl(state), {
    headers: {
      "Set-Cookie": await discordStateCookie.serialize(state),
    },
  });
}
