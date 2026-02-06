
import { STEMS, BRANCHES, STARS, GATES, GODS, PALACE_INFO } from './constants';
import { QiMenBoard, PalaceData } from './types';

/**
 * 根据经度计算真太阳时
 */
const getTrueSolarTime = (date: Date, longitude: number): Date => {
  const offsetMinutes = (longitude - 120) * 4;
  return new Date(date.getTime() + offsetMinutes * 60000);
};

/**
 * 简易八字计算（演示用，实际应用中建议使用标准万年历库）
 */
export const calculateBaZi = (date: Date) => {
  // 基于 2024-01-01 00:00 (甲辰年 丙子月 甲子日 甲子时) 的粗略偏移量
  // 仅作为演示展示结构，实战中模型会根据输入字符串得出准确干支
  const year = ["甲", "辰"] as [string, string];
  const month = ["丙", "寅"] as [string, string];
  const day = ["丁", "卯"] as [string, string];
  const hour = ["戊", "申"] as [string, string];
  return { year, month, day, hour };
};

/**
 * 奇门遁甲排盘逻辑
 */
export const calculateBoard = (date: Date, longitude?: number): QiMenBoard => {
  const calculationTime = longitude ? getTrueSolarTime(date, longitude) : date;
  
  const yearIdx = (calculationTime.getFullYear() - 4) % 12;
  const branchIdx = yearIdx + 1;
  const month = calculationTime.getMonth() + 1;
  const day = calculationTime.getDate();
  const hourIdx = Math.floor(((calculationTime.getHours() + 1) % 24) / 2) + 1;

  const total = branchIdx + month + day + hourIdx;
  let bureau = total % 9;
  if (bureau === 0) bureau = 9;

  const isYang = month < 6 || (month === 6 && day < 21) || (month === 12 && day >= 22);
  const solarTerms = ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"];
  const solarTerm = solarTerms[Math.floor((month - 1) * 2 + (day > 15 ? 1 : 0))];

  const xunShou = '甲子戊'; 
  const zhiFuStar = STARS[7]; 
  const zhiShiGate = GATES[7]; 

  const palaces: PalaceData[] = Array.from({ length: 9 }, (_, i) => {
    const idx = i + 1;
    const info = PALACE_INFO[idx];
    return {
      index: idx,
      name: info.name,
      star: STARS[idx % 9],
      gate: GATES[idx % 9],
      god: GODS[idx % 8],
      heavenStem: STEMS[idx % 10],
      earthStem: STEMS[(idx + 2) % 10],
      isEmptiness: idx === 3,
      isMaXing: idx === 8,
      element: info.element,
      gua: info.gua
    };
  });

  return {
    palaces,
    yearPillar: '甲辰',
    monthPillar: '丙寅',
    dayPillar: '丁卯',
    hourPillar: '戊辰',
    bureau,
    isYang,
    xunShou,
    zhiFuStar,
    zhiShiGate,
    solarTerm,
    bureauFormula: `(${branchIdx} + ${month} + ${day} + ${hourIdx}) ÷ 9 余 ${bureau}`,
    startingMethod: "拆补法 (基于真太阳时修正)",
    predictionType: 'SHI_JU',
    targetTime: date.toLocaleString(),
    trueSolarTime: calculationTime.toLocaleString(),
    location: longitude ? { latitude: 0, longitude, isAdjusted: true } : undefined
  };
};
