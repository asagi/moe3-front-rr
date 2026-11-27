import { SeasonCalendar } from "~/components/calendar/SeasonCalendar";
import { chatPath } from "~/lib/chat";
import { requireGame, resolveSeason } from "~/lib/game.server";
import type { GameRouteHandle } from "./games.$gameUuid";
import type { Route } from "./+types/games.$gameUuid.calendar";

export const handle: GameRouteHandle = { gameTitle: "カレンダー", seasonal: true };

export function meta({}: Route.MetaArgs) {
  return [{ title: "カレンダー | Diplomacy MOE" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const game = requireGame(context);
  return {
    gameUuid: game.game_uuid,
    seasons: game.seasons,
    phaseKind: game.phase_kind,
    selected: resolveSeason(request, game),
  };
}

/**
 * カレンダー。開戦前夜から現在までのシーズンを並べ、選ぶとそのシーズンのチャットに移る
 * （チャンネル一覧か第三者用ログビューアーかは、チャットのページが見ている人から決める）
 */
export default function GameCalendar({ loaderData }: Route.ComponentProps) {
  const { gameUuid, seasons, phaseKind, selected } = loaderData;
  const latest = seasons.at(-1);
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-3 px-3 py-4">
      {seasons.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-600">
          まだシーズンがありません。卓が始まると、ここからシーズンを選べます。
        </p>
      ) : (
        <>
          <p className="text-center text-xs text-gray-600">
            シーズンを選ぶと、そのシーズンのチャットを開きます
          </p>
          <SeasonCalendar
            seasons={seasons}
            selected={selected}
            phaseKind={phaseKind}
            hrefFor={(season) => chatPath(gameUuid, season === latest ? null : season)}
          />
        </>
      )}
    </section>
  );
}
