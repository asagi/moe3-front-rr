import { useEffect, useMemo, useState } from "react";
import {
  type ShouldRevalidateFunctionArgs,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router";
import { ChannelList } from "~/components/chat/ChannelList";
import styles from "~/components/chat/Chat.module.css";
import { ChatLogList } from "~/components/chat/ChatLogList";
import { ChatLogToolbar } from "~/components/chat/ChatLogToolbar";
import {
  type LogCategory,
  OPEN_CHANNEL_ID,
  appendMessage,
  chatPath,
  filterLog,
  parseHidden,
  parsePov,
  serializeHidden,
  summarizeChannels,
} from "~/lib/chat";
import {
  loadSeasonMessages,
  resolveChatViewer,
  streamConnectionKey,
} from "~/lib/chat.server";
import {
  chatClosedPhaseLabel,
  isLiveSeason,
  isOffGameSeason,
  isWritableSeason,
} from "~/lib/game";
import { requireGame, resolveSeason } from "~/lib/game.server";
import { useMessageStream } from "~/lib/use-message-stream";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.chat._index";

export const handle: GameRouteHandle = { gameTitle: "チャット", seasonal: true };

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.layout === "viewer" ? "チャットログ" : "チャンネル一覧";
  return [{ title: `${title} | Diplomacy MOE` }];
}

/** ログビューアーの視点（?pov=）とフィルタ（?hide=）。画面の中だけで使い、loader には関係ない */
const VIEWER_PARAMS = ["pov", "hide"];

/** 視点とフィルタを変えただけなら、データを取り直さない */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod == null && currentUrl.pathname === nextUrl.pathname) {
    const strip = (url: URL) => {
      const params = new URLSearchParams(url.search);
      for (const key of VIEWER_PARAMS) params.delete(key);
      params.sort();
      return params.toString();
    };
    if (currentUrl.search !== nextUrl.search && strip(currentUrl) === strip(nextUrl)) {
      return false;
    }
  }
  return defaultShouldRevalidate;
}

/**
 * 参加者と管理者モード中の管理者にはチャンネル一覧を（参加者でない管理者はオープンチャンネルだけ）、
 * それ以外（第三者・終了した卓）と、書き込めないシーズン（終わったシーズン・撤退フェイズ・調整フェイズ）には、
 * 誰にでもログビューアーを出す。
 * 権限が変わると再取得でここが走り直すので、表示も自然に切り替わる
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const game = requireGame(context);
  const viewer = await resolveChatViewer(request, context, game);
  const season = resolveSeason(request, game);
  const messages = season ? await loadSeasonMessages(context, game, season) : [];
  const base = {
    gameUuid: game.game_uuid,
    faceType: game.regulation.face_type,
    season,
  };
  // 終わったシーズンは更新されないので、SSE は現在のシーズンを見ているときだけつなぐ
  const live = isLiveSeason(game, season);

  // 書き込めないシーズンは、参加者もログビューアーで見る
  if (viewer.kind === "viewer" || !isWritableSeason(game, season)) {
    return {
      ...base,
      layout: "viewer" as const,
      messages,
      // チャンネル一覧で見られる人か（シーズンが進んだらオープンチャンネルに移す）
      canUseChannels: viewer.kind === "channels",
      // 撤退・調整フェイズで書き込めないときの、フェイズの名前
      closedPhase: live ? chatClosedPhaseLabel(game.phase_kind) : null,
      // 開戦前夜と感想戦には国ごとの密談がないので、視点変更は使えない
      povEnabled: !isOffGameSeason(season),
      // 進行中の卓の独り言は本人にしか見えない（ほかの人にはサーバーが返さない）ので、
      // 第三者にはフィルタにも出さない
      personalVisible:
        game.status !== "in_progress" || (viewer.kind === "channels" && viewer.power != null),
      live,
      streamAfter: messages.at(-1)?.message_uuid ?? null,
      streamKey: viewer.kind === "channels" ? streamConnectionKey(viewer) : "viewer",
    };
  }
  // 参加者の担当国（チャンネル名から自国を省く）
  const myPower = viewer.power;
  return {
    ...base,
    layout: "channels" as const,
    // URL で指定されたシーズン（チャンネル画面へのリンクに引き継ぐ）
    seasonParam: new URL(request.url).searchParams.get("season"),
    myPower,
    channels: summarizeChannels(messages, myPower),
    live,
    streamKey: streamConnectionKey(viewer),
  };
}

export default function GameChat({ loaderData }: Route.ComponentProps) {
  return loaderData.layout === "viewer" ? (
    <ChatLogViewer data={loaderData} />
  ) : (
    <ChannelIndex data={loaderData} />
  );
}

type LoaderData = Route.ComponentProps["loaderData"];

/** 参加者向けのチャンネル一覧 */
const ChannelIndex = ({ data }: { data: Extract<LoaderData, { layout: "channels" }> }) => {
  const { gameUuid, faceType, season, seasonParam, myPower, channels, streamKey, live } =
    data;
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  // 新しい発言が届いたら、一覧（最後の発言など）を読み直す
  const refresh = () => {
    if (revalidator.state === "idle") void revalidator.revalidate();
  };
  useMessageStream(
    gameUuid,
    { connectionKey: streamKey, season, enabled: live },
    {
      onMessage: refresh,
      // シーズンが進んだら、最新シーズンのオープンチャンネルに移る
      onSeason: () => void navigate(chatPath(gameUuid, null, OPEN_CHANNEL_ID)),
      // 撤退・調整フェイズになったら書き込めないので、ログビューアーに移る
      onPhase: (phase) => {
        if (chatClosedPhaseLabel(phase)) void navigate(chatPath(gameUuid, null));
      },
    },
  );

  return (
    <div className={styles.page}>
      <h3 className={styles.pageTitle}>チャンネル一覧</h3>
      <ChannelList
        channels={channels}
        faceType={faceType}
        myPower={myPower}
        channelHref={(id) => chatPath(gameUuid, seasonParam, id)}
      />
    </div>
  );
};

/**
 * 第三者用ログビューアー。
 * 視点とフィルタは URL（?pov=g&hide=system,personal）で持ち、リロードやリンクの共有でも保つ
 */
const ChatLogViewer = ({ data }: { data: Extract<LoaderData, { layout: "viewer" }> }) => {
  const { gameUuid, faceType, season, live, povEnabled, personalVisible } = data;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // SSE で届いたメッセージを足していく。読み直したら loader の結果に戻す
  const [messages, setMessages] = useState(data.messages);
  useEffect(() => setMessages(data.messages), [data.messages]);
  useMessageStream(
    gameUuid,
    { after: data.streamAfter, connectionKey: data.streamKey, season, enabled: live },
    {
      onMessage: (m) => {
        if (m.turn === season) setMessages((list) => appendMessage(list, m));
      },
      // シーズンが進んだら、チャンネルを使える人は最新シーズンのオープンチャンネルに、
      // 第三者は最新シーズンのログビューアーに移る（視点とフィルタは保つ）
      onSeason: () => {
        if (data.canUseChannels) {
          void navigate(chatPath(gameUuid, null, OPEN_CHANNEL_ID));
          return;
        }
        const params = new URLSearchParams(searchParams);
        params.delete("season");
        const query = params.toString();
        void navigate(`${chatPath(gameUuid, null)}${query ? `?${query}` : ""}`);
      },
    },
  );

  const pov = povEnabled ? parsePov(searchParams.get("pov")) : null;
  const hiddenParam = searchParams.get("hide");
  const hidden = useMemo(() => parseHidden(hiddenParam), [hiddenParam]);
  const categories: LogCategory[] = personalVisible
    ? ["system", "open", "private", "personal"]
    : ["system", "open", "private"];

  const updateParam = (key: string, value: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value == null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  const visible = filterLog(messages, { pov, hidden });
  const narrowed = pov != null || categories.some((c) => hidden.has(c));

  return (
    <>
      <ChatLogToolbar
        pov={pov}
        povEnabled={povEnabled}
        hidden={hidden}
        categories={categories}
        onPovChange={(p) => updateParam("pov", p)}
        onHiddenChange={(h) => updateParam("hide", serializeHidden(h))}
      />
      <div className={`${styles.page} ${data.closedPhase ? styles.withPhaseDock : ""}`}>
        <ChatLogList
          messages={visible}
          faceType={faceType}
          emptyText={
            narrowed && messages.length > 0
              ? "視点・フィルタの条件に合う発言はありません"
              : undefined
          }
        />
        {data.closedPhase && (
          // 書き込めない理由は、チャンネル画面の入力フォームと同じ位置（画面下）に出す
          <div className={styles.composerDock}>
            <div className={styles.composer}>
              <p className={styles.phaseNotice} role="status">
                {data.closedPhase}のあいだは、チャットに書き込めません
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
