import type { Meta, StoryObj } from "@storybook/react-vite";
import Board from "./Board";
import pattern01 from "./fixtures/pattern01.json";
import pattern02 from "./fixtures/pattern02.json";
import pattern03 from "./fixtures/pattern03.json";

const meta = {
  title: "Components/Board",
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

export const Pattern02: Story = {
  args: {
    boardData: pattern02,
  },
};

export const Pattern03: Story = {
  args: {
    boardData: pattern03,
  },
};
