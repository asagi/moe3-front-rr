import { useEffect, useRef } from "react";
import type { ChatMessage } from "~/lib/chat";
import type { PhaseKind } from "~/lib/game";

export interface MessageStreamHandlers {
  /** 新しいメッセージを受け取った */
  onMessage?: (message: ChatMessage) => void;
  /**
   * シーズンが切り替わった（同じシーズンについては 1 回だけ呼ぶ）。
   * season イベントのほか、見ているシーズンと違うシーズンの発言が届いたときも呼ぶ
   * （つなぎ直している間にシーズンが変わると、season イベントが届かないため）
   */
  onSeason?: (season: string) => void;
  /**
   * フェイズ種別が切り替わった（phase イベント）。
   * シーズンも変わるときは、season イベントのあとに届く。
   * 撤退・調整フェイズになったら書き込めなくなるので、画面を切り替えるのに使う
   */
  onPhase?: (phaseKind: PhaseKind, season: string) => void;
}

/**
 * 卓の新しいメッセージを SSE で受け取る。
 * 切れたときは EventSource が自動でつなぎ直し、Last-Event-ID で取りこぼしを受け取る
 * @param after つないだ直後に、このメッセージより後のものを送り直してもらう（読み込み済みの最後のメッセージ）
 * @param connectionKey 変わったらつなぎ直す（管理者モードや視点変更で、見ている人が変わったとき）
 * @param season 見ているシーズン（これと違うシーズンの発言が届いたら、シーズンが切り替わったとみなす）
 */
export const useMessageStream = (
  gameUuid: string,
  {
    after,
    connectionKey,
    season,
    enabled = true,
  }: { after?: string | null; connectionKey: string; season?: string | null; enabled?: boolean },
  handlers: MessageStreamHandlers,
) => {
  // ハンドラが変わるたびにつなぎ直さないよう、最新のものを ref で持つ
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  // after は最初につなぐときだけ使う（以降の再接続は Last-Event-ID に任せる）
  const afterRef = useRef(after);
  afterRef.current = after;
  const seasonRef = useRef(season);
  seasonRef.current = season;
  // 知らせ済みのシーズン（同じ切り替えを 2 回知らせない）
  const notifiedRef = useRef<string | null>(null);
  const notifySeason = (next: string) => {
    if (next === seasonRef.current || next === notifiedRef.current) return;
    notifiedRef.current = next;
    handlersRef.current.onSeason?.(next);
  };

  useEffect(() => {
    if (!enabled) return;
    const query = afterRef.current
      ? `?${new URLSearchParams({ after: afterRef.current })}`
      : "";
    const source = new EventSource(`/api/games/${gameUuid}/stream${query}`);
    source.addEventListener("message", (e) => {
      try {
        const message = JSON.parse(e.data) as ChatMessage;
        handlersRef.current.onMessage?.(message);
        if (seasonRef.current != null) notifySeason(message.turn);
      } catch (err) {
        console.error("SSE のメッセージを読めませんでした", err);
      }
    });
    source.addEventListener("season", (e) => {
      try {
        notifySeason((JSON.parse(e.data) as { season: string }).season);
      } catch (err) {
        console.error("SSE のシーズンを読めませんでした", err);
      }
    });
    source.addEventListener("phase", (e) => {
      try {
        const { phase_kind, season } = JSON.parse(e.data) as {
          phase_kind: PhaseKind;
          season: string;
        };
        handlersRef.current.onPhase?.(phase_kind, season);
      } catch (err) {
        console.error("SSE のフェイズを読めませんでした", err);
      }
    });
    return () => source.close();
  }, [gameUuid, connectionKey, enabled]);
};
