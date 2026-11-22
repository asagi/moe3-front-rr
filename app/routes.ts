import {
  type RouteConfig,
  layout,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layouts/with-header.tsx", [index("routes/home.tsx")]),
  route("auth/discord", "routes/auth.discord.ts"),
  route("auth/discord/callback", "routes/auth.discord.callback.ts"),
  route("auth/logout", "routes/auth.logout.ts"),
  route("admin-mode", "routes/admin-mode.ts"),
] satisfies RouteConfig;
