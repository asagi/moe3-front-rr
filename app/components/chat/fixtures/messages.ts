import type { ChatMessage } from "~/lib/chat";

let seq = 0;

/** ストーリー用のメッセージ */
export const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => {
  seq += 1;
  const base: ChatMessage = {
    message_uuid: `00000000-0000-7000-8000-${String(seq).padStart(12, "0")}`,
    sender: "f",
    sender_kind: "power",
    sender_user: null,
    turn: "1901s",
    context: "よろしくお願いします。",
    kind: "public",
    recipients: null,
    created_at: `2026-11-24 ${String(9 + (seq % 12)).padStart(2, "0")}:00`,
  };
  const m = { ...base, ...overrides };
  // システムメッセージと管理人発言には送信国が無い
  if (m.sender_kind !== "power") m.sender = null;
  return m;
};

/** 1901 年春のメッセージ（英仏独・仏伊の密談、墺露の masked、仏独の独り言） */
export const springMessages: ChatMessage[] = [
  message({ sender_kind: "system", kind: "system", context: "1901 年春 のメインフェイズが開始されました。", created_at: "2026-11-24 09:00" }),
  message({ sender: "f", context: "フランスです。皆さんよろしく。", created_at: "2026-11-24 09:10" }),
  message({ sender: "e", kind: "confidential", recipients: ["f", "g"], context: "北海の扱いを相談したい。", created_at: "2026-11-24 09:30" }),
  message({ sender: "f", kind: "confidential", recipients: ["e", "g"], context: "ベルギーは譲ってほしい。\nその代わり英仏海峡には入らない。", created_at: "2026-11-24 09:45" }),
  message({ sender: "a", kind: "masked", recipients: ["r"], context: null, created_at: "2026-11-24 10:00" }),
  message({ sender: "f", kind: "personal", context: "イギリスは信用できるか要観察。", created_at: "2026-11-24 10:10" }),
  message({ sender: "g", kind: "personal", context: "ベルギーは秋に取る。", created_at: "2026-11-24 10:15" }),
  message({ sender: "i", kind: "confidential", recipients: ["f"], context: "ピエモンテには行きません。", created_at: "2026-11-24 10:20" }),
];

/** 開戦前夜のオープンチャンネル（ユーザーとしての発言と管理人発言） */
export const readyMessages: ChatMessage[] = [
  message({ sender_kind: "system", kind: "system", turn: "ready", context: "@asagix が募集を開始しました。", created_at: "2026-11-23 10:53" }),
  message({
    sender_kind: "user",
    sender_user: { username: "asagix", global_name: "あさぎ", avatar_url: null },
    turn: "ready",
    context: "よろしくお願いします。",
    created_at: "2026-11-23 11:00",
  }),
  message({
    sender_kind: "user",
    sender_user: { username: "dummy_judy", global_name: "Judy", avatar_url: null },
    turn: "ready",
    context: "はじめまして。",
    created_at: "2026-11-23 11:05",
  }),
  message({ sender_kind: "admin", turn: "ready", context: "開始は 12 月 12 日 0 時です。", created_at: "2026-11-23 11:10" }),
];

/** 秋のオープンチャンネル（滅亡したイタリアの Ghost 発言を含む） */
export const ghostMessages: ChatMessage[] = [
  message({ sender: "t", turn: "1905f", context: "イタリアさん、お疲れさまでした。", created_at: "2026-12-20 09:00" }),
  message({ sender: "i", kind: "ghost", turn: "1905f", context: "まだ見てるからな。", created_at: "2026-12-20 09:05" }),
  message({ sender: "i", kind: "ghost", turn: "1905f", context: "オーストリアを信じたのが間違いだった。", created_at: "2026-12-20 09:06" }),
  message({ sender: "f", turn: "1905f", context: "化けて出た。", created_at: "2026-12-20 09:10" }),
];
