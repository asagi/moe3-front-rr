import {
  type GamePlayer,
  POWERS,
  POWER_LABELS,
  type PowerCode,
} from "~/lib/game";

/**
 * メッセージの種類（GET /games/{uuid}/logs/{season} の kind）。
 * ghost は滅亡した国の発言（通常発言の代わり）。オープンチャンネルに出す
 */
export type ChatMessageKind =
  | "public"
  | "confidential"
  | "masked"
  | "personal"
  | "ghost"
  | "system";

/**
 * 発言者の種類。
 * - power: 担当国としての発言（進行中）
 * - user: 国を持たないユーザーとしての発言（開戦前夜・感想戦）
 * - admin: 管理人発言
 * - system: システムメッセージ
 */
export type ChatSenderKind = "power" | "user" | "admin" | "system";

/** sender_kind が user のときの発言者（Discord の数値 ID は返らない） */
export interface ChatSenderUser {
  username: string;
  global_name: string | null;
  avatar_url: string | null;
}

/** システムメッセージの種類と値に出てくるユニット（GET /board の units[] と同じ形） */
export interface SystemNoticeUnit {
  power: PowerCode;
  kind: "a" | "f";
  location: string;
}

/**
 * システムメッセージの種類と値（notice）。国・地域・ユニット種別はコードで入る。
 * 今後種類が増えることがあるので、知らない type のときは本文（context）を出す
 */
export type SystemNotice =
  | { type: "game_created" | "player_joined"; params: { username: string } }
  | {
      type:
        | "ready"
        | "aborted"
        | "draw_proposed"
        | "owner_absent"
        | "draw_rescinded"
        | "draw"
        | "closed"
        | "progress_mode_changed"
        | "progress_consensus_reached";
      params: Record<string, never>;
    }
  | { type: "start_season"; params: { season: string } }
  | {
      type:
        | "solo"
        | "progress_consented"
        | "progress_consensus_rescinded"
        | "power_returned";
      params: { power: PowerCode };
    }
  | { type: "unit_placed" | "unit_removed"; params: { unit: SystemNoticeUnit } }
  | {
      type: "unit_replaced";
      params: { old_unit: SystemNoticeUnit; new_unit: SystemNoticeUnit };
    }
  | { type: "territory_set"; params: { province: string; power: PowerCode } }
  | {
      type: "territory_replaced";
      params: { province: string; old_power: PowerCode; new_power: PowerCode };
    }
  | {
      type: "territory_released";
      params: { province: string; old_power: PowerCode };
    }
  | { type: "next_update_at_changed"; params: { next_update_at: string } };

/** 外交メッセージ */
export interface ChatMessage {
  message_uuid: string;
  /** 送信者の国コード。sender_kind が power のときだけ入る */
  sender: PowerCode | null;
  sender_kind: ChatSenderKind;
  /** sender_kind が user のときの発言者 */
  sender_user: ChatSenderUser | null;
  /** 帰属シーズン（"1901s" など） */
  turn: string;
  /** 本文。masked は null */
  context: string | null;
  kind: ChatMessageKind;
  /** 宛先の国コード（confidential / masked のみ） */
  recipients: PowerCode[] | null;
  /** 送信日時（JST、"YYYY-MM-DD HH:mm"） */
  created_at: string;
  /**
   * システムメッセージの種類と値。システムメッセージ以外と、種類が分からないものは null。
   * サーバーが対応する前のデータでは省略されることがある
   */
  notice?: SystemNotice | null;
}

/** 滅亡した国の発言（Ghost 発言）か。アイコンを白黒にし、吹き出しを薄くする */
export const isGhost = (m: Pick<ChatMessage, "kind">) => m.kind === "ghost";

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
  if (
    codes.length === 0 ||
    !codes.every((c) => POWER_ORDER.includes(c as PowerCode))
  ) {
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
    case "ghost":
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
      return null;
  }
};

/**
 * チャンネル画面に出すメッセージか。
 * オープンチャンネルには、そのシーズンの密談も混ぜて出す（関与していない密談はサーバーが masked で返す）
 */
export const isShownInChannel = (message: ChatMessage, channelId: string) =>
  channelIdOf(message) === channelId ||
  (channelId === OPEN_CHANNEL_ID && logCategoryOf(message) === "private");

/** チャンネル画面に出すメッセージだけを取り出す */
export const channelMessages = (messages: ChatMessage[], channelId: string) =>
  messages.filter((m) => isShownInChannel(m, channelId));

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
 *   null（担当国が決まる前・開戦前夜・感想戦）ならオープンチャンネルだけ
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
    return {
      channel,
      messageCount: list.length,
      lastMessage: list.at(-1) ?? null,
    };
  };

  const channels = [...groups.keys()].map((id) => parseChannelId(id));

  const personals =
    myPower != null
      ? [summary({ kind: "personal", id: myPower, power: myPower })]
      : [];

  const others = channels
    .filter((c) => c?.kind === "group")
    .filter((c) => myPower != null && c.members.includes(myPower))
    .map(summary)
    // 新しく発言があった順
    .sort((a, b) =>
      (b.lastMessage?.created_at ?? "").localeCompare(
        a.lastMessage?.created_at ?? "",
      ),
    );

  return [
    summary({ kind: "open", id: OPEN_CHANNEL_ID }),
    ...personals,
    ...others,
  ];
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

/** 発言者の表示名（国名・ユーザーの表示名・「管理人」）。システムメッセージは null */
export const senderName = (m: ChatMessage) => {
  switch (m.sender_kind) {
    case "power":
      return m.sender ? POWER_LABELS[m.sender] : null;
    case "user":
      return m.sender_user
        ? (m.sender_user.global_name ?? m.sender_user.username)
        : null;
    case "admin":
      return "管理人";
    case "system":
      return null;
  }
};

/** 見ている人（自分の発言の判定に使う） */
export interface ChatSelf {
  /** 担当国（進行中の発言の判定に使う） */
  power: PowerCode | null;
  /** Discord のユーザー名（開戦前夜・感想戦の発言の判定に使う） */
  username: string | null;
}

/** 自分の発言か。管理人発言は誰の発言か分からないので、自分の発言としない */
export const isMine = (m: ChatMessage, self: ChatSelf) =>
  (m.sender_kind === "power" && m.sender != null && m.sender === self.power) ||
  (m.sender_kind === "user" &&
    self.username != null &&
    m.sender_user?.username === self.username);

/** 参加者のユーザー名 → 担当国（担当国のある参加者だけ） */
export type AssignedPowers = Record<string, PowerCode>;

export const assignedPowersOf = (players: GamePlayer[]): AssignedPowers =>
  Object.fromEntries(
    players.flatMap((p) => (p.power ? [[p.user.username, p.power]] : [])),
  );

/**
 * 開戦前夜で担当国が割り当てられた（ready のシステムメッセージ）あとのユーザー発言を、
 * 担当国の発言として出す。割り当て前の発言は Discord のアバターと名前のまま
 */
export const withAssignedPowers = (
  messages: ChatMessage[],
  powers: AssignedPowers,
) => {
  let assigned = false;
  let changed = false;
  const result = messages.map((m) => {
    if (m.notice?.type === "ready") assigned = true;
    if (!assigned || m.sender_kind !== "user" || !m.sender_user) return m;
    const power = powers[m.sender_user.username];
    if (!power) return m;
    changed = true;
    return { ...m, sender_kind: "power" as const, sender: power };
  });
  return changed ? result : messages;
};

/** SSE で受け取ったメッセージを、重複を除いて末尾に足す */
export const appendMessage = (messages: ChatMessage[], m: ChatMessage) =>
  messages.some((x) => x.message_uuid === m.message_uuid)
    ? messages
    : [...messages, m];

/** シーズンを保ったままチャット内の URL を作る */
export const chatPath = (
  gameUuid: string,
  season: string | null,
  channelId?: string,
) => {
  const base = `/games/${gameUuid}/chat${channelId ? `/${channelId}` : ""}`;
  return season ? `${base}?${new URLSearchParams({ season })}` : base;
};

/* ---- 第三者用ログビューアー ---- */

/**
 * ログビューアーのフィルタで出し分ける発言の種類。
 * - system: システムメッセージ
 * - open: オープンチャンネルの発言（管理人発言・Ghost 発言を含む）
 * - private: 密談（内容が伏せられたものを含む）
 * - personal: 独り言
 */
export type LogCategory = "system" | "open" | "private" | "personal";

export const LOG_CATEGORIES: { value: LogCategory; label: string }[] = [
  { value: "system", label: "システムメッセージ" },
  { value: "open", label: "オープンチャンネル" },
  { value: "private", label: "密談" },
  { value: "personal", label: "独り言" },
];

/** 発言の種類。知らない kind は null（ログビューアーに出さない） */
export const logCategoryOf = (m: ChatMessage): LogCategory | null => {
  switch (m.kind) {
    case "system":
      return "system";
    case "public":
    case "ghost":
      return "open";
    case "confidential":
    case "masked":
      return "private";
    case "personal":
      return "personal";
    default:
      return null;
  }
};

/**
 * 卓の進行中に、その国が読めた発言か（視点変更で使う）。
 * 全体向けの発言・その国が送信者か宛先の密談・その国の独り言だけが読める
 */
export const couldRead = (m: ChatMessage, power: PowerCode) => {
  switch (logCategoryOf(m)) {
    case "system":
    case "open":
      return true;
    case "private":
      return m.sender === power || (m.recipients ?? []).includes(power);
    case "personal":
      return m.sender === power;
    default:
      return false;
  }
};

/** ログビューアーの絞り込み */
export interface LogFilter {
  /** 視点にする国（null なら絞らない） */
  pov: PowerCode | null;
  /** 出さない種類 */
  hidden: ReadonlySet<LogCategory>;
}

/** 視点とフィルタで発言を絞る */
export const filterLog = (
  messages: ChatMessage[],
  { pov, hidden }: LogFilter,
) =>
  messages.filter((m) => {
    const category = logCategoryOf(m);
    if (category == null || hidden.has(category)) return false;
    return pov == null || couldRead(m, pov);
  });

/** URL の ?pov= を読む。不正なら null */
export const parsePov = (value: string | null): PowerCode | null =>
  value != null && POWER_ORDER.includes(value as PowerCode)
    ? (value as PowerCode)
    : null;

/** URL の ?hide=system,personal を読む。知らない値は捨てる */
export const parseHidden = (value: string | null): Set<LogCategory> =>
  new Set(
    (value ?? "")
      .split(",")
      .filter((v): v is LogCategory =>
        LOG_CATEGORIES.some((c) => c.value === v),
      ),
  );

/** ?hide= に入れる値（並びはメニューの順）。何も隠さなければ null */
export const serializeHidden = (hidden: ReadonlySet<LogCategory>) => {
  const list = LOG_CATEGORIES.map((c) => c.value).filter((v) => hidden.has(v));
  return list.length > 0 ? list.join(",") : null;
};

/** 密談の宛先（国の並び順） */
export const recipientsOf = (m: ChatMessage) => sortPowers(m.recipients ?? []);

/**
 * 未読として数える発言の ID を、チャンネルごとに集める（古い順）。
 * システムメッセージと自分の発言は数えない。見ている人のチャンネル（channelIds）の発言だけ
 */
export const unreadCandidatesOf = (
  messages: ChatMessage[],
  self: ChatSelf,
  channelIds: Iterable<string>,
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  const ids = new Set(channelIds);
  for (const m of messages) {
    if (m.sender_kind === "system" || m.kind === "masked" || isMine(m, self)) continue;
    const id = channelIdOf(m);
    if (id == null || !ids.has(id)) continue;
    (result[id] ??= []).push(m.message_uuid);
  }
  return result;
};
