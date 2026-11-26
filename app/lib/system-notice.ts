import { findProvince } from "~/lib/board";
import type { ChatMessage, SystemNotice, SystemNoticeUnit } from "~/lib/chat";
import {
  POWER_LABELS,
  type PowerCode,
  formatMonthDayJa,
  seasonLabel,
} from "~/lib/game";

// システムメッセージの出し分け（notice の種類と値を使う）。
// - 本文は種類と値から日本語で組み立て直す（サーバーの本文は英語の国名などが混ざるため）
// - 区切り（シーズン開始・単独勝利など）は画面幅の帯にする
// - 盤面編集の通知が続いたら 1 行にまとめる
// 知らない種類や notice のないメッセージは、サーバーの本文をそのまま出す。

/** 本文の部品。国は画像と国名で出すので分けておく */
export type NoticeSegment = string | { power: PowerCode };

/** 区切りとして帯で出す種類 */
const MILESTONE_TYPES = new Set<string>([
  "ready",
  "aborted",
  "start_season",
  "solo",
  "draw",
  "closed",
]);

/** 盤面編集の通知の種類（続いたらまとめる） */
const BOARD_EDIT_TYPES = new Set<string>([
  "unit_placed",
  "unit_replaced",
  "unit_removed",
  "territory_set",
  "territory_replaced",
  "territory_released",
]);

export const isMilestone = (m: Pick<ChatMessage, "notice">) =>
  m.notice != null && MILESTONE_TYPES.has(m.notice.type);

export const isBoardEdit = (m: Pick<ChatMessage, "notice">) =>
  m.notice != null && BOARD_EDIT_TYPES.has(m.notice.type);

const COAST_LABELS: Record<string, string> = {
  nc: "北岸",
  sc: "南岸",
  ec: "東岸",
};

/** 地域の日本語名（"stp_sc" → "サンクトペテルブルク南岸"） */
const provinceLabel = (location: string) => {
  const [, coast] = location.split("_");
  const name = findProvince(location)?.jname.replace(/\(.*\)$/, "") ?? location;
  return coast ? `${name}${COAST_LABELS[coast] ?? `(${coast})`}` : name;
};

/** ユニットの部品（「[国]ドイツの陸軍（ミュンヘン）」） */
const unitSegments = (unit: SystemNoticeUnit): NoticeSegment[] => [
  { power: unit.power },
  `の${unit.kind === "f" ? "海軍" : "陸軍"}（${provinceLabel(unit.location)}）`,
];

/** "2026-11-27 21:00" → "11 月 27 日 (金) 21:00" */
const dateTimeLabel = (value: string) => {
  const [date, time = ""] = value.split(" ");
  return `${formatMonthDayJa(date)} ${time}`.trim();
};

/**
 * 種類と値から組み立てた本文。知らない種類なら null（サーバーの本文を出す）
 */
export const noticeSegments = (
  notice: SystemNotice,
): NoticeSegment[] | null => {
  switch (notice.type) {
    case "game_created":
      return [`@${notice.params.username} が募集を開始しました`];
    case "player_joined":
      return [`@${notice.params.username} が参加を表明しました`];
    case "ready":
      return ["プレイヤーが揃い、担当国が割り当てられました"];
    case "aborted":
      return ["プレイヤーが揃わなかったため、募集を終了しました"];
    case "start_season":
      return [`${seasonLabel(notice.params.season)} メインフェイズ開始`];
    case "draw_proposed":
      return ["卓主が講和を宣言しました"];
    case "owner_absent":
      return ["卓主が消息不明のため、講和の手続きが自動で進みます"];
    case "draw_rescinded":
      return ["卓主が講和を撤回しました"];
    case "solo":
      return [
        { power: notice.params.power },
        "が制覇を達成しました。お疲れさまでした",
      ];
    case "draw":
      return ["講和が成立しました。お疲れさまでした"];
    case "closed":
      return ["卓が閉鎖されました"];
    case "unit_placed":
      return [...unitSegments(notice.params.unit), "が配置されました"];
    case "unit_replaced":
      return [
        ...unitSegments(notice.params.old_unit),
        "が",
        ...unitSegments(notice.params.new_unit),
        "に変更されました",
      ];
    case "unit_removed":
      return [...unitSegments(notice.params.unit), "が除去されました"];
    case "territory_set":
      return [
        `${provinceLabel(notice.params.province)}の保有国が`,
        { power: notice.params.power },
        "になりました",
      ];
    case "territory_replaced":
      return [
        `${provinceLabel(notice.params.province)}の保有国が`,
        { power: notice.params.old_power },
        "から",
        { power: notice.params.new_power },
        "に変わりました",
      ];
    case "territory_released":
      return [
        { power: notice.params.old_power },
        `が保有していた${provinceLabel(notice.params.province)}が解放されました`,
      ];
    case "progress_mode_changed":
      return ["進行モードが定時進行から合意進行に変わりました"];
    case "progress_consented":
      return [{ power: notice.params.power }, "が即時進行に合意しました"];
    case "progress_consensus_rescinded":
      return [
        { power: notice.params.power },
        "が即時進行への合意を撤回しました",
      ];
    case "progress_consensus_reached":
      return [
        "すべての生存国が合意したため、メインフェイズをただちに終了します",
      ];
    case "next_update_at_changed":
      return [
        `次回更新時刻が ${dateTimeLabel(notice.params.next_update_at)} に変わりました`,
      ];
    case "power_returned":
      return [{ power: notice.params.power }, "が無政府状態から復帰しました"];
    default:
      return null;
  }
};

/** 本文の部品を文字だけにしたもの（読み上げ用など） */
export const segmentsText = (segments: NoticeSegment[]) =>
  segments
    .map((s) => (typeof s === "string" ? s : POWER_LABELS[s.power]))
    .join("");

/** 一覧に並べる単位。盤面編集の通知が 2 つ以上続いたら 1 つにまとめる */
export type ChatListItem =
  | { kind: "message"; message: ChatMessage }
  | { kind: "boardEdits"; messages: ChatMessage[] };

/**
 * メッセージを一覧に並べる単位に分ける。
 * 盤面編集の通知が同じ日に 2 つ以上続いたら、まとめて 1 つにする
 */
export const groupChatItems = (messages: ChatMessage[]): ChatListItem[] => {
  const items: ChatListItem[] = [];
  for (const m of messages) {
    const last = items.at(-1);
    const lastMessage =
      last?.kind === "message" ? last.message : last?.messages.at(-1);
    const sameDay =
      lastMessage != null &&
      lastMessage.created_at.slice(0, 10) === m.created_at.slice(0, 10);
    if (
      isBoardEdit(m) &&
      sameDay &&
      lastMessage != null &&
      isBoardEdit(lastMessage)
    ) {
      if (last?.kind === "boardEdits") {
        last.messages.push(m);
      } else {
        items[items.length - 1] = {
          kind: "boardEdits",
          messages: [lastMessage, m],
        };
      }
      continue;
    }
    items.push({ kind: "message", message: m });
  }
  return items;
};

/** 一覧の単位の最初のメッセージ（日付の区切りや、続けての発言の判定に使う） */
export const firstMessageOf = (item: ChatListItem) =>
  item.kind === "message" ? item.message : item.messages[0];

/** 一覧の単位の最後のメッセージ */
export const lastMessageOf = (item: ChatListItem) =>
  item.kind === "message"
    ? item.message
    : item.messages[item.messages.length - 1];

/** 一覧の単位の React の key */
export const itemKey = (item: ChatListItem) =>
  firstMessageOf(item).message_uuid;
