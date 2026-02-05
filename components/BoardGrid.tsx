
import React from 'react';
import { QiMenBoard } from '../types';
import { GRID_LAYOUT } from '../constants';

interface BoardGridProps {
  board: QiMenBoard;
}

const BoardGrid: React.FC<BoardGridProps> = ({ board }) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-inner">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[10px] tracking-widest font-bold">
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px]">公历时空</span>
            <span className="text-slate-300">{board.targetTime}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px]">当季节气</span>
            <span className="text-amber-500">{board.solarTerm}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px]">干支四柱</span>
            <span className="text-slate-300">{board.yearPillar} {board.monthPillar} {board.dayPillar} {board.hourPillar}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px]">局数理法</span>
            <span className="text-amber-400">{board.isYang ? '阳' : '阴'}遁 {board.bureau} 局</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 bg-[#020617] border border-amber-900/30 w-full max-w-[480px] mx-auto shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden ring-4 ring-slate-900/50">
        {GRID_LAYOUT.map((pIndex) => {
          const palace = board.palaces.find(p => p.index === pIndex);
          if (!palace) return null;

          const isZhiFu = palace.star === board.zhiFuStar;
          const isZhiShi = palace.gate === board.zhiShiGate;

          return (
            <div 
              key={pIndex} 
              className={`relative flex flex-col justify-between p-4 h-40 md:h-44 border border-amber-900/10 transition-colors duration-500
                ${palace.isEmptiness ? 'bg-slate-950/80 grayscale-[0.3]' : 'bg-slate-900/40'}
                ${isZhiFu ? 'ring-1 ring-inset ring-amber-500/20' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <span className="text-indigo-400/80 font-black text-[11px] tracking-widest">{palace.god}</span>
                <div className="flex gap-1.5">
                  {palace.isEmptiness && <span className="text-[9px] bg-red-950/80 text-red-500 px-1.5 py-0.5 rounded border border-red-900/50 font-black">空</span>}
                  {palace.isMaXing && <span className="text-[9px] bg-amber-950/80 text-amber-500 px-1.5 py-0.5 rounded border border-amber-900/50 font-black">马</span>}
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-7xl font-black pointer-events-none select-none text-amber-500 qimen-font">
                {palace.gua}
              </div>

              <div className="flex flex-col items-center justify-center gap-2 z-10">
                <span className={`text-[15px] font-black tracking-widest transition-all
                  ${isZhiFu ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-slate-400'}
                `}>
                  {palace.star}
                </span>
                <div className={`px-4 py-1.5 rounded-lg border transition-all
                  ${isZhiShi ? 'bg-amber-950/50 border-amber-500/40 shadow-lg' : 'bg-slate-950/50 border-slate-800'}
                `}>
                  <span className={`font-black text-sm tracking-[0.3em]
                    ${isZhiShi ? 'text-amber-500' : 'text-green-600'}
                  `}>
                    {palace.gate}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-800/40 pt-2.5 z-10">
                <div className="flex flex-col items-center group">
                  <span className="text-red-600 font-black text-base leading-none group-hover:scale-110 transition-transform">{palace.heavenStem}</span>
                </div>
                <div className="flex flex-col items-center opacity-30 text-[8px] font-black text-slate-500 leading-none pb-0.5 tracking-tighter uppercase">
                  <span>{palace.gua}宫</span>
                  <span>{palace.element}</span>
                </div>
                <div className="flex flex-col items-center group">
                  <span className="text-blue-500/80 font-black text-base leading-none group-hover:scale-110 transition-transform">{palace.earthStem}</span>
                </div>
              </div>
              <span className="absolute bottom-1 right-1.5 text-[7px] text-slate-800 font-mono font-black">{pIndex}</span>
            </div>
          );
        })}
      </div>
      
      <div className="text-[10px] text-slate-600 text-center leading-loose tracking-widest px-10">
        <span className="text-amber-500/60">值符：{board.zhiFuStar}</span> 巡首落 {board.palaces.find(p => p.star === board.zhiFuStar)?.name} | 
        <span className="text-amber-500/60 pl-4">值使：{board.zhiShiGate}</span> 枢机落 {board.palaces.find(p => p.gate === board.zhiShiGate)?.name}
        <br/>
        <span className="opacity-40 italic font-light">正统奇门理法体系 · 豆包大模型实战版</span>
      </div>
    </div>
  );
};

export default BoardGrid;
