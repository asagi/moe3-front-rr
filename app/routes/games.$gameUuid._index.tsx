import { data, useFetcher } from "react-router";
import { GameOwnerCard } from "~/components/game-info/GameOwnerCard";
import {
  GameJoinForm,
  GameJoinLoginPrompt,
} from "~/components/game-info/GameJoinForm";
import { GamePlayerList } from "~/components/game-info/GamePlayerList";
import { GameRegulationTable } from "~/components/game-info/GameRegulationTable";
import styles from "~/components/game-info/GameInfo.module.css";
import { ApiError, joinGame } from "~/lib/api.server";
import { discordLoginPath } from "~/lib/auth";
import { MAX_PLAYERS, POWERS, isRecruiting } from "~/lib/game";
import { joinErrorMessage, requireGame } from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid._index";

export const handle: GameRouteHandle = { gameTitle: "卓情報" };

export function meta({}: Route.MetaArgs) {
  return [{ title: "卓情報 | Diplomacy MOE" }];
}

/** 卓の詳細はレイアウトのミドルウェアで取得済み */
export async function loader({ context }: Route.LoaderArgs) {
  const game = requireGame(context);
  const state = context.get(meContext);
  return { game, loggedIn: state.kind === "ok" };
}

type JoinResult = { ok: true; error?: undefined } | { ok?: false; error: string };

/** 参加登録フォームの「申請する」で呼ばれる */
export async function action({ request, params, context }: Route.ActionArgs) {
  const state = context.get(meContext);
  if (state.kind !== "ok") {
    return data<JoinResult>(
      { error: "ログイン情報を確認できませんでした。もう一度ログインしてください。" },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const power = String(formData.get("requestedPower") ?? "");
  const keyword = String(formData.get("keyword") ?? "").trim();
  if (power && !POWERS.some((p) => p.code === power)) {
    return data<JoinResult>({ error: "希望国の指定が不正です。" }, { status: 400 });
  }

  try {
    await joinGame(
      params.gameUuid,
      { requested_power: power || null, keyword: keyword || null },
      state.auth,
    );
    return data<JoinResult>({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) {
      return data<JoinResult>({ error: joinErrorMessage(e) }, { status: e.status });
    }
    throw e;
  }
}

export default function GameInfo({ loaderData }: Route.ComponentProps) {
  const { game, loggedIn } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const owner = game.players.find((p) => p.is_owner);
  const others = game.players.filter((p) => !p.is_owner);
  const recruiting = isRecruiting(game);
  // 卓主の希望は必ず通るので、その国は選択肢に出さない
  const excludePowers = owner?.requested_power ? [owner.requested_power] : [];
  const justJoined = fetcher.data?.ok === true;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-5">
      {owner && (
        <GameOwnerCard owner={owner} faceType={game.regulation.face_type} />
      )}

      <GameRegulationTable
        regulation={game.regulation}
        startAt={game.start_at}
        isPrivate={game.is_private}
      />

      <GamePlayerList
        players={others}
        faceType={game.regulation.face_type}
        remaining={
          recruiting ? Math.max(MAX_PLAYERS - game.players.length, 0) : null
        }
      />

      {recruiting &&
        !game.is_owner &&
        (justJoined ? (
          <p className={styles.success} role="status">
            参加を申請しました。
          </p>
        ) : game.is_joined ? (
          <p className={styles.success}>この卓には参加申請済みです。</p>
        ) : !loggedIn ? (
          <GameJoinLoginPrompt
            onLogin={() => {
              window.location.href = discordLoginPath();
            }}
          />
        ) : (
          <GameJoinForm
            faceType={game.regulation.face_type}
            excludePowers={excludePowers}
            isPrivate={game.is_private}
            submitting={fetcher.state !== "idle"}
            error={fetcher.data?.error}
            onSubmit={(values) => {
              fetcher.submit(
                {
                  requestedPower: values.requestedPower,
                  keyword: values.keyword,
                },
                { method: "post" },
              );
            }}
          />
        ))}
    </div>
  );
}
