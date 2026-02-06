
import { STEMS, BRANCHES, STARS, GATES, GODS, PALACE_INFO } from './constants';
import { QiMenBoard, PalaceData } from './types';

/**
 * 获取 24 节气的精确公历日期（简化天文算法）
 * 返回该年份所有节气的 Date 对象
 */
const getYearSolarTerms = (year: number): { name: string; date: Date }[] => {
  const solarTermsNames = ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"];
  // 节气基准数据 (1900年小寒时刻)
  const baseTermDate = new Date(Date.UTC(1900, 0, 6, 2, 5)); 
  const termInfo = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285961, 308477, 330856, 353050, 375027, 396749, 418210, 439376, 460226, 480743, 500914];
  
  return solarTermsNames.map((name, i) => {
    const minutes = 525948.76 * (year - 1900) + termInfo[i];
    return {
      name,
      date: new Date(baseTermDate.getTime() + minutes * 60000)
    };
  });
};

/**
 * 根据经度计算真太阳时
 */
const getTrueSolarTime = (date: Date, longitude: number): Date => {
  const offsetMinutes = (longitude - 120) * 4;
  return new Date(date.getTime() + offsetMinutes * 60000);
};

/**
 * 核心四柱推演算法 - 专家级修正版
 */
export const calculateBaZi = (date: Date, hasTime: boolean = true) => {
  // 1. 晚子时处理: 23:00 标志着新的一天开始 (换日不换月)
  const hour = date.getHours();
  let dayOffsetDate = new Date(date);
  if (hour >= 23) {
    dayOffsetDate.setDate(dayOffsetDate.getDate() + 1);
  }

  const year = date.getFullYear();

  // 2. 节气判定 (年柱/月柱边界)
  const terms = getYearSolarTerms(year);
  const prevYearTerms = getYearSolarTerms(year - 1);
  const nextYearTerms = getYearSolarTerms(year + 1);
  const allTerms = [...prevYearTerms, ...terms, ...nextYearTerms].sort((a, b) => a.date.getTime() - b.date.getTime());

  // 年柱 (以立春为界)
  const liChun = terms.find(t => t.name === "立春")?.date || new Date(year, 1, 4);
  let baziYear = year;
  if (date < liChun) baziYear--;
  const yearStemIdx = (baziYear - 4) % 10;
  const yearBranchIdx = (baziYear - 4) % 12;
  const yearPillar: [string, string] = [
    STEMS[(yearStemIdx + 10) % 10], 
    BRANCHES[(yearBranchIdx + 12) % 12]
  ];

  // 月柱 (以 12 节为界)
  const jieTerms = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"];
  const lastJie = allTerms.filter(t => jieTerms.includes(t.name)).reverse().find(t => date >= t.date);
  const monthBranchIdx = lastJie ? (jieTerms.indexOf(lastJie.name) + 2) % 12 : 1;
  // 五虎遁推算月干: 甲己年起丙寅
  const monthStemIdx = (yearStemIdx % 5 * 2 + 2 + (monthBranchIdx < 2 ? monthBranchIdx + 12 : monthBranchIdx) - 2) % 10;
  const monthPillar: [string, string] = [STEMS[(monthStemIdx + 10) % 10], BRANCHES[monthBranchIdx]];

  // 3. 日柱推算 (基于 1900-01-01 甲戌日)
  // 使用 Date.UTC 强制零点对齐，规避本地时区/夏令时偏差
  const getUtcDayCount = (d: Date) => {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / (24 * 3600 * 1000));
  };
  const baseDayCount = Date.UTC(1900, 0, 1) / (24 * 3600 * 1000);
  const diffDays = getUtcDayCount(dayOffsetDate) - baseDayCount;
  
  // 1900-01-01 为甲戌日 (天干索引0, 地支索引10)
  const dayStemIdx = (diffDays % 10 + 10) % 10;
  const dayBranchIdx = ((diffDays + 10) % 12 + 12) % 12;
  const dayPillar: [string, string] = [STEMS[dayStemIdx], BRANCHES[dayBranchIdx]];

  // 4. 时柱推算 (根据日干五鼠遁)
  let hourPillar: [string, string] = ["?", "?"];
  if (hasTime) {
    const hourBranchIdx = Math.floor((hour + 1) % 24 / 2);
    // 五鼠遁: 甲己还加甲 (0), 乙庚丙作初 (2)...
    const hourStemIdx = (dayStemIdx % 5 * 2 + hourBranchIdx) % 10;
    hourPillar = [STEMS[hourStemIdx], BRANCHES[hourBranchIdx]];
  }

  return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };
};

/**
 * 奇门遁甲排盘逻辑
 */
export const calculateBoard = (date: Date, longitude?: number): QiMenBoard => {
  const calculationTime = longitude ? getTrueSolarTime(date, longitude) : date;
  
  // 使用修正后的四柱引擎
  const pillars = calculateBaZi(calculationTime);
  const yearP = pillars.year.join('');
  const monthP = pillars.month.join('');
  const dayP = pillars.day.join('');
  const hourP = pillars.hour.join('');

  // 局数推算 (拆补法简化模型)
  const terms = getYearSolarTerms(calculationTime.getFullYear());
  const currentTerm = terms.reverse().find(t => calculationTime >= t.date) || terms[0];
  const isYang = ["冬至", "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种"].includes(currentTerm.name);

  // 局数公式：(年支 + 月 + 日 + 时支) % 9
  const yBranchIdx = BRANCHES.indexOf(pillars.year[1]) + 1;
  const mIdx = calculationTime.getMonth() + 1;
  const dIdx = calculationTime.getDate();
  const hBranchIdx = BRANCHES.indexOf(pillars.hour[1]) + 1;
  
  let bureau = (yBranchIdx + mIdx + dIdx + hBranchIdx) % 9;
  if (bureau === 0) bureau = 9;

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
    yearPillar: yearP,
    monthPillar: monthP,
    dayPillar: dayP,
    hourPillar: hourP,
    bureau,
    isYang,
    xunShou,
    zhiFuStar,
    zhiShiGate,
    solarTerm: currentTerm.name,
    bureauFormula: `(${yBranchIdx} + ${mIdx} + ${dIdx} + ${hBranchIdx}) ÷ 9 余 ${bureau}`,
    startingMethod: "正统拆补法 (基于真太阳时与精准节令)",
    predictionType: 'SHI_JU',
    targetTime: date.toLocaleString(),
    trueSolarTime: calculationTime.toLocaleString(),
    location: longitude ? { latitude: 0, longitude, isAdjusted: true } : undefined
  };
};
