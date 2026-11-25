import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { ChatLogToolbar } from "./ChatLogToolbar";

const meta = {
  title: "Components/Chat/ChatLogToolbar",
  component: ChatLogToolbar,
  tags: ["autodocs"],
  args: {
    pov: null,
    povEnabled: true,
    hidden: new Set(),
    categories: ["system", "open", "private", "personal"],
    onPovChange: fn(),
    onHiddenChange: fn(),
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ChatLogToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 絞り込みなし */
export const Default: Story = {};

/** 視点メニューから国を選ぶ */
export const ChoosePov: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "視点変更" }));
    await userEvent.click(canvas.getByLabelText("ドイツ"));
    await expect(args.onPovChange).toHaveBeenCalledWith("g");
  },
};

/** フィルタで独り言を外す */
export const HidePersonal: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "フィルタ" }));
    await userEvent.click(canvas.getByLabelText("独り言"));
    await expect(args.onHiddenChange).toHaveBeenCalledWith(new Set(["personal"]));
  },
};

/** 視点とフィルタで絞り込み中（アイコンの色が変わる） */
export const Narrowed: Story = {
  args: { pov: "g", hidden: new Set(["system"]) },
};

/** 進行中の卓（独り言はフィルタに出さない） */
export const InProgress: Story = {
  args: { categories: ["system", "open", "private"] },
};

/** 開戦前夜・感想戦（視点変更は使えない） */
export const OffGameSeason: Story = {
  args: { povEnabled: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "視点変更" })).toBeDisabled();
  },
};
