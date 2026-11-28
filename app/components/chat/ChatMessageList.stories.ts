import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";
import { MemoryRouter } from "react-router";

import { expect, userEvent, within } from "storybook/test";

import { channelMessages } from "~/lib/chat";
import {
  ghostMessages,
  noticeMessages,
  readyMessages,
  springMessages,
} from "./fixtures/messages";
import { ChatMessageList } from "./ChatMessageList";

const meta = {
  title: "Components/Chat/ChatMessageList",
  component: ChatMessageList,
  tags: ["autodocs"],
  // 密談の吹き出しはグループチャンネルへのリンクになる
  decorators: [
    (Story) => createElement(MemoryRouter, null, createElement(Story)),
  ],
  args: {
    messages: channelMessages(springMessages, "open", "f"),
    faceType: "girls",
    self: { power: "f", username: "asagix" },
  },
} satisfies Meta<typeof ChatMessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * オープンチャンネル（システムメッセージを含む）。密談と自分の独り言も混ぜて出す（フランスの視点）。
 * 関与している密談は本文を出してグループチャンネルへのリンクに、関与していない密談は「……」
 */
export const Open: Story = {
  args: { channelHref: (id: string) => `/games/demo/chat/${id}` },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/メインフェイズが開始されました/),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("イギリス to: フランス、ドイツ"),
    ).toBeInTheDocument();
    await expect(canvas.getByText("to: イギリス、ドイツ")).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: /北海の扱いを相談したい/ }),
    ).toHaveAttribute("href", "/games/demo/chat/efg");
    await expect(
      canvas.getByText("オーストリア to: ロシア"),
    ).toBeInTheDocument();
    await expect(canvas.getByText("……")).toBeInTheDocument();
    // 自分（フランス）の独り言だけを出し、独り言のチャンネルへのリンクにする
    await expect(
      canvas.getByRole("link", { name: /イギリスは信用できるか要観察/ }),
    ).toHaveAttribute("href", "/games/demo/chat/f");
    await expect(
      canvas.queryByText("ベルギーは秋に取る。"),
    ).not.toBeInTheDocument();
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

/** 滅亡したイタリアの Ghost 発言（白黒のアイコン、薄い吹き出し） */
export const Ghost: Story = {
  args: { messages: ghostMessages },
  play: async ({ canvasElement }) => {
    const images =
      canvasElement.querySelectorAll<HTMLImageElement>("img[src*='dfpli']");
    await expect(images.length).toBe(1);
  },
};

/** システムメッセージの出し分け（区切りの帯・盤面編集のまとめ・国の画像） */
export const Notices: Story = {
  args: { messages: noticeMessages },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 区切りは帯で、本文は日本語で組み立て直す
    await expect(
      canvas.getByText("1901 年秋 メインフェイズ開始"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("が制覇を達成しました。お疲れさまでした"),
    ).toBeInTheDocument();
    // 続いた盤面編集の通知（3 件）は 1 行にまとめる。発言を挟んだ 1 件はまとめない
    const toggle = canvas.getByRole("button", {
      name: /盤面が編集されました（3 件）/,
    });
    await expect(
      canvas.queryByText("が配置されました"),
    ).not.toBeInTheDocument();
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("が配置されました")).toBeInTheDocument();
    await expect(
      canvas.getByText("の海軍（サンクトペテルブルク南岸）"),
    ).toBeInTheDocument();
    await expect(canvas.getByText("が除去されました")).toBeInTheDocument();
    await expect(
      canvas.getByText("次回更新時刻が 11 月 27 日 (金) 21:00 に変わりました"),
    ).toBeInTheDocument();
    // 知らない種類はサーバーの本文
    await expect(
      canvas.getByText("未来の種類のお知らせです。"),
    ).toBeInTheDocument();
  },
};
