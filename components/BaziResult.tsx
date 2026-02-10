
import React from 'react';
import { BaziResultData, Pillar } from '../types/bazi.types';

interface BaziResultProps {
  data: BaziResultData;
}

const BaziResult: React.FC<BaziResultProps> = ({ data }) => {
  const renderPillar = (label: string, pillar: Pillar) => (
    <div className="flex flex-col items-center gap-1 border-r border-emerald-950/30 last:border-r-0 py-2">
      <span className="text-[7px] text-emerald-900/60 font-black mb-1 tracking-widest uppercase">{label}</span>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[8px] text-rose-500/70 font-bold">{pillar.shiShen}</span>
        <div className="flex flex-col items-center leading-none">
          <span className="text-xl md:text-2xl font-black text-slate-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{pillar.stem}</span>
          <span className="text-xl md:text-2xl font-black text-slate-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{pillar.branch}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-1 mt-2 px-1 max-w-full">
          {pillar.hiddenStems.map((h, i) => (
            <span key={i} className="text-[6px] text-slate-500 border border-slate-800/50 px-1 rounded-sm">
              {h.stem}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-[400px] mx-auto">
      {/* 顶部元数据区 - 参考奇门设计 */}
      <div className="bg-emerald-950/10 border border-emerald-900/20 p-3 rounded-xl backdrop-blur-xl ring-1 ring-emerald-500/5">
        <div className="grid grid-cols-2 gap-3 text-[8px] tracking-widest font-bold uppercase">
          <div className="space-y-1">
            <span className="text-emerald-900 block text-[7px]">真太阳时</span>
            <span className="text-slate-400 truncate">{data.trueSolarTime}</span>
          </div>
          <div className="space-y-1">
            <span className="text-emerald-900 block text-[7px]">当前气象</span>
            <span className="text-rose-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-rose-500 rounded-full animate-pulse"></span>
              碧海命理 · 气象排盘
            </span>
          </div>
        </div>
      </div>
      
      {/* 核心排盘网格 */}
      <div className="bg-[#020617] border border-emerald-950 shadow-xl shadow-emerald-950/30 rounded-lg overflow-hidden ring-1 ring-emerald-900/15">
        <div className="grid grid-cols-4">
          {renderPillar("年柱", data.pillars.year)}
          {renderPillar("月柱", data.pillars.month)}
          {renderPillar("日柱", data.pillars.day)}
          {renderPillar("时柱", data.pillars.hour)}
        </div>
      </div>

      {/* 大运简述区 */}
      <div className="bg-slate-950/40 p-3 rounded-xl border border-rose-950/15">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-0.5 h-2.5 bg-rose-500 rounded-full"></span>
          <span className="text-[8px] text-rose-500 font-black tracking-widest uppercase">大运轨道 · LIFE PATH</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
          {data.daYun.slice(0, 8).map((dy, i) => (
            <div key={i} className="flex flex-col items-center bg-slate-900/30 p-1.5 rounded-lg border border-slate-800/30">
              <span className="text-[6px] text-slate-600 mb-0.5">{dy.age}岁</span>
              <span className="text-[10px] font-black text-emerald-400/90 leading-tight">{dy.stem}{dy.branch}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BaziResult;
