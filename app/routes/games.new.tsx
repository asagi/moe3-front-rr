import { useEffect, useState } from "react";
import {
  data,
  redirect,
  useActionData,
  useNavigation,
  useSubmit,
} from "react-router";
import { GameCreateConfirm } from "~/components/game-create/GameCreateConfirm";
import { GameCreateForm } from "~/components/game-create/GameCreateForm";
import { ApiError, type CreateGameBody, createGame } from "~/lib/api.server";
import {
  DEFAULT_GAME_FORM_VALUES,
  type GameFormValues,
  gameFormToRecord,
  readGameForm,
  todayInJst,
  validateGameForm,
} from "~/lib/game-form";
import { hasActiveOwnedGame } from "~/lib/game.server";
import { meContext } from "~/lib/me.server";
import type { Route } from "./+types/games.new";

export function meta({}: Route.MetaArgs) {
  return [{ title: "新規卓作成 | Diplomacy MOE" }];
}

/** 未ログインならトップへ、卓主の卓が進行中ならマイページへ戻す */
export async function loader({ context }: Route.LoaderArgs) {
  const state = context.get(meContext);
  if (state.kind === "loggedOut" || state.kind === "unauthorized") {
    throw redirect("/");
  }
  if (state.kind === "ok") {
    // 確認できなかったときは画面を出す（作成時の action でもう一度確認する）
    const owned = await hasActiveOwnedGame(
      state.me.discord_user_id,
      state.auth,
    ).catch((e) => {
      console.error("卓主の卓の確認に失敗しました", e);
      return false;
    });
    if (owned) throw redirect("/mypage");
  }
  return { today: todayInJst() };
}

const toCreateGameBody = (values: GameFormValues): CreateGameBody => ({
  face_type: values.faceType === "girls" ? 1 : 2,
  progress_mode: values.progressMode === "scheduled" ? 1 : 2,
  duration_type: values.durationType === "short" ? 1 : 2,
  start_date: values.startDate,
  first_period_hour: Number(values.firstPeriodHour),
  first_period_minute: Number(values.firstPeriodMinute),
  requested_power: values.requestedPower || null,
  keyword: values.locked ? values.keyword : null,
});

/** 確認画面の「この内容で作成する」で呼ばれる。成功したら作成した卓のページへ移る */
export async function action({ request, context }: Route.ActionArgs) {
  const state = context.get(meContext);
  if (state.kind !== "ok") {
    return data(
      { error: "ログイン情報を確認できませんでした。もう一度ログインしてください。" },
      { status: 401 },
    );
  }

  // 画面側でも検証しているが、直接 POST された場合に備えてもう一度確認する
  const values = readGameForm(await request.formData());
  const errors = Object.values(validateGameForm(values, todayInJst()));
  if (errors.length > 0) {
    return data({ error: errors.join(" / ") }, { status: 400 });
  }

  try {
    // API 側では制限していないので、ここで 1 人 1 卓に絞る
    if (await hasActiveOwnedGame(state.me.discord_user_id, state.auth)) {
      return data(
        { error: "卓主として進行中の卓があるため、新しい卓は作成できません。" },
        { status: 409 },
      );
    }
    const { game_uuid } = await createGame(toCreateGameBody(values), state.auth);
    return redirect(`/games/${game_uuid}`);
  } catch (e) {
    if (e instanceof ApiError) {
      return data(
        { error: `作成に失敗しました（${e.code}）: ${e.message}` },
        { status: e.status },
      );
    }
    throw e;
  }
}

export default function GamesNew({ loaderData }: Route.ComponentProps) {
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [values, setValues] = useState(DEFAULT_GAME_FORM_VALUES);
  const [error, setError] = useState<string | null>(null);
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  // action のエラーは確認画面に出す（戻ったら消す）
  useEffect(() => {
    if (actionData?.error) setError(actionData.error);
  }, [actionData]);

  // 画面を切り替えたら先頭から見せる
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <h2 className="text-xl font-bold">
        {step === "input" ? "新規卓作成" : "募集内容の確認"}
      </h2>
      {step === "input" ? (
        <GameCreateForm
          defaultValues={values}
          today={loaderData.today}
          onConfirm={(confirmed) => {
            setValues(confirmed);
            setError(null);
            setStep("confirm");
          }}
        />
      ) : (
        <GameCreateConfirm
          values={values}
          submitting={navigation.state !== "idle"}
          error={error}
          onBack={() => {
            setError(null);
            setStep("input");
          }}
          onCreate={() => {
            submit(gameFormToRecord(values), { method: "post" });
          }}
        />
      )}
    </div>
  );
}
