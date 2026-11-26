import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { adjustmentOrders, mainOrders, retreatOrders } from "./fixtures/orders";
import { OrderResultList } from "./OrderResultList";

const meta = {
  title: "Components/Orders/OrderResultList",
  component: OrderResultList,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    title: "全軍の行軍命令結果",
    faceType: "girls",
    result: { status: "closed", orders: mainOrders },
  },
} satisfies Meta<typeof OrderResultList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 行軍命令の結果（国の並び順に並べる） */
export const Main: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = canvas.getAllByRole("listitem");
    await expect(items).toHaveLength(mainOrders.length);
    // オーストリアが先頭
    await expect(items[0]).toHaveTextContent("A Vie 維持");
    await expect(canvas.getByText("A Par → Bur")).toBeInTheDocument();
    await expect(canvas.getByText("A Lvp → Bel（海路）")).toBeInTheDocument();
    await expect(canvas.getByText("A Mar 支援 Par → Bur")).toBeInTheDocument();
    await expect(canvas.getByText("A Ber 支援 Kie 維持")).toBeInTheDocument();
    await expect(canvas.getByText("F Edi 輸送 Lvp → Bel")).toBeInTheDocument();
    await expect(canvas.getByText("F Stp (sc) → Bot")).toBeInTheDocument();
  },
};

/** 撤退命令の結果 */
export const Retreat: Story = {
  args: { title: "全軍の撤退命令結果", result: { status: "closed", orders: retreatOrders } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("A Vie 撤退 → Boh")).toBeInTheDocument();
  },
};

/** 調整命令の結果 */
export const Adjustment: Story = {
  args: { title: "全軍の調整命令結果", result: { status: "closed", orders: adjustmentOrders } },
};

/** 進行中のフェイズ（命令は伏せて「—」） */
export const Open: Story = {
  args: { result: { status: "open", orders: [] } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("—")).toBeInTheDocument();
  },
};
