import boardDefaults from './boardDefaults.json';
import type { JSX } from 'react';
import svgResources from './resources.svg?raw';
import styles from '~/styles/board.module.css';

const getOwnerStyleForTarget = (target: string, owner?: string) => {
  if (owner === 'a') return styles[`austrian-${target}`];
  if (owner === 'e') return styles[`english-${target}`];
  if (owner === 'f') return styles[`french-${target}`];
  if (owner === 'g') return styles[`german-${target}`];
  if (owner === 'i') return styles[`italian-${target}`];
  if (owner === 'r') return styles[`russian-${target}`];
  if (owner === 't') return styles[`turkish-${target}`];
  return styles[`free-${target}`];
};

// boardDefaults を土台に、boardData で指定された項目だけ置き換える
// - units があれば initialUnits の代わりに使う
// - territories があれば initialTerritories の代わりに使う
const mergeBoardData = (defaults: BoardDefaults, boardData?: BoardData): BoardState => ({
  provinces: defaults.provinces,
  supplyCenters: defaults.supplyCenters,
  territories: boardData?.territories ?? defaults.initialTerritories,
  units: boardData?.units ?? defaults.initialUnits,
});

// 地域の保有国は territories に従う
const getOwnerByCode = (data: BoardState) =>
  new Map(data.territories.map((t) => [t.code, t.power]));

// 海域: kind が Water の地域
const loadWaters = (data: BoardState) => {
  return data.provinces
    .filter((prov) => prov.kind === 'Water')
    .map((prov) => <use xlinkHref={`#${prov.code}`} className={styles.water} key={prov.code} />);
};

// 補給都市の保有国は、その地域の保有国（territories）に従う
const loadSupplyCenters = (data: BoardState) => {
  const ownerByCode = getOwnerByCode(data);
  return data.supplyCenters.map((code) => {
    const ownerStyle = getOwnerStyleForTarget('supply-center', ownerByCode.get(code));
    const positionStyle = styles[`supply-center-on-${code}`];
    return (
      <svg className={`${ownerStyle} ${positionStyle}`} key={code}>
        <use xlinkHref='#supply-center' />
      </svg>
    );
  });
};

// 陸地: Water 以外の地域（bul_ec などの沿岸区分は除く）
const loadLands = (data: BoardState) => {
  const ownerByCode = getOwnerByCode(data);
  return data.provinces
    .filter((prov) => prov.kind !== 'Water' && !prov.code.includes('_'))
    .map((prov) => {
      const ownerStyle = getOwnerStyleForTarget('province', ownerByCode.get(prov.code));
      return <use xlinkHref={`#${prov.code}`} className={ownerStyle} key={prov.code} />;
    });
};

const loadUnits = (data: BoardState) => {
  return data.units.map((unit: Unit, index) => {
    const unitKind = ((kind) => {
      if (kind === 'a') return 'army';
      if (kind === 'f') return 'fleet';
      return null;
    })(unit.kind);
    if (!unitKind) return;
    const prov = unit.location.split('_');
    const ownerStyle = getOwnerStyleForTarget('unit', unit.power);
    const positionStyle = styles[`unit-on-${prov[0]}`];
    return (
      <svg className={`${ownerStyle} ${positionStyle}`} key={index}>
        <use xlinkHref={`#${unitKind}`} />
      </svg>
    );
  });
};

const loadAnchors = (data: BoardState) => {
  return data.units.map((unit: Unit, index) => {
    const prov = unit.location.split('_');
    const positionStyle = styles[`anchor-on-${prov[0]}${prov[1] || ''}`];
    return (
      prov[1] && (
        <svg className={positionStyle} key={index}>
          <use xlinkHref='#anchor' />
        </svg>
      )
    );
  });
};

export default function Board({ boardData }: BoardProps): JSX.Element {
  const data = mergeBoardData(boardDefaults, boardData);
  const Waters = loadWaters(data);
  const Lands = loadLands(data);
  const Units = loadUnits(data);
  const SupplyCenters = loadSupplyCenters(data);
  const Anchors = loadAnchors(data);

  return (
    <>
      <div className='hidden' dangerouslySetInnerHTML={{ __html: svgResources }} />
      <div className='board'>
        {/* board base */}
        <svg className={styles.base}>
          <use xlinkHref='#board-base'></use>
        </svg>

        {/* provinces */}
        <svg className={styles.province}>
          {Waters}
          {Lands}
        </svg>

        {/* supply centers */}
        <div className='supply-centers'>{SupplyCenters}</div>

        {/* board frame */}
        <svg className={styles.frame}>
          <use xlinkHref='#board-frame'></use>
        </svg>

        {/* units */}
        <div className='units'>
          {Units}
          {Anchors}
        </div>
      </div>
    </>
  );
}
