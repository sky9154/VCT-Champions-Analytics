const AGENT_NAMES: Record<string, string> = {
  astra: "亞星卓",
  breach: "叛奇",
  brimstone: "布史東",
  chamber: "錢博爾",
  clove: "珂樂芙",
  cypher: "瑟符",
  deadlock: "蒂羅",
  fade: "菲德",
  gekko: "蓋克",
  harbor: "哈泊",
  iso: "離索",
  jett: "婕提",
  kayo: "KAY/O",
  killjoy: "愷宙",
  neon: "妮虹",
  omen: "歐門",
  phoenix: "菲尼克斯",
  raze: "芮茲",
  reyna: "蕾娜",
  sage: "聖祈",
  skye: "絲凱",
  sova: "蘇法",
  tejo: "戴侯",
  veto: "維托",
  viper: "薇蝮",
  vyse: "薇絲",
  waylay: "維蕾",
  yoru: "夜戮",
  miks: "米克什"
};

const MAP_NAMES: Record<string, string> = {
  abyss: "深窟幽境",
  ascent: "義境空島",
  bind: "熱帶樂園",
  breeze: "天漠之峽",
  corrode: "晶蝕之地",
  fracture: "遺落境地",
  haven: "劫境之地",
  icebox: "極地寒港",
  lotus: "蓮華古城",
  pearl: "深海遺珠",
  split: "雙塔迷城",
  summit: "頂峰亭閣",
  sunset: "日落之城"
};

const REGION_NAMES: Record<string, string> = {
  americas: "美洲",
  emea: "歐洲、中東與非洲",
  pacific: "太平洋",
  china: "中國"
};

const normalizeGameName = (value: string): string => (
  value.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "")
);

export const formatAgentName = (value: string | null): string => {
  if (value === null || value.trim() === "") {
    return "尚無資料";
  }

  return AGENT_NAMES[normalizeGameName(value)] ?? value;
};

export const formatMapName = (value: string | null): string => {
  if (value === null || value.trim() === "") {
    return "尚無資料";
  }

  return MAP_NAMES[normalizeGameName(value)] ?? value;
};

export const formatRegionName = (value: string | null): string => {
  if (value === null || value.trim() === "") {
    return "尚無資料";
  }

  return REGION_NAMES[normalizeGameName(value)] ?? value;
};