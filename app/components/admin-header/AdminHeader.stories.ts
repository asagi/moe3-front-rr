import type { Meta, StoryObj } from "@storybook/react-vite";

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
    await userEvent.type(canvas.getByLabelText("視点変更"), "  user-123 ");
    await userEvent.click(button);
    await expect(args.onImpersonate).toHaveBeenCalledWith("user-123");
  },
};

/** 設定済みのときは対象 ID と「解除」ボタンを表示する */
export const Impersonating: Story = {
  args: {
    impersonateUserId: "user-123",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("user-123")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "解除" }));
    await expect(args.onClearImpersonate).toHaveBeenCalled();
  },
};
