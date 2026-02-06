
import React from 'react';
import { QiMenBoard } from '../types';
import { GRID_LAYOUT } from '../constants';

interface BoardGridProps {
  board: QiMenBoard;
}

const BoardGrid: React.FC<BoardGridProps> = ({ board }) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="bg-orange-950/10 border border-orange-900/20 p-5 rounded-2xl backdrop-blur-xl ring-1 ring-orange-500/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[9px] tracking-widest font-bold uppercase">
          <div className="space-y-1">
            <span className="text-orange-900 block text-[8px]">方位映射</span>
            <span className="text-orange-500 font-black">{board.direction || '定位中'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-orange-900 block text-[8px]">真太阳时</span>
            <span className="text-slate-400">{board.trueSolarTime}</span>
          </div>
          <div className="space-y-1">
            <span className="text-orange-900 block text-[8px]">干支历法</span>
            <span className="text-slate-300 font-mono">{board.yearPillar} {board.monthPillar} {board.dayPillar} {board.hourPillar}</span>
          </div>
          <div className="space-y-1">
            <span className="text-orange-900 block text-[8px]">遁甲局数</span>
            <span className="text-orange-500">{board.isYang ? '阳' : '阴'}遁 {board.bureau} 局</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 bg-[#020617] border border-orange-950 w-full max-w-[480px] mx-auto shadow-2xl shadow-orange-950/40 rounded-xl overflow-hidden ring-1 ring-orange-900/20">
        {GRID_LAYOUT.map((pIndex) => {
          const palace = board.palaces.find(p => p.index === pIndex);
          if (!palace) return null;

          const isZhiFu = palace.star === board.zhiFuStar;
          const isZhiShi = palace.gate === board.zhiShiGate;
          const isUserDirection = board.direction?.includes(palace.name.slice(0, 1));

          return (
            <div 
              key={pIndex} 
              className={`relative flex flex-col justify-between p-3 h-36 md:h-40 border border-orange-900/10 transition-all duration-700
                ${palace.isEmptiness ? 'bg-slate-950/80' : 'bg-slate-900/30'}
                ${isUserDirection ? 'bg-orange-600/10 ring-1 ring-inset ring-orange-500/30' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <span className="text-orange-800 font-black text-[9px] tracking-widest">{palace.god}</span>
                {palace.isEmptiness && <span className="text-[7px] border border-red-900 text-red-700 px-1 rounded-sm font-black">空</span>}
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-7xl font-black pointer-events-none text-orange-500">
                {palace.gua}
              </div>

              <div className="flex flex-col items-center justify-center gap-1 z-10">
                <span className={`text-[11px] font-black tracking-widest ${isZhiFu ? 'text-orange-400 drop-shadow-[0_0_8px_orange]' : 'text-slate-500'}`}>
                  {palace.star}
                </span>
                <div className={`px-2 py-0.5 rounded border ${isZhiShi ? 'bg-orange-950/50 border-orange-500/40' : 'bg-slate-950/30 border-orange-950'}`}>
                  <span className={`font-black text-[10px] tracking-[0.2em] ${isZhiShi ? 'text-orange-500' : 'text-slate-600'}`}>
                    {palace.gate}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-orange-900/10 pt-1.5 z-10">
                <span className="text-orange-600 font-black text-xs">{palace.heavenStem}</span>
                <div className="text-[6px] text-orange-900 font-black flex flex-col items-center uppercase">
                  <span>{palace.gua}</span>
                </div>
                <span className="text-orange-900/60 font-black text-xs">{palace.earthStem}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardGrid;
