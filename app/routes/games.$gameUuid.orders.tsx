import { useCallback, useEffect, useState } from "react";
import {
  data,
  redirect,
  useBlocker,
  useFetcher,
  useRevalidator,
} from "react-router";
import { BoardWithInfo } from "~/components/board/BoardWithInfo";
import { OrderForm, type OrderFormSubmit } from "~/components/orders/OrderForm";
import { OrderResultList } from "~/components/orders/OrderResultList";
import { OrderSystemMessage } from "~/components/orders/OrderSystemMessage";
import styles from "~/components/orders/OrdersPage.module.css";
import { PowerStatusTable } from "~/components/orders/PowerStatusTable";
import { PowerSummaryCard } from "~/components/orders/PowerSummaryCard";
import {
  ApiError,
  getBoard,
  getOrders,
  getSeasonResult,
  putOrders,
  putProgressConsensus,
} from "~/lib/api.server";
import { type BoardSnapshot, baseCode } from "~/lib/board";
import { isLiveSeason, isOffGameSeason, isRecruiting } from "~/lib/game";
import { requireGame, resolveSeason } from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import {
  type OrderInput,
  type OrderPhaseKind,
  type OrdersResponse,
  type SeasonResult,
  idleLimitMinutes,
  locationLabel,
  orderSystemMessage,
} from "~/lib/orders";
import { useMessageStream } from "~/lib/use-message-stream";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.orders";

export const handle: GameRouteHandle = { gameTitle: "命令", seasonal: true };

export function meta({}: Route.MetaArgs) {
  return [{ title: "命令 | Diplomacy MOE" }];
}

const ORDER_PHASES: OrderPhaseKind[] = ["main", "retreat", "adjustment"];

/**
 * 命令画面。
 * - 開戦前夜：誰でも初期配置を見る（命令はない）
 * - 現在のシーズン：参加者は命令を出す（操作の要らない国は命令欄なし）。第三者は結果を見る
 * - 過去のシーズン：誰でも結果を見る
 */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  const game = requireGame(context);
  // 募集中は盤面がないので卓情報へ戻す（開戦前夜は初期配置を見られる）
  if (isRecruiting(game)) throw redirect(`/games/${params.gameUuid}`);
  const season = resolveSeason(request, game);
  if (season == null) throw redirect(`/games/${params.gameUuid}`);
  const live = isLiveSeason(game, season);
  const state = context.get(meContext);
  const auth = state.kind === "ok" ? state.auth : null;

  // 命令を出せるのは、進行中の卓の現在のシーズンで、メイン・撤退・調整フェイズのとき。
  // 担当国のある参加者かどうかは API に任せる（403 なら第三者として見せる）
  const canOrder =
    live &&
    game.status === "in_progress" &&
    ORDER_PHASES.includes(game.phase_kind as OrderPhaseKind);

  const [board, result, orders] = await Promise.all([
    getBoard(game.game_uuid, auth, season),
    // 開戦前夜と感想戦には命令がない
    isOffGameSeason(season)
      ? Promise.resolve(null)
      : getSeasonResult(game.game_uuid, season),
    canOrder && auth && game.is_joined
      ? getOrders(game.game_uuid, auth).catch((e) => {
          if (e instanceof ApiError && (e.status === 403 || e.status === 401))
            return null;
          throw e;
        })
      : Promise.resolve(null),
  ]);

  const myPower = orders?.power ?? null;
  return {
    // 地図に描くユニット（撤退フェイズは、攻めてきたユニットを移動前の位置に戻す）
    mapUnits: retreatMapUnits(board, result),
    gameUuid: game.game_uuid,
    faceType: game.regulation.face_type,
    season,
    live,
    phaseKind: game.phase_kind,
    board,
    result,
    orders,
    // 不在時間は、進行中の卓の現在のシーズンだけ出す（開戦前夜・感想戦・過去のシーズンは出さない）
    idleLimitMinutes:
      live && game.status === "in_progress" && !isOffGameSeason(season)
        ? idleLimitMinutes(game.regulation.duration_type)
        : null,
    myStatus: board.powers.find((p) => p.power === myPower) ?? null,
    systemMessage: orderSystemMessage({
      game,
      isLive: live,
      needsAction: orders ? orders.needs_action : null,
    }),
    // 即時進行は合意進行の卓の現在のシーズンだけ
    consensus: game.regulation.progress_mode === "consensus" && live,
    // SSE をつなぎ直す鍵（視点変更などで見ている人が変わったとき）
    streamKey:
      state.kind === "ok" ? `${state.me.username}:${myPower ?? "-"}` : "guest",
  };
}

/**
 * 撤退フェイズの地図に描くユニット。
 * 敗退したユニットは今の位置のまま（地図で × を重ねる）、攻めてきたユニットはメインフェイズの
 * 移動前の位置に描く（同じ地域に 2 つ重ならないようにするため）。撤退フェイズ以外はそのまま
 */
const retreatMapUnits = (board: BoardSnapshot, result: SeasonResult | null) => {
  if (board.phase_kind !== "retreat" || !result) return board.units;
  const dislodgedAt = new Set(
    board.units.filter((u) => u.dislodged).map((u) => baseCode(u.location)),
  );
  return board.units.map((unit) => {
    if (unit.dislodged || !dislodgedAt.has(baseCode(unit.location)))
      return unit;
    // その地域に移動して成功した、同じ国の命令が攻めてきたユニット
    const attack = result.main_phase.orders.find(
      (o) =>
        o.order_kind === "move" &&
        o.status === "success" &&
        o.power === unit.power &&
        o.dest != null &&
        baseCode(o.dest) === baseCode(unit.location),
    );
    return attack ? { ...unit, location: attack.location } : unit;
  });
};

type SubmitResult =
  { ok: true; error?: undefined } | { ok?: false; error: string };

/** 命令の確定のエラーごとの文言 */
const submitErrorMessage = (e: ApiError) => {
  switch (e.code) {
    case "phase_conflict":
      return "フェイズが進んだため確定できませんでした。画面を読み直してください。";
    case "invalid_order":
      return e.location
        ? `${locationLabel(e.location)} の命令を確定できませんでした（${e.message}）`
        : `命令を確定できませんでした（${e.message}）`;
    case "forbidden":
      return `命令を確定できません（${e.message}）`;
    default:
      return `命令の確定に失敗しました（${e.code}）: ${e.message}`;
  }
};

/** 命令をまとめて確定し、即時進行の合意が変わっていれば送る */
export async function action({ request, context }: Route.ActionArgs) {
  const game = requireGame(context);
  const state = context.get(meContext);
  if (state.kind !== "ok") {
    return data<SubmitResult>(
      { error: "ログイン情報を確認できませんでした。" },
      { status: 401 },
    );
  }
  const body = (await request.json()) as {
    season: string;
    phase_kind: OrderPhaseKind;
    orders: OrderInput[];
    progressConsented: boolean | null;
    savedProgress: boolean | null;
  };
  try {
    await putOrders(
      game.game_uuid,
      { season: body.season, phase_kind: body.phase_kind, orders: body.orders },
      state.auth,
    );
    if (
      body.progressConsented != null &&
      body.progressConsented !== body.savedProgress
    ) {
      await putProgressConsensus(
        game.game_uuid,
        body.progressConsented,
        state.auth,
      );
    }
    return data<SubmitResult>({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) {
      return data<SubmitResult>(
        { error: submitErrorMessage(e) },
        { status: e.status },
      );
    }
    throw e;
  }
}

export default function GameOrders({ loaderData }: Route.ComponentProps) {
  const {
    gameUuid,
    faceType,
    season,
    live,
    board,
    result,
    orders,
    myStatus,
    systemMessage,
    consensus,
  } = loaderData;
  const revalidator = useRevalidator();
  const fetcher = useFetcher<typeof action>();

  // 状況が変わった・フェイズが進んだら読み直す（確定前の命令は、命令の中身が変わらない限り保つ）
  const refresh = () => {
    if (revalidator.state === "idle") void revalidator.revalidate();
  };
  useMessageStream(
    gameUuid,
    { connectionKey: loaderData.streamKey, season, enabled: live },
    {
      onBoard: refresh,
      onPhase: refresh,
      onSeason: refresh,
      // 発言が届いたら、タブバーのチャットに未読の印を出すために読み直す
      onMessage: (m) => {
        if (m.sender_kind !== "system") refresh();
      },
    },
  );

  // 確定に失敗したときのエラー
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (fetcher.state === "idle") setError(fetcher.data?.error ?? null);
  }, [fetcher.state, fetcher.data]);

  // 確定していない変更があるときは、ページを離れる前に確認する
  const [dirty, setDirty] = useState(false);
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);
  useUnsavedChangesGuard(dirty);

  const showForm = orders != null && orders.needs_action;

  // 地図で押した地域の情報カードに、命令を出せる自国ユニットがいれば「命令を変更」を出す。
  // 押すとカードを閉じ、そのユニットの命令フォームを開いてそこまで画面を動かす
  const [openLocation, setOpenLocation] = useState<string | null>(null);
  const mapActions = (code: string, close: () => void) => {
    if (!showForm) return null;
    const option = orders.options.find(
      (o) => o.unit_power === orders.power && baseCode(o.location) === code,
    );
    if (!option) return null;
    return (
      <button
        type="button"
        className={styles.mapAction}
        onClick={() => {
          close();
          setOpenLocation(option.location);
          requestAnimationFrame(() =>
            document
              .getElementById(`order-editor-${option.location}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" }),
          );
        }}
      >
        命令を変更
      </button>
    );
  };
  const submit = ({ orders: next, progressConsented }: OrderFormSubmit) => {
    if (!orders) return;
    void fetcher.submit(
      {
        season: orders.season,
        phase_kind: orders.phase_kind,
        orders: next,
        progressConsented,
        savedProgress: myStatus?.progress_consented ?? null,
      } as unknown as Parameters<typeof fetcher.submit>[0],
      { method: "post", encType: "application/json" },
    );
  };

  return (
    <div className={styles.page}>
      <BoardWithInfo
        boardData={{
          units: loaderData.mapUnits,
          territories: board.territories,
        }}
        renderActions={mapActions}
      />

      {systemMessage && <OrderSystemMessage message={systemMessage} />}

      {orders && myStatus && (
        <PowerSummaryCard faceType={faceType} status={myStatus} />
      )}

      {showForm && (
        <OrderForm
          res={orders}
          units={board.units}
          faceType={faceType}
          showProgress={consensus}
          progressConsented={myStatus?.progress_consented ?? false}
          submitting={fetcher.state !== "idle"}
          error={error}
          onSubmit={submit}
          onDirtyChange={onDirtyChange}
          openLocation={openLocation}
          onOpenChange={setOpenLocation}
        />
      )}

      {result && (
        <ResultLists
          result={result}
          faceType={faceType}
          orders={orders}
          live={live}
        />
      )}

      {board.powers.length > 0 && (
        <PowerStatusTable
          faceType={faceType}
          powers={board.powers}
          showProgress={consensus}
          idleLimitMinutes={loaderData.idleLimitMinutes}
        />
      )}
    </div>
  );
}

/**
 * 結果一覧。
 * - 行軍：参加者がメインフェイズで命令を出している間は出さない。第三者には「—」
 * - 撤退・調整：解決済み（調整フェイズ以降・翌シーズン以降）で、命令があるときだけ
 */
const ResultLists = ({
  result,
  faceType,
  orders,
  live,
}: {
  result: SeasonResult;
  faceType: Route.ComponentProps["loaderData"]["faceType"];
  orders: OrdersResponse | null;
  live: boolean;
}) => {
  const ordering = live && orders?.phase_kind === "main";
  const closedWithOrders = (phase: SeasonResult["retreat_phase"]) =>
    phase != null && phase.status === "closed" && phase.orders.length > 0
      ? phase
      : null;
  const retreat = closedWithOrders(result.retreat_phase);
  const adjustment = closedWithOrders(result.adjustment_phase);
  return (
    <>
      {!ordering && (
        <OrderResultList
          title="全軍の行軍命令結果"
          faceType={faceType}
          result={result.main_phase}
        />
      )}
      {retreat && (
        <OrderResultList
          title="全軍の撤退命令結果"
          faceType={faceType}
          result={retreat}
        />
      )}
      {adjustment && (
        <OrderResultList
          title="全軍の調整命令結果"
          faceType={faceType}
          result={adjustment}
        />
      )}
    </>
  );
};

/** 確定していない変更があるときに、ページ内の移動とタブを閉じる操作の前に確認する */
const useUnsavedChangesGuard = (dirty: boolean) => {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (
      window.confirm(
        "確定していない命令の変更があります。破棄して移動しますか？",
      )
    ) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
};
