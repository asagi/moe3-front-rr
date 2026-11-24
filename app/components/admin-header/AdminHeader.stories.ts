import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement, useState } from "react";

import { expect, fn, userEvent, within } from "storybook/test";

import { AdminHeader } from "./AdminHeader";

const meta = {
  title: "Components/AdminHeader",
  component: AdminHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    onImpersonate: fn(),
    onClearImpersonate: fn(),
  },
} satisfies Meta<typeof AdminHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 未設定時はユーザー名を入力して「切替」できる（前後の空白と先頭の @ は外す） */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "切替" });
    await expect(button).toBeDisabled();
    await userEvent.type(canvas.getByLabelText("視点変更"), "  @asagix ");
    await userEvent.click(button);
    await expect(args.onImpersonate).toHaveBeenCalledWith("asagix");
  },
};

/** 設定済みのときは対象のユーザー名と「解除」ボタンを表示する */
export const Impersonating: Story = {
  args: {
    impersonateUsername: "asagix",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("@asagix")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "解除" }));
    await expect(args.onClearImpersonate).toHaveBeenCalled();
  },
};

/** 切り替え済みなら、対象ユーザーのアイコンも並べて表示する */
export const ImpersonatingWithAvatar: Story = {
  args: {
    impersonateUsername: "asagix",
    impersonateUser: {
      name: "Asagi",
      avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("@asagix")).toBeInTheDocument();
    await expect(canvasElement.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.discordapp.com/embed/avatars/1.png",
    );
  },
};

/** アイコンがないユーザーは頭文字の丸を出す */
export const ImpersonatingWithoutAvatar: Story = {
  args: {
    impersonateUsername: "dummy_carol",
    impersonateUser: { name: "キャロル", avatarUrl: null },
  },
};

/** 切替 → 解除すると、入力欄に直前のユーザー名が残っている */
export const ClearKeepsInput: Story = {
  render: (args) => {
    const [username, setUsername] = useState<string | null>(null);
    return createElement(AdminHeader, {
      ...args,
      impersonateUsername: username,
      onImpersonate: (name) => {
        args.onImpersonate?.(name);
        setUsername(name);
      },
      onClearImpersonate: () => {
        args.onClearImpersonate?.();
        setUsername(null);
      },
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("視点変更"), "asagix");
    await userEvent.click(canvas.getByRole("button", { name: "切替" }));
    await userEvent.click(canvas.getByRole("button", { name: "解除" }));
    await expect(canvas.getByLabelText("視点変更")).toHaveValue("asagix");
  },
};

/** ユーザー名が見つからず切り替えられなかったときはエラーを出し、解除できるようにする */
export const ImpersonateError: Story = {
  args: {
    impersonateUsername: "unknown-user",
    impersonateError: "user specified by X-Impersonate-User-Name was not found",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "切り替えられませんでした",
    );
    await expect(canvas.getByRole("button", { name: "解除" })).toBeEnabled();
  },
};
