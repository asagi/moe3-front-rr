import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { DrawProposalControl, NextUpdateForm, ProgressModeControl } from "./OwnerControls";

const meta = {
  title: "Components/GameAdmin/OwnerControls",
  component: NextUpdateForm,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { current: "2026-11-27 21:00", submitting: false, error: null, onSubmit: fn() },
} satisfies Meta<typeof NextUpdateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 次回更新時刻：延長する */
export const NextUpdate: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const submit = canvas.getByRole("button", { name: "延長する" });
    // 変えていないうちは押せない
    await expect(submit).toBeDisabled();
    const input = canvas.getByLabelText("新しい次回更新時刻");
    await userEvent.clear(input);
    await userEvent.type(input, "2026-11-28T21:00");
    await userEvent.click(submit);
    await expect(args.onSubmit).toHaveBeenCalledWith("2026-11-28 21:00");
  },
};

/** 次回更新時刻：前には戻せない */
export const NextUpdateEarlier: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("新しい次回更新時刻");
    await userEvent.clear(input);
    await userEvent.type(input, "2026-11-26T21:00");
    await expect(canvas.getByText("今の次回更新時刻より前には変更できません")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "延長する" })).toBeDisabled();
  },
};

/** 次回更新時刻：失敗した */
export const NextUpdateError: Story = {
  args: { error: "フェイズが進んだため変更できませんでした。画面を読み直してください。" },
};

/** 和平終了：宣言していない（確認を挟んで宣言する） */
export const DrawNotProposed: Story = {
  render: () => <DrawProposalControl current={false} submitting={false} error={null} onChange={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: "講和を撤回する" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "講和を宣言する" }));
    await expect(canvas.getByRole("alertdialog")).toHaveTextContent("次の更新で終戦になります");
  },
};

/** 和平終了：宣言している（撤回だけ出す） */
export const DrawProposed: Story = {
  render: () => <DrawProposalControl current={true} submitting={false} error={null} onChange={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "講和を撤回する" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "講和を宣言する" })).not.toBeInTheDocument();
  },
};

/** 進行モード：定時進行（確認を挟んで切り替える） */
export const ProgressScheduled: Story = {
  render: () => <ProgressModeControl current="scheduled" submitting={false} error={null} onSwitch={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "合意進行に切り替える" }));
    await expect(canvas.getByRole("alertdialog")).toHaveTextContent("定時進行には戻せません");
  },
};

/** 進行モード：合意進行（切り替えボタンなし） */
export const ProgressConsensus: Story = {
  render: () => <ProgressModeControl current="consensus" submitting={false} error={null} onSwitch={fn()} />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("button")).not.toBeInTheDocument();
  },
};
