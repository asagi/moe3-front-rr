import { POWERS, POWER_LABELS, type PowerCode } from "~/lib/game";

/**
 * メッセージの種類（GET /games/{uuid}/logs/{season} の kind）。
 * ghost は API にはあるがフロントでは使わない
 */
export type ChatMessageKind =
  | "public"
  | "confidential"
  | "masked"
  | "personal"
  | "ghost"
  | "system";

/** 外交メッセージ */
export interface ChatMessage {
  message_uuid: string;
  /** 送信者の国コード。システムメッセージは null */
  sender: PowerCode | null;
  /** 帰属シーズン（"1901s" など） */
  turn: string;
  /** 本文。masked は null */
  context: string | null;
  kind: ChatMessageKind;
  /** 宛先の国コード（confidential / masked のみ） */
  recipients: PowerCode[] | null;
  /** 送信日時（JST、"YYYY-MM-DD HH:mm"） */
  created_at: string;
}

/** オープンチャンネル（全員向けの公開発言）の ID */
export const OPEN_CHANNEL_ID = "open";

/**
 * チャンネル。
 * サーバーにチャンネルの概念がまだないので、メンバー（送信者＋宛先）の国の組み合わせを
 * 国の並び順でつなげたもの（"efg" など）を ID にする。オープンチャンネルは "open"、
 * 独り言（kind personal）はその国のコード 1 文字（"f" など）
 */
export type Channel =
  | { kind: "open"; id: typeof OPEN_CHANNEL_ID }
  | { kind: "personal"; id: PowerCode; power: PowerCode }
  | { kind: "group"; id: string; members: PowerCode[] };

const POWER_ORDER = POWERS.map((p) => p.code) as PowerCode[];

const sortPowers = (codes: Iterable<PowerCode>) => {
  const set = new Set(codes);
  return POWER_ORDER.filter((c) => set.has(c));
};

/** メンバーの国からチャンネル ID を作る */
export const groupChannelId = (members: Iterable<PowerCode>) =>
  sortPowers(members).join("");

/** URL のチャンネル ID を読む。不正なら null */
export const parseChannelId = (id: string): Channel | null => {
  if (id === OPEN_CHANNEL_ID) return { kind: "open", id };
  const codes = [...id];
  if (codes.length === 0 || !codes.every((c) => POWER_ORDER.includes(c as PowerCode))) {
    return null;
  }
  const members = sortPowers(codes as PowerCode[]);
  // 重複や並び順の違いは別の ID とみなさない（正規の ID だけ受け付ける）
  if (members.join("") !== id) return null;
  if (members.length === 1) {
    return { kind: "personal", id: members[0], power: members[0] };
  }
  return { kind: "group", id, members };
};

/** メッセージが属するチャンネルの ID。チャンネルに出さない種類は null */
export const channelIdOf = (message: ChatMessage): string | null => {
  switch (message.kind) {
    case "public":
    case "system":
      return OPEN_CHANNEL_ID;
    case "confidential":
    case "masked": {
      const members = [
        ...(message.sender ? [message.sender] : []),
        ...(message.recipients ?? []),
      ];
      return members.length >= 2 ? groupChannelId(members) : null;
    }
    case "personal":
      // 独り言は送信者の国だけのチャンネル
      return message.sender;
    default:
      // ghost はフロントでは使わない
      return null;
  }
};

/** チャンネルに属するメッセージだけを取り出す */
export const channelMessages = (messages: ChatMessage[], channelId: string) =>
  messages.filter((m) => channelIdOf(m) === channelId);

/** チャンネル一覧の 1 行 */
export interface ChannelSummary {
  channel: Channel;
  /** そのシーズンのメッセージ数 */
  messageCount: number;
  /** 最後のメッセージ（なければ null） */
  lastMessage: ChatMessage | null;
}

/**
 * シーズンのメッセージからチャンネル一覧を作る。
 * 並びは、オープンチャンネル → 独り言 → 密談（新しく発言があった順）。
 * オープンチャンネルと独り言は、メッセージがなくても出す。
 * @param myPower 参加者の担当国。その国がメンバーのチャンネルだけに絞る。
 *   null（担当国が決まる前）ならオープンチャンネルだけ
 */
export const summarizeChannels = (
  messages: ChatMessage[],
  myPower: PowerCode | null,
): ChannelSummary[] => {
  const groups = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const id = channelIdOf(m);
    if (!id) continue;
    groups.set(id, [...(groups.get(id) ?? []), m]);
  }

  const summary = (channel: Channel): ChannelSummary => {
    const list = groups.get(channel.id) ?? [];
    return { channel, messageCount: list.length, lastMessage: list.at(-1) ?? null };
  };

  const channels = [...groups.keys()].map((id) => parseChannelId(id));

  const personals =
    myPower != null ? [summary({ kind: "personal", id: myPower, power: myPower })] : [];

  const others = channels
    .filter((c) => c?.kind === "group")
    .filter((c) => myPower != null && c.members.includes(myPower))
    .map(summary)
    // 新しく発言があった順
    .sort((a, b) =>
      (b.lastMessage?.created_at ?? "").localeCompare(a.lastMessage?.created_at ?? ""),
    );

  return [summary({ kind: "open", id: OPEN_CHANNEL_ID }), ...personals, ...others];
};

/**
 * チャンネル名。
 * @param myPower 参加者の担当国（自分の国は名前から省く）
 */
export const channelName = (channel: Channel, myPower: PowerCode | null) => {
  switch (channel.kind) {
    case "open":
      return "オープンチャンネル";
    case "personal":
      return "独り言";
    case "group":
      return channel.members
        .filter((c) => c !== myPower)
        .map((c) => POWER_LABELS[c])
        .join("・");
  }
};

/** シーズンを保ったままチャット内の URL を作る */
export const chatPath = (
  gameUuid: string,
  season: string | null,
  channelId?: string,
) => {
  const base = `/games/${gameUuid}/chat${channelId ? `/${channelId}` : ""}`;
  return season ? `${base}?${new URLSearchParams({ season })}` : base;
};
