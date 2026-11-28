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
        {/* ログインには Discord の identify スコープ（ユーザー名とアイコン）だけを使う */}
        <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-gray-500">
          {"卓への参加には Discord アカウントでのログインが必要ですが、" +
            "ユーザー名とアバター（アイコン）を取得する以外には使用されません。"}
          <br />
          ゲーム自体はこのサイト内で完結します。
        </p>
      </div>
      <Greeting />
    </>
  );
}
