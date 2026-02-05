
export type PredictionType = 'SHI_JU' | 'MING_JU';

export interface LocationData {
  latitude: number;
  longitude: number;
  isAdjusted: boolean;
}

export interface QiMenBoard {
  palaces: PalaceData[];
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  bureau: number;
  isYang: boolean;
  xunShou: string;
  zhiFuStar: string;
  zhiShiGate: string;
  solarTerm: string;
  bureauFormula: string;
  startingMethod: string;
  predictionType: PredictionType;
  targetTime: string; // 原始输入时间
  trueSolarTime?: string; // 修正后的真太阳时
  location?: LocationData;
  direction?: string; // 用户选择的方位
}

export interface PalaceData {
  index: number;
  name: string;
  star: string;
  gate: string;
  god: string;
  heavenStem: string;
  earthStem: string;
  isEmptiness: boolean;
  isMaXing: boolean;
  element: string;
  gua: string;
}
