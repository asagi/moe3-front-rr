import type { Meta, StoryObj } from "@storybook/react-vite";

import { fn } from "storybook/test";

import { PowerChoices } from "./PowerChoices";

const meta = {
  title: "Components/PowerChoices",
  component: PowerChoices,
  tags: ["autodocs"],
  args: {
    faceType: "girls",
    name: "requestedPower",
    value: "",
    onChange: fn(),
  },
} satisfies Meta<typeof PowerChoices>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Flags: Story = {
  args: { faceType: "flags", value: "e" },
};

/** 卓主の希望国（フランス）を外したもの */
export const Excluded: Story = {
  args: { exclude: ["f"] },
};
