import type { Meta, StoryObj } from "@storybook/react-vite";

import { fn } from "storybook/test";

import { DiscordLoginButton } from "./DiscordLoginButton";

const meta = {
  title: "Components/DiscordLoginButton",
  component: DiscordLoginButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: { onClick: fn() },
} satisfies Meta<typeof DiscordLoginButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
