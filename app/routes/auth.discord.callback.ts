import { data, redirect } from "react-router";
import { ApiError, login } from "~/lib/api.server";
import {
  DiscordTokenError,
  discordReturnCookie,
  discordStateCookie,
  exchangeDiscordCode,
  safeReturnPath,
} from "~/lib/discord.server";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/auth.discord.callback";

/**
 * Discord 認可後のコールバック。
 * state を検証し、code → Discord トークン → API ログインの順に処理してセッションに保存する。
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const savedState = await discordStateCookie.parse(
    request.headers.get("Cookie"),
  );
  // ログインを始めたページ（ログイン後とキャンセル時に戻る）
  const returnTo = safeReturnPath(
    await discordReturnCookie.parse(request.headers.get("Cookie")),
  );
  // 使い終わった state と戻り先は破棄する
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    await discordStateCookie.serialize("", { maxAge: 0 }),
  );
  headers.append(
    "Set-Cookie",
    await discordReturnCookie.serialize("", { maxAge: 0 }),
  );

  // 認可画面でキャンセルされたら、エラーにせずログインを始めたページへ戻す
  if (error === "access_denied") {
    return redirect(returnTo, { headers });
  }
  if (error) {
    throw data(
      `Discord でのログインに失敗しました（${error}）。もう一度お試しください。`,
      {
        status: 400,
        headers,
      },
    );
  }
  if (!state) {
    throw data("state がありません", { status: 400, headers });
  }
  if (!savedState) {
    // ログインを始めたのとは別のブラウザ（Discord アプリ経由で OS の既定ブラウザが
    // 開いた場合など）でコールバックが開かれると起こる
    throw data(
      "ログイン情報を確認できませんでした。ログインを始めたのとは別のブラウザで開かれた可能性があります。" +
        "ログインに使ったブラウザでもう一度お試しください。",
      { status: 400, headers },
    );
  }
  if (state !== savedState) {
    throw data("state が一致しません", { status: 400, headers });
  }
  if (!code) {
    throw data("code がありません", { status: 400, headers });
  }

  let accessToken: string;
  let isAdmin: boolean;
  try {
    const discordAccessToken = await exchangeDiscordCode(code);
    ({
      access_token: accessToken,
      user: { is_admin: isAdmin },
    } = await login(discordAccessToken));
  } catch (e) {
    if (e instanceof DiscordTokenError) {
      // code の期限切れ・再利用などは 400、それ以外は Discord 側の問題として 502
      throw data(e.message, { status: e.status === 400 ? 400 : 502, headers });
    }
    if (e instanceof ApiError) {
      throw data(`ログインに失敗しました（${e.code}）: ${e.message}`, {
        status: e.status,
        headers,
      });
    }
    throw e;
  }

  const sessionStorage = getSessionStorage();
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  session.set("accessToken", accessToken);
  session.set("isAdmin", isAdmin);
  // ログインし直したら視点変更は外す（前のセッションに不正な値が残っていても入り直せるように）
  session.unset("impersonateUsername");
  session.unset("viewAsThirdParty");
  headers.append("Set-Cookie", await sessionStorage.commitSession(session));

  return redirect(returnTo, { headers });
}
