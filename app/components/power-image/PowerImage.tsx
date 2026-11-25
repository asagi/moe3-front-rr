import {
  type GameRegulation,
  type PowerCode,
  powerImageUrl,
} from "~/lib/game";
import styles from "./PowerImage.module.css";

export interface PowerImageProps {
  faceType: GameRegulation["face_type"];
  /** 国の 1 文字コード。null なら国未定（希望なし）の仮アイコン */
  code: PowerCode | null;
  /** 表示する枠の一辺（px）。娘・旗どちらでもこの正方形に収める */
  size: number;
  /** 滅亡した国の白黒の画像（dfpl）にするか */
  defeated?: boolean;
  className?: string;
}

/**
 * 国の画像。
 * 娘（正方形）と旗（3:2）で比率が違うので、同じ大きさの正方形の枠に
 * 元の比率のまま中央寄せで収める（並べたときに位置がずれないようにする）
 */
export const PowerImage = ({
  faceType,
  code,
  size,
  defeated = false,
  className,
}: PowerImageProps) =>
  code == null ? (
    // 国未定・希望なしの専用画像はないので、枠だけの仮アイコンにする
    <span
      className={`${styles.frame} ${styles.none} ${className ?? ""}`}
      style={{ width: size, height: size, borderRadius: Math.round(size / 12) }}
    >
      <span style={{ fontSize: Math.round(size * 0.4) }} aria-hidden="true">
        ？
      </span>
    </span>
  ) : (
    <FramedImage
      faceType={faceType}
      code={code}
      size={size}
      defeated={defeated}
      className={className}
    />
  );

export interface AdminImageProps {
  faceType: GameRegulation["face_type"];
  /** 表示する枠の一辺（px） */
  size: number;
  className?: string;
}

/** 管理人の画像（国の画像と同じ枠に収める） */
export const AdminImage = ({ faceType, size, className }: AdminImageProps) => (
  <FramedImage faceType={faceType} code="x" size={size} className={className} />
);

/** 旗画像の縦横比（横 3 : 縦 2） */
const FLAG_RATIO = 2 / 3;

const FramedImage = ({
  faceType,
  code,
  size,
  defeated = false,
  className,
}: {
  faceType: GameRegulation["face_type"];
  code: PowerCode | "x";
  size: number;
  defeated?: boolean;
  className?: string;
}) => {
  const height = faceType === "flags" ? Math.round(size * FLAG_RATIO) : size;
  return (
    <span
      className={`${styles.frame} ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <img
        className={styles.image}
        src={powerImageUrl(faceType, code, size > 60 ? 100 : 60, defeated)}
        alt=""
        width={size}
        height={height}
        // 角丸は大きさに比例させる（小さい旗が丸く見えないように）
        style={{ borderRadius: Math.round(size / 12) }}
      />
    </span>
  );
};
