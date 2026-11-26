import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import {
  buildResponse,
  disbandResponse,
  initialUnits,
  mainResponse,
  retreatResponse,
  retreatUnits,
} from "./fixtures/order-form";
import { OrderForm } from "./OrderForm";

const meta = {
  title: "Components/Orders/OrderForm",
  component: OrderForm,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    res: mainResponse,
    units: initialUnits,
    faceType: "girls",
    showProgress: true,
    progressConsented: false,
    submitting: false,
    error: null,
    onSubmit: fn(),
  },
} satisfies Meta<typeof OrderForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** メインフェイズ：命令を変えて確定する */
export const Main: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const own = within(canvas.getByRole("region", { name: "自軍ユニットへの命令" }));
    await expect(own.getByText("A Par → Bur")).toBeInTheDocument();
    await expect(own.getByText("A Mar 支援 Par → Bur")).toBeInTheDocument();
    // 他国ユニット（仮定命令）は出さない
    await expect(canvas.queryByText("A Mun → Bur")).not.toBeInTheDocument();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(canvas.getByRole("button", { name: "更新" })).toBeDisabled();

    // ブレストの海軍を移動に変える
    const brestRow = own.getByText("F Bre 維持").closest("li") as HTMLElement;
    await userEvent.click(within(brestRow).getByRole("button", { name: "変更" }));
    await userEvent.click(within(brestRow).getByRole("radio", { name: "移動" }));
    await userEvent.selectOptions(within(brestRow).getByRole("combobox", { name: "移動先" }), "mao");
    await expect(own.getByText("F Bre → Mao")).toBeInTheDocument();
    await expect(within(brestRow).getByText("未確定")).toBeInTheDocument();

    // 即時進行に合意して確定する（確認を挟む）
    await userEvent.click(canvas.getByRole("switch", { name: "即時進行" }));
    await userEvent.click(canvas.getByRole("button", { name: "更新" }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "確定する" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      orders: expect.arrayContaining([
        expect.objectContaining({ location: "bre", order_kind: "move", dest: "mao" }),
      ]),
      progressConsented: true,
    });
    // 自国ユニットの命令だけを送る（サーバーに残っている仮定命令は送らないので消える）
    const sent = (args.onSubmit as ReturnType<typeof fn>).mock.calls[0][0].orders;
    await expect(sent).toHaveLength(3);
    await expect(sent.every((o: { unit_power: string }) => o.unit_power === "f")).toBe(true);
  },
};

/** メインフェイズ：海路移動・支援の選び直し */
export const MainConvoyAndSupport: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const own = within(canvas.getByRole("region", { name: "自軍ユニットへの命令" }));
    const marRow = own.getByText("A Mar 支援 Par → Bur").closest("li") as HTMLElement;
    await userEvent.click(within(marRow).getByRole("button", { name: "変更" }));
    // 支援の対象を変えると、支援の内容はその候補の先頭になる
    await userEvent.selectOptions(within(marRow).getByRole("combobox", { name: "支援するユニット" }), "mun");
    await expect(own.getByText("A Mar 支援 Mun → Bur")).toBeInTheDocument();
    // 海路移動
    await userEvent.click(within(marRow).getByRole("radio", { name: "海路移動" }));
    await userEvent.selectOptions(within(marRow).getByRole("combobox", { name: "移動先（海路）" }), "naf");
    await expect(own.getByText("A Mar → Naf（海路）")).toBeInTheDocument();
  },
};

/** メインフェイズ：変更をキャンセルする */
export const MainCancel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const own = within(canvas.getByRole("region", { name: "自軍ユニットへの命令" }));
    const parRow = own.getByText("A Par → Bur").closest("li") as HTMLElement;
    await userEvent.click(within(parRow).getByRole("button", { name: "変更" }));
    await userEvent.click(within(parRow).getByRole("radio", { name: "維持" }));
    await expect(own.getByText("A Par 維持")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "キャンセル" }));
    await userEvent.click(canvas.getByRole("button", { name: "破棄する" }));
    await expect(own.getByText("A Par → Bur")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "更新" })).toBeDisabled();
  },
};

/** 定時進行の卓（即時進行のトグルなし） */
export const Scheduled: Story = {
  args: { showProgress: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("switch")).not.toBeInTheDocument();
  },
};

/** 確定に失敗した */
export const SubmitError: Story = {
  args: { error: "命令を確定できませんでした（Par の命令が候補にありません）" },
};

/** 撤退フェイズ */
export const Retreat: Story = {
  args: { res: retreatResponse, units: retreatUnits },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("A Bur 解体")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "変更" }));
    await userEvent.click(canvas.getByRole("radio", { name: "撤退" }));
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "撤退先" }), "pic");
    await userEvent.click(canvas.getByRole("button", { name: "更新" }));
    await userEvent.click(canvas.getByRole("button", { name: "確定する" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      orders: [{ unit_power: "f", unit_kind: "a", location: "bur", order_kind: "retreat", dest: "pic" }],
      progressConsented: false,
    });
  },
};

/** 調整フェイズ：増設（n/m） */
export const Build: Story = {
  args: {
    res: buildResponse,
    units: initialUnits.filter((u) => u.location !== "mos" && u.location !== "sev" && u.location !== "stp_sc"),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "増設命令（0/2）" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "＋ 増設を追加" }));
    await userEvent.click(canvas.getByRole("button", { name: "＋ 増設を追加" }));
    await expect(canvas.getByRole("heading", { name: "増設命令（2/2）" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "＋ 増設を追加" })).not.toBeInTheDocument();
    // 2 つ目はモスクワ以外（同じ地域には 1 つまで）
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "増設 2" }), "stp_nc:f");
    await userEvent.click(canvas.getByRole("button", { name: "更新" }));
    await userEvent.click(canvas.getByRole("button", { name: "確定する" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      orders: [
        { unit_power: "r", unit_kind: "a", location: "mos", order_kind: "build" },
        { unit_power: "r", unit_kind: "f", location: "stp_nc", order_kind: "build" },
      ],
      progressConsented: false,
    });
  },
};

/** 調整フェイズ：解体（m/m。差し替えだけできる） */
export const Disband: Story = {
  args: { res: disbandResponse },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "解体命令（1/1）" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "取り消し" })).not.toBeInTheDocument();
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "解体 1" }), "bud");
    await userEvent.click(canvas.getByRole("button", { name: "更新" }));
    await userEvent.click(canvas.getByRole("button", { name: "確定する" }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      orders: [{ unit_power: "a", unit_kind: "a", location: "bud", order_kind: "disband" }],
      progressConsented: false,
    });
  },
};
