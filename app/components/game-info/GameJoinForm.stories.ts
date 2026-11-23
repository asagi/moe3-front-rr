import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { GameJoinForm, GameJoinLoginPrompt } from "./GameJoinForm";

const meta = {
  title: "Components/GameInfo/GameJoinForm",
  component: GameJoinForm,
  tags: ["autodocs"],
  args: {
    faceType: "girls",
    excludePowers: [],
    isPrivate: false,
    onSubmit: fn(),
  },
} satisfies Meta<typeof GameJoinForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 卓主の希望国は選択肢に出ない */
export const ExcludeOwnerPower: Story = {
  args: { excludePowers: ["f"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("radio", { name: "フランス" })).toBeNull();
    await expect(canvas.getByRole("radio", { name: "ドイツ" })).toBeInTheDocument();
  },
};

/** 確認ダイアログで「申請する」を押すと、選んだ内容を渡す */
export const Submit: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "イタリア" }));
    await userEvent.click(canvas.getByRole("button", { name: "参加を申請する" }));
    const dialog = within(canvas.getByRole("dialog"));
    await expect(dialog.getByText("申請後は取り消すことができません。")).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "申請する" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      requestedPower: "i",
      keyword: "",
    });
  },
};

/** キャンセルすると申請しない */
export const Cancel: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "参加を申請する" }));
    await userEvent.click(
      within(canvas.getByRole("dialog")).getByRole("button", { name: "キャンセル" }),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** 鍵卓では鍵の入力が必要 */
export const PrivateGame: Story = {
  args: { isPrivate: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "参加を申請する" }));
    await expect(canvas.getByText("鍵を入力してください")).toBeInTheDocument();
    await expect(canvas.queryByRole("dialog")).toBeNull();

    await userEvent.type(canvas.getByRole("textbox", { name: "鍵" }), "secret1");
    await userEvent.click(canvas.getByRole("button", { name: "参加を申請する" }));
    await userEvent.click(
      within(canvas.getByRole("dialog")).getByRole("button", { name: "申請する" }),
    );
    await expect(args.onSubmit).toHaveBeenCalledWith({
      requestedPower: "",
      keyword: "secret1",
    });
  },
};

export const WithError: Story = {
  args: { error: "鍵が違います。", isPrivate: true },
};

export const Submitting: Story = {
  args: { submitting: true },
};

/** 未ログインのときにフォームの代わりに出す案内 */
export const LoginPrompt: StoryObj<typeof GameJoinLoginPrompt> = {
  render: (args) => GameJoinLoginPrompt(args),
  args: { onLogin: fn() },
};
