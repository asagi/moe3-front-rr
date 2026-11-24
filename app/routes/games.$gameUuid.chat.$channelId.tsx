import { Link, type RouterContextProvider, data, redirect } from "react-router";
import {
  ChatComposer,
  type ChatComposerSender,
} from "~/components/chat/ChatComposer";
import { ChatMessageList } from "~/components/chat/ChatMessageList";
import styles from "~/components/chat/Chat.module.css";
import {
  channelMessages,
  channelName,
  chatPath,
  parseChannelId,
} from "~/lib/chat";
import {
  loadSeasonMessages,
  resolveChatViewer,
} from "~/lib/chat.server";
import { type GameDetail, displayName } from "~/lib/game";
import { requireGame, resolveSeason } from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.chat.$channelId";

export const handle: GameRouteHandle = { gameTitle: "チャット", seasonal: true };

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `${loaderData?.channelName ?? "チャット"} | Diplomacy MOE` },
  ];
}

/**
 * チャンネル画面。
 * 第三者になったときと、このチャンネルのメンバーでない参加者になったときは、
 * シーズンを保ったまま /chat（ログビューアーかチャンネル一覧）に移す
 */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  const game = requireGame(context);
  const channel = parseChannelId(params.channelId);
  if (!channel) throw data("チャンネルが見つかりませんでした", { status: 404 });

  const seasonParam = new URL(request.url).searchParams.get("season");
  const listPath = chatPath(game.game_uuid, seasonParam);
  const viewer = await resolveChatViewer(request, context, game);
  if (viewer.kind === "viewer") throw redirect(listPath);
  const myPower = viewer.power;
  const isMember =
    channel.kind === "open" ||
    (myPower != null &&
      (channel.kind === "personal"
        ? channel.power === myPower
        : channel.members.includes(myPower)));
  if (!isMember) {
    throw redirect(listPath);
  }

  const season = resolveSeason(request, game);
  const messages = season ? await loadSeasonMessages(context, game, season) : [];
  return {
    faceType: game.regulation.face_type,
    listPath,
    channelName: channelName(channel, myPower),
    myPower,
    sender: composerSender(context, game, viewer.canPostAsAdmin && channel.kind === "open"),
    // 誰として書き込むか。管理者モード中は（参加者でも）管理人として発言し、
    // 管理人発言はオープンチャンネルにしか書けない。管理者モードでなければ元のアカウントとして発言する
    postAs: !viewer.canPostAsAdmin
      ? ("self" as const)
      : channel.kind === "open"
        ? ("admin" as const)
        : null,
    messages: channelMessages(messages, channel.id),
  };
}

/**
 * 発言フォームのアイコン。
 * 管理人発言なら管理人のアイコン。それ以外は、現在のシーズンが開戦前夜・感想戦なら
 * Discord のアバター、それ以外は担当国（視点変更中は切り替え先のアカウント）
 */
const composerSender = (
  context: Readonly<RouterContextProvider>,
  game: GameDetail,
  asAdmin: boolean,
): ChatComposerSender => {
  if (asAdmin) return { kind: "admin", faceType: game.regulation.face_type };
  const state = context.get(meContext);
  if (state.kind !== "ok") throw new Error("ログインしていません");
  const power = game.players.find(
    (p) => p.user.discord_user_id === state.me.discord_user_id,
  )?.power;
  const current = game.seasons.at(-1);
  if (power && current !== "ready" && current !== "debrief") {
    return { kind: "power", faceType: game.regulation.face_type, power };
  }
  return {
    kind: "user",
    name: displayName(state.me),
    avatarUrl: state.me.avatar_url,
  };
};

export default function GameChatChannel({ loaderData }: Route.ComponentProps) {
  const { faceType, listPath, myPower, sender, postAs, messages } = loaderData;
  return (
    <div className={`${styles.page} ${styles.withComposer}`}>
      <div className={styles.channelTitle}>
        <Link to={listPath} className={styles.backLink}>
          ‹ 一覧
        </Link>
        <h3>{loaderData.channelName}</h3>
      </div>
      <ChatMessageList messages={messages} faceType={faceType} myPower={myPower} />
      <div className={styles.composerDock}>
        <ChatComposer
          sender={sender}
          disabledReason={
            postAs === "admin"
              ? "管理人発言の送信は準備中です"
              : postAs === "self"
                ? "発言の送信は準備中です"
                : "管理者モード中はオープンチャンネルにだけ書き込めます"
          }
        />
      </div>
    </div>
  );
}
