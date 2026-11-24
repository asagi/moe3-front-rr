import { useEffect, useRef } from "react";
import type { ChatMessage } from "~/lib/chat";

export interface MessageStreamHandlers {
  /** 新しいメッセージを受け取った */
  onMessage?: (message: ChatMessage) => void;
  /** シーズンが切り替わった */
  onSeason?: (season: string) => void;
}

/**
 * 卓の新しいメッセージを SSE で受け取る。
 * 切れたときは EventSource が自動でつなぎ直し、Last-Event-ID で取りこぼしを受け取る
 * @param after つないだ直後に、このメッセージより後のものを送り直してもらう（読み込み済みの最後のメッセージ）
 * @param connectionKey 変わったらつなぎ直す（管理者モードや視点変更で、見ている人が変わったとき）
 */
export const useMessageStream = (
  gameUuid: string,
  { after, connectionKey, enabled = true }: { after?: string | null; connectionKey: string; enabled?: boolean },
  handlers: MessageStreamHandlers,
) => {
  // ハンドラが変わるたびにつなぎ直さないよう、最新のものを ref で持つ
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  // after は最初につなぐときだけ使う（以降の再接続は Last-Event-ID に任せる）
  const afterRef = useRef(after);
  afterRef.current = after;

  useEffect(() => {
    if (!enabled) return;
    const query = afterRef.current
      ? `?${new URLSearchParams({ after: afterRef.current })}`
      : "";
    const source = new EventSource(`/api/games/${gameUuid}/stream${query}`);
    source.addEventListener("message", (e) => {
      try {
        handlersRef.current.onMessage?.(JSON.parse(e.data) as ChatMessage);
      } catch (err) {
        console.error("SSE のメッセージを読めませんでした", err);
      }
    });
    source.addEventListener("season", (e) => {
      try {
        handlersRef.current.onSeason?.((JSON.parse(e.data) as { season: string }).season);
      } catch (err) {
        console.error("SSE のシーズンを読めませんでした", err);
      }
    });
    return () => source.close();
  }, [gameUuid, connectionKey, enabled]);
};
