import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";
import { MemoryRouter } from "react-router";

import { expect, within } from "storybook/test";

import { summarizeChannels } from "~/lib/chat";
import { springMessages } from "./fixtures/messages";
import { ChannelList } from "./ChannelList";

const meta = {
  title: "Components/Chat/ChannelList",
  component: ChannelList,
  tags: ["autodocs"],
  decorators: [
    (Story) => createElement(MemoryRouter, null, createElement(Story)),
  ],
  args: {
    channels: summarizeChannels(springMessages, "f"),
    faceType: "girls",
    myPower: "f",
    channelHref: (id: string) => `/games/x/chat/${id}`,
  },
} satisfies Meta<typeof ChannelList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 参加者（フランス）：オープンチャンネル、自分の独り言、自国が入ったチャンネルだけ出る */
export const Participant: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const links = canvas.getAllByRole("link");
    await expect(links[0]).toHaveTextContent("オープンチャンネル");
    await expect(links[1]).toHaveTextContent("独り言");
    await expect(canvas.getByText("イギリス・ドイツ")).toBeInTheDocument();
    await expect(canvas.queryByText(/ロシア/)).not.toBeInTheDocument();
  },
};

/** 発言がまだないとき（オープンチャンネルと自分の独り言だけ出る） */
export const Empty: Story = {
  args: { channels: summarizeChannels([], "f") },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText("まだ発言はありません"),
    ).toHaveLength(2);
  },
};

/** 旗表示の卓 */
export const Flags: Story = {
  args: { faceType: "flags" },
};

/** 未読あり（オープンチャンネル 3 件、英独との密談 1 件） */
export const WithUnread: Story = {
  args: { unreadCounts: { open: 3, efg: 1 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("link")[0]).toHaveTextContent("3 件の未読");
  },
};
