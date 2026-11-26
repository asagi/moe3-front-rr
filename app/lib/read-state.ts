import { useEffect, useState } from "react";

// チャットの既読の位置を、ブラウザ（localStorage）に持つ。
// - チャンネルごとに「最後に読んだ発言の ID」を覚える。発言の ID は時刻順に並ぶ UUID v7 なので、
//   文字列の大小で新しいかどうかが分かる
// - 初めてその卓を開いたときは、その時点の発言をすべて既読にする（since）。
//   覚えていないチャンネル（あとからできたグループチャンネルなど）は since より新しい発言を未読にする
// - 端末ごとに別々。ブラウザのデータを消すと、また「初めて開いた」扱いになる

interface ReadState {
  /** 初めて開いたときの最新の発言（これ以前はすべて既読） */
  since: string;
  /** チャンネルごとの最後に読んだ発言 */
  channels: Record<string, string>;
}

const storageKey = (gameUuid: string) => `moe3:read:${gameUuid}`;

/** 既読の位置が変わったことを、同じ画面のほかの部品（タブバーの印など）に知らせるイベント */
const CHANGE_EVENT = "moe3:read-state-change";

const load = (gameUuid: string): ReadState | null => {
  try {
    const raw = window.localStorage.getItem(storageKey(gameUuid));
    return raw ? (JSON.parse(raw) as ReadState) : null;
  } catch {
    return null;
  }
};

const save = (gameUuid: string, state: ReadState) => {
  try {
    window.localStorage.setItem(storageKey(gameUuid), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: gameUuid }));
  } catch {
    // 保存できない環境（プライベートブラウズなど）では、未読を出さないだけ
  }
};

/** 新しいほうの ID */
const newer = (a: string | undefined, b: string) => (a != null && a > b ? a : b);

/**
 * 初めて開いた卓なら、その時点の発言をすべて既読にする。
 * @param latest 今ある最新の発言の ID（発言がなければ null）
 */
export const ensureReadState = (gameUuid: string, latest: string | null) => {
  if (load(gameUuid)) return;
  // 発言がまだなければ、すべての発言を未読として数える（"" はどの ID より小さい）
  save(gameUuid, { since: latest ?? "", channels: {} });
};

/** チャンネルをここまで読んだ（戻ることはない） */
export const markChannelRead = (gameUuid: string, channelId: string, messageUuid: string) => {
  const state = load(gameUuid) ?? { since: "", channels: {} };
  if (state.channels[channelId] != null && state.channels[channelId] >= messageUuid) return;
  save(gameUuid, {
    ...state,
    channels: { ...state.channels, [channelId]: newer(state.channels[channelId], messageUuid) },
  });
};

/** チャンネルごとの未読の数（未読がなければ含めない） */
export const countUnread = (gameUuid: string, candidates: Record<string, string[]>) => {
  const state = load(gameUuid);
  if (!state) return {};
  const counts: Record<string, number> = {};
  for (const [channelId, ids] of Object.entries(candidates)) {
    const readUpTo = state.channels[channelId] ?? state.since;
    const n = ids.filter((id) => id > readUpTo).length;
    if (n > 0) counts[channelId] = n;
  }
  return counts;
};

/**
 * チャンネルごとの未読の数。既読の位置が変わったら（ほかの部品で読んだときも）数え直す。
 * localStorage はブラウザでしか読めないので、サーバーで描くときと最初の描画は空
 * @param latest 今ある最新の発言（初めて開いた卓なら、ここまでを既読にする）
 */
export const useUnreadCounts = (
  gameUuid: string,
  candidates: Record<string, string[]> | null,
  latest: string | null,
) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const key = JSON.stringify(candidates);
  useEffect(() => {
    if (!candidates) {
      setCounts({});
      return;
    }
    ensureReadState(gameUuid, latest);
    const update = () => setCounts(countUnread(gameUuid, candidates));
    update();
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === gameUuid) update();
    };
    // ほかのタブで読んだとき
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(gameUuid)) update();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
    // candidates は中身（key）で比べる
  }, [gameUuid, key, latest]);
  return counts;
};
