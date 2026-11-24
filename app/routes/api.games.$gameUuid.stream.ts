import {
  type ApiAuth,
  isImpersonateError,
  ApiError,
  openMessageStream,
} from "~/lib/api.server";
import { getApiAuth, getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/api.games.$gameUuid.stream";

/**
 * 卓の新しいメッセージの SSE を API から中継する。
 * ブラウザの EventSource は Authorization ヘッダを付けられないので、
 * ここでセッションのトークン（と視点変更）を付けて API につなぐ。
 * 再接続のときにブラウザが付ける Last-Event-ID と、?after= はそのまま渡す
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await getSessionStorage().getSession(request.headers.get("Cookie"));
  const auth = getApiAuth(session);
  // ブラウザが切断したら（ページ移動・タブを閉じるなど）API への接続も切る。
  // request.signal をそのまま fetch に渡すと、切断のたびに読み取り中の本文が
  // AbortError で失敗して未処理のエラーになるので、自前の AbortController を挟む
  const upstream = new AbortController();
  request.signal.addEventListener("abort", () => upstream.abort(), { once: true });
  const options = {
    lastEventId: request.headers.get("Last-Event-ID"),
    after: new URL(request.url).searchParams.get("after"),
    signal: upstream.signal,
  };

  let res: Response;
  try {
    res = await openMessageStream(params.gameUuid, auth, options);
    if (!res.ok && auth?.impersonateUsername && (await isImpersonateFailure(res))) {
      // 視点変更のユーザー名が不正なら、ページの表示と同じく本人としてつなぎ直す
      const ownAuth: ApiAuth = { ...auth, impersonateUsername: null };
      res = await openMessageStream(params.gameUuid, ownAuth, options);
    }
  } catch (e) {
    // つなぐ前にブラウザが切断した
    if (upstream.signal.aborted) return new Response(null, { status: 204 });
    throw e;
  }
  if (!res.ok || !res.body) {
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "text/plain" },
    });
  }

  return new Response(relay(res.body, upstream), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // リバースプロキシにバッファさせない
      "X-Accel-Buffering": "no",
    },
  });
}

const isImpersonateFailure = async (res: Response) => {
  const body = (await res.clone().json().catch(() => null)) as { code?: string } | null;
  return isImpersonateError(new ApiError(res.status, body?.code ?? "", ""));
};

/**
 * API からの本文をブラウザへ流す。
 * どちらかが切断して読み取りが失敗しても、エラーにせずに静かに閉じる
 */
const relay = (body: ReadableStream<Uint8Array>, upstream: AbortController) => {
  const reader = body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch {
        // 切断（AbortError）や API 側の切断。ブラウザは Last-Event-ID 付きでつなぎ直す
        try {
          controller.close();
        } catch {
          // すでに閉じている
        }
      }
    },
    cancel() {
      upstream.abort();
      reader.cancel().catch(() => {});
    },
  });
};
