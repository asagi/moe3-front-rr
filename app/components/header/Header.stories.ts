import type { Meta, StoryObj } from "@storybook/react-vite";

import { fn } from "storybook/test";

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
    impersonateUserId: "1012988952082399243",
  },
};
