import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../app/**/*.stories.@(ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
  ],
  framework: "@storybook/react-vite",
  // アプリと同じく public/ を配信し、/favicon.ico などの静的ファイルを参照できるようにする
  staticDirs: ["../public"],
  // React Router の Vite プラグインはアプリ本体用で Storybook では動かないため除外する
  async viteFinal(config) {
    const flatten = async (plugins: unknown[]): Promise<unknown[]> =>
      (
        await Promise.all(
          plugins.map(async (p) => {
            const resolved = await p;
            return Array.isArray(resolved) ? flatten(resolved) : [resolved];
          }),
        )
      ).flat();
    const plugins = await flatten(config.plugins ?? []);
    config.plugins = plugins.filter(
      (p) =>
        !(
          p &&
          typeof p === "object" &&
          "name" in p &&
          String(p.name).startsWith("react-router")
        ),
    ) as typeof config.plugins;
    return config;
  },
};
export default config;
