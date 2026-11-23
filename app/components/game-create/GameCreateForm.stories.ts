import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";
import { MemoryRouter } from "react-router";

import { expect, fn, userEvent, within } from "storybook/test";

import { DEFAULT_GAME_FORM_VALUES } from "~/lib/game-form";
import { GameCreateForm } from "./GameCreateForm";

const meta = {
  title: "Components/GameCreateForm",
  component: GameCreateForm,
  tags: ["autodocs"],
  // 「戻る」が <Link> なのでルーターで包む
  decorators: [(Story) => createElement(MemoryRouter, null, createElement(Story))],
  args: {
    defaultValues: DEFAULT_GAME_FORM_VALUES,
    today: "2026-11-23",
    onConfirm: fn(),
  },
} satisfies Meta<typeof GameCreateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 開始日を選ばずに進むとエラーが出て、確認画面へは進まない（開始時刻は 0:00 が初期値） */
export const RequiredErrors: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "確認へ進む" }));
    await expect(canvas.getByText("開始日を選択してください")).toBeInTheDocument();
    await expect(canvas.queryByText("開始時刻を選択してください")).toBeNull();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** 鍵にチェックを入れたときだけキーワードを入力でき、英数字以外はエラーになる */
export const Keyword: Story = {
  args: {
    defaultValues: {
      ...DEFAULT_GAME_FORM_VALUES,
      startDate: "2026-11-25",
      firstPeriodHour: "12",
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const keyword = canvas.getByRole("textbox", { name: "キーワード" });
    await expect(keyword).toBeDisabled();
    await userEvent.click(canvas.getByRole("checkbox", { name: "鍵" }));
    await expect(keyword).toBeEnabled();
    await userEvent.type(keyword, "ひみつ");
    await userEvent.click(canvas.getByRole("button", { name: "確認へ進む" }));
    await expect(
      canvas.getByText("キーワードには半角英数字のみ使えます"),
    ).toBeInTheDocument();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** すべて入力すると、入力値を渡して確認画面へ進む */
export const Confirm: Story = {
  args: {
    defaultValues: {
      ...DEFAULT_GAME_FORM_VALUES,
      startDate: "2026-11-25",
      firstPeriodHour: "12",
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "旗" }));
    await userEvent.click(canvas.getByRole("radio", { name: "合意進行" }));
    await userEvent.click(canvas.getByRole("radio", { name: "30 分" }));
    await userEvent.click(canvas.getByRole("radio", { name: "フランス" }));
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: "開始時刻（分）" }),
      "30",
    );
    await userEvent.click(canvas.getByRole("button", { name: "確認へ進む" }));
    await expect(args.onConfirm).toHaveBeenCalledWith({
      ...DEFAULT_GAME_FORM_VALUES,
      faceType: "flags",
      progressMode: "consensus",
      durationType: "short",
      startDate: "2026-11-25",
      firstPeriodHour: "12",
      firstPeriodMinute: "30",
      requestedPower: "f",
    });
  },
};
