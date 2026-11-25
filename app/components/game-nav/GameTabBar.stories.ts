import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";
import { MemoryRouter } from "react-router";

import { expect, within } from "storybook/test";

import { GameTabBar } from "./GameTabBar";

const GAME_UUID = "00000000-0000-0000-0000-000000000001";

const meta = {
  title: "Components/GameNav/GameTabBar",
  component: GameTabBar,
  tags: ["autodocs"],
  // 卓情報ページを開いている状態
  decorators: [
    (Story) =>
      createElement(
        MemoryRouter,
        { initialEntries: [`/games/${GAME_UUID}`] },
        createElement(Story),
      ),
  ],
  args: {
    gameUuid: GAME_UUID,
    ordersEnabled: false,
    maintenanceEnabled: false,
  },
} satisfies Meta<typeof GameTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開始前・一般の参加者：命令と盤面の編集は押せない */
export const BeforeStart: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "卓情報" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(canvas.getByRole("link", { name: "命令" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(
      canvas.getByRole("link", { name: "盤面の編集" }),
    ).toHaveAttribute("aria-disabled", "true");
  },
};

/** 開始後の卓主：すべて押せる */
export const OwnerInProgress: Story = {
  args: { ordersEnabled: true, maintenanceEnabled: true },
};
