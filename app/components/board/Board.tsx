import initialData from './initialData.json';
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

const Seas = initialData.seas.map((prov: Province, index) => {
  return <use xlinkHref={`#${prov.code}`} className={styles.sea} key={index} />;
});

// moe3-server-rust の province.rs で supply: true の地域
const SUPPLY_CENTER_CODES = [
  'ank', 'bel', 'ber', 'bre', 'bud', 'bul', 'con', 'den', 'edi', 'gre', 'hol', 'kie',
  'lon', 'lvp', 'mar', 'mos', 'mun', 'nap', 'nwy', 'par', 'por', 'rom', 'rum', 'ser',
  'sev', 'smy', 'spa', 'stp', 'swe', 'tri', 'tun', 'ven', 'vie', 'war',
] as const;

// 補給都市の保有国は、その地域の占領国（lands[].owner）に従う
const loadSupplyCenters = (data: BoardData) => {
  const ownerByCode = new Map(data.lands.map((prov) => [prov.code, prov.owner]));
  return SUPPLY_CENTER_CODES.map((code) => {
    const ownerStyle = getOwnerStyleForTarget('supply-center', ownerByCode.get(code));
    const positionStyle = styles[`supply-center-on-${code}`];
    return (
      <svg className={`${ownerStyle} ${positionStyle}`} key={code}>
        <use xlinkHref='#supply-center' />
      </svg>
    );
  });
};

const loadLands = (data: BoardData) => {
  return data.lands.map((prov: Province, index) => {
    const ownerStyle = getOwnerStyleForTarget('province', prov.owner);
    return <use xlinkHref={`#${prov.code}`} className={ownerStyle} key={index} />;
  });
};

const loadUnits = (data: BoardData) => {
  return data.units.map((unit: Unit, index) => {
    const unitKind = ((kind) => {
      if (kind === 'a') return 'army';
      if (kind === 'f') return 'fleet';
      return null;
    })(unit.kind);
    if (!unitKind) return;
    const prov = unit.province.split('_');
    const ownerStyle = getOwnerStyleForTarget('unit', unit.owner);
    const positionStyle = styles[`unit-on-${prov[0]}`];
    return (
      <svg className={`${ownerStyle} ${positionStyle}`} key={index}>
        <use xlinkHref={`#${unitKind}`} />
      </svg>
    );
  });
};

const loadAnchors = (data: BoardData) => {
  return data.units.map((unit: Unit, index) => {
    const prov = unit.province.split('_');
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
  const Lands = loadLands(boardData || initialData);
  const Units = loadUnits(boardData || initialData);
  const SupplyCenters = loadSupplyCenters(boardData || initialData);
  const Anchors = loadAnchors(boardData || initialData);

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
          {Seas}
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
