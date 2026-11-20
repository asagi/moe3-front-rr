type Province = {
  code: string;
  short: string;
  full: string;
  jname: string;
  kind: string;
};

type Territory = {
  power: string;
  code: string;
};

type Unit = {
  power: string;
  kind: string;
  location: string;
};

// boardDefaults.json の形
type BoardDefaults = {
  provinces: Array<Province>;
  supplyCenters: Array<string>;
  initialTerritories: Array<Territory>;
  initialUnits: Array<Unit>;
};

// props で渡す盤面データ。指定した項目だけ boardDefaults の初期値を置き換える
type BoardData = {
  territories?: Array<Territory>;
  units?: Array<Unit>;
};

// boardDefaults と boardData をマージした、描画に使う盤面
type BoardState = {
  provinces: Array<Province>;
  supplyCenters: Array<string>;
  territories: Array<Territory>;
  units: Array<Unit>;
};

type BoardProps = { boardData?: BoardData };
