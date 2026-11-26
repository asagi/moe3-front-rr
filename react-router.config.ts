import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // 本番はリバースプロキシ（nginx）が HTTPS を受けてアプリへ HTTP で転送するため、
  // アプリから見た request.url は http:// になる。ブラウザが送る Origin（https://）と
  // 一致せず、action が CSRF 対策で拒否されるので、本番のホストを許可しておく
  allowedActionOrigins: ["diplomacy.moe"],
} satisfies Config;
