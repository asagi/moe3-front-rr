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
    onMyPage: fn(),
    onLogout: fn(),
    onAdminModeChange: fn(),
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

/** アバターをクリックしてメニューから「マイページ」を選ぶ */
export const MyPage: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Alice のメニュー" }));
    await userEvent.click(canvas.getByRole("menuitem", { name: "マイページ" }));
    await expect(args.onMyPage).toHaveBeenCalled();
    await expect(canvas.queryByRole("menu")).toBeNull();
  },
};

/** 管理者はメニューに「管理者モード」のトグルが出る */
export const AdminToggle: Story = {
  args: {
    isAdmin: true,
    adminMode: false,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Alice のメニュー" }));
    const toggle = canvas.getByRole("menuitemcheckbox", { name: "管理者モード" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await userEvent.click(toggle);
    await expect(args.onAdminModeChange).toHaveBeenCalledWith(true);
    await expect(canvas.getByRole("menu")).toBeInTheDocument();
  },
};

/** 管理者でなければトグルは出ない */
export const NonAdmin: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Alice のメニュー" }));
    await expect(canvas.queryByRole("menuitemcheckbox")).toBeNull();
  },
};
