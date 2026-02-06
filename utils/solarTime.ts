
/**
 * 根据经度计算真太阳时
 * 北京时间 (UTC+8) 基准为 120°E
 * 每偏离 1 度，时间偏差 4 分钟
 */
export const calculateTrueSolarTime = (date: Date, longitude: number = 120): Date => {
  const offsetMinutes = (longitude - 120) * 4;
  return new Date(date.getTime() + offsetMinutes * 60000);
};

export const getLongitudeFromPlace = (place: string): number => {
  // 简单模拟常用城市经度，实战中可接入地图API
  if (place.includes('上海')) return 121.47;
  if (place.includes('广州')) return 113.27;
  if (place.includes('成都')) return 104.06;
  if (place.includes('北京')) return 116.40;
  if (place.includes('新疆')) return 87.61;
  return 120; // 默认北京时间
};
