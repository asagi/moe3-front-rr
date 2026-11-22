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

/** 未設定時はユーザー ID を入力して「切替」できる */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "切替" });
    await expect(button).toBeDisabled();
    await userEvent.type(canvas.getByLabelText("視点変更"), "  1012988952082399243 ");
    await userEvent.click(button);
    await expect(args.onImpersonate).toHaveBeenCalledWith("1012988952082399243");
  },
};

/** 設定済みのときは対象 ID と「解除」ボタンを表示する */
export const Impersonating: Story = {
  args: {
    impersonateUserId: "1012988952082399243",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1012988952082399243")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "解除" }));
    await expect(args.onClearImpersonate).toHaveBeenCalled();
  },
};

/** 切替 → 解除すると、入力欄に直前の ID が残っている */
export const ClearKeepsInput: Story = {
  render: (args) => {
    const [userId, setUserId] = useState<string | null>(null);
    return createElement(AdminHeader, {
      ...args,
      impersonateUserId: userId,
      onImpersonate: (id) => {
        args.onImpersonate?.(id);
        setUserId(id);
      },
      onClearImpersonate: () => {
        args.onClearImpersonate?.();
        setUserId(null);
      },
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("視点変更"), "1012988952082399243");
    await userEvent.click(canvas.getByRole("button", { name: "切替" }));
    await userEvent.click(canvas.getByRole("button", { name: "解除" }));
    await expect(canvas.getByLabelText("視点変更")).toHaveValue(
      "1012988952082399243",
    );
  },
};

/** ID が不正で切り替えられなかったときはエラーを出し、解除できるようにする */
export const ImpersonateError: Story = {
  args: {
    impersonateUserId: "not-a-number",
    impersonateError: "X-Impersonate-User-Id must be a valid discord user id",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "切り替えられませんでした",
    );
    await expect(canvas.getByRole("button", { name: "解除" })).toBeEnabled();
  },
};
