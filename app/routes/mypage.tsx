import type { ReactNode } from "react";
import { Link, redirect } from "react-router";
import { GameList } from "~/components/game-list/GameList";
import { type UserMe, listGames } from "~/lib/api.server";
import type { GameSummary } from "~/lib/game";
import { meContext } from "~/lib/me.server";
import type { Route } from "./+types/mypage";

export function meta({}: Route.MetaArgs) {
  return [{ title: "マイページ | Diplomacy MOE" }];
}

/** 各セクションの最大表示件数（ページ送りは未対応） */
const LIMIT = 20;

/** 失敗したら null にして、そのセクションだけエラー表示にする */
const settle = async <T,>(promise: Promise<T>): Promise<T | null> => {
  try {
    return await promise;
  } catch (e) {
    console.error("卓一覧の取得に失敗しました", e);
    return null;
  }
};

/** 卓番号の新しい順（採番前は最後） */
const byNumberDesc = (a: GameSummary, b: GameSummary) =>
  (b.game_number ?? -1) - (a.game_number ?? -1);

/** 未ログインならトップへ戻す。ユーザー情報はレイアウトのミドルウェアで取得済み */
export async function loader({ context }: Route.LoaderArgs) {
  const state = context.get(meContext);
  if (state.kind === "loggedOut" || state.kind === "unauthorized") {
    throw redirect("/");
  }
  if (state.kind === "failed") {
    return { me: null, active: null, recruiting: null, past: null };
  }

  const { me, auth } = state;
  // 視点変更中は me も auth も成り代わり先になっている
  const user = me.discord_user_id;
  const [active, allActive, closed, aborted] = await Promise.all([
    settle(listGames({ user, status: "active", per_page: LIMIT }, auth)),
    // status で「募集中」を直接指定できないので、active から preparing を抜き出す
    settle(listGames({ status: "active", per_page: 100 })),
    settle(listGames({ user, status: "closed", per_page: LIMIT }, auth)),
    settle(listGames({ user, status: "aborted", per_page: LIMIT }, auth)),
  ]);

  return {
    me,
    active: active?.games ?? null,
    recruiting:
      allActive?.games
        .filter((g) => g.status === "preparing")
        .slice(0, LIMIT) ?? null,
    past:
      closed && aborted
        ? [...closed.games, ...aborted.games].sort(byNumberDesc).slice(0, LIMIT)
        : null,
  };
}

/** プロフィール欄の項目（仮。しばらく出しておく） */
const FIELDS: { key: keyof UserMe; label: string }[] = [
  { key: "discord_user_id", label: "Discord ユーザー ID" },
  { key: "username", label: "ユーザー名" },
  { key: "global_name", label: "表示名" },
  { key: "avatar_url", label: "アバター URL" },
];

const linkButton =
  "inline-block rounded-full bg-brand px-4 py-2.5 text-xs leading-none font-bold whitespace-nowrap text-white hover:bg-brand-hover";
const linkButtonSecondary =
  "inline-block rounded-full px-5 py-3 text-sm leading-none font-bold text-gray-700 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.15)] hover:bg-white";

export default function MyPage({ loaderData }: Route.ComponentProps) {
  const { me, active, recruiting, past } = loaderData;
  // TODO: 参加中の卓に自分が卓主の卓があれば非表示にする（API に卓主情報が入ったら対応）
  const canCreate = true;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
      <h2 className="text-xl font-bold">マイページ</h2>

      <Section title="参加中の卓">
        <GameList games={active} emptyMessage="現在参加している卓はありません" />
      </Section>

      <Section
        title="募集中の卓"
        action={
          canCreate && (
            <Link to="/games/new" className={linkButton}>
              新しく募集する
            </Link>
          )
        }
      >
        <GameList games={recruiting} emptyMessage="募集中の卓はありません" />
      </Section>

      <Section title="過去に参加した卓">
        <GameList games={past} emptyMessage="過去に参加した卓はありません" />
      </Section>

      <div className="text-center">
        <Link to="/games" className={linkButtonSecondary}>
          すべての卓を見る
        </Link>
      </div>

      <Section title="ユーザー情報">
        {me ? (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="contents">
                <dt className="font-semibold text-gray-600">{label}</dt>
                <dd className="break-all">{me[key] ?? "（なし）"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm">ユーザー情報を取得できませんでした。</p>
        )}
      </Section>
    </div>
  );
}

const Section = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex min-h-9 items-center justify-between gap-2 border-b border-gray-300 pb-1">
      <h3 className="text-base font-bold">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);
