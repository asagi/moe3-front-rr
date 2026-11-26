import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { PowerSummaryCard } from "./PowerSummaryCard";

const meta = {
  title: "Components/Orders/PowerSummaryCard",
  component: PowerSummaryCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    faceType: "girls",
    status: { power: "f", supply_centers: 3, armies: 2, fleets: 1, is_eliminated: false },
  },
} satisfies Meta<typeof PowerSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** フランス */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "フランスの状況" })).toBeInTheDocument();
    await expect(canvas.getByText("補給都市").nextElementSibling).toHaveTextContent("3");
  },
};

/** 旗 */
export const Flags: Story = { args: { faceType: "flags" } };
