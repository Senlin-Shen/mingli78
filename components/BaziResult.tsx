
import React from 'react';
import { BaziResultData, Pillar } from '../types/bazi.types';

interface BaziResultProps {
  data: BaziResultData;
}

const BaziResult: React.FC<BaziResultProps> = ({ data }) => {
  const renderPillar = (label: string, pillar: Pillar) => (
    <div className="flex flex-col items-center gap-2 border-r border-slate-800/50 last:border-r-0 py-4 px-2">
      <span className="text-[8px] text-slate-500 font-bold tracking-widest uppercase">{label}</span>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] text-logic-blue font-black tracking-tighter">{pillar.shiShen}</span>
        <div className="flex flex-col items-center leading-tight">
          <span className="text-2xl md:text-3xl font-black text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{pillar.stem}</span>
          <span className="text-2xl md:text-3xl font-black text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{pillar.branch}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-1 mt-3 px-1 max-w-full">
          {pillar.hiddenStems.map((h, i) => (
            <span key={i} className="text-[7px] text-slate-400 bg-slate-950/60 border border-slate-800/40 px-1.5 py-0.5 rounded shadow-sm">
              {h.stem}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-[500px] mx-auto">
      {/* 顶部时空状态区 */}
      <div className="frosted-glass p-4 rounded-2xl ring-1 ring-slate-700/30">
        <div className="grid grid-cols-2 gap-4 text-[9px] tracking-[0.2em] font-bold uppercase">
          <div className="space-y-1.5 border-r border-slate-800/50">
            <span className="text-slate-500 block">真太阳时 LST</span>
            <span className="text-slate-200 font-mono truncate">{data.trueSolarTime}</span>
          </div>
          <div className="space-y-1.5 pl-2">
            <span className="text-slate-500 block">气象定式 STATE</span>
            <span className="text-logic-blue flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-logic-blue rounded-full shadow-[0_0_8px_#38bdf8]"></div>
              精密时空建模中
            </span>
          </div>
        </div>
      </div>
      
      {/* 核心排盘网格 */}
      <div className="bg-slate-950/80 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-slate-700/50">
        <div className="grid grid-cols-4">
          {renderPillar("年柱", data.pillars.year)}
          {renderPillar("月柱", data.pillars.month)}
          {renderPillar("日柱", data.pillars.day)}
          {renderPillar("时柱", data.pillars.hour)}
        </div>
      </div>

      {/* 大运简述区 */}
      <div className="frosted-glass p-5 rounded-2xl border border-slate-800/50">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-3 bg-logic-blue rounded-full"></div>
          <span className="text-[10px] text-slate-300 font-black tracking-[0.3em] uppercase">大运流转轨迹 · LIFE ORBIT</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {data.daYun.slice(0, 8).map((dy, i) => (
            <div key={i} className="flex flex-col items-center bg-slate-900/60 p-2 rounded-xl border border-slate-800/40 hover:border-logic-blue/40 transition-colors">
              <span className="text-[7px] text-slate-500 mb-1">{dy.age}y</span>
              <span className="text-[12px] font-black text-slate-200 leading-none">{dy.stem}</span>
              <span className="text-[12px] font-black text-slate-200 leading-none">{dy.branch}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BaziResult;
