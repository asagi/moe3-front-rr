import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { findProvince } from "~/lib/board";
import { ProvinceInfo } from "./ProvinceInfo";

const province = (code: string) => {
  const p = findProvince(code);
  if (!p) throw new Error(code);
  return p;
};

const meta = {
  title: "Components/Board/ProvinceInfo",
  component: ProvinceInfo,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    province: province("stp"),
    owner: "r",
    unit: { power: "r", kind: "f", location: "stp_sc" },
  },
} satisfies Meta<typeof ProvinceInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** サンクトペテルブルク（ロシア領、南岸に海軍） */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("（ロシア領）")).toBeInTheDocument();
    await expect(canvas.getByText("駐留ユニット： Russian F stp (sc)")).toBeInTheDocument();
  },
};

/** 占領されていない地域・ユニットなし */
export const Empty: Story = {
  args: { province: province("bel"), owner: null, unit: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("駐留ユニット： なし")).toBeInTheDocument();
  },
};

/** 海 */
export const Water: Story = {
  args: { province: province("nth"), owner: null, unit: { power: "e", kind: "f", location: "nth" } },
};
