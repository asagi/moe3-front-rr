import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { initialPowers } from "./fixtures/orders";
import { PowerStatusTable } from "./PowerStatusTable";

const meta = {
  title: "Components/Orders/PowerStatusTable",
  component: PowerStatusTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    faceType: "girls",
    powers: initialPowers,
    showProgress: true,
    idleLimitMinutes: 24 * 60,
  },
} satisfies Meta<typeof PowerStatusTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 合意進行の卓（イタリアは無政府、トルコは滅亡） */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("row")).toHaveLength(8);
    await expect(
      canvas.getByRole("columnheader", { name: "即時進行" }),
    ).toBeInTheDocument();
    const italy = canvas
      .getByRole("rowheader", { name: "イタリア（無政府）" })
      .closest("tr");
    await expect(italy).toHaveAttribute("data-state", "idle");
    const turkey = canvas
      .getByRole("rowheader", { name: "トルコ（滅亡）" })
      .closest("tr");
    await expect(turkey).toHaveAttribute("data-state", "eliminated");
    await expect(within(turkey as HTMLElement).getAllByText("—")).toHaveLength(
      2,
    );
    // 不在時間（1 時間未満は分、以降は時間。無政府はサーバーの判定どおり）
    await expect(
      canvas.getByRole("columnheader", { name: "不在時間" }),
    ).toBeInTheDocument();
    await expect(canvas.getByText("42分")).toBeInTheDocument();
    await expect(canvas.getByText("3時間")).toBeInTheDocument();
    await expect(
      within(italy as HTMLElement).getByText("無政府"),
    ).toBeInTheDocument();
  },
};

/** 短期の卓（放置上限 60 分。無政府と判定されるまでは 59 分で止める） */
export const Short: Story = {
  args: {
    idleLimitMinutes: 60,
    powers: initialPowers.map((p) =>
      p.power === "g" ? { ...p, absent_minutes: 75 } : p,
    ),
  },
  play: async ({ canvasElement }) => {
    const germany = within(canvasElement)
      .getByRole("rowheader", { name: "ドイツ" })
      .closest("tr");
    await expect(
      within(germany as HTMLElement).getByText("59分"),
    ).toBeInTheDocument();
  },
};

/** 定時進行の卓（即時進行の列を出さない） */
export const Scheduled: Story = {
  args: { showProgress: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("columnheader", { name: "即時進行" }),
    ).not.toBeInTheDocument();
  },
};

/** 過去のシーズン（即時進行と不在時間の記録がない） */
export const PastSeason: Story = {
  args: {
    idleLimitMinutes: null,
    powers: initialPowers.map((p) => ({
      ...p,
      progress_consented: null,
      is_idle: null,
      absent_minutes: null,
    })),
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("columnheader", { name: "不在時間" }),
    ).not.toBeInTheDocument();
  },
};

/** 旗 */
export const Flags: Story = { args: { faceType: "flags" } };
