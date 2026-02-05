
import React from 'react';
import { QiMenBoard } from '../types';
import { GRID_LAYOUT } from '../constants';

interface BoardGridProps {
  board: QiMenBoard;
}

const BoardGrid: React.FC<BoardGridProps> = ({ board }) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-inner border-t-amber-500/20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-[10px] tracking-widest font-bold">
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px] uppercase">真太阳时修正</span>
            <span className="text-amber-500">{board.trueSolarTime || board.targetTime}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px] uppercase">方位映射</span>
            <span className="text-blue-400 font-black">{board.direction || '计算中'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px] uppercase">坐标定位</span>
            <span className="text-slate-400 font-mono">
              {board.location ? `${board.location.longitude}E / ${board.location.latitude}N` : 'IP获取中'}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px] uppercase">干支历</span>
            <span className="text-slate-300">{board.yearPillar} {board.monthPillar} {board.dayPillar} {board.hourPillar}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-600 block text-[9px] uppercase">遁甲局数</span>
            <span className="text-amber-400">{board.isYang ? '阳' : '阴'}遁 {board.bureau} 局</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 bg-[#020617] border border-amber-900/20 w-full max-w-[500px] mx-auto shadow-2xl rounded-xl overflow-hidden ring-1 ring-slate-800">
        {GRID_LAYOUT.map((pIndex) => {
          const palace = board.palaces.find(p => p.index === pIndex);
          if (!palace) return null;

          const isZhiFu = palace.star === board.zhiFuStar;
          const isZhiShi = palace.gate === board.zhiShiGate;
          // 视觉高亮自动判定的方位宫位
          const isUserDirection = board.direction?.includes(palace.name.slice(0, 1));

          return (
            <div 
              key={pIndex} 
              className={`relative flex flex-col justify-between p-4 h-40 md:h-44 border border-slate-800/50 transition-all duration-700
                ${palace.isEmptiness ? 'bg-slate-950/80' : 'bg-slate-900/40'}
                ${isUserDirection ? 'bg-amber-900/10 ring-1 ring-inset ring-amber-500/30' : ''}
                ${isZhiFu ? 'bg-gradient-to-br from-amber-500/5 to-transparent' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <span className="text-indigo-400/60 font-black text-[10px] tracking-widest">{palace.god}</span>
                <div className="flex gap-1">
                  {isUserDirection && <span className="text-[7px] bg-amber-600 text-white px-1 rounded-sm shadow-sm animate-pulse">方位</span>}
                  {palace.isEmptiness && <span className="text-[8px] border border-red-500/40 text-red-500 px-1 rounded-sm font-black">空</span>}
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] text-8xl font-black pointer-events-none select-none text-amber-500">
                {palace.gua}
              </div>

              <div className="flex flex-col items-center justify-center gap-1.5 z-10">
                <span className={`text-[13px] font-black tracking-widest transition-all
                  ${isZhiFu ? 'text-amber-400 drop-shadow-sm' : 'text-slate-400'}
                `}>
                  {palace.star}
                </span>
                <div className={`px-3 py-1 rounded-md border transition-all
                  ${isZhiShi ? 'bg-amber-950/40 border-amber-500/40' : 'bg-slate-950/30 border-slate-800/50'}
                `}>
                  <span className={`font-black text-xs tracking-[0.2em]
                    ${isZhiShi ? 'text-amber-500' : 'text-green-600/80'}
                  `}>
                    {palace.gate}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-800/30 pt-2 z-10">
                <span className="text-red-600 font-black text-sm">{palace.heavenStem}</span>
                <div className="text-[7px] text-slate-700 font-black flex flex-col items-center">
                  <span>{palace.gua}</span>
                  <span>{palace.element}</span>
                </div>
                <span className="text-blue-500/70 font-black text-sm">{palace.earthStem}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-[9px] text-slate-700 text-center leading-loose tracking-[0.3em] font-bold uppercase">
        <span className="text-amber-600/40 italic text-[8px]">Qi Men Jing Yao · Framework v3.0</span>
      </div>
    </div>
  );
};

export default BoardGrid;
