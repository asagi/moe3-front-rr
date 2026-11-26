import { useEffect, useRef, useState } from "react";
import {
  Link,
  data,
  redirect,
  useFetcher,
  useNavigate,
  useRevalidator,
} from "react-router";
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
  OPEN_CHANNEL_ID,
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
import {
  type GameDetail,
  chatClosedPhaseLabel,
  displayName,
  isOffGameSeason,
  isWritableSeason,
  seasonLabel,
} from "~/lib/game";
import { requireGame, resolveSeason } from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import { useMessageStream } from "~/lib/use-message-stream";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.chat.$channelId";

export const handle: GameRouteHandle = {
  gameTitle: "チャット",
  seasonal: true,
};

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `${loaderData?.channelName ?? "チャット"} | Diplomacy MOE` },
  ];
}

type ChannelsViewer = Extract<ChatViewer, { kind: "channels" }>;

/** 誰として書き込むか。書き込めなければ理由 */
type PostAs = { ok: true; asAdmin: boolean } | { ok: false; reason: string };

/**
 * このチャンネルに誰として書き込めるか。
 * - 書けるのは現在のシーズンだけ
 * - 管理者モード中（視点変更なし）は管理人として、オープンチャンネルにだけ書ける
 * - 開戦前夜と感想戦は、オープンチャンネルにだけ書ける
 * - 滅亡した国は密談に書けない（オープンチャンネルへの発言は Ghost 発言になる。独り言は書ける）
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
      : {
          ok: false,
          reason: "管理者モード中はオープンチャンネルにだけ書き込めます",
        };
  }
  if (game.status !== "in_progress" && channel.kind !== "open") {
    return {
      ok: false,
      reason: "開戦前夜と感想戦はオープンチャンネルにだけ書き込めます",
    };
  }
  if (viewer.eliminated && channel.kind === "group") {
    return { ok: false, reason: "滅亡したため密談には書き込めません" };
  }
  return { ok: true, asAdmin: false };
};

/**
 * 発言フォームのアイコン。
 * 管理人発言なら管理人の画像。進行中は担当国（滅亡していれば白黒の画像）、
 * 開戦前夜・感想戦は Discord のアバター
 * （視点変更中は切り替え先のアカウント）
 */
const composerSender = (
  game: GameDetail,
  viewer: ChannelsViewer,
  asAdmin: boolean,
  me: {
    username: string;
    global_name: string | null;
    avatar_url: string | null;
  },
): ChatComposerSender => {
  if (asAdmin) return { kind: "admin", faceType: game.regulation.face_type };
  if (game.status === "in_progress" && viewer.power) {
    return {
      kind: "power",
      faceType: game.regulation.face_type,
      power: viewer.power,
      defeated: viewer.eliminated,
    };
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
  // 書き込めないシーズン（終わったシーズン・撤退フェイズ・調整フェイズ）は、参加者もログビューアーで見る
  if (!isWritableSeason(game, season)) throw redirect(listPath);
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
  // 開戦前夜と感想戦はオープンチャンネルだけ（独り言もない）
  if (isOffGameSeason(season) && channel.kind !== "open")
    throw redirect(listPath);

  return { game, channel, viewer, season, seasonParam, listPath };
};

/**
 * チャンネル画面。
 * 第三者になったとき・このチャンネルのメンバーでない参加者になったとき・書き込めないシーズンを開いたときは、
 * シーズンを保ったまま /chat（ログビューアーかチャンネル一覧）に移す
 */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { game, channel, viewer, season, seasonParam, listPath } =
    await loadChannel(request, params, context);
  const state = context.get(meContext);
  if (state.kind !== "ok") throw redirect(listPath);

  const messages = season
    ? await loadSeasonMessages(context, game, season)
    : [];
  const postAs = resolvePostAs(game, viewer, channel, season);
  return {
    gameUuid: game.game_uuid,
    faceType: game.regulation.face_type,
    listPath,
    season,
    // URL でシーズンを指定しているか（指定がなければ、読み直すと最新のシーズンになる）
    seasonFixed: seasonParam != null,
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

type PostResult =
  | { ok: true; error?: undefined }
  | { ok?: false; error: string };

/** 発言フォームの送信 */
export async function action({ request, params, context }: Route.ActionArgs) {
  const { game, channel, viewer, season } = await loadChannel(
    request,
    params,
    context,
  );
  const state = context.get(meContext);
  if (state.kind !== "ok") {
    return data<PostResult>(
      { error: "ログイン情報を確認できませんでした。" },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const text = String(formData.get("context") ?? "");
  if (text.trim() === "") {
    return data<PostResult>(
      { error: "発言を入力してください。" },
      { status: 400 },
    );
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return data<PostResult>(
      { error: `発言は ${MAX_MESSAGE_LENGTH} 文字までです。` },
      { status: 400 },
    );
  }
  const postAs = resolvePostAs(game, viewer, channel, season);
  if (!postAs.ok)
    return data<PostResult>({ error: postAs.reason }, { status: 403 });

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
      return data<PostResult>(
        { error: postErrorMessage(e) },
        { status: e.status },
      );
    }
    throw e;
  }
}

export default function GameChatChannel({ loaderData }: Route.ComponentProps) {
  const { gameUuid, faceType, listPath, season, channelId, self, sender } =
    loaderData;
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const openPath = chatPath(gameUuid, null, OPEN_CHANNEL_ID);

  // SSE で届いたメッセージを足していく。読み直したら loader の結果に戻す
  const [messages, setMessages] = useState(loaderData.messages);
  useEffect(() => setMessages(loaderData.messages), [loaderData.messages]);

  // 書きかけの発言があるか（シーズンが進んだときに、画面を移ってよいかの判断に使う）
  const hasDraftRef = useRef(false);
  // 書きかけがあって移らなかったときの、新しいシーズン（入力欄の上にお知らせを出す）
  const [pendingSeason, setPendingSeason] = useState<string | null>(null);
  useEffect(() => setPendingSeason(null), [channelId]);
  // 書きかけがあって移らなかったときの、書き込めなくなったフェイズの名前
  const [closedPhase, setClosedPhase] = useState<string | null>(null);
  useEffect(() => setClosedPhase(null), [channelId, season]);
  const viewerPath = chatPath(gameUuid, null);

  /**
   * 撤退・調整フェイズになったら書き込めないので、ログビューアーに移る。
   * 書きかけがあるときは、消えないよう移らずに入力欄を止めてお知らせを出す（書きかけはコピーできる）
   */
  const closeByPhase = (phase: string) => {
    if (!hasDraftRef.current) {
      void navigate(viewerPath);
      return;
    }
    setClosedPhase(phase);
  };

  /**
   * シーズンが進んだら、最新シーズンのオープンチャンネルに移る。
   * オープンチャンネル以外で書きかけがあるときは、消えないよう移らずにお知らせだけ出す
   */
  const followSeason = (next: string) => {
    if (!hasDraftRef.current || channelId === OPEN_CHANNEL_ID) {
      void navigate(openPath);
      return;
    }
    setPendingSeason(next);
    // シーズンを指定していなければ、このチャンネルの最新シーズンに読み直す（書きかけは残る）。
    // 指定していると読み直しでログビューアーに移り書きかけが消えるので、読み直さない
    if (!loaderData.seasonFixed) void revalidator.revalidate();
  };

  useMessageStream(
    gameUuid,
    {
      after: loaderData.streamAfter,
      connectionKey: loaderData.streamKey,
      season,
    },
    {
      onMessage: (m) => {
        if (m.turn === season && channelIdOf(m) === channelId) {
          setMessages((list) => appendMessage(list, m));
        }
      },
      onSeason: followSeason,
      onPhase: (phase) => {
        const label = chatClosedPhaseLabel(phase);
        if (label) closeByPhase(label);
      },
    },
  );

  // 送信に成功したら入力欄を空にする
  const [sentCount, setSentCount] = useState(0);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok)
      setSentCount((n) => n + 1);
  }, [fetcher.state, fetcher.data]);

  return (
    <>
      {/* チャンネル一覧と同じく、卓ヘッダのすぐ下に固定する */}
      <div className={styles.subHeader}>
        <div className={styles.subHeaderInner}>
          <Link to={listPath} className={styles.backLink} aria-label="チャンネル一覧へ">
            {/* 卓ヘッダのシーズン切り替えと同じ線のアイコン */}
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M10 3 5 8l5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span aria-hidden="true">一覧</span>
          </Link>
          <h3>{loaderData.channelName}</h3>
        </div>
      </div>
      <div className={`${styles.page} ${styles.withComposer}`}>
        <ChatMessageList messages={messages} faceType={faceType} self={self} />
        <div className={styles.composerDock}>
          <ChatComposer
            // チャンネルを移ったら書きかけを持ち越さない（密談の下書きをオープンに出さないため）
            key={channelId}
            sender={sender}
            disabledReason={
              closedPhase
                ? `${closedPhase}のあいだは書き込めません`
                : loaderData.disabledReason
            }
            submitting={fetcher.state !== "idle"}
            error={fetcher.state === "idle" ? fetcher.data?.error : null}
            resetKey={sentCount}
            onSend={(context) =>
              fetcher.submit({ context }, { method: "post" })
            }
            onDraftChange={(hasDraft) => {
              hasDraftRef.current = hasDraft;
            }}
            notice={
              closedPhase ? (
                <>
                  <span>{closedPhase}になりました</span>
                  <Link to={viewerPath}>ログビューアーへ</Link>
                </>
              ) : (
                pendingSeason && (
                  <>
                    <span>{seasonLabel(pendingSeason)}が始まりました</span>
                    <Link to={openPath}>オープンチャンネルへ</Link>
                  </>
                )
              )
            }
          />
        </div>
      </div>
    </>
  );
}
