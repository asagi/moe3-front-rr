import { type ReactNode, useEffect, useRef, useState } from "react";
import Board from "./Board";
import boardDefaults from "./boardDefaults.json";
import { ProvinceInfo, type ProvinceInfoUnit } from "./ProvinceInfo";
import type { BoardData } from "./types";
import { baseCode, findProvince } from "~/lib/board";
import type { PowerCode } from "~/lib/game";
import styles from "./ProvinceInfo.module.css";

export interface BoardWithInfoProps {
  /** 盤面（指定しなければ初期配置）。ユニットに dislodged があれば「敗退」と出す */
  boardData?: BoardData;
  /**
   * 情報カードの下に並べる操作（命令画面の「命令を変更」など）。
   * @param code 選んでいる地域のコード（ベースのコード）
   * @param close カードを閉じる
   */
  renderActions?: (code: string, close: () => void) => ReactNode;
}

/**
 * 地域を押すと、その情報を地図のすぐ下に重ねて出す地図。
 * 下のコンテンツは押し下げず、カードを上に重ねる。
 * カードの「閉じる」、地図とカード以外を押す、Esc のどれかで閉じる
 */
export const BoardWithInfo = ({ boardData, renderActions }: BoardWithInfoProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = () => setSelected(null);

  useEffect(() => {
    if (!selected) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setSelected(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  const units = (boardData?.units ?? boardDefaults.initialUnits) as ProvinceInfoUnit[];
  const territories = (boardData?.territories ?? boardDefaults.initialTerritories) as {
    power: PowerCode;
    code: string;
  }[];
  const province = selected ? findProvince(selected) : null;

  return (
    <div ref={rootRef} className={styles.anchor}>
      <Board boardData={boardData} onProvinceSelect={setSelected} selectedCode={selected} />
      {province && (
        <div className={styles.overlay}>
          <ProvinceInfo
            province={province}
            owner={territories.find((t) => t.code === province.code)?.power ?? null}
            units={units.filter((u) => baseCode(u.location) === province.code)}
            onClose={close}
            actions={renderActions?.(province.code, close)}
          />
        </div>
      )}
    </div>
  );
};
