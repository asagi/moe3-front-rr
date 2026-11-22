import type { Meta, StoryObj } from "@storybook/react-vite";

import { AdminHeader } from "./AdminHeader";

const meta = {
  title: "Components/AdminHeader",
  component: AdminHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AdminHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
