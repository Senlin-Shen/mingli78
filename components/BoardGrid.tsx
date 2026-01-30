
import React from 'react';
import { QiMenBoard } from '../types';
import { GRID_LAYOUT } from '../constants';

interface BoardGridProps {
  board: QiMenBoard;
}

const BoardGrid: React.FC<BoardGridProps> = ({ board }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Starting Info Header - Professional Style */}
      <div className="bg-slate-900 border-2 border-slate-800 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-y-2 text-[11px] leading-relaxed">
          <div className="flex justify-between border-r border-slate-800 pr-4">
            <span className="text-slate-500">公历：</span>
            <span className="text-slate-300">{board.targetTime}</span>
          </div>
          <div className="flex justify-between pl-4">
            <span className="text-slate-500">节气：</span>
            <span className="text-amber-500 font-bold">{board.solarTerm}</span>
          </div>
          <div className="flex justify-between border-r border-slate-800 pr-4">
            <span className="text-slate-500">四柱：</span>
            <span className="text-slate-300">{board.yearPillar} {board.monthPillar} {board.dayPillar} {board.hourPillar}</span>
          </div>
          <div className="flex justify-between pl-4">
            <span className="text-slate-500">定局：</span>
            <span className="text-amber-400 font-bold">{board.isYang ? '阳' : '阴'}遁 {board.bureau} 局</span>
          </div>
          <div className="flex justify-between border-r border-slate-800 pr-4">
            <span className="text-slate-500">值符：</span>
            <span className="text-amber-500">{board.zhiFuStar}</span>
          </div>
          <div className="flex justify-between pl-4">
            <span className="text-slate-500">值使：</span>
            <span className="text-green-500">{board.zhiShiGate}</span>
          </div>
        </div>
      </div>
      
      {/* Professional 3x3 Traditional Chart Grid */}
      <div className="grid grid-cols-3 bg-slate-900 border-2 border-amber-900/30 w-full max-w-[420px] mx-auto shadow-2xl">
        {GRID_LAYOUT.map((pIndex) => {
          const palace = board.palaces.find(p => p.index === pIndex);
          if (!palace) return null;

          return (
            <div 
              key={pIndex} 
              className={`relative flex flex-col justify-between p-3 h-32 md:h-36 border border-amber-900/20
                ${palace.isEmptiness ? 'bg-slate-950 grayscale-[0.5]' : 'bg-slate-900'}
              `}
            >
              {/* God (Top Row) */}
              <div className="flex justify-between items-center text-indigo-400 font-bold text-xs">
                <span className="tracking-widest">{palace.god}</span>
                <div className="flex gap-1">
                  {palace.isEmptiness && <span className="text-[9px] bg-red-900/40 text-red-400 px-1 rounded border border-red-800">空</span>}
                  {palace.isMaXing && <span className="text-[9px] bg-amber-900/40 text-amber-500 px-1 rounded border border-amber-800">马</span>}
                </div>
              </div>

              {/* Palace Background Gua (Subtle) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-6xl font-black pointer-events-none select-none text-amber-500">
                {palace.gua}
              </div>

              {/* Middle Section: Star and Gate */}
              <div className="flex flex-col items-center justify-center gap-1.5 z-10">
                <span className="text-amber-500 font-bold text-[13px] tracking-wider">{palace.star}</span>
                <div className="bg-slate-950 px-3 py-1 rounded-sm border border-slate-800">
                  <span className="text-green-500 font-black text-sm tracking-[0.2em]">{palace.gate}</span>
                </div>
              </div>

              {/* Bottom Row: Stems and Palace Info */}
              <div className="flex justify-between items-end border-t border-slate-800/60 pt-1.5 z-10">
                <div className="flex flex-col items-center">
                  <span className="text-red-500 font-bold text-sm leading-none">{palace.heavenStem}</span>
                </div>
                <div className="flex flex-col items-center opacity-40 text-[8px] font-mono text-slate-500 leading-none pb-0.5">
                  <span>{palace.gua}</span>
                  <span>{palace.element}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-blue-400 font-bold text-sm leading-none">{palace.earthStem}</span>
                </div>
              </div>
              
              {/* Palace Index (Corner) */}
              <span className="absolute bottom-0 right-1 text-[8px] text-slate-700 font-mono">{pIndex}</span>
            </div>
          );
        })}
      </div>
      
      <div className="text-[10px] text-slate-500 text-center leading-relaxed">
        值符：{board.zhiFuStar} 落 {board.palaces.find(p => p.star === board.zhiFuStar)?.name} | 
        值使：{board.zhiShiGate} 落 {board.palaces.find(p => p.gate === board.zhiShiGate)?.name}
        <br/>
        <span className="opacity-50 italic">基于奇门遁甲理法体系·拆补法自动排盘</span>
      </div>
    </div>
  );
};

export default BoardGrid;
