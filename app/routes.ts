import {
  type RouteConfig,
  layout,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layouts/with-header.tsx", [
    index("routes/home.tsx"),
    route("mypage", "routes/mypage.tsx"),
    route("games", "routes/games.tsx"),
    route("games/new", "routes/games.new.tsx"),
    // 卓内のページ（卓ヘッダと画面下のタブバーを共通で出す）
    route("games/:gameUuid", "routes/games.$gameUuid.tsx", [
      index("routes/games.$gameUuid._index.tsx"),
      route("calendar", "routes/games.$gameUuid.calendar.tsx"),
      route("chat", "routes/games.$gameUuid.chat._index.tsx"),
      route("chat/:channelId", "routes/games.$gameUuid.chat.$channelId.tsx"),
      route("orders", "routes/games.$gameUuid.orders.tsx"),
      route("maintenance", "routes/games.$gameUuid.maintenance.tsx"),
    ]),
  ]),
  route("auth/discord", "routes/auth.discord.ts"),
  route("auth/discord/callback", "routes/auth.discord.callback.ts"),
  route("auth/logout", "routes/auth.logout.ts"),
  route("admin-mode", "routes/admin-mode.ts"),
  route("admin-impersonate", "routes/admin-impersonate.ts"),
] satisfies RouteConfig;
