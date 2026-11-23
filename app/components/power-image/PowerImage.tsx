import {
  type GameRegulation,
  type PowerCode,
  powerImageUrl,
} from "~/lib/game";
import styles from "./PowerImage.module.css";

export interface PowerImageProps {
  faceType: GameRegulation["face_type"];
  /** 国の 1 文字コード。null なら「国未定」の画像 */
  code: PowerCode | null;
  /** 表示する枠の一辺（px）。娘・旗どちらでもこの正方形に収める */
  size: number;
  className?: string;
}

/** 旗画像の縦横比（横 3 : 縦 2） */
const FLAG_RATIO = 2 / 3;

/**
 * 国の画像。
 * 娘（正方形）と旗（3:2）で比率が違うので、同じ大きさの正方形の枠に
 * 元の比率のまま中央寄せで収める（並べたときに位置がずれないようにする）
 */
export const PowerImage = ({
  faceType,
  code,
  size,
  className,
}: PowerImageProps) => {
  const height = faceType === "flags" ? Math.round(size * FLAG_RATIO) : size;
  return (
    <span
      className={`${styles.frame} ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <img
        className={styles.image}
        src={powerImageUrl(faceType, code, size > 60 ? 100 : 60)}
        alt=""
        width={size}
        height={height}
        // 角丸は大きさに比例させる（小さい旗が丸く見えないように）
        style={{ borderRadius: Math.round(size / 12) }}
      />
    </span>
  );
};
