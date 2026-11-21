import { type RouteConfig, layout, index } from "@react-router/dev/routes";

export default [
  layout("layouts/with-header.tsx", [index("routes/home.tsx")]),
] satisfies RouteConfig;
