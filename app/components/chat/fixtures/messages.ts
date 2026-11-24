import type { ChatMessage } from "~/lib/chat";

let seq = 0;

/** ストーリー用のメッセージ */
export const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => {
  seq += 1;
  return {
    message_uuid: `00000000-0000-7000-8000-${String(seq).padStart(12, "0")}`,
    sender: "f",
    turn: "1901s",
    context: "よろしくお願いします。",
    kind: "public",
    recipients: null,
    created_at: `2026-11-24 ${String(9 + (seq % 12)).padStart(2, "0")}:00`,
    ...overrides,
  };
};

/** 1901 年春のメッセージ（英仏独・仏伊の密談、墺露の masked、仏独の独り言） */
export const springMessages: ChatMessage[] = [
  message({ sender: null, kind: "system", context: "1901 年春 のメインフェイズが開始されました。", created_at: "2026-11-24 09:00" }),
  message({ sender: "f", context: "フランスです。皆さんよろしく。", created_at: "2026-11-24 09:10" }),
  message({ sender: "e", kind: "confidential", recipients: ["f", "g"], context: "北海の扱いを相談したい。", created_at: "2026-11-24 09:30" }),
  message({ sender: "f", kind: "confidential", recipients: ["e", "g"], context: "ベルギーは譲ってほしい。\nその代わり英仏海峡には入らない。", created_at: "2026-11-24 09:45" }),
  message({ sender: "a", kind: "masked", recipients: ["r"], context: null, created_at: "2026-11-24 10:00" }),
  message({ sender: "f", kind: "personal", context: "イギリスは信用できるか要観察。", created_at: "2026-11-24 10:10" }),
  message({ sender: "g", kind: "personal", context: "ベルギーは秋に取る。", created_at: "2026-11-24 10:15" }),
  message({ sender: "i", kind: "confidential", recipients: ["f"], context: "ピエモンテには行きません。", created_at: "2026-11-24 10:20" }),
];
