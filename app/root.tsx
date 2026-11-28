import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  // ホーム画面に追加したときの名前とアイコン（アイコンは images/power/girl/pla.png の上の正方形 202×202 を切り出したもの）
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja_JP">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-title" content="MOE" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * どのページでも拾われなかったエラーの画面。
 * throw data("文言", { status }) で投げたエラーは、その文言をそのまま出す
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "エラーが発生しました";
  let details =
    "予期しないエラーが発生しました。時間をおいて再度お試しください。";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "ページが見つかりません";
      details = "URL が正しいか確認してください。";
    }
    // 画面向けの文言を付けて投げたエラーは、それを出す
    if (typeof error.data === "string" && error.data.trim() !== "") {
      details = error.data;
    }
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4 pt-16">
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="whitespace-pre-wrap text-sm text-gray-700">{details}</p>
      <p>
        <a
          href="/"
          className="text-sm font-semibold text-[var(--color-brand)] underline"
        >
          トップページへ戻る
        </a>
      </p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4 text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
