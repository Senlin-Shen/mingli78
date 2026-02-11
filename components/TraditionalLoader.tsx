
import React, { useState, useEffect } from 'react';

const PROGRESS_STAGES = [
  "甲子发端，时空落位...",
  "六仪布阵，奇门定局...",
  "中宫运化，五行转轮...",
  "星神汇聚，吉凶初现...",
  "全息建模，乾坤落定..."
];

const SHICHEN_ANIMALS: Record<string, string> = {
  "子": "鼠", "丑": "牛", "寅": "虎", "卯": "兔", "辰": "龙", "巳": "蛇",
  "午": "马", "未": "羊", "申": "猴", "酉": "鸡", "戌": "狗", "亥": "猪"
};

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

  // 模拟古代漏刻计时：每当时辰前进，仪式感递增
  const ke = (seconds % 8) + 1;
  const shichenNames = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const shichen = shichenNames[Math.floor(seconds / 8) % 12];

  return (
    <section className="frosted-glass p-16 rounded-[4rem] flex flex-col items-center justify-center gap-10 min-h-[400px] relative overflow-hidden border border-logic-blue/20 shadow-2xl">
      {/* 动态两仪光影 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-logic-blue/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')] opacity-5"></div>
      </div>

      {/* 核心罗盘计时器 */}
      <div className="relative z-10">
        <div className="absolute inset-0 rounded-full border border-logic-blue/10 animate-[spin_12s_linear_infinite]"></div>
        <div className="absolute -inset-6 rounded-full border border-dashed border-slate-700/20 animate-[spin_40s_linear_infinite_reverse]"></div>
        
        <div className="w-36 h-36 rounded-full bg-slate-950 flex flex-col items-center justify-center border-2 border-slate-800 shadow-[0_0_60px_rgba(56,189,248,0.15)] relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-logic-blue rounded-full shadow-[0_0_10px_#38bdf8]"></div>
          
          <div className="flex flex-col items-center gap-1">
            <span className="text-logic-blue text-5xl font-black qimen-font drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]">
              {shichen}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter">
                {SHICHEN_ANIMALS[shichen]}时
              </span>
              <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
              <span className="text-[11px] text-slate-400 font-black">{ke}刻</span>
            </div>
          </div>
        </div>
      </div>

      {/* 文本进度流 */}
      <div className="text-center space-y-6 z-10">
        <div className="inline-block px-6 py-2 bg-slate-900/40 rounded-full border border-slate-800/50">
          <p className="text-[14px] text-logic-blue font-black tracking-[0.5em] animate-pulse drop-shadow-sm">
            {PROGRESS_STAGES[stageIdx]}
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-6">
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-600 font-mono tracking-widest uppercase">Pushing:</span>
            <span className="text-[14px] text-slate-400 font-mono font-bold tabular-nums">
              {Math.floor(seconds / 60).toString().padStart(2, '0')}
              <span className="animate-pulse mx-0.5">:</span>
              {(seconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="h-px w-16 bg-gradient-to-l from-transparent via-slate-700 to-transparent"></div>
        </div>
      </div>

      <div className="absolute bottom-8 text-[9px] text-slate-700 tracking-[0.6em] font-black uppercase opacity-50">
        Symmetric Holographic Computation Matrix
      </div>
    </section>
  );
};

export default TraditionalLoader;
