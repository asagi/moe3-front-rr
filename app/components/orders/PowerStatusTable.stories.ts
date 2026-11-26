import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { initialPowers } from "./fixtures/orders";
import { PowerStatusTable } from "./PowerStatusTable";

const meta = {
  title: "Components/Orders/PowerStatusTable",
  component: PowerStatusTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { faceType: "girls", powers: initialPowers, showProgress: true },
} satisfies Meta<typeof PowerStatusTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 合意進行の卓（イタリアは無政府、トルコは滅亡） */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("row")).toHaveLength(8);
    await expect(canvas.getByRole("columnheader", { name: "即時進行" })).toBeInTheDocument();
    const italy = canvas.getByRole("rowheader", { name: "イタリア（無政府）" }).closest("tr");
    await expect(italy).toHaveAttribute("data-state", "idle");
    const turkey = canvas.getByRole("rowheader", { name: "トルコ（滅亡）" }).closest("tr");
    await expect(turkey).toHaveAttribute("data-state", "eliminated");
    await expect(within(turkey as HTMLElement).getByText("—")).toBeInTheDocument();
  },
};

/** 定時進行の卓（即時進行の列を出さない） */
export const Scheduled: Story = {
  args: { showProgress: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("columnheader", { name: "即時進行" }),
    ).not.toBeInTheDocument();
  },
};

/** 過去のシーズン（即時進行の記録がない） */
export const PastSeason: Story = {
  args: {
    powers: initialPowers.map((p) => ({ ...p, progress_consented: null, is_idle: null })),
  },
};

/** 旗 */
export const Flags: Story = { args: { faceType: "flags" } };
