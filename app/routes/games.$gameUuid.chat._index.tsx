import { ChannelList } from "~/components/chat/ChannelList";
import styles from "~/components/chat/Chat.module.css";
import { PlaceholderPage } from "~/components/placeholder-page/PlaceholderPage";
import { chatPath, summarizeChannels } from "~/lib/chat";
import {
  loadSeasonMessages,
  resolveChatViewer,
} from "~/lib/chat.server";
import { requireGame, resolveSeason } from "~/lib/game.server";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.chat._index";

export const handle: GameRouteHandle = { gameTitle: "チャット", seasonal: true };

export function meta({}: Route.MetaArgs) {
  return [{ title: "チャンネル一覧 | Diplomacy MOE" }];
}

/**
 * 参加者と管理者モード中の管理者にはチャンネル一覧を（参加者でない管理者はオープンチャンネルだけ）、
 * それ以外（第三者・終了した卓）には第三者用ログビューアーを出す。
 * 権限が変わると再取得でここが走り直すので、表示も自然に切り替わる
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const game = requireGame(context);
  const viewer = await resolveChatViewer(request, context, game);
  const season = resolveSeason(request, game);
  const base = {
    gameUuid: game.game_uuid,
    faceType: game.regulation.face_type,
    season,
    // URL で指定されたシーズン（チャンネル画面へのリンクに引き継ぐ）
    seasonParam: new URL(request.url).searchParams.get("season"),
    // 参加者の担当国（チャンネル名から自国を省く）
    myPower: viewer.kind === "channels" ? viewer.power : null,
  };

  if (viewer.kind === "viewer") {
    return { ...base, layout: "viewer" as const, channels: [] };
  }
  const messages = season ? await loadSeasonMessages(context, game, season) : [];
  return {
    ...base,
    layout: "channels" as const,
    channels: summarizeChannels(messages, base.myPower),
  };
}

export default function GameChat({ loaderData }: Route.ComponentProps) {
  const { gameUuid, faceType, seasonParam, myPower, layout, channels } =
    loaderData;

  if (layout === "viewer") {
    // 第三者用ログビューアーはレイアウトが決まるまで仮表示
    return <PlaceholderPage title="チャットログ" />;
  }

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
}
