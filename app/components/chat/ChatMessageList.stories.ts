import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { channelMessages } from "~/lib/chat";
import { readyMessages, springMessages } from "./fixtures/messages";
import { ChatMessageList } from "./ChatMessageList";

const meta = {
  title: "Components/Chat/ChatMessageList",
  component: ChatMessageList,
  tags: ["autodocs"],
  args: {
    messages: channelMessages(springMessages, "open"),
    faceType: "girls",
    self: { power: "f", username: "asagix" },
  },
} satisfies Meta<typeof ChatMessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** オープンチャンネル（システムメッセージを含む） */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/メインフェイズが開始されました/),
    ).toBeInTheDocument();
  },
};

/** 英仏独のチャンネル（改行を含む発言） */
export const Group: Story = {
  args: { messages: channelMessages(springMessages, "efg") },
};

/** フランスの独り言 */
export const Personal: Story = {
  args: { messages: channelMessages(springMessages, "f") },
};

/** 内容が見えない密談（masked。第三者のログビューアーで出る想定） */
export const Masked: Story = {
  args: { messages: channelMessages(springMessages, "ar") },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("（内容は非公開）"),
    ).toBeInTheDocument();
  },
};

/** 発言がないとき */
export const Empty: Story = {
  args: { messages: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("このシーズンの発言はまだありません"),
    ).toBeInTheDocument();
  },
};

/** 自分（フランス）の発言はアイコンと名前を出さない */
export const Mine: Story = {
  args: { messages: channelMessages(springMessages, "efg") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("イギリス")).toBeInTheDocument();
    await expect(canvas.queryByText("フランス")).not.toBeInTheDocument();
  },
};

/** 開戦前夜：ユーザーとしての発言は Discord のアバター、管理人発言は管理人の画像 */
export const Ready: Story = {
  args: {
    messages: readyMessages,
    self: { power: null, username: "asagix" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Judy")).toBeInTheDocument();
    await expect(canvas.getByText("管理人")).toBeInTheDocument();
    // 自分（asagix）の発言には名前を出さない
    await expect(canvas.queryByText("あさぎ")).not.toBeInTheDocument();
  },
};
