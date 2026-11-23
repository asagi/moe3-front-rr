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
    route("games/:gameUuid", "routes/games.$gameUuid.tsx"),
  ]),
  route("auth/discord", "routes/auth.discord.ts"),
  route("auth/discord/callback", "routes/auth.discord.callback.ts"),
  route("auth/logout", "routes/auth.logout.ts"),
  route("admin-mode", "routes/admin-mode.ts"),
  route("admin-impersonate", "routes/admin-impersonate.ts"),
] satisfies RouteConfig;
