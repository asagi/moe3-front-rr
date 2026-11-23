import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { Header } from "./Header";

const meta = {
  title: "Components/Header",
  component: Header,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  args: {
    onLogin: fn(),
    onHome: fn(),
    onLogout: fn(),
    onMyPage: fn(),
    onAdminModeChange: fn(),
    onImpersonate: fn(),
    onClearImpersonate: fn(),
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
  args: {
    user: {
      name: "Jane Doe",
      avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
    },
  },
};

export const LoggedOut: Story = {};

/** 管理者モード ON では通常ヘッダの下に管理者用ヘッダを表示する */
export const AdminMode: Story = {
  args: {
    user: {
      name: "Jane Doe",
      avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
      isAdmin: true,
    },
    adminMode: true,
  },
};

/** 管理者モードで視点変更している状態 */
export const AdminModeImpersonating: Story = {
  args: {
    ...AdminMode.args,
    impersonateUsername: "asagix",
  },
};

/** タイトルをクリックすると onHome が呼ばれる */
export const ClickTitle: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: "Diplomacy MOE" });
    await expect(link).toHaveAttribute("href", "/");
    await userEvent.click(link);
    await expect(args.onHome).toHaveBeenCalled();
  },
};
