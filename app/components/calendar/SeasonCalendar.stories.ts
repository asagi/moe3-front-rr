import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";
import { MemoryRouter } from "react-router";

import { expect, within } from "storybook/test";

import { SeasonCalendar } from "./SeasonCalendar";

const CHAT = "/games/00000000-0000-0000-0000-000000000001/chat";
const SEASONS = ["ready", "1901s", "1901f", "1902s"];

const meta = {
  title: "Components/Calendar/SeasonCalendar",
  component: SeasonCalendar,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [(Story) => createElement(MemoryRouter, null, createElement(Story))],
  args: {
    seasons: SEASONS,
    selected: "1902s",
    phaseKind: "main",
    hrefFor: (season: string) =>
      season === SEASONS.at(-1) ? CHAT : `${CHAT}?season=${season}`,
  },
} satisfies Meta<typeof SeasonCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 進行中（最新のシーズンを見ている） */
export const InProgress: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "開戦前夜" })).toHaveAttribute(
      "href",
      `${CHAT}?season=ready`,
    );
    const latest = canvas.getByRole("link", { name: "1902 年春（現在）" });
    await expect(latest).toHaveAttribute("href", CHAT);
    await expect(latest).toHaveAttribute("aria-current", "page");
    // まだ来ていない 1902 年秋はリンクにしない
    await expect(canvas.queryByRole("link", { name: /1902 年秋/ })).not.toBeInTheDocument();
  },
};

/** 過去のシーズンを見ている・撤退フェイズ */
export const PastSelectedRetreat: Story = {
  args: { selected: "1901s", phaseKind: "retreat" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "1901 年春" })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByText("現在・撤退フェイズ")).toBeInTheDocument();
  },
};

/** 終わった卓（感想戦まで） */
export const Finished: Story = {
  args: {
    seasons: [...SEASONS, "1902f", "1903s", "debrief"],
    selected: "debrief",
    phaseKind: "debrief",
    hrefFor: (season: string) => `${CHAT}?season=${season}`,
  },
};

/** 開戦前夜だけ */
export const ReadyOnly: Story = {
  args: { seasons: ["ready"], selected: "ready", phaseKind: "ready" },
};
