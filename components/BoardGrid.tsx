
import React from 'react';
import { QiMenBoard } from '../types';
import { GRID_LAYOUT } from '../constants';

interface BoardGridProps {
  board: QiMenBoard;
}

const BoardGrid: React.FC<BoardGridProps> = ({ board }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900/20 border border-slate-800/30 p-4 rounded-xl backdrop-blur-xl ring-1 ring-white/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[8px] tracking-widest font-bold uppercase">
          <div className="space-y-1">
            <span className="text-slate-600 block text-[7px]">方位映射 DIRECTION</span>
            <span className="text-logic-blue font-black">{board.direction || '定位中'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[7px]">真太阳时 LST</span>
            <span className="text-slate-400">{board.trueSolarTime}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[7px]">干支历法 PILLARS</span>
            <span className="text-slate-300 font-mono">{board.yearPillar} {board.monthPillar} {board.dayPillar} {board.hourPillar}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[7px]">遁甲局数 BUREAU</span>
            <span className="text-logic-blue">{board.isYang ? '阳' : '阴'}遁 {board.bureau} 局</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 bg-[#020617] border border-slate-800 w-full max-w-[400px] mx-auto shadow-2xl rounded-lg overflow-hidden ring-1 ring-slate-700/30">
        {GRID_LAYOUT.map((pIndex) => {
          const palace = board.palaces.find(p => p.index === pIndex);
          if (!palace) return null;

          const isZhiFu = palace.star === board.zhiFuStar;
          const isZhiShi = palace.gate === board.zhiShiGate;
          const isUserDirection = board.direction?.includes(palace.name.slice(0, 1));

          return (
            <div 
              key={pIndex} 
              className={`relative flex flex-col justify-between p-2 h-28 md:h-32 border border-slate-800/20 transition-all duration-500
                ${palace.isEmptiness ? 'bg-slate-950/80' : 'bg-slate-900/30'}
                ${isUserDirection ? 'bg-logic-blue/10 ring-1 ring-inset ring-logic-blue/20' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <span className="text-slate-500 font-black text-[8px] tracking-widest">{palace.god}</span>
                {palace.isEmptiness && <span className="text-[6px] border border-slate-700 text-slate-400 px-0.5 rounded-sm font-black">空</span>}
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-5xl font-black pointer-events-none text-logic-blue">
                {palace.gua}
              </div>

              <div className="flex flex-col items-center justify-center gap-0.5 z-10">
                <span className={`text-[10px] font-black tracking-widest ${isZhiFu ? 'text-logic-blue drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'text-slate-500'}`}>
                  {palace.star}
                </span>
                <div className={`px-1.5 py-0.5 rounded border ${isZhiShi ? 'bg-logic-blue/10 border-logic-blue/30' : 'bg-slate-950/20 border-slate-800'}`}>
                  <span className={`font-black text-[9px] tracking-widest ${isZhiShi ? 'text-logic-blue' : 'text-slate-600'}`}>
                    {palace.gate}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-800/10 pt-1 z-10">
                <span className="text-logic-blue/80 font-black text-[10px]">{palace.heavenStem}</span>
                <div className="text-[5px] text-slate-700 font-black flex flex-col items-center uppercase">
                  <span>{palace.gua}</span>
                </div>
                <span className="text-slate-600 font-black text-[10px]">{palace.earthStem}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardGrid;
