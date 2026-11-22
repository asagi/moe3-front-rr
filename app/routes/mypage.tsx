import { redirect, useRouteLoaderData } from "react-router";
import type { loader as layoutLoader } from "~/layouts/with-header";
import type { UserMe } from "~/lib/api.server";
import { getSessionStorage } from "~/lib/session.server";
import type { Route } from "./+types/mypage";

export function meta({}: Route.MetaArgs) {
  return [{ title: "マイページ | Diplomacy MOE" }];
}

/** 未ログインならトップへ戻す（ユーザー情報の取得はレイアウトの loader が行う） */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSessionStorage().getSession(
    request.headers.get("Cookie"),
  );
  if (!session.get("accessToken")) {
    throw redirect("/");
  }
  return null;
}

/** 表示する項目と順番（仮。ページの中身は今後作り直す予定） */
const FIELDS: { key: keyof UserMe; label: string }[] = [
  { key: "discord_user_id", label: "Discord ユーザー ID" },
  { key: "username", label: "ユーザー名" },
  { key: "global_name", label: "表示名" },
  { key: "avatar_url", label: "アバター URL" },
];

export default function MyPage() {
  // レイアウトが取得した /users/me の結果を使い回す（視点変更中なら成り代わり先）
  const me = useRouteLoaderData<typeof layoutLoader>("layouts/with-header")?.me;

  return (
    <section className="w-full max-w-2xl px-4 py-6">
      <h2 className="mb-4 text-xl font-bold">マイページ</h2>
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
    </section>
  );
}
