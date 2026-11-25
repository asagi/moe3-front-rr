import boardDefaults from "./boardDefaults.json";
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  BoardData,
  BoardDefaults,
  BoardProps,
  BoardState,
  Unit,
} from "./types";
import svgResources from "./resources.svg?raw";
import styles from "./Board.module.css";

const getOwnerStyleForTarget = (target: string, owner?: string) => {
  if (owner === "a") return styles[`austrian-${target}`];
  if (owner === "e") return styles[`english-${target}`];
  if (owner === "f") return styles[`french-${target}`];
  if (owner === "g") return styles[`german-${target}`];
  if (owner === "i") return styles[`italian-${target}`];
  if (owner === "r") return styles[`russian-${target}`];
  if (owner === "t") return styles[`turkish-${target}`];
  return styles[`free-${target}`];
};

// boardDefaults を土台に、boardData で指定された項目だけ置き換える
// - units があれば initialUnits の代わりに使う
// - territories があれば initialTerritories の代わりに使う
const mergeBoardData = (
  defaults: BoardDefaults,
  boardData?: BoardData,
): BoardState => ({
  provinces: defaults.provinces,
  supplyCenters: defaults.supplyCenters,
  territories: boardData?.territories ?? defaults.initialTerritories,
  units: boardData?.units ?? defaults.initialUnits,
});

// 地域の保有国は territories に従う
const getOwnerByCode = (data: BoardState) =>
  new Map(data.territories.map((t) => [t.code, t.power]));

/** 地域を押せるようにするときの、<use> に付ける属性 */
type ProvinceInteraction = {
  onSelect?: (code: string) => void;
  selectedCode?: string | null;
};

const provinceProps = (
  prov: { code: string; jname: string },
  className: string | undefined,
  { onSelect, selectedCode }: ProvinceInteraction,
) => {
  const selected = selectedCode === prov.code;
  // 選んでいる地域は、地域の塗りではなくユニットの位置に重ねる〇で示す（loadSelection）
  const classes = [className, onSelect ? styles.selectable : ""].filter(Boolean).join(" ");
  if (!onSelect) return { className: classes };
  return {
    className: classes,
    role: "button",
    tabIndex: 0,
    "aria-label": prov.jname,
    "aria-pressed": selected,
    onClick: () => onSelect(prov.code),
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(prov.code);
      }
    },
  };
};

// 海域: kind が Water の地域
const loadWaters = (data: BoardState, interaction: ProvinceInteraction) => {
  return data.provinces
    .filter((prov) => prov.kind === "Water")
    .map((prov) => (
      <use
        xlinkHref={`#${prov.code}`}
        key={prov.code}
        {...provinceProps(prov, styles.water, interaction)}
      />
    ));
};

// 補給都市の保有国は、その地域の保有国（territories）に従う
const loadSupplyCenters = (data: BoardState) => {
  const ownerByCode = getOwnerByCode(data);
  return data.supplyCenters.map((code) => {
    const ownerStyle = getOwnerStyleForTarget(
      "supply-center",
      ownerByCode.get(code),
    );
    const positionStyle = styles[`supply-center-on-${code}`];
    return (
      <svg className={`${ownerStyle} ${positionStyle}`} key={code}>
        <use xlinkHref="#supply-center" />
      </svg>
    );
  });
};

// 陸地: Water 以外の地域（bul_ec などの沿岸区分は除く）
const loadLands = (data: BoardState, interaction: ProvinceInteraction) => {
  const ownerByCode = getOwnerByCode(data);
  return data.provinces
    .filter((prov) => prov.kind !== "Water" && !prov.code.includes("_"))
    .map((prov) => {
      const ownerStyle = getOwnerStyleForTarget(
        "province",
        ownerByCode.get(prov.code),
      );
      return (
        <use
          xlinkHref={`#${prov.code}`}
          key={prov.code}
          {...provinceProps(prov, ownerStyle, interaction)}
        />
      );
    });
};

const loadUnits = (data: BoardState) => {
  return data.units.map((unit: Unit, index) => {
    const unitKind = ((kind) => {
      if (kind === "a") return "army";
      if (kind === "f") return "fleet";
      return null;
    })(unit.kind);
    if (!unitKind) return;
    const prov = unit.location.split("_");
    const ownerStyle = getOwnerStyleForTarget("unit", unit.power);
    const positionStyle = styles[`unit-on-${prov[0]}`];
    return (
      <svg className={`${ownerStyle} ${positionStyle}`} key={index}>
        <use xlinkHref={`#${unitKind}`} />
      </svg>
    );
  });
};

// 選んでいる地域の印（〇）。その地域のユニットの表示位置に重ねる
const loadSelection = (selectedCode?: string | null) => {
  if (!selectedCode) return null;
  const positionStyle = styles[`unit-on-${selectedCode.split("_")[0]}`];
  if (!positionStyle) return null;
  return (
    <svg className={`${positionStyle} ${styles.selection}`} aria-hidden="true">
      <use xlinkHref="#selection" />
    </svg>
  );
};

const loadAnchors = (data: BoardState) => {
  return data.units.map((unit: Unit, index) => {
    const prov = unit.location.split("_");
    const positionStyle = styles[`anchor-on-${prov[0]}${prov[1] || ""}`];
    return (
      prov[1] && (
        <svg className={positionStyle} key={index}>
          <use xlinkHref="#anchor" />
        </svg>
      )
    );
  });
};

export default function Board({
  boardData,
  onProvinceSelect,
  selectedCode,
}: BoardProps): JSX.Element {
  const data = mergeBoardData(boardDefaults, boardData);
  const interaction = { onSelect: onProvinceSelect, selectedCode };
  const Waters = loadWaters(data, interaction);
  const Lands = loadLands(data, interaction);
  const Units = loadUnits(data);
  const SupplyCenters = loadSupplyCenters(data);
  const Anchors = loadAnchors(data);
  const Selection = loadSelection(selectedCode);

  return (
    <>
      <div
        className="hidden"
        dangerouslySetInnerHTML={{ __html: svgResources }}
      />
      <div className={styles.board}>
        {/* board base */}
        <svg className={styles.base}>
          <use xlinkHref="#board-base"></use>
        </svg>

        {/* provinces */}
        <svg className={styles.province}>
          {Waters}
          {Lands}
        </svg>

        {/* board frame */}
        <svg className={styles.frame}>
          <use xlinkHref="#board-frame"></use>
        </svg>

        {/* supply centers */}
        <div className={styles["supply-centers"]}>{SupplyCenters}</div>

        {/* units */}
        <div className={styles.units}>
          {Units}
          {Anchors}
          {Selection}
        </div>
      </div>
    </>
  );
}
