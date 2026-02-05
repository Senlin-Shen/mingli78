
export type PredictionType = 'SHI_JU' | 'MING_JU';

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
  targetTime: string;
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
