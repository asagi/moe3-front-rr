import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, userEvent, within } from "storybook/test";

import { BoardWithInfo } from "./BoardWithInfo";

const meta = {
  title: "Components/Board/BoardWithInfo",
  component: BoardWithInfo,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof BoardWithInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 地域を押すと、地図の下に情報を重ねて出す。Esc で閉じる */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "ワルシャワ" }));
    await expect(canvas.getByText("駐留ユニット： Russian A war")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByText(/駐留ユニット/)).not.toBeInTheDocument();
  },
};
