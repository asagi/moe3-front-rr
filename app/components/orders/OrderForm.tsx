import { useEffect, useMemo, useState } from "react";
import type { BoardUnit } from "~/lib/board";
import type { GameRegulation } from "~/lib/game";
import {
  type OrderDraft,
  changedLocations,
  createDraft,
  draftToOrders,
  isDraftDirty,
} from "~/lib/order-draft";
import type { OrderInput, OrdersResponse } from "~/lib/orders";
import { AdjustmentEditor } from "./AdjustmentEditor";
import { OrderControls } from "./OrderControls";
import styles from "./OrderEditor.module.css";
import { OrderList, type OrderListItem } from "./OrderList";

export interface OrderFormSubmit {
  orders: OrderInput[];
  /** 即時進行（トグルを出していないときは null） */
  progressConsented: boolean | null;
}

export interface OrderFormProps {
  /**
   * サーバーの命令と候補。中身が変わったら（確定に成功した・フェイズが進んだ）確定前の変更を捨てる。
   * 盤面の読み直しなどで同じ中身の別オブジェクトが来ても、変更は捨てない
   */
  res: OrdersResponse;
  /** 盤面のユニット */
  units: BoardUnit[];
  faceType: GameRegulation["face_type"];
  /** 即時進行のトグルを出すか（合意進行の卓だけ） */
  showProgress: boolean;
  /** 確定済みの即時進行 */
  progressConsented: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (value: OrderFormSubmit) => void;
  /** 編集フォームを開いているユニットの位置（地図でユニットを選んだときに開くため、外から渡せる） */
  openLocation?: string | null;
  onOpenChange?: (location: string | null) => void;
  /** 確定前の命令が変わったとき（地図に矢印を描くため） */
  onDraftChange?: (orders: OrderInput[]) => void;
  /** 確定していない変更があるかが変わったとき（ページを離れるときの確認のため） */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * 命令欄（フェイズごとの命令の一覧・即時進行・更新・キャンセル）。
 * 命令はブラウザの中で編集し、「更新」でまとめて確定する
 */
export const OrderForm = ({
  res,
  units,
  faceType,
  showProgress,
  progressConsented: savedProgress,
  submitting,
  error,
  onSubmit,
  openLocation: openLocationProp,
  onOpenChange,
  onDraftChange,
  onDirtyChange,
}: OrderFormProps) => {
  const resKey = JSON.stringify(res);
  // 中身が同じなら作り直さない（res は読み直しのたびに別オブジェクトになる）
  const saved = useMemo(() => createDraft(res), [resKey]);
  const [draft, setDraftState] = useState<OrderDraft>(saved);
  const [progress, setProgress] = useState(savedProgress);
  // サーバーの命令が変わったら（確定した・フェイズが進んだ）、確定前の変更を捨てる
  const [prevResKey, setPrevResKey] = useState(resKey);
  const [prevProgress, setPrevProgress] = useState(savedProgress);
  if (resKey !== prevResKey || savedProgress !== prevProgress) {
    setPrevResKey(resKey);
    setPrevProgress(savedProgress);
    setDraftState(createDraft(res));
    setProgress(savedProgress);
  }

  const [openLocal, setOpenLocal] = useState<string | null>(null);
  const openLocation = openLocationProp !== undefined ? openLocationProp : openLocal;
  const setOpen = (location: string | null) => {
    setOpenLocal(location);
    onOpenChange?.(location);
  };

  const ordersDirty = isDraftDirty(draft, saved, res.phase_kind);
  const dirty = ordersDirty || (showProgress && progress !== savedProgress);
  const changed = changedLocations(draft, saved);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => onDraftChange?.(draftToOrders(draft, res.phase_kind)), [draft, res.phase_kind, onDraftChange]);

  const setDraft = setDraftState;
  const setUnitOrder = (order: OrderInput) =>
    setDraft({ ...draft, units: { ...draft.units, [order.location]: order } });

  // 自国ユニットだけ（仮定命令は出さない）
  const own: OrderListItem[] = res.options
    .filter((option) => option.unit_power === res.power)
    .map((option) => ({ option, order: draft.units[option.location] }));

  const listProps = {
    faceType,
    units,
    openLocation,
    onOpenChange: setOpen,
    changed,
    onChange: setUnitOrder,
  };

  return (
    <div className={styles.form}>
      {res.phase_kind === "main" && (
        <OrderList {...listProps} title="自軍ユニットへの命令" phaseKind="main" items={own} />
      )}
      {res.phase_kind === "retreat" && (
        <OrderList {...listProps} title="敗退したユニットへの命令" phaseKind="retreat" items={own} />
      )}
      {res.phase_kind === "adjustment" && res.adjustment && (
        <AdjustmentEditor
          power={res.power}
          adjustment={res.adjustment}
          myUnits={units.filter((u) => u.power === res.power)}
          builds={draft.builds}
          disbands={draft.disbands}
          onChange={({ builds, disbands }) => setDraft({ ...draft, builds, disbands })}
        />
      )}

      <OrderControls
        showProgress={showProgress}
        progressConsented={progress}
        onProgressChange={setProgress}
        dirty={dirty}
        submitting={submitting}
        error={error}
        onSubmit={() =>
          onSubmit({
            orders: draftToOrders(draft, res.phase_kind),
            progressConsented: showProgress ? progress : null,
          })
        }
        onCancel={() => {
          setDraft(saved);
          setProgress(savedProgress);
          setOpen(null);
        }}
      />
    </div>
  );
};
