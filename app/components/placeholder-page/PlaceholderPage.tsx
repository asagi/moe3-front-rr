import { Link } from "react-router";

export interface PlaceholderPageProps {
  /** ページ名 */
  title: string;
}

/** まだ中身を作っていないページの仮表示 */
export const PlaceholderPage = ({ title }: PlaceholderPageProps) => (
  <section className="flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
    <h2 className="text-xl font-bold">{title}</h2>
    <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-600">
      このページは準備中です。
    </p>
    <Link to="/mypage" className="text-sm text-brand underline">
      マイページへ戻る
    </Link>
  </section>
);
