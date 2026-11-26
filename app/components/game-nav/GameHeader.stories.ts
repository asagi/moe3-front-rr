import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";
import { MemoryRouter } from "react-router";

import { expect, within } from "storybook/test";

import { GameHeader } from "./GameHeader";

const ORDERS = "/games/00000000-0000-0000-0000-000000000001/orders";

const meta = {
  title: "Components/GameNav/GameHeader",
  component: GameHeader,
  tags: ["autodocs"],
  decorators: [(Story) => createElement(MemoryRouter, null, createElement(Story))],
  args: { numberLabel: null, title: "卓情報" },
} satisfies Meta<typeof GameHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開始前（卓番号の採番前） */
export const BeforeStart: Story = {};

/** 開始後は卓番号を付ける */
export const Started: Story = {
  args: { numberLabel: "#001" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("heading", { name: "#001： 卓情報" }),
    ).toBeInTheDocument();
  },
};

/** ターンの中のページ（過去のシーズンを見ている） */
export const SeasonNavMiddle: Story = {
  args: {
    numberLabel: "#001",
    title: "1901 年秋",
    seasonNav: {
      first: `${ORDERS}?season=ready`,
      prev: `${ORDERS}?season=1901s`,
      next: `${ORDERS}?season=1902s`,
      latest: ORDERS,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "開戦前夜へ" })).toHaveAttribute(
      "href",
      `${ORDERS}?season=ready`,
    );
    await expect(canvas.getByRole("link", { name: "最新のシーズンへ" })).toHaveAttribute("href", ORDERS);
  },
};

/** 最新のシーズン（後ろへのボタンはグレーアウト） */
export const SeasonNavLatest: Story = {
  args: {
    numberLabel: "#001",
    title: "1902 年春",
    seasonNav: {
      first: `${ORDERS}?season=ready`,
      prev: `${ORDERS}?season=1901f`,
      next: null,
      latest: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "直後のシーズンへ" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(canvas.getByRole("link", { name: "最新のシーズンへ" })).not.toHaveAttribute("href");
  },
};

/** 開戦前夜（前へのボタンはグレーアウト） */
export const SeasonNavFirst: Story = {
  args: {
    numberLabel: "#001",
    title: "開戦前夜",
    seasonNav: { first: null, prev: null, next: `${ORDERS}?season=1901s`, latest: `${ORDERS}?season=1901s` },
  },
};

/** 現在のシーズン（フェイズ名を添える。狭い画面ではフェイズ名ごと 2 行目に回る） */
export const WithPhase: Story = {
  args: {
    numberLabel: "#001",
    title: "1901 年春",
    phase: "撤退フェイズ",
    seasonNav: { first: `${ORDERS}?season=ready`, prev: `${ORDERS}?season=ready`, next: null, latest: null },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("heading", { name: "#001： 1901 年春 撤退フェイズ" }),
    ).toBeInTheDocument();
  },
};
