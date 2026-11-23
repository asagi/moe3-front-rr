import {
  type GameRegulation,
  POWERS,
  type PowerCode,
} from "~/lib/game";

/** 新規募集フォームの入力値（フォームの name と同じキー） */
export interface GameFormValues {
  faceType: GameRegulation["face_type"];
  progressMode: GameRegulation["progress_mode"];
  durationType: GameRegulation["duration_type"];
  /** 開始日（"YYYY-MM-DD"）。未選択は "" */
  startDate: string;
  /** 開始時刻の時（"0"〜"23"） */
  firstPeriodHour: string;
  /** 開始時刻の分（"0" / "15" / "30" / "45"） */
  firstPeriodMinute: string;
  /** 鍵卓にするか */
  locked: boolean;
  /** 鍵卓のキーワード（英数字のみ） */
  keyword: string;
  /** 希望国。希望なしは "" */
  requestedPower: PowerCode | "";
}

export type GameFormErrors = Partial<Record<keyof GameFormValues, string>>;

/** 開始時刻の分として選べる値 */
export const START_MINUTES = ["0", "15", "30", "45"] as const;

export const DEFAULT_GAME_FORM_VALUES: GameFormValues = {
  faceType: "girls",
  progressMode: "scheduled",
  durationType: "normal",
  startDate: "",
  firstPeriodHour: "0",
  firstPeriodMinute: "0",
  locked: false,
  keyword: "",
  requestedPower: "",
};

const str = (formData: FormData, name: keyof GameFormValues) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/** FormData から入力値を取り出す（不正な列挙値は既定値にする） */
export const readGameForm = (formData: FormData): GameFormValues => {
  const power = str(formData, "requestedPower");
  return {
    faceType: str(formData, "faceType") === "flags" ? "flags" : "girls",
    progressMode:
      str(formData, "progressMode") === "consensus" ? "consensus" : "scheduled",
    durationType: str(formData, "durationType") === "short" ? "short" : "normal",
    startDate: str(formData, "startDate"),
    firstPeriodHour: str(formData, "firstPeriodHour"),
    firstPeriodMinute: str(formData, "firstPeriodMinute") || "0",
    locked: formData.get("locked") != null && str(formData, "locked") !== "",
    keyword: str(formData, "keyword").trim(),
    requestedPower: POWERS.some((p) => p.code === power)
      ? (power as PowerCode)
      : "",
  };
};

/** 入力値を送信用の FormData 相当（文字列だけのオブジェクト）にする */
export const gameFormToRecord = (
  values: GameFormValues,
): Record<string, string> => ({
  ...values,
  locked: values.locked ? "on" : "",
  keyword: values.locked ? values.keyword : "",
});

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

/**
 * 入力値を検証する
 * @param today 今日（JST、"YYYY-MM-DD"）。これより前の開始日はエラーにする
 */
export const validateGameForm = (
  values: GameFormValues,
  today: string,
): GameFormErrors => {
  const errors: GameFormErrors = {};

  if (!values.startDate) {
    errors.startDate = "開始日を選択してください";
  } else if (!isValidDate(values.startDate)) {
    errors.startDate = "開始日の形式が正しくありません";
  } else if (values.startDate < today) {
    errors.startDate = "開始日には今日以降の日付を選択してください";
  }

  const hour = Number(values.firstPeriodHour);
  if (values.firstPeriodHour === "") {
    // 画面では必ず選ばれているので、直接 POST された場合だけ起こる
    errors.firstPeriodHour = "開始時刻を選択してください";
  } else if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    errors.firstPeriodHour = "開始時刻が正しくありません";
  }

  if (!(START_MINUTES as readonly string[]).includes(values.firstPeriodMinute)) {
    errors.firstPeriodMinute = "開始時刻の分が正しくありません";
  }

  if (values.locked) {
    if (!values.keyword) {
      errors.keyword = "キーワードを入力してください";
    } else if (!/^[A-Za-z0-9]+$/.test(values.keyword)) {
      errors.keyword = "キーワードには半角英数字のみ使えます";
    }
  }

  return errors;
};

/** 開始時刻の表示（例: "9:00"、"21:45"） */
export const formatStartTime = (values: GameFormValues) =>
  `${values.firstPeriodHour}:${values.firstPeriodMinute.padStart(2, "0")}`;

/** 今日の日付（JST、"YYYY-MM-DD"） */
export const todayInJst = (now = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
