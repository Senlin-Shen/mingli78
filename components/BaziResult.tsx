
import React from 'react';
import { BaziResultData, Pillar } from '../types/bazi.types';

interface BaziResultProps {
  data: BaziResultData;
}

const BaziResult: React.FC<BaziResultProps> = ({ data }) => {
  const renderPillar = (label: string, pillar: Pillar) => (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] text-emerald-800 font-black mb-0.5 uppercase tracking-widest">{label}</span>
      <div className="bg-slate-900/60 border border-slate-800/50 p-3 rounded-xl flex flex-col items-center w-full min-w-[70px] shadow-sm">
        <span className="text-[8px] text-rose-500/80 mb-1 font-bold">{pillar.shiShen}</span>
        <span className="text-xl font-black text-slate-100 mb-1">{pillar.stem}</span>
        <span className="text-xl font-black text-slate-100 mb-1">{pillar.branch}</span>
        <div className="flex flex-col gap-0.5 mt-1.5 border-t border-slate-800/50 w-full pt-1.5">
          {pillar.hiddenStems.map((h, i) => (
            <div key={i} className="flex justify-between text-[7px] px-1 font-medium">
              <span className="text-slate-500">{h.stem}</span>
              <span className="text-emerald-800/80">{h.shiShen}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <div className="grid grid-cols-4 gap-3">
        {renderPillar("年柱", data.pillars.year)}
        {renderPillar("月柱", data.pillars.month)}
        {renderPillar("日柱", data.pillars.day)}
        {renderPillar("时柱", data.pillars.hour)}
      </div>
      
      <div className="bg-slate-950/40 p-4 rounded-2xl border border-rose-950/15">
        <h4 className="text-[9px] text-rose-500 font-black mb-4 tracking-widest uppercase flex items-center gap-1.5">
          <span className="w-0.5 h-2.5 bg-rose-500 rounded-full"></span>
          大运流转轨迹
        </h4>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {data.daYun.map((dy, i) => (
            <div key={i} className="flex flex-col items-center bg-slate-900/30 p-2 rounded-lg border border-slate-800/30">
              <span className="text-[7px] text-slate-600 mb-0.5">{dy.age}岁</span>
              <span className="text-[11px] font-black text-rose-400/90">{dy.stem}{dy.branch}</span>
              <span className="text-[7px] text-slate-700 mt-0.5">{dy.year}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BaziResult;
