import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  type ShouldRevalidateFunctionArgs,
  data,
  redirect,
  useFetcher,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router";
import {
  ChatComposer,
  type ChatComposerSender,
  MAX_MESSAGE_LENGTH,
} from "~/components/chat/ChatComposer";
import { ChatLogToolbar } from "~/components/chat/ChatLogToolbar";
import { ChatMessageList } from "~/components/chat/ChatMessageList";
import { PowerImage } from "~/components/power-image/PowerImage";
import styles from "~/components/chat/Chat.module.css";
import { ApiError, type PostMessageBody, postMessage } from "~/lib/api.server";
import {
  type Channel,
  type LogCategory,
  OPEN_CHANNEL_ID,
  appendMessage,
  assignedPowersOf,
  channelIdOf,
  channelMessages,
  channelName,
  chatPath,
  filterLog,
  isMine,
  isShownInChannel,
  parseChannelId,
  parseHidden,
  serializeHidden,
  withAssignedPowers,
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
import { ensureReadState, markChannelRead } from "~/lib/read-state";
import { useMessageStream } from "~/lib/use-message-stream";
import { useStickyHeight } from "~/lib/use-sticky-height";
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

/** オープンチャンネルのフィルタ（システムメッセージ・オープンの発言・密談） */
const OPEN_FILTER_CATEGORIES: LogCategory[] = ["system", "open", "private"];

/** フィルタを変えただけ（?hide= の変化だけ）なら、データを取り直さない */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod == null && currentUrl.pathname === nextUrl.pathname) {
    const strip = (url: URL) => {
      const params = new URLSearchParams(url.search);
      params.delete("hide");
      params.sort();
      return params.toString();
    };
    if (
      currentUrl.search !== nextUrl.search &&
      strip(currentUrl) === strip(nextUrl)
    ) {
      return false;
    }
  }
  return defaultShouldRevalidate;
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
 * 管理人発言なら管理人の画像。進行中と担当国の割り当て後の開戦前夜は担当国
 * （滅亡していれば白黒の画像）、割り当て前の開戦前夜・感想戦は Discord のアバター
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
  if (
    (game.status === "in_progress" || game.status === "ready") &&
    viewer.power
  ) {
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
    // 既読にするのは最新のシーズンを見ているときだけ
    latestSeason: game.seasons.at(-1) ?? null,
    listPath,
    season,
    seasonParam,
    // URL でシーズンを指定しているか（指定がなければ、読み直すと最新のシーズンになる）
    seasonFixed: seasonParam != null,
    channelId: channel.id,
    channelName: channelName(channel, viewer.power),
    // グループチャンネルの見出しは、自国以外のメンバーの国の画像で出す（滅亡した国は白黒）
    headerPowers:
      channel.kind === "group"
        ? channel.members
            .filter((code) => code !== viewer.power)
            .map((code) => ({
              code,
              eliminated:
                game.players.find((p) => p.power === code)?.is_eliminated ??
                false,
            }))
        : null,
    self: { power: viewer.power, username: viewer.username },
    // SSE で届いた発言も、担当国の割り当て後なら担当国の発言として出す
    assignedPowers: assignedPowersOf(game.players),
    sender: composerSender(game, viewer, postAs.ok && postAs.asAdmin, state.me),
    disabledReason: postAs.ok ? undefined : postAs.reason,
    messages: channelMessages(messages, channel.id),
    // SSE で最初に送り直してもらう起点
    streamAfter: messages.at(-1)?.message_uuid ?? null,
    streamKey: streamConnectionKey(viewer),
  };
}

type PostResult =
  { ok: true; error?: undefined } | { ok?: false; error: string };

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

  // オープンチャンネルのフィルタ（?hide=system,private）。URL で持ち、リロードしても保つ。
  // 開戦前夜と感想戦は密談がないので出さない
  const filterEnabled =
    channelId === OPEN_CHANNEL_ID && !isOffGameSeason(season);
  const [searchParams, setSearchParams] = useSearchParams();
  const hiddenParam = filterEnabled ? searchParams.get("hide") : null;
  const hidden = useMemo(() => parseHidden(hiddenParam), [hiddenParam]);
  const visible = filterEnabled
    ? filterLog(messages, { pov: null, hidden })
    : messages;
  const filtering = OPEN_FILTER_CATEGORIES.some((c) => hidden.has(c));
  const updateHidden = (next: Set<LogCategory>) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        const value = serializeHidden(next);
        if (value == null) params.delete("hide");
        else params.set("hide", value);
        return params;
      },
      { replace: true, preventScrollReset: true },
    );
  // 密談を押したときに開くグループチャンネル（今見ているシーズンのまま）
  const channelHref = (id: string) =>
    chatPath(gameUuid, loaderData.seasonParam, id);

  // 開いているチャンネルは、表示した発言まで既読にする（未読の数とタブバーの印に使う）。
  // オープンチャンネルに混ぜた密談は、そのグループチャンネルを開くまで既読にしない
  const lastUuid = messages.at(-1)?.message_uuid ?? null;
  const readUuid =
    visible.filter((m) => channelIdOf(m) === channelId).at(-1)?.message_uuid ??
    null;
  useEffect(() => {
    if (season !== loaderData.latestSeason) return;
    ensureReadState(gameUuid, lastUuid);
    if (readUuid) markChannelRead(gameUuid, channelId, readUuid);
  }, [
    gameUuid,
    channelId,
    lastUuid,
    readUuid,
    season,
    loaderData.latestSeason,
  ]);

  // 自分の発言が届いたら、全部見えるように一番下までスクロールする
  // （ほかの人の発言では、読んでいる位置を動かさない）
  const prevLastUuidRef = useRef(lastUuid);
  useEffect(() => {
    if (prevLastUuidRef.current === lastUuid) return;
    prevLastUuidRef.current = lastUuid;
    const last = messages.at(-1);
    if (last && isMine(last, self)) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [lastUuid, messages, self]);

  // 送信フォームの高さ（複数行の入力やお知らせで変わる）。最後の発言が隠れないよう、ページの下の余白に使う
  const composerRef = useRef<HTMLDivElement>(null);
  useStickyHeight(composerRef, "--composer-height");

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
        if (m.turn === season && isShownInChannel(m, channelId)) {
          setMessages((list) =>
            withAssignedPowers(
              appendMessage(list, m),
              loaderData.assignedPowers,
            ),
          );
          // 担当国が割り当てられたら、担当国を読み直す（以降の発言と発言フォームのアイコンを国にする）
          if (m.notice?.type === "ready") void revalidator.revalidate();
        }
        if (
          (m.turn !== season || channelIdOf(m) !== channelId) &&
          revalidator.state === "idle"
        ) {
          // ほかのチャンネルの発言は、タブバーの未読の印を出すために読み直す
          void revalidator.revalidate();
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
          {/* 開戦前夜と感想戦はオープンチャンネルだけなので、一覧へ戻るリンクを出さない */}
          {/* （見出しを中央に保つため、代わりに空の要素を置く） */}
          {isOffGameSeason(season) ? (
            <span />
          ) : (
            <Link
              to={listPath}
              className={styles.backLink}
              aria-label="チャンネル一覧へ"
            >
              {/* 卓ヘッダのシーズン切り替えと同じ線のアイコン */}
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
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
          )}
          {loaderData.headerPowers ? (
            <h3
              className={styles.subHeaderPowers}
              title={loaderData.channelName}
            >
              {loaderData.headerPowers.map((p) => (
                <PowerImage
                  key={p.code}
                  faceType={faceType}
                  code={p.code}
                  size={32}
                  defeated={p.eliminated}
                />
              ))}
              <span className="sr-only">{loaderData.channelName}</span>
            </h3>
          ) : (
            <h3>{loaderData.channelName}</h3>
          )}
          {filterEnabled && (
            <ChatLogToolbar
              variant="inline"
              hidden={hidden}
              categories={OPEN_FILTER_CATEGORIES}
              onHiddenChange={updateHidden}
            />
          )}
        </div>
      </div>
      <div className={`${styles.page} ${styles.withComposer}`}>
        <ChatMessageList
          messages={visible}
          faceType={faceType}
          self={self}
          channelHref={channelId === OPEN_CHANNEL_ID ? channelHref : undefined}
          emptyText={
            filtering && messages.length > 0
              ? "フィルタの条件に合う発言はありません"
              : undefined
          }
        />
        <div ref={composerRef} className={styles.composerDock}>
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
