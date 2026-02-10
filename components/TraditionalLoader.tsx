
import React, { useState, useEffect } from 'react';

const PROGRESS_STAGES = [
  "甲子启航，时空落位",
  "六仪排布，奇门定局",
  "中宫运化，五行流转",
  "星神交错，吉凶渐现",
  "全息建模，乾坤落定"
];

const TraditionalLoader: React.FC = () => {
  const [seconds, setSeconds] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const idx = Math.min(Math.floor(seconds / 5), PROGRESS_STAGES.length - 1);
    setStageIdx(idx);
  }, [seconds]);

  // 模拟古代计时：1刻 = 15分钟，此处为显示效果，1秒模拟1刻
  const ke = (seconds % 4) + 1;
  const shichen = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][Math.floor(seconds / 4) % 12];

  return (
    <section className="frosted-glass p-12 rounded-[3rem] flex flex-col items-center justify-center gap-8 min-h-[300px] relative overflow-hidden">
      {/* 旋转罗盘背景 */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <div className="w-[400px] h-[400px] border-2 border-dashed border-logic-blue rounded-full animate-[spin_60s_linear_infinite]"></div>
      </div>

      <div className="relative">
        {/* 核心动态圆环 */}
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="44"
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            className="text-slate-800"
          />
          <circle
            cx="48"
            cy="48"
            r="44"
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            strokeDasharray="276"
            strokeDashoffset={276 - (seconds * 10 % 276)}
            className="text-logic-blue transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-logic-blue text-xl font-black qimen-font">{shichen}</span>
          <span className="text-[8px] text-slate-500 font-bold uppercase">{ke}刻</span>
        </div>
      </div>

      <div className="text-center space-y-3 z-10">
        <p className="text-[11px] text-logic-blue font-black tracking-[0.5em] animate-pulse">
          {PROGRESS_STAGES[stageIdx]}
        </p>
        <div className="flex items-center justify-center gap-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-800"></div>
          <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">
            Elapsed: {Math.floor(seconds / 60).toString().padStart(2, '0')}:{ (seconds % 60).toString().padStart(2, '0') }
          </p>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-800"></div>
        </div>
      </div>
    </section>
  );
};

export default TraditionalLoader;
