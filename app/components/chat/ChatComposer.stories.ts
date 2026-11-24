import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { ChatComposer } from "./ChatComposer";

const meta = {
  title: "Components/Chat/ChatComposer",
  component: ChatComposer,
  tags: ["autodocs"],
  args: {
    sender: { kind: "power", faceType: "girls", power: "f" },
  },
} satisfies Meta<typeof ChatComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 担当国として発言する */
export const Power: Story = {};

/** 開戦前夜・感想戦は Discord のアバター */
export const DiscordUser: Story = {
  args: { sender: { kind: "user", name: "asagi", avatarUrl: null } },
};

/** 管理者モード中の管理人発言 */
export const Admin: Story = {
  args: { sender: { kind: "admin", faceType: "girls" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByLabelText("管理人として発言"),
    ).toBeInTheDocument();
  },
};

/** 送信 API ができるまでの表示（理由を入力欄に出す） */
export const Disabled: Story = {
  args: { disabledReason: "発言の送信は準備中です" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("textbox")).toBeDisabled();
    await expect(canvas.getByPlaceholderText("発言の送信は準備中です")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "送信" })).toBeDisabled();
  },
};
