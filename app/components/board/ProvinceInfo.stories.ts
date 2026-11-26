import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

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
    units: [{ power: "r", kind: "f", location: "stp_sc" }],
    onClose: fn(),
  },
} satisfies Meta<typeof ProvinceInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** サンクトペテルブルク（ロシア領、南岸に海軍） */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("ロシア領")).toBeInTheDocument();
    await expect(canvas.getByText("Russian F stp (sc)")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "閉じる" }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** 占領されていない地域・ユニットなし */
export const Empty: Story = {
  args: { province: province("bel"), owner: null, units: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("なし")).toHaveLength(2);
  },
};

/** 海 */
export const Water: Story = {
  args: { province: province("nth"), owner: null, units: [{ power: "e", kind: "f", location: "nth" }] },
};

/** 撤退フェイズ（敗退したユニットと攻めてきたユニット） */
export const Retreat: Story = {
  args: {
    province: province("bur"),
    owner: "f",
    units: [
      { power: "f", kind: "a", location: "bur", dislodged: true },
      { power: "g", kind: "a", location: "bur" },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("敗退")).toBeInTheDocument();
  },
};

/** 閉じるボタンなし */
export const WithoutClose: Story = {
  args: { onClose: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("button", { name: "閉じる" })).not.toBeInTheDocument();
  },
};
