import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { GameRegulationTable } from "./GameRegulationTable";

const meta = {
  title: "Components/GameInfo/GameRegulationTable",
  component: GameRegulationTable,
  tags: ["autodocs"],
  args: {
    regulation: {
      face_type: "girls",
      progress_mode: "scheduled",
      duration_type: "normal",
    },
    startAt: "2026-11-24 00:00",
    isPrivate: false,
  },
} satisfies Meta<typeof GameRegulationTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開始日時は 1 行にまとめて出す */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("2026 年 11 月 24 日（火） 0:00"),
    ).toBeInTheDocument();
  },
};

export const PrivateShort: Story = {
  args: {
    regulation: {
      face_type: "flags",
      progress_mode: "consensus",
      duration_type: "short",
    },
    isPrivate: true,
  },
};
