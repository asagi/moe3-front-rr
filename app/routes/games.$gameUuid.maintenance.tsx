import { useEffect, useState } from "react";
import { data, redirect, useFetcher } from "react-router";
import Board from "~/components/board/Board";
import {
  BoardEditPanel,
  type BoardEditValue,
} from "~/components/board-edit/BoardEditPanel";
import styles from "~/components/board-edit/BoardEdit.module.css";
import {
  DrawProposalControl,
  NextUpdateForm,
  ProgressModeControl,
} from "~/components/game-admin/OwnerControls";
import {
  type ApiAuth,
  ApiError,
  deleteTerritory,
  deleteUnit,
  getBoard,
  putDrawProposal,
  putNextUpdateAt,
  putProgressModeConsensus,
  putTerritory,
  putUnit,
} from "~/lib/api.server";
import {
  type BoardSnapshot,
  type BoardUnit,
  SELECTABLE_PROVINCES,
  baseCode,
  boardNotEditableReason,
  findProvince,
} from "~/lib/board";
import { type GameDetail, POWERS, type PowerCode, isEnded, seasonLabel } from "~/lib/game";
import { canMaintainGame, requireGame } from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.maintenance";

export const handle: GameRouteHandle = { gameTitle: "卓の管理" };

export function meta({}: Route.MetaArgs) {
  return [{ title: "卓の管理 | Diplomacy MOE" }];
}

/** 卓主と管理者モード中の管理者以外は開けないので、卓情報へ戻す */
const requireMaintainer = async (
  request: Request,
  params: Route.LoaderArgs["params"],
  context: Route.LoaderArgs["context"],
) => {
  const game = requireGame(context);
  if (!(await canMaintainGame(request, context, game))) {
    throw redirect(`/games/${params.gameUuid}`);
  }
  return game;
};

const loadBoard = async (gameUuid: string, context: Route.LoaderArgs["context"]) => {
  const state = context.get(meContext);
  return getBoard(gameUuid, state.kind === "ok" ? state.auth : null);
};

/**
 * 卓主の操作（次回更新時刻・和平終了・進行モード）。使えるのは卓主だけ（管理者は使えない）。
 * 次回更新時刻は開戦前夜とメインフェイズ、和平終了と進行モードはメインフェイズだけ。
 * 視点変更中は、切り替え先が卓主なら使える（is_owner も切り替え先の値が返る）
 */
const ownerControlsOf = (game: GameDetail) => {
  if (!game.is_owner || isEnded(game)) return null;
  const main = game.status === "in_progress" && game.phase_kind === "main";
  const ready = game.status === "ready" && game.phase_kind === "ready";
  if (!main && !ready) return null;
  return {
    season: game.seasons.at(-1) ?? "ready",
    nextUpdateAt: game.next_update_at,
    // 和平終了と進行モードはメインフェイズだけ
    main,
    drawProposal: game.draw_proposal,
    progressMode: game.regulation.progress_mode,
  };
};

/**
 * 卓の管理。卓主の操作（次回更新時刻・和平終了・進行モード）と、盤面の編集。
 * 盤面の編集は、最新フェイズのユニット配置と占領情報を地域ごとに編集する（卓主と管理者モード中の管理者）。
 * 開戦前夜とメインフェイズだけ使える
 */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  const game = await requireMaintainer(request, params, context);
  const owner = ownerControlsOf(game);
  const notEditable = boardNotEditableReason(game);
  let board: BoardSnapshot | null = null;
  let loadError: string | null = null;
  try {
    board = await loadBoard(game.game_uuid, context);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    loadError =
      e.status === 404 && e.code !== "not_found"
        ? "盤面を取得できませんでした（サーバーが盤面取得 API にまだ対応していない可能性があります）"
        : `盤面を取得できませんでした（${e.code}）`;
  }
  return { board, loadError, notEditable, owner };
}

type EditResult = { ok: true; error?: undefined } | { ok?: false; error: string };

/** 編集 API のエラーごとの文言 */
const editErrorMessage = (e: ApiError) => {
  switch (e.code) {
    case "phase_conflict":
      return "フェイズが進んだため保存できませんでした。画面を読み直してから、もう一度編集してください。";
    case "forbidden":
      return `この盤面は編集できません（${e.message}）`;
    case "invalid_request":
      return `入力が正しくありません（${e.message}）`;
    default:
      return `保存に失敗しました（${e.code}）: ${e.message}`;
  }
};

/** 卓主の操作の API エラーごとの文言 */
const ownerErrorMessage = (e: ApiError) => {
  switch (e.code) {
    case "phase_conflict":
      return "フェイズが進んだため変更できませんでした。画面を読み直してください。";
    case "forbidden":
      return `変更できません（${e.message}）`;
    case "invalid_request":
      return `入力が正しくありません（${e.message}）`;
    default:
      return `変更に失敗しました（${e.code}）: ${e.message}`;
  }
};

/** 卓主の操作（intent が next-update / draw / progress-mode） */
const handleOwnerAction = async (game: GameDetail, auth: ApiAuth, form: FormData) => {
  const owner = ownerControlsOf(game);
  if (!owner) {
    return data<EditResult>({ error: "この操作は、卓主が開戦前夜かメインフェイズにだけ使えます。" }, { status: 403 });
  }
  const intent = form.get("intent");
  try {
    if (intent === "next-update") {
      const value = String(form.get("next_update_at") ?? "");
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
        return data<EditResult>({ error: "日時が正しくありません。" }, { status: 400 });
      }
      await putNextUpdateAt(game.game_uuid, owner.season, value, auth);
    } else if (!owner.main) {
      return data<EditResult>({ error: "この操作はメインフェイズにだけ使えます。" }, { status: 403 });
    } else if (intent === "draw") {
      await putDrawProposal(game.game_uuid, owner.season, form.get("draw_proposal") === "true", auth);
    } else if (intent === "progress-mode") {
      await putProgressModeConsensus(game.game_uuid, owner.season, auth);
    } else {
      return data<EditResult>({ error: "操作が正しくありません。" }, { status: 400 });
    }
    return data<EditResult>({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) {
      return data<EditResult>({ error: ownerErrorMessage(e) }, { status: e.status });
    }
    throw e;
  }
};

const OWNER_INTENTS = ["next-update", "draw", "progress-mode"];

/** 卓主の操作か、1 つの地域のユニットと占領国の保存 */
export async function action({ request, params, context }: Route.ActionArgs) {
  const game = await requireMaintainer(request, params, context);
  const state = context.get(meContext);
  if (state.kind !== "ok") {
    return data<EditResult>({ error: "ログイン情報を確認できませんでした。" }, { status: 401 });
  }
  const form = await request.formData();
  if (OWNER_INTENTS.includes(String(form.get("intent")))) {
    return handleOwnerAction(game, state.auth, form);
  }

  const notEditable = boardNotEditableReason(game);
  if (notEditable) return data<EditResult>({ error: notEditable }, { status: 403 });

  const code = String(form.get("code") ?? "");
  const province = findProvince(code);
  if (!province || province.code !== code) {
    return data<EditResult>({ error: "地域が正しくありません。" }, { status: 400 });
  }
  const nextUnit = JSON.parse(String(form.get("unit") ?? "null")) as BoardUnit | null;
  const nextTerritory = (form.get("territory") || null) as PowerCode | null;
  const powerCodes = POWERS.map((p) => p.code) as string[];
  if (
    (nextUnit &&
      (!powerCodes.includes(nextUnit.power) ||
        !["a", "f"].includes(nextUnit.kind) ||
        baseCode(nextUnit.location) !== code)) ||
    (nextTerritory && !powerCodes.includes(nextTerritory))
  ) {
    return data<EditResult>({ error: "入力が正しくありません。" }, { status: 400 });
  }

  try {
    // 今の盤面と比べて、変わったところだけ API を呼ぶ
    const board = await loadBoard(game.game_uuid, context);
    const season = board.season;
    const unit = board.units.find((u) => baseCode(u.location) === code) ?? null;
    const territory = board.territories.find((t) => t.code === code)?.power ?? null;

    if (
      nextUnit &&
      (unit?.kind !== nextUnit.kind ||
        unit?.power !== nextUnit.power ||
        unit?.location !== nextUnit.location)
    ) {
      // 同じ地域のユニットは置き換えられる（古いユニットの命令は消え、新しいユニットに維持命令が付く）
      await putUnit(
        game.game_uuid,
        nextUnit.location,
        { power: nextUnit.power, kind: nextUnit.kind },
        season,
        state.auth,
      );
    } else if (!nextUnit && unit) {
      await deleteUnit(game.game_uuid, unit.location, season, state.auth);
    }

    if (province.kind !== "Water" && nextTerritory !== territory) {
      if (nextTerritory) {
        await putTerritory(game.game_uuid, code, nextTerritory, season, state.auth);
      } else {
        await deleteTerritory(game.game_uuid, code, season, state.auth);
      }
    }
    return data<EditResult>({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) {
      return data<EditResult>({ error: editErrorMessage(e) }, { status: e.status });
    }
    throw e;
  }
}

export default function GameMaintenance({ loaderData }: Route.ComponentProps) {
  const { owner } = loaderData;
  return (
    <div className={styles.page}>
      {owner && <OwnerSection owner={owner} />}
      <BoardEditSection data={loaderData} showHeading={owner != null} />
    </div>
  );
}

/** 送信の状態（送信中か・失敗したときの文言） */
const useControlState = (fetcher: ReturnType<typeof useFetcher<typeof action>>) => {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (fetcher.state === "idle") setError(fetcher.data?.error ?? null);
  }, [fetcher.state, fetcher.data]);
  return { submitting: fetcher.state !== "idle", error };
};

/** 卓主の操作（次回更新時刻・和平終了・進行モード）。操作ごとに別々に送る */
const OwnerSection = ({
  owner,
}: {
  owner: NonNullable<Route.ComponentProps["loaderData"]["owner"]>;
}) => {
  const nextUpdate = useFetcher<typeof action>();
  const draw = useFetcher<typeof action>();
  const progress = useFetcher<typeof action>();
  const nextUpdateState = useControlState(nextUpdate);
  const drawState = useControlState(draw);
  const progressState = useControlState(progress);
  return (
    <>
      <NextUpdateForm
        current={owner.nextUpdateAt}
        {...nextUpdateState}
        onSubmit={(value) =>
          void nextUpdate.submit({ intent: "next-update", next_update_at: value }, { method: "post" })
        }
      />
      {owner.main && (
        <>
          <DrawProposalControl
            current={owner.drawProposal}
            {...drawState}
            onChange={(value) =>
              void draw.submit({ intent: "draw", draw_proposal: String(value) }, { method: "post" })
            }
          />
          <ProgressModeControl
            current={owner.progressMode}
            {...progressState}
            onSwitch={() => void progress.submit({ intent: "progress-mode" }, { method: "post" })}
          />
        </>
      )}
    </>
  );
};

/** 盤面の編集 */
const BoardEditSection = ({
  data: { board, loadError, notEditable },
  showHeading,
}: {
  data: Route.ComponentProps["loaderData"];
  /** 卓主の操作と並べるときは「盤面の編集」の見出しを出す */
  showHeading: boolean;
}) => {
  const fetcher = useFetcher<typeof action>();
  const [selected, setSelected] = useState<string | null>(null);

  // 保存に失敗したときのエラーは、別の地域を選んだら消す
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (fetcher.state === "idle") setError(fetcher.data?.error ?? null);
  }, [fetcher.state, fetcher.data]);
  useEffect(() => setError(null), [selected]);

  const heading = showHeading && <h3 className={styles.sectionTitle}>盤面の編集</h3>;
  if (!board) {
    return (
      <>
        {heading}
        <p className={styles.notice} role="alert">
          {loadError}
        </p>
      </>
    );
  }

  const editable = notEditable == null;
  const province = selected ? findProvince(selected) : null;
  const unit = selected
    ? (board.units.find((u) => baseCode(u.location) === selected) ?? null)
    : null;
  const territory = selected
    ? (board.territories.find((t) => t.code === selected)?.power ?? null)
    : null;

  const save = (value: BoardEditValue) => {
    if (!selected) return;
    void fetcher.submit(
      {
        code: selected,
        unit: JSON.stringify(value.unit),
        territory: value.territory ?? "",
      },
      { method: "post" },
    );
  };

  return (
    <>
      {heading}
      {editable ? (
        <p className={styles.lead}>
          {seasonLabel(board.season)}の盤面です。地図の地域を押すと、ユニットと占領を編集できます。
          保存するとシステムメッセージで全員に知らされます。
        </p>
      ) : (
        <p className={styles.notice}>{notEditable}</p>
      )}

      <Board
        boardData={{ units: board.units, territories: board.territories }}
        onProvinceSelect={editable ? setSelected : undefined}
        selectedCode={selected}
      />

      {editable && (
        // 地図で押しにくい小さな地域のため、一覧からも選べるようにする
        <label className={styles.picker}>
          地域
          <select value={selected ?? ""} onChange={(e) => setSelected(e.target.value || null)}>
            <option value="">選んでください</option>
            {[...SELECTABLE_PROVINCES]
              .sort((a, b) => a.jname.localeCompare(b.jname, "ja"))
              .map((p) => (
                <option key={p.code} value={p.code}>
                  {p.jname}
                </option>
              ))}
          </select>
        </label>
      )}

      {editable && province && (
        <BoardEditPanel
          province={province}
          unit={unit}
          territory={territory}
          submitting={fetcher.state !== "idle"}
          error={error}
          onSave={save}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};
