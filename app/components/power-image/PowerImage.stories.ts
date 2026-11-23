import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement } from "react";

import { POWERS } from "~/lib/game";
import { PowerImage } from "./PowerImage";

const meta = {
  title: "Components/PowerImage",
  component: PowerImage,
  tags: ["autodocs"],
  args: {
    faceType: "girls",
    code: "a",
    size: 100,
  },
} satisfies Meta<typeof PowerImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Girl: Story = {};

/** 旗は 3:2 のまま、娘と同じ大きさの正方形の枠に収める */
export const Flag: Story = {
  args: { faceType: "flags" },
};

/** 娘と旗を並べたときに枠の大きさがそろう */
export const AllPowers: Story = {
  render: (args) =>
    createElement(
      "div",
      { style: { display: "grid", gap: 8 } },
      (["girls", "flags"] as const).map((faceType) =>
        createElement(
          "div",
          { key: faceType, style: { display: "flex", gap: 8, outline: "1px dashed #ccc" } },
          [null, ...POWERS.map((p) => p.code)].map((code) =>
            createElement(PowerImage, {
              key: code ?? "x",
              faceType,
              code,
              size: args.size,
            }),
          ),
        ),
      ),
    ),
  args: { size: 60 },
};
