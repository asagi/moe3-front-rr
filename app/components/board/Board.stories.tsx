import type { Meta, StoryObj } from "@storybook/react-vite";
import Board from "./Board";
import pattern01 from "./fixtures/pattern01.json";

const meta = {
  title: "Board",
  component: Board,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Board>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    boardData: undefined,
  },
};

export const Pattern01: Story = {
  args: {
    boardData: pattern01,
  },
};
