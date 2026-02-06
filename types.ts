
export type PredictionType = 'SHI_JU' | 'MING_JU';
export type AppMode = 'QIMEN' | 'YI_LOGIC';

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
  targetTime: string; 
  trueSolarTime?: string; 
  location?: LocationData;
  direction?: string; 
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

// 新增易理输入结构
export interface LiuYaoInput {
  numbers: string[];
  question: string;
}

export interface BaZiInput {
  name: string;
  gender: '男' | '女';
  birthDate: string;
  birthPlace: string;
}
