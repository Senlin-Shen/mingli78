
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const STARS = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
export const GATES = ['休门', '死门', '伤门', '杜门', '中门', '开门', '惊门', '生门', '景门'];
export const GODS = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];

export const PALACE_INFO: Record<number, { name: string; element: string; gua: string }> = {
  1: { name: '坎一宫', element: '水', gua: '坎' },
  2: { name: '坤二宫', element: '土', gua: '坤' },
  3: { name: '震三宫', element: '木', gua: '震' },
  4: { name: '巽四宫', element: '木', gua: '巽' },
  5: { name: '中五宫', element: '土', gua: '中' },
  6: { name: '乾六宫', element: '金', gua: '乾' },
  7: { name: '兑七宫', element: '金', gua: '兑' },
  8: { name: '艮八宫', element: '土', gua: '艮' },
  9: { name: '离九宫', element: '火', gua: '离' }
};

export const GRID_LAYOUT = [4, 9, 2, 3, 5, 7, 8, 1, 6];

export const SCENARIOS = [
  {
    id: 'investment',
    label: '投资决策',
    templates: [
      '当前市场趋势如何，某新兴产业的资金动向是否利好？',
      '近期有大笔资金进场意图，从奇门局看当下的投资时机如何？'
    ]
  },
  {
    id: 'career',
    label: '事业创业',
    templates: [
      '项目处于什么阶段，应静守还是发力？',
      '职业晋升路径是否存在阻碍，领导层的态度及变动如何？'
    ]
  }
];

export const YI_LOGIC_SCENARIOS = [
  {
    id: 'liuyao',
    label: '六爻演化',
    templates: [
      '手动起卦：[此处填入卦象，如：乾为天化天风姤]，求测近期财运走势。',
      '报数起卦：数字 [7, 8, 3]，求问此项合同签约能否顺利达成？',
      '现状研讨：目前面临某某选择困难，请以此时空起卦分析变量。'
    ]
  },
  {
    id: 'bazi',
    label: '四柱气象',
    templates: [
      '乾造：[1988年 10月 10日 10时]，分析全局气象及职业定位方案。',
      '坤造：[1995年 5月 20日 14时]，分析目前大运流年的能量盈缺。',
      '健康专项：分析八字全局五行过盈状态及脏腑调理重点。'
    ]
  }
];
