import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";
import { MemoryRouter } from "react-router";

import { expect, within } from "storybook/test";

import type { GameSummary } from "~/lib/game";
import { GameList } from "./GameList";

const game = (overrides: Partial<GameSummary>): GameSummary => ({
  game_uuid: crypto.randomUUID(),
  game_number: 42,
  status: "in_progress",
  season: "1901 年春",
  next_update_at: "2026-05-10 20:00",
  regulation: {
    face_type: "girls",
    progress_mode: "scheduled",
    duration_type: "normal",
  },
  player_count: 7,
  is_owner: false,
  ...overrides,
});

const meta = {
  title: "Components/GameList",
  component: GameList,
  tags: ["autodocs"],
  // 各行が <Link> なのでルーターで包む
  decorators: [(Story) => createElement(MemoryRouter, null, createElement(Story))],
  args: {
    emptyMessage: "現在参加している卓はありません",
  },
} satisfies Meta<typeof GameList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    games: [
      game({ game_uuid: "a" }),
      game({
        game_uuid: "b",
        game_number: null,
        status: "preparing",
        season: null,
        next_update_at: null,
        player_count: 3,
        regulation: {
          face_type: "flags",
          progress_mode: "consensus",
          duration_type: "short",
        },
      }),
      game({ game_uuid: "c", game_number: 12, status: "closed", season: "1908 年秋" }),
      game({ game_uuid: "d", game_number: 7, status: "aborted", season: "1902 年春" }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: /第 42 卓/ })).toHaveAttribute(
      "href",
      "/games/a",
    );
    await expect(canvas.getByRole("link", { name: /番号未定/ })).toBeInTheDocument();
  },
};

/** 0 件のときはメッセージを出す */
export const Empty: Story = {
  args: { games: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("現在参加している卓はありません"),
    ).toBeInTheDocument();
  },
};

/** 取得に失敗したとき */
export const Failed: Story = {
  args: { games: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
  },
};
