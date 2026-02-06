
import { calculateBaZi } from '../qimenLogic';
import { calculateTrueSolarTime, getLongitudeFromPlace } from '../utils/solarTime';
import { Stem, Branch, BaziResultData, Pillar, DaYun } from '../types/bazi.types';
import { STEMS, BRANCHES } from '../constants';

const SHI_SHEN_MAP: Record<string, Record<string, string>> = {
  // 以日干为中心，定义其他天干的十神
  '甲': { '甲': '比肩', '乙': '劫财', '丙': '食神', '丁': '伤官', '戊': '偏财', '己': '正财', '庚': '七杀', '辛': '正官', '壬': '枭神', '癸': '正印' },
  '乙': { '乙': '比肩', '甲': '劫财', '丁': '食神', '丙': '伤官', '己': '偏财', '戊': '正财', '辛': '七杀', '庚': '正官', '癸': '枭神', '壬': '正印' },
  '丙': { '丙': '比肩', '丁': '劫财', '戊': '食神', '己': '伤官', '庚': '偏财', '辛': '正财', '壬': '七杀', '癸': '正官', '甲': '枭神', '乙': '正印' },
  '丁': { '丁': '比肩', '丙': '劫财', '己': '食神', '戊': '伤官', '辛': '偏财', '庚': '正财', '癸': '七杀', '壬': '正官', '乙': '枭神', '甲': '正印' },
  '戊': { '戊': '比肩', '己': '劫财', '庚': '食神', '辛': '伤官', '壬': '偏财', '癸': '正财', '甲': '七杀', '乙': '正官', '丙': '枭神', '丁': '正印' },
  '己': { '己': '比肩', '戊': '劫财', '辛': '食神', '庚': '伤官', '癸': '偏财', '壬': '正财', '乙': '七杀', '甲': '正官', '丁': '枭神', '丙': '正印' },
  '庚': { '庚': '比肩', '辛': '劫财', '壬': '食神', '癸': '伤官', '甲': '偏财', '乙': '正财', '丙': '七杀', '丁': '正官', '戊': '枭神', '己': '正印' },
  '辛': { '辛': '比肩', '庚': '劫财', '癸': '食神', '壬': '伤官', '乙': '偏财', '甲': '正财', '丁': '七杀', '丙': '正官', '己': '枭神', '戊': '正印' },
  '壬': { '壬': '比肩', '癸': '劫财', '甲': '食神', '乙': '伤官', '丙': '偏财', '丁': '正财', '戊': '七杀', '己': '正官', '庚': '枭神', '辛': '正印' },
  '癸': { '癸': '比肩', '壬': '劫财', '乙': '食神', '甲': '伤官', '丁': '偏财', '丙': '正财', '己': '七杀', '戊': '正官', '辛': '枭神', '庚': '正印' },
};

const HIDDEN_STEMS: Record<Branch, Stem[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
  '辰': ['戊', '乙', '癸'], '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
};

export const useBazi = () => {
  const getBaziResult = (birthDate: string, birthTime: string, place: string, gender: '男' | '女'): BaziResultData => {
    const lng = getLongitudeFromPlace(place);
    const dateObj = new Date(`${birthDate} ${birthTime || '12:00'}`);
    const bazi = calculateBaZi(dateObj, lng);
    
    const dayMaster = bazi.day[0] as Stem;
    
    const createPillar = (p: [string, string]): Pillar => {
      const stem = p[0] as Stem;
      const branch = p[1] as Branch;
      return {
        stem,
        branch,
        shiShen: SHI_SHEN_MAP[dayMaster][stem] || '日主',
        hiddenStems: HIDDEN_STEMS[branch].map(s => ({
          stem: s,
          shiShen: SHI_SHEN_MAP[dayMaster][s]
        }))
      };
    };

    const pillars = {
      year: createPillar(bazi.year),
      month: createPillar(bazi.month),
      day: createPillar(bazi.day),
      hour: createPillar(bazi.hour)
    };

    // 大运逻辑：阳男阴女顺排，阴男阳女逆排
    const isYangYear = STEMS.indexOf(pillars.year.stem) % 2 === 0;
    const isForward = (gender === '男' && isYangYear) || (gender === '女' && !isYangYear);
    
    const daYun: DaYun[] = [];
    let currentStemIdx = STEMS.indexOf(pillars.month.stem);
    let currentBranchIdx = BRANCHES.indexOf(pillars.month.branch);

    for (let i = 1; i <= 8; i++) {
      if (isForward) {
        currentStemIdx = (currentStemIdx + 1) % 10;
        currentBranchIdx = (currentBranchIdx + 1) % 12;
      } else {
        currentStemIdx = (currentStemIdx - 1 + 10) % 10;
        currentBranchIdx = (currentBranchIdx - 1 + 12) % 12;
      }
      daYun.push({
        age: i * 10, // 简化起运计算，实战中需根据节气距离计算精确起运岁数
        year: dateObj.getFullYear() + i * 10,
        stem: STEMS[currentStemIdx] as Stem,
        branch: BRANCHES[currentBranchIdx] as Branch
      });
    }

    return {
      pillars,
      dayMasterElement: dayMaster,
      daYun,
      startAge: 3, // 示例起运岁数
      solarTerm: '计算中...',
      trueSolarTime: bazi.trueTime
    };
  };

  return { getBaziResult };
};
