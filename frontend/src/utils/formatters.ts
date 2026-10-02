const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short"
});

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "long",
  day: "numeric"
});

export const formatLocalDateTime = (value: string | null): string => {
  if (value === null || Number.isNaN(new Date(value).getTime())) {
    return "尚無資料";
  }

  return DATE_TIME_FORMATTER.format(new Date(value));
};

export const formatLocalDateTimeWithOffset = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "尚無資料";
  }

  const dateParts = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((item) => item.type === type)?.value ?? "";
  const offset = new Intl.DateTimeFormat("en", { timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName")?.value ?? "GMT";

  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")} [${offset}]`;
};

export const formatTaipeiDateTime = (value: string | null): string => {
  if (value === null) {
    return "尚無資料";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "尚無資料";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")} [GMT+8]`;
};

export const formatDateTimeForZone = (value: string | null, timeZone: "Asia/Taipei" | "UTC"): string => {
  if (value === null) {
    return "尚無資料";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "尚無資料";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const suffix = timeZone === "UTC" ? "UTC" : "GMT+8";

  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")} [${suffix}]`;
};

export const formatLocalDate = (value: string | null): string => {
  if (value === null || Number.isNaN(new Date(value).getTime())) {
    return "尚無資料";
  }

  return DATE_FORMATTER.format(new Date(value));
};

export const formatPercent = (value: number | null): string => {
  if (value === null) {
    return "尚無資料";
  }

  return `${value.toLocaleString("zh-TW", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

export const formatNumber = (value: number | null, digits = 0): string => {
  if (value === null) {
    return "尚無資料";
  }

  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
};

export const getLocalTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

const STAGE_LABELS: Record<string, string> = {
  "group-stage": "小組賽",
  playoffs: "淘汰賽",
  final: "總決賽"
};

export const formatStageLabel = (stage: string | null): string => {
  if (stage === null || !stage.trim()) {
    return "階段尚未確認";
  }

  return STAGE_LABELS[stage] ?? "階段尚未確認";
};

const ROUND_LABELS: Record<string, string> = {
  opening: "首輪戰",
  "opening matches": "首輪戰",
  winners: "勝者戰",
  "winner's": "勝者戰",
  "winner's match": "勝者戰",
  "winners match": "勝者戰",
  elimination: "淘汰戰",
  "elimination match": "淘汰戰",
  decider: "決勝戰",
  "decider match": "決勝戰"
};

export const formatRoundLabel = (round: string | null): string => {
  if (round === null || !round.trim()) {
    return "輪次尚未確認";
  }

  const normalized = round.trim().toLocaleLowerCase("en-US").replace(/\s*\([^)]*\)\s*$/, "").trim();

  return ROUND_LABELS[normalized] ?? "輪次尚未確認";
};
