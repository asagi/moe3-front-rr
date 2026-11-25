import { useEffect, useState } from "react";
import { Link, data, redirect, useFetcher, useRevalidator } from "react-router";
import {
  ChatComposer,
  type ChatComposerSender,
  MAX_MESSAGE_LENGTH,
} from "~/components/chat/ChatComposer";
import { ChatMessageList } from "~/components/chat/ChatMessageList";
import styles from "~/components/chat/Chat.module.css";
import { ApiError, type PostMessageBody, postMessage } from "~/lib/api.server";
import {
  type Channel,
  appendMessage,
  channelIdOf,
  channelMessages,
  channelName,
  chatPath,
  parseChannelId,
} from "~/lib/chat";
import {
  type ChatViewer,
  loadSeasonMessages,
  postErrorMessage,
  resolveChatViewer,
  streamConnectionKey,
} from "~/lib/chat.server";
import { type GameDetail, displayName, isLiveSeason } from "~/lib/game";
import { requireGame, resolveSeason } from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import { useMessageStream } from "~/lib/use-message-stream";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.chat.$channelId";

export const handle: GameRouteHandle = { gameTitle: "チャット", seasonal: true };

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `${loaderData?.channelName ?? "チャット"} | Diplomacy MOE` },
  ];
}

type ChannelsViewer = Extract<ChatViewer, { kind: "channels" }>;

/** 誰として書き込むか。書き込めなければ理由 */
type PostAs =
  | { ok: true; asAdmin: boolean }
  | { ok: false; reason: string };

/**
 * このチャンネルに誰として書き込めるか。
 * - 書けるのは現在のシーズンだけ
 * - 管理者モード中（視点変更なし）は管理人として、オープンチャンネルにだけ書ける
 * - 開戦前夜と感想戦は、オープンチャンネルにだけ書ける
 */
const resolvePostAs = (
  game: GameDetail,
  viewer: ChannelsViewer,
  channel: Channel,
  season: string | null,
): PostAs => {
  if (season == null || season !== game.seasons.at(-1)) {
    return { ok: false, reason: "過去のシーズンには書き込めません" };
  }
  if (viewer.canPostAsAdmin) {
    return channel.kind === "open"
      ? { ok: true, asAdmin: true }
      : { ok: false, reason: "管理者モード中はオープンチャンネルにだけ書き込めます" };
  }
  if (game.status !== "in_progress" && channel.kind !== "open") {
    return { ok: false, reason: "開戦前夜と感想戦はオープンチャンネルにだけ書き込めます" };
  }
  return { ok: true, asAdmin: false };
};

/**
 * 発言フォームのアイコン。
 * 管理人発言なら管理人の画像。進行中は担当国、開戦前夜・感想戦は Discord のアバター
 * （視点変更中は切り替え先のアカウント）
 */
const composerSender = (
  game: GameDetail,
  viewer: ChannelsViewer,
  asAdmin: boolean,
  me: { username: string; global_name: string | null; avatar_url: string | null },
): ChatComposerSender => {
  if (asAdmin) return { kind: "admin", faceType: game.regulation.face_type };
  if (game.status === "in_progress" && viewer.power) {
    return { kind: "power", faceType: game.regulation.face_type, power: viewer.power };
  }
  return { kind: "user", name: displayName(me), avatarUrl: me.avatar_url };
};

/** URL のチャンネルを読み、見られない人は一覧へ移す */
const loadChannel = async (
  request: Request,
  params: Route.LoaderArgs["params"],
  context: Route.LoaderArgs["context"],
) => {
  const game = requireGame(context);
  const channel = parseChannelId(params.channelId);
  if (!channel) throw data("チャンネルが見つかりませんでした", { status: 404 });

  const seasonParam = new URL(request.url).searchParams.get("season");
  const listPath = chatPath(game.game_uuid, seasonParam);
  const season = resolveSeason(request, game);
  // 終わったシーズンは、参加者もログビューアーで見る
  if (!isLiveSeason(game, season)) throw redirect(listPath);
  const viewer = await resolveChatViewer(request, context, game);
  if (viewer.kind === "viewer") throw redirect(listPath);
  const myPower = viewer.power;
  const isMember =
    channel.kind === "open" ||
    (myPower != null &&
      (channel.kind === "personal"
        ? channel.power === myPower
        : channel.members.includes(myPower)));
  if (!isMember) throw redirect(listPath);

  return { game, channel, viewer, season, listPath };
};

/**
 * チャンネル画面。
 * 第三者になったとき・このチャンネルのメンバーでない参加者になったとき・終わったシーズンを開いたときは、
 * シーズンを保ったまま /chat（ログビューアーかチャンネル一覧）に移す
 */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { game, channel, viewer, season, listPath } = await loadChannel(
    request,
    params,
    context,
  );
  const state = context.get(meContext);
  if (state.kind !== "ok") throw redirect(listPath);

  const messages = season ? await loadSeasonMessages(context, game, season) : [];
  const postAs = resolvePostAs(game, viewer, channel, season);
  return {
    gameUuid: game.game_uuid,
    faceType: game.regulation.face_type,
    listPath,
    season,
    channelId: channel.id,
    channelName: channelName(channel, viewer.power),
    self: { power: viewer.power, username: viewer.username },
    sender: composerSender(game, viewer, postAs.ok && postAs.asAdmin, state.me),
    disabledReason: postAs.ok ? undefined : postAs.reason,
    messages: channelMessages(messages, channel.id),
    // SSE で最初に送り直してもらう起点
    streamAfter: messages.at(-1)?.message_uuid ?? null,
    streamKey: streamConnectionKey(viewer),
  };
}

type PostResult = { ok: true; error?: undefined } | { ok?: false; error: string };

/** 発言フォームの送信 */
export async function action({ request, params, context }: Route.ActionArgs) {
  const { game, channel, viewer, season } = await loadChannel(request, params, context);
  const state = context.get(meContext);
  if (state.kind !== "ok") {
    return data<PostResult>({ error: "ログイン情報を確認できませんでした。" }, { status: 401 });
  }

  const formData = await request.formData();
  const text = String(formData.get("context") ?? "");
  if (text.trim() === "") {
    return data<PostResult>({ error: "発言を入力してください。" }, { status: 400 });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return data<PostResult>(
      { error: `発言は ${MAX_MESSAGE_LENGTH} 文字までです。` },
      { status: 400 },
    );
  }
  const postAs = resolvePostAs(game, viewer, channel, season);
  if (!postAs.ok) return data<PostResult>({ error: postAs.reason }, { status: 403 });

  const body: PostMessageBody =
    channel.kind === "group"
      ? {
          kind: "confidential",
          recipients: channel.members.filter((c) => c !== viewer.power),
          context: text,
          as_admin: false,
        }
      : {
          kind: channel.kind === "open" ? "public" : "personal",
          recipients: null,
          context: text,
          as_admin: postAs.asAdmin,
        };

  try {
    await postMessage(game.game_uuid, body, state.auth);
    return data<PostResult>({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) {
      return data<PostResult>({ error: postErrorMessage(e) }, { status: e.status });
    }
    throw e;
  }
}

export default function GameChatChannel({ loaderData }: Route.ComponentProps) {
  const { gameUuid, faceType, listPath, season, channelId, self, sender } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();

  // SSE で届いたメッセージを足していく。読み直したら loader の結果に戻す
  const [messages, setMessages] = useState(loaderData.messages);
  useEffect(() => setMessages(loaderData.messages), [loaderData.messages]);

  useMessageStream(
    gameUuid,
    {
      after: loaderData.streamAfter,
      connectionKey: loaderData.streamKey,
    },
    {
      onMessage: (m) => {
        if (m.turn === season && channelIdOf(m) === channelId) {
          setMessages((list) => appendMessage(list, m));
        }
      },
      // シーズンが進んだら、現在のシーズンや書き込める範囲を読み直す
      onSeason: () => revalidator.revalidate(),
    },
  );

  // 送信に成功したら入力欄を空にする
  const [sentCount, setSentCount] = useState(0);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) setSentCount((n) => n + 1);
  }, [fetcher.state, fetcher.data]);

  return (
    <div className={`${styles.page} ${styles.withComposer}`}>
      <div className={styles.channelTitle}>
        <Link to={listPath} className={styles.backLink}>
          ‹ 一覧
        </Link>
        <h3>{loaderData.channelName}</h3>
      </div>
      <ChatMessageList messages={messages} faceType={faceType} self={self} />
      <div className={styles.composerDock}>
        <ChatComposer
          sender={sender}
          disabledReason={loaderData.disabledReason}
          submitting={fetcher.state !== "idle"}
          error={fetcher.state === "idle" ? fetcher.data?.error : null}
          resetKey={sentCount}
          onSend={(context) => fetcher.submit({ context }, { method: "post" })}
        />
      </div>
    </div>
  );
}
