import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { NewChannelForm } from "./NewChannelForm";

const meta = {
  title: "Components/Chat/NewChannelForm",
  component: NewChannelForm,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  // フランスから見たメンバーの候補（トルコは滅亡）
  args: { faceType: "girls", candidates: ["a", "e", "g", "i", "r"], onCreate: fn() },
} satisfies Meta<typeof NewChannelForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** メンバーを選んで作る */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "＋ 新しいグループチャンネル" }));
    const submit = canvas.getByRole("button", { name: "作成" });
    await expect(submit).toBeDisabled();
    await userEvent.click(canvas.getByRole("checkbox", { name: "イギリス" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: "ドイツ" }));
    await userEvent.click(submit);
    await expect(args.onCreate).toHaveBeenCalledWith(["e", "g"]);
  },
};

/** やめると閉じる */
export const Cancel: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "＋ 新しいグループチャンネル" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: "ロシア" }));
    await userEvent.click(canvas.getByRole("button", { name: "やめる" }));
    await expect(canvas.getByRole("button", { name: "＋ 新しいグループチャンネル" })).toBeInTheDocument();
    await expect(args.onCreate).not.toHaveBeenCalled();
  },
};

/** 選べる国がない */
export const NoCandidates: Story = {
  args: { candidates: [] },
};
