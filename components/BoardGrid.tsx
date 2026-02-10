
import React from 'react';
import { QiMenBoard } from '../types';
import { GRID_LAYOUT } from '../constants';

interface BoardGridProps {
  board: QiMenBoard;
}

const BoardGrid: React.FC<BoardGridProps> = ({ board }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-orange-950/10 border border-orange-900/20 p-4 rounded-xl backdrop-blur-xl ring-1 ring-orange-500/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[8px] tracking-widest font-bold uppercase">
          <div className="space-y-1">
            <span className="text-orange-900 block text-[7px]">方位映射</span>
            <span className="text-orange-500 font-black">{board.direction || '定位中'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-orange-900 block text-[7px]">真太阳时</span>
            <span className="text-slate-400">{board.trueSolarTime}</span>
          </div>
          <div className="space-y-1">
            <span className="text-orange-900 block text-[7px]">干支历法</span>
            <span className="text-slate-300 font-mono">{board.yearPillar} {board.monthPillar} {board.dayPillar} {board.hourPillar}</span>
          </div>
          <div className="space-y-1">
            <span className="text-orange-900 block text-[7px]">遁甲局数</span>
            <span className="text-orange-500">{board.isYang ? '阳' : '阴'}遁 {board.bureau} 局</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 bg-[#020617] border border-orange-950 w-full max-w-[400px] mx-auto shadow-xl shadow-orange-950/30 rounded-lg overflow-hidden ring-1 ring-orange-900/15">
        {GRID_LAYOUT.map((pIndex) => {
          const palace = board.palaces.find(p => p.index === pIndex);
          if (!palace) return null;

          const isZhiFu = palace.star === board.zhiFuStar;
          const isZhiShi = palace.gate === board.zhiShiGate;
          const isUserDirection = board.direction?.includes(palace.name.slice(0, 1));

          return (
            <div 
              key={pIndex} 
              className={`relative flex flex-col justify-between p-2 h-28 md:h-32 border border-orange-900/10 transition-all duration-500
                ${palace.isEmptiness ? 'bg-slate-950/80' : 'bg-slate-900/30'}
                ${isUserDirection ? 'bg-orange-600/10 ring-1 ring-inset ring-orange-500/25' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <span className="text-orange-800 font-black text-[8px] tracking-widest">{palace.god}</span>
                {palace.isEmptiness && <span className="text-[6px] border border-red-900 text-red-700 px-0.5 rounded-sm font-black">空</span>}
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] text-5xl font-black pointer-events-none text-orange-500">
                {palace.gua}
              </div>

              <div className="flex flex-col items-center justify-center gap-0.5 z-10">
                <span className={`text-[10px] font-black tracking-widest ${isZhiFu ? 'text-orange-400 drop-shadow-[0_0_6px_orange]' : 'text-slate-500'}`}>
                  {palace.star}
                </span>
                <div className={`px-1.5 py-0.5 rounded border ${isZhiShi ? 'bg-orange-950/50 border-orange-500/30' : 'bg-slate-950/20 border-orange-950/50'}`}>
                  <span className={`font-black text-[9px] tracking-widest ${isZhiShi ? 'text-orange-500' : 'text-slate-600'}`}>
                    {palace.gate}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-orange-900/5 pt-1 z-10">
                <span className="text-orange-600 font-black text-[10px]">{palace.heavenStem}</span>
                <div className="text-[5px] text-orange-900/50 font-black flex flex-col items-center uppercase">
                  <span>{palace.gua}</span>
                </div>
                <span className="text-orange-900/40 font-black text-[10px]">{palace.earthStem}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardGrid;
