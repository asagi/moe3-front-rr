import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { player } from "./fixtures/players";
import { GameOwnerCard } from "./GameOwnerCard";

const meta = {
  title: "Components/GameInfo/GameOwnerCard",
  component: GameOwnerCard,
  tags: ["autodocs"],
  args: {
    owner: player("asagix", {
      is_owner: true,
      user: {
        discord_user_id: "1",
        username: "asagix",
        global_name: "あさぎ丸怪郎",
        avatar_url: null,
      },
    }),
    faceType: "girls",
  },
} satisfies Meta<typeof GameOwnerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 希望なし */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("あさぎ丸怪郎")).toBeInTheDocument();
    await expect(canvas.getByText("@asagix")).toBeInTheDocument();
    await expect(canvas.getByText("希望なし")).toBeInTheDocument();
  },
};

/** 希望国あり（開始前） */
export const RequestedPower: Story = {
  args: {
    owner: player("asagix", { is_owner: true, requested_power: "f" }),
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("希望：フランス"),
    ).toBeInTheDocument();
  },
};

/** 開始後は担当国を出す */
export const Started: Story = {
  args: {
    owner: player("asagix", {
      is_owner: true,
      requested_power: "f",
      power: "f",
    }),
    faceType: "flags",
  },
};
