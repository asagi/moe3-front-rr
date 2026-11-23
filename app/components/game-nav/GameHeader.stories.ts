import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { GameHeader } from "./GameHeader";

const meta = {
  title: "Components/GameNav/GameHeader",
  component: GameHeader,
  tags: ["autodocs"],
  args: { numberLabel: null, title: "卓情報" },
} satisfies Meta<typeof GameHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開始前（卓番号の採番前） */
export const BeforeStart: Story = {};

/** 開始後は卓番号を付ける */
export const Started: Story = {
  args: { numberLabel: "#001" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("heading", { name: "#001： 卓情報" }),
    ).toBeInTheDocument();
  },
};
