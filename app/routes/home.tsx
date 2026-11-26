import { Link } from "react-router";
import type { Route } from "./+types/home";
import { BoardWithInfo } from "~/components/board/BoardWithInfo";
import { Greeting } from "~/components/greeting/Greeting";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Diplomacy MOE" },
    {
      name: "description",
      content: "ボードゲーム「ディプロマシー」をオンラインで遊べるサイト",
    },
  ];
}

export default function Home() {
  return (
    <>
      {/* 初期配置の地図。地域を押すと、その情報を地図の下に重ねて出す */}
      <BoardWithInfo />
      <div className="px-4 pt-6 text-center">
        <Link
          to="/games"
          className="inline-block rounded-full px-5 py-3 text-sm leading-none font-bold text-gray-700 shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.15)] hover:bg-white"
        >
          稼働中の卓を見る
        </Link>
      </div>
      <Greeting />
    </>
  );
}
