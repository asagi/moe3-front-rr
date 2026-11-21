import type { Meta, StoryObj } from "@storybook/react-vite";

import { Greeting } from "./Greeting";

const meta = {
  title: "Components/Greeting",
  component: Greeting,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Greeting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
