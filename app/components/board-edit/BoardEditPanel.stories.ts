import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { findProvince } from "~/lib/board";
import { BoardEditPanel } from "./BoardEditPanel";

const province = (code: string) => {
  const p = findProvince(code);
  if (!p) throw new Error(code);
  return p;
};

const meta = {
  title: "Components/BoardEdit/BoardEditPanel",
  component: BoardEditPanel,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    province: province("par"),
    unit: { power: "f", kind: "a", location: "par" },
    territory: "f",
    onSave: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof BoardEditPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** パリ（フランスの陸軍と占領） */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    // 変えていないうちは保存できない
    await expect(within(canvasElement).getByRole("button", { name: "保存" })).toBeDisabled();
  },
};

/** ユニットの国を変えて保存する */
export const ChangePower: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText("国"), "g");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));
    await expect(args.onSave).toHaveBeenCalledWith({
      unit: { power: "g", kind: "a", location: "par" },
      territory: "f",
    });
  },
};

/** 内陸（ボヘミア）には海軍を置けない */
export const Inland: Story = {
  args: { province: province("boh"), unit: null, territory: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText("海軍")).toBeDisabled();
  },
};

/** 海（北海）には陸軍を置けず、占領の欄もない */
export const Water: Story = {
  args: { province: province("nth"), unit: { power: "e", kind: "f", location: "nth" }, territory: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("陸軍")).toBeDisabled();
    await expect(canvas.queryByText("占領")).not.toBeInTheDocument();
  },
};

/** 海岸が 2 つある地域（サンクトペテルブルク）の海軍は海岸を選ぶ */
export const DualCoast: Story = {
  args: {
    province: province("stp"),
    unit: { power: "r", kind: "f", location: "stp_sc" },
    territory: "r",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText("海岸"), "stp_nc");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));
    await expect(args.onSave).toHaveBeenCalledWith({
      unit: { power: "r", kind: "f", location: "stp_nc" },
      territory: "r",
    });
  },
};

/** 保存に失敗したとき */
export const SaveError: Story = {
  args: {
    error: "フェイズが進んだため保存できませんでした。画面を読み直してから、もう一度編集してください。",
  },
};
