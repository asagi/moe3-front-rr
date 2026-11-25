import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { filterLog } from "~/lib/chat";
import { ghostMessages, message, readyMessages, springMessages } from "./fixtures/messages";
import { ChatLogList } from "./ChatLogList";

/** 終わった卓のログ（全部公開。墺露の密談も中身が見える） */
const endedMessages = springMessages.map((m) =>
  m.kind === "masked" ? { ...m, kind: "confidential" as const, context: "ガリツィアは空けておく。" } : m,
);

/** 進行中の卓を第三者が見たログ（密談は伏せられ、独り言は返らない） */
const inProgressMessages = springMessages
  .filter((m) => m.kind !== "personal")
  .map((m) => (m.kind === "confidential" ? { ...m, kind: "masked" as const, context: null } : m));

const meta = {
  title: "Components/Chat/ChatLogList",
  component: ChatLogList,
  tags: ["autodocs"],
  args: {
    messages: endedMessages,
    faceType: "girls",
  },
} satisfies Meta<typeof ChatLogList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 終わった卓：密談は宛先付きで、独り言も出る */
export const Ended: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("イギリス to: フランス、ドイツ")).toBeInTheDocument();
    await expect(canvas.getByText("ベルギーは秋に取る。")).toBeInTheDocument();
    await expect(canvas.getByText("11 月 24 日 (火)")).toBeInTheDocument();
  },
};

/** 進行中の卓：密談は宛先だけで本文は「……」、独り言は出ない */
export const InProgress: Story = {
  args: { messages: inProgressMessages },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("（内容は非公開）").length).toBeGreaterThan(0);
    await expect(canvas.queryByText("ベルギーは秋に取る。")).not.toBeInTheDocument();
  },
};

/** ドイツの視点：ドイツが読めなかった発言（墺露・伊仏の密談、仏の独り言）を隠す */
export const GermanyPov: Story = {
  args: { messages: filterLog(endedMessages, { pov: "g", hidden: new Set() }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("ベルギーは秋に取る。")).toBeInTheDocument();
    await expect(canvas.queryByText("イギリスは信用できるか要観察。")).not.toBeInTheDocument();
    await expect(canvas.queryByText("ピエモンテには行きません。")).not.toBeInTheDocument();
  },
};

/** 同じ人が同じ宛先に続けて発言したら、2 つ目からはアイコンと名前を省く */
export const Continued: Story = {
  args: {
    messages: [
      message({ sender: "a", context: "よろしくお願いします。", created_at: "2026-11-24 09:00" }),
      message({ sender: "a", context: "あいうえお", created_at: "2026-11-24 09:01" }),
      message({ sender: "g", kind: "confidential", recipients: ["a", "f", "i", "r", "t"], context: "英を封じ込めましょう", created_at: "2026-11-24 09:05" }),
      message({ sender: "g", kind: "confidential", recipients: ["e"], context: "手堅く英独同名で仏を狩りませんか。", created_at: "2026-11-24 09:06" }),
      message({ sender: "i", context: "出遅れたぜ", created_at: "2026-11-25 08:00" }),
    ],
  },
};

/** 開戦前夜：ユーザーとしての発言は Discord のアバター */
export const Ready: Story = {
  args: { messages: readyMessages },
};

/** 発言がないとき */
export const Empty: Story = {
  args: { messages: [] },
};

/** 滅亡したイタリアの Ghost 発言（白黒のアイコン、薄い吹き出し） */
export const Ghost: Story = {
  args: { messages: ghostMessages },
  play: async ({ canvasElement }) => {
    const images = canvasElement.querySelectorAll<HTMLImageElement>("img[src*='dfpli']");
    await expect(images.length).toBe(1);
  },
};
