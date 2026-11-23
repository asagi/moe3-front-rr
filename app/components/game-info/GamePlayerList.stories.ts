import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { player } from "./fixtures/players";
import { GamePlayerList } from "./GamePlayerList";

const meta = {
  title: "Components/GameInfo/GamePlayerList",
  component: GamePlayerList,
  tags: ["autodocs"],
  args: {
    players: [player("alice"), player("bob")],
    faceType: "girls",
    remaining: 4,
  },
} satisfies Meta<typeof GamePlayerList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 募集中は残りの人数を出す */
export const Recruiting: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("（あと 4 名）"),
    ).toBeInTheDocument();
  },
};

/** 卓主しかいないとき */
export const Empty: Story = {
  args: { players: [], remaining: 6 },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("まだ参加者はいません"),
    ).toBeInTheDocument();
  },
};

/** 開始後は担当国を出す */
export const Started: Story = {
  args: {
    remaining: null,
    players: (["e", "f", "g", "i", "r", "t"] as const).map((code, i) =>
      player(`player${i + 1}`, { power: code }),
    ),
  },
};
