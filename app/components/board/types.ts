export type Unit = {
  owner: string;
  kind: string;
  province: string;
};

export type Province = {
  owner?: string;
  code: string;
};

export type BoardData = {
  seas?: Array<Province>;
  lands: Array<Province>;
  units: Array<Unit>;
};

export type BoardProps = { boardData?: BoardData };
