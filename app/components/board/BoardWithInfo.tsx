import { useEffect, useRef, useState } from "react";
import Board from "./Board";
import boardDefaults from "./boardDefaults.json";
import { ProvinceInfo } from "./ProvinceInfo";
import type { BoardData } from "./types";
import { type BoardUnit, baseCode, findProvince } from "~/lib/board";
import type { PowerCode } from "~/lib/game";
import styles from "./ProvinceInfo.module.css";

export interface BoardWithInfoProps {
  /** 盤面（指定しなければ初期配置） */
  boardData?: BoardData;
}

/**
 * 地域を押すと、その情報を地図のすぐ下に重ねて出す地図。
 * 下のコンテンツは押し下げず、カードを上に重ねる。地図とカード以外を押すか Esc で閉じる
 */
export const BoardWithInfo = ({ boardData }: BoardWithInfoProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const units = (boardData?.units ?? boardDefaults.initialUnits) as BoardUnit[];
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
            unit={units.find((u) => baseCode(u.location) === province.code) ?? null}
          />
        </div>
      )}
    </div>
  );
};
