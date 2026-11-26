import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { orderSystemMessage } from "~/lib/orders";
import { OrderSystemMessage } from "./OrderSystemMessage";

const game = (phase_kind: "main" | "retreat" | "adjustment") => ({
  status: "in_progress" as const,
  phase_kind,
  next_update_at: "2026-11-27 21:00",
});

const message = (input: Parameters<typeof orderSystemMessage>[0]) => {
  const m = orderSystemMessage(input);
  if (m == null) throw new Error("message is null");
  return m;
};

const meta = {
  title: "Components/Orders/OrderSystemMessage",
  component: OrderSystemMessage,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { message: message({ game: game("main"), isLive: true, needsAction: true }) },
} satisfies Meta<typeof OrderSystemMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** メインフェイズ（次回更新時刻） */
export const Main: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "次回更新は 2026 年 11 月 27 日（金） 21:00 です",
    );
  },
};

/** 撤退フェイズ・操作が必要な国 */
export const RetreatNeedsAction: Story = {
  args: { message: message({ game: game("retreat"), isLive: true, needsAction: true }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "撤退フェイズです。2026 年 11 月 27 日（金） 21:00 までに命令を確定してください",
    );
  },
};

/** 調整フェイズ・操作のない国 */
export const AdjustmentWaiting: Story = {
  args: { message: message({ game: game("adjustment"), isLive: true, needsAction: false }) },
};

/** 撤退フェイズ・第三者 */
export const RetreatSpectator: Story = {
  args: { message: message({ game: game("retreat"), isLive: true, needsAction: null }) },
};
