
import React from 'react';
import { BaziResultData, Pillar } from '../types/bazi.types';

interface BaziResultProps {
  data: BaziResultData;
}

const BaziResult: React.FC<BaziResultProps> = ({ data }) => {
  const renderPillar = (label: string, pillar: Pillar) => (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] text-emerald-800 font-black mb-1">{label}</span>
      <div className="bg-slate-900/60 border border-slate-800/50 p-4 rounded-2xl flex flex-col items-center w-full min-w-[80px]">
        <span className="text-[10px] text-rose-500 mb-1">{pillar.shiShen}</span>
        <span className="text-3xl font-black text-slate-100 mb-2">{pillar.stem}</span>
        <span className="text-3xl font-black text-slate-100 mb-2">{pillar.branch}</span>
        <div className="flex flex-col gap-1 mt-2 border-t border-slate-800 w-full pt-2">
          {pillar.hiddenStems.map((h, i) => (
            <div key={i} className="flex justify-between text-[8px] px-1">
              <span className="text-slate-500">{h.stem}</span>
              <span className="text-emerald-700">{h.shiShen}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-4 gap-4">
        {renderPillar("年柱", data.pillars.year)}
        {renderPillar("月柱", data.pillars.month)}
        {renderPillar("日柱", data.pillars.day)}
        {renderPillar("时柱", data.pillars.hour)}
      </div>
      
      <div className="bg-slate-950/40 p-6 rounded-3xl border border-rose-950/20">
        <h4 className="text-[11px] text-rose-500 font-black mb-6 tracking-widest uppercase flex items-center gap-2">
          <span className="w-1 h-3 bg-rose-500 rounded-full"></span>
          大运流转轨迹
        </h4>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {data.daYun.map((dy, i) => (
            <div key={i} className="flex flex-col items-center bg-slate-900/30 p-3 rounded-xl border border-slate-800/40">
              <span className="text-[9px] text-slate-500 mb-1">{dy.age}岁起</span>
              <span className="text-sm font-black text-rose-400">{dy.stem}{dy.branch}</span>
              <span className="text-[8px] text-slate-600 mt-1">{dy.year}年</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BaziResult;
