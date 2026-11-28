import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";

import { expect, fn, userEvent, within } from "storybook/test";

import { BoardWithInfo } from "~/components/board/BoardWithInfo";
import { TitleOverlay } from "./TitleOverlay";

const meta = {
  title: "Components/TitleOverlay",
  component: TitleOverlay,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { onClose: fn() },
  // トップページと同じく、初期配置の地図に重ねる
  decorators: [
    (Story) =>
      createElement(
        "div",
        { style: { position: "relative", width: "100%", maxWidth: 660 } },
        createElement(BoardWithInfo),
        createElement(Story),
      ),
  ],
} satisfies Meta<typeof TitleOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ✕ でも、膜のどこを押しても閉じる */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Diplomacy MOE" }),
    ).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "タイトルを閉じる" }),
    );
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};
