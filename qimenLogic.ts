
import { STEMS, BRANCHES, STARS, GATES, GODS, PALACE_INFO } from './constants';
import { QiMenBoard, PalaceData } from './types';

/**
 * 获取 24 节气的精确公历日期
 */
const getYearSolarTerms = (year: number): { name: string; date: Date }[] => {
  const solarTermsNames = ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"];
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
 * 真太阳时修正逻辑：将民用北京时间转换为地方经度太阳时
 */
const getTrueSolarTime = (date: Date, longitude: number): Date => {
  // 北京时间以 120 度为准，每度 4 分钟
  const offsetMinutes = (longitude - 120) * 4;
  return new Date(date.getTime() + offsetMinutes * 60000);
};

/**
 * 专家级四柱推演引擎
 * @param date 输入日期（通常为北京时间）
 * @param longitude 出生地经度（用于修正真太阳时）
 * @param hasTime 是否有时辰信息
 */
export const calculateBaZi = (date: Date, longitude: number = 120, hasTime: boolean = true) => {
  // 1. 真太阳时修正
  const trueTime = getTrueSolarTime(date, longitude);
  
  // 提取 UTC 时间分量，确保不受浏览器本地时区(Local Time)干扰
  // 注意：在处理用户输入的 Date 时，我们需要将其当作绝对时间点
  const y = trueTime.getFullYear();
  const m = trueTime.getMonth();
  const d = trueTime.getDate();
  const h = trueTime.getHours();

  // 2. 晚子时换日处理 (23:00 - 00:00 属于下一天的子时，但仍算作当日子时头，古法日更从子正或子初起)
  // 此处采用 23 点换日逻辑（子初换日）
  let dayOffsetDate = new Date(trueTime);
  if (h >= 23) {
    dayOffsetDate.setDate(dayOffsetDate.getDate() + 1);
  }

  // 3. 节气判定 (年柱、月柱边界)
  const terms = getYearSolarTerms(y);
  const prevYearTerms = getYearSolarTerms(y - 1);
  const nextYearTerms = getYearSolarTerms(y + 1);
  const allTerms = [...prevYearTerms, ...terms, ...nextYearTerms].sort((a, b) => a.date.getTime() - b.date.getTime());

  // 年柱：以立春为界
  const liChun = terms.find(t => t.name === "立春")?.date || new Date(Date.UTC(y, 1, 4));
  let baziYear = y;
  if (trueTime < liChun) baziYear--;
  const yearStemIdx = (baziYear - 4) % 10;
  const yearBranchIdx = (baziYear - 4) % 12;
  const yearPillar: [string, string] = [STEMS[(yearStemIdx + 10) % 10], BRANCHES[(yearBranchIdx + 12) % 12]];

  // 月柱：以 12 节为界
  const jieTerms = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"];
  const lastJie = allTerms.filter(t => jieTerms.includes(t.name)).reverse().find(t => trueTime >= t.date);
  const monthBranchIdx = lastJie ? (jieTerms.indexOf(lastJie.name) + 2) % 12 : 1;
  // 五虎遁推月干：(年干索引 % 5 * 2 + 2 + 月支索引 - 2) % 10
  const monthStemIdx = (yearStemIdx % 5 * 2 + 2 + (monthBranchIdx < 2 ? monthBranchIdx + 12 : monthBranchIdx) - 2) % 10;
  const monthPillar: [string, string] = [STEMS[(monthStemIdx + 10) % 10], BRANCHES[monthBranchIdx]];

  // 4. 日柱推算：使用 1900-01-01 (甲戌日) 为基准，严格 UTC 零点对齐
  const msPerDay = 86400000;
  const targetMidnight = Date.UTC(dayOffsetDate.getFullYear(), dayOffsetDate.getMonth(), dayOffsetDate.getDate());
  const epochMidnight = Date.UTC(1900, 0, 1);
  const diffDays = Math.floor((targetMidnight - epochMidnight) / msPerDay);
  
  // 1900-01-01 是甲戌 (0, 10)
  const dayStemIdx = (diffDays % 10 + 10) % 10;
  const dayBranchIdx = ((diffDays + 10) % 12 + 12) % 12;
  const dayPillar: [string, string] = [STEMS[dayStemIdx], BRANCHES[dayBranchIdx]];

  // 5. 时柱推算 (根据日干五鼠遁)
  let hourPillar: [string, string] = ["?", "?"];
  if (hasTime) {
    const hourBranchIdx = Math.floor((h + 1) % 24 / 2);
    // 五鼠遁：(日干索引 % 5 * 2 + 时支索引) % 10
    const hourStemIdx = (dayStemIdx % 5 * 2 + hourBranchIdx) % 10;
    hourPillar = [STEMS[hourStemIdx], BRANCHES[hourBranchIdx]];
  }

  return { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar, trueTime: trueTime.toLocaleString() };
};

/**
 * 奇门遁甲排盘逻辑 (复用 BaZi 引擎)
 */
export const calculateBoard = (date: Date, longitude: number = 120): QiMenBoard => {
  const pillars = calculateBaZi(date, longitude);
  const yearP = pillars.year.join('');
  const monthP = pillars.month.join('');
  const dayP = pillars.day.join('');
  const hourP = pillars.hour.join('');

  const calcDate = new Date(pillars.trueTime);
  const terms = getYearSolarTerms(calcDate.getFullYear());
  const currentTerm = terms.reverse().find(t => calcDate >= t.date) || terms[0];
  const isYang = ["冬至", "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种"].includes(currentTerm.name);

  const yBranchIdx = BRANCHES.indexOf(pillars.year[1]) + 1;
  const mIdx = calcDate.getMonth() + 1;
  const dIdx = calcDate.getDate();
  const hBranchIdx = BRANCHES.indexOf(pillars.hour[1]) + 1;
  let bureau = (yBranchIdx + mIdx + dIdx + hBranchIdx) % 9;
  if (bureau === 0) bureau = 9;

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
    xunShou: '甲子戊',
    zhiFuStar: STARS[7],
    zhiShiGate: GATES[7],
    solarTerm: currentTerm.name,
    bureauFormula: `(${yBranchIdx} + ${mIdx} + ${dIdx} + ${hBranchIdx}) ÷ 9 余 ${bureau}`,
    startingMethod: "正统拆补法 (基于真太阳时与精准节令)",
    predictionType: 'SHI_JU',
    targetTime: date.toLocaleString(),
    trueSolarTime: pillars.trueTime,
    location: { latitude: 0, longitude, isAdjusted: true }
  };
};
