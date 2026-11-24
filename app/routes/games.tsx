import type { ReactNode } from "react";
import { Link } from "react-router";
import { GameList } from "~/components/game-list/GameList";
import { listGames } from "~/lib/api.server";
import { meContext } from "~/lib/me.server";
import type { Route } from "./+types/games";

export function meta({}: Route.MetaArgs) {
  return [{ title: "稼働中の卓 | Diplomacy MOE" }];
}

/** 1 ページの件数 */
const PER_PAGE = 20;

/** ?page= を 1 以上の整数として読む（不正な値は 1 ページ目） */
const parsePage = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
};

/** 稼働中（終了・中止以外）の卓を取得する。ゲストも見られる */
export async function loader({ request, context }: Route.LoaderArgs) {
  const page = parsePage(new URL(request.url).searchParams.get("page"));
  const state = context.get(meContext);
  // ログインしていれば付ける（is_owner が入る）。ゲストは認証なしで取る
  const auth = state.kind === "ok" ? state.auth : null;

  try {
    // 並び順は API に任せる（作成日時の新しい順）
    const res = await listGames(
      { status: "active", page, per_page: PER_PAGE },
      auth,
    );
    return {
      page,
      totalPages: Math.max(1, Math.ceil(res.total / PER_PAGE)),
      recruiting: res.games.filter((g) => g.status === "preparing"),
      running: res.games.filter((g) => g.status !== "preparing"),
    };
  } catch (e) {
    console.error("卓一覧の取得に失敗しました", e);
    return { page, totalPages: 1, recruiting: null, running: null };
  }
}

const pagerLink =
  "rounded-full px-4 py-2 text-sm leading-none font-bold text-gray-700 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.15)] hover:bg-white";

/** 稼働中の卓一覧 */
export default function Games({ loaderData }: Route.ComponentProps) {
  const { page, totalPages, recruiting, running } = loaderData;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
      <h2 className="text-xl font-bold">稼働中の卓</h2>

      <Section title="募集中">
        <GameList games={recruiting} emptyMessage="募集中の卓はありません" />
      </Section>

      <Section title="進行中">
        <GameList games={running} emptyMessage="進行中の卓はありません" />
      </Section>

      {totalPages > 1 && (
        <nav
          aria-label="ページ送り"
          className="flex items-center justify-center gap-4"
        >
          {page > 1 ? (
            <Link to={`?page=${page - 1}`} className={pagerLink}>
              前へ
            </Link>
          ) : (
            <span className={`${pagerLink} invisible`} aria-hidden>
              前へ
            </span>
          )}
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link to={`?page=${page + 1}`} className={pagerLink}>
              次へ
            </Link>
          ) : (
            <span className={`${pagerLink} invisible`} aria-hidden>
              次へ
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex min-h-9 items-center border-b border-gray-300 pb-1">
      <h3 className="text-base font-bold">{title}</h3>
    </div>
    {children}
  </section>
);
