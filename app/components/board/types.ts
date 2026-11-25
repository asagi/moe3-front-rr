export type Province = {
  code: string;
  short: string;
  full: string;
  jname: string;
  kind: string;
};

export type Territory = {
  power: string;
  code: string;
};

export type Unit = {
  power: string;
  kind: string;
  location: string;
};

// boardDefaults.json の形
export type BoardDefaults = {
  provinces: Array<Province>;
  supplyCenters: Array<string>;
  initialTerritories: Array<Territory>;
  initialUnits: Array<Unit>;
};

// props で渡す盤面データ。指定した項目だけ boardDefaults の初期値を置き換える
export type BoardData = {
  territories?: Array<Territory>;
  units?: Array<Unit>;
};

// boardDefaults と boardData をマージした、描画に使う盤面
export type BoardState = {
  provinces: Array<Province>;
  supplyCenters: Array<string>;
  territories: Array<Territory>;
  units: Array<Unit>;
};

export type BoardProps = {
  boardData?: BoardData;
  /** 指定すると地域を押せるようにし、押された地域のコード（"spa" などベースのコード）を渡す */
  onProvinceSelect?: (code: string) => void;
  /** 強調する地域のコード（ベースのコード） */
  selectedCode?: string | null;
};
