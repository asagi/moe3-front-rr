import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { UserMenu } from "./UserMenu";

const meta = {
  title: "Components/UserMenu",
  component: UserMenu,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    name: "Alice",
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
    onLogout: fn(),
  },
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** アバター未設定時は頭文字を表示する */
export const NoAvatar: Story = {
  args: {
    avatarUrl: null,
  },
};

/** アバターをクリックしてメニューから「ログアウト」を選ぶ */
export const Logout: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Alice のメニュー" }));
    await userEvent.click(canvas.getByRole("menuitem", { name: "ログアウト" }));
    await expect(args.onLogout).toHaveBeenCalled();
    await expect(canvas.queryByRole("menu")).toBeNull();
  },
};
