import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { DEFAULT_GAME_FORM_VALUES } from "~/lib/game-form";
import { GameCreateConfirm } from "./GameCreateConfirm";

const meta = {
  title: "Components/GameCreateConfirm",
  component: GameCreateConfirm,
  tags: ["autodocs"],
  args: {
    values: {
      ...DEFAULT_GAME_FORM_VALUES,
      startDate: "2026-11-25",
      firstPeriodHour: "12",
      firstPeriodMinute: "30",
      locked: true,
      keyword: "secret123",
      requestedPower: "f",
    },
    onBack: fn(),
    onCreate: fn(),
  },
} satisfies Meta<typeof GameCreateConfirm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("2026 年 11 月 25 日（水）")).toBeInTheDocument();
    await expect(canvas.getByText("フランス")).toBeInTheDocument();
    await expect(canvas.getByText("12:30")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "この内容で作成する" }));
    await expect(args.onCreate).toHaveBeenCalled();
  },
};

/** 希望国なし・鍵なし */
export const NoOptions: Story = {
  args: {
    values: {
      ...DEFAULT_GAME_FORM_VALUES,
      faceType: "flags",
      progressMode: "consensus",
      durationType: "short",
      startDate: "2026-11-25",
      firstPeriodHour: "0",
    },
  },
};

/** 作成中はボタンを押せない */
export const Submitting: Story = {
  args: { submitting: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "作成中…" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "戻る" })).toBeDisabled();
  },
};

/** 作成に失敗したとき */
export const Failed: Story = {
  args: {
    error: "作成に失敗しました（invalid_request）: keyword must contain only alphanumeric characters",
  },
};
