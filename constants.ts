
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
    id: 'business',
    label: '商业决策',
    templates: [
      '近期计划投资某新能源项目，其利润潜力(生门)与本金安全(戊)如何？',
      '公司准备发布新产品，当前市场需求(时干)是否旺盛？',
      '即将进行关键商业谈判，选择什么方位(宫位)和时辰能增加成功率？'
    ]
  },
  {
    id: 'career',
    label: '事业项目',
    templates: [
      '项目启动时机(乙奇临值符)是否合适？',
      '当前团队协作(宫位生克)是否存在隐患？',
      '晋升机会(开门)在何时出现？'
    ]
  },
  {
    id: 'love',
    label: '情感关系',
    templates: [
      '与伴侣近期出现隔阂，如何通过环境布局(六合/乙庚合)化解？',
      '当下的感情走向如何，是否存在竞争者(庚金)？'
    ]
  },
  {
    id: 'health',
    label: '健康管理',
    templates: [
      '近期感觉体能下降，天芮星落宫提示哪些潜在风险？',
      '寻求良医(天心星)的方向在何处？'
    ]
  }
];
