import type { Meta, StoryObj } from "@storybook/react-vite";
import { createElement, useState } from "react";

import { expect, fn, userEvent, within } from "storybook/test";

import { AdminHeader } from "./AdminHeader";

const meta = {
  title: "Components/AdminHeader",
  component: AdminHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    onImpersonate: fn(),
    onClearImpersonate: fn(),
  },
} satisfies Meta<typeof AdminHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 未設定時はユーザー名を入力して「切替」できる（前後の空白と先頭の @ は外す） */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "切替" });
    await expect(button).toBeDisabled();
    await userEvent.type(canvas.getByLabelText("視点変更"), "  @asagix ");
    await userEvent.click(button);
    await expect(args.onImpersonate).toHaveBeenCalledWith("asagix");
  },
};

/** 設定済みのときは対象のユーザー名と「解除」ボタンを表示する */
export const Impersonating: Story = {
  args: {
    impersonateUsername: "asagix",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("@asagix")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "解除" }));
    await expect(args.onClearImpersonate).toHaveBeenCalled();
  },
};

/** 切り替え済みなら、対象ユーザーのアイコンも並べて表示する */
export const ImpersonatingWithAvatar: Story = {
  args: {
    impersonateUsername: "asagix",
    impersonateUser: {
      name: "Asagi",
      avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("@asagix")).toBeInTheDocument();
    await expect(canvasElement.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.discordapp.com/embed/avatars/1.png",
    );
  },
};

/** アイコンがないユーザーは頭文字の丸を出す */
export const ImpersonatingWithoutAvatar: Story = {
  args: {
    impersonateUsername: "dummy_carol",
    impersonateUser: { name: "キャロル", avatarUrl: null },
  },
};

/** 切替 → 解除すると、入力欄に直前のユーザー名が残っている */
export const ClearKeepsInput: Story = {
  render: (args) => {
    const [username, setUsername] = useState<string | null>(null);
    return createElement(AdminHeader, {
      ...args,
      impersonateUsername: username,
      onImpersonate: (name) => {
        args.onImpersonate?.(name);
        setUsername(name);
      },
      onClearImpersonate: () => {
        args.onClearImpersonate?.();
        setUsername(null);
      },
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("視点変更"), "asagix");
    await userEvent.click(canvas.getByRole("button", { name: "切替" }));
    await userEvent.click(canvas.getByRole("button", { name: "解除" }));
    await expect(canvas.getByLabelText("視点変更")).toHaveValue("asagix");
  },
};

/** ユーザー名が見つからず切り替えられなかったときはエラーを出し、解除できるようにする */
export const ImpersonateError: Story = {
  args: {
    impersonateUsername: "unknown-user",
    impersonateError: "user specified by X-Impersonate-User-Name was not found",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "切り替えられませんでした",
    );
    await expect(canvas.getByRole("button", { name: "解除" })).toBeEnabled();
  },
};

/** 卓内のページで選べる国（国の割り当て後。トルコは滅亡） */
const viewpoints = {
  faceType: "girls" as const,
  powers: [
    { power: "a" as const, username: "dummy_alice", eliminated: false },
    { power: "e" as const, username: "dummy_bob", eliminated: false },
    { power: "f" as const, username: "asagix", eliminated: false },
    { power: "g" as const, username: "dummy_carol", eliminated: false },
    { power: "i" as const, username: "dummy_dave", eliminated: false },
    { power: "r" as const, username: "dummy_eve", eliminated: false },
    { power: "t" as const, username: "dummy_frank", eliminated: true },
  ],
};

/** 卓内のページでは、管理人・第三者・国名から選ぶ。国を選ぶとその担当者に切り替える */
export const InGame: Story = {
  args: { viewpoints, onThirdParty: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText("視点");
    await expect(select).toHaveValue("admin");
    await expect(
      canvas.getByRole("option", { name: "トルコ（滅亡）" }),
    ).toBeInTheDocument();
    await userEvent.selectOptions(select, "f");
    await expect(args.onImpersonate).toHaveBeenCalledWith("asagix");
    await userEvent.selectOptions(select, "third_party");
    await expect(args.onThirdParty).toHaveBeenCalled();
  },
};

/** 卓内で国の担当者に切り替え済みなら、その国を選んだ状態で国の画像を出す。管理人を選ぶと解除 */
export const InGameImpersonating: Story = {
  args: { viewpoints, impersonateUsername: "asagix" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText("視点");
    await expect(select).toHaveValue("f");
    await userEvent.selectOptions(select, "admin");
    await expect(args.onClearImpersonate).toHaveBeenCalled();
  },
};

/** 卓内で第三者として見ているとき */
export const InGameThirdParty: Story = {
  args: { viewpoints, thirdParty: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText("視点")).toHaveValue(
      "third_party",
    );
  },
};

/** 国の割り当て前の卓内では、管理人・第三者に加えてユーザー名の入力欄も出す */
export const InGameBeforeAssignment: Story = {
  args: { viewpoints: { ...viewpoints, powers: [] } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText("視点変更するユーザー名"),
      "asagix",
    );
    await userEvent.click(canvas.getByRole("button", { name: "切替" }));
    await expect(args.onImpersonate).toHaveBeenCalledWith("asagix");
  },
};

/** 卓の外で第三者として見ているときは、その旨と「解除」を出す */
export const ThirdPartyOutsideGame: Story = {
  args: { thirdParty: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/第三者/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "解除" }));
    await expect(args.onClearImpersonate).toHaveBeenCalled();
  },
};
