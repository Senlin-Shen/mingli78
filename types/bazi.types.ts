
export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Branch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

export interface Pillar {
  stem: Stem;
  branch: Branch;
  shiShen: string; // 十神
  hiddenStems: { stem: Stem; shiShen: string }[]; // 藏干及其十神
}

export interface DaYun {
  age: number;
  year: number;
  stem: Stem;
  branch: Branch;
}

export interface BaziResultData {
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  dayMasterElement: string;
  daYun: DaYun[];
  startAge: number; // 起运岁数
  solarTerm: string;
  trueSolarTime: string;
}
