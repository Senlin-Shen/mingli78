
import React from 'react';

interface HeaderProps {
  onOpenProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenProfile }) => {
  return (
    <header className="text-center py-10 border-b border-rose-900/20 relative overflow-hidden">
      {/* 能量背景层 */}
      <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full opacity-20 pointer-events-none blur-3xl bg-gradient-to-tr from-emerald-500/20 via-rose-500/20 to-violet-500/20"></div>
      
      {/* 个人中心入口 */}
      <button 
        onClick={onOpenProfile}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-900/40 border border-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-600/10 hover:border-rose-500/50 transition-all z-50 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>

      <div className="inline-block px-4 py-1 mb-6 border border-rose-600/30 rounded-full bg-slate-950/60 backdrop-blur-xl ring-1 ring-rose-500/10">
        <span className="text-[9px] text-rose-400/90 tracking-[0.4em] font-black uppercase">
          Jing Yao Framework · Fire-Wood Resonance
        </span>
      </div>

      <div className="relative inline-block">
        <h1 className="text-6xl md:text-7xl qimen-font text-transparent bg-clip-text bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 mb-4 animate-fire">
          奇门景曜
        </h1>
        <div className="absolute -top-6 -left-6 w-12 h-12 bg-rose-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-amber-500/10 rounded-full blur-xl animate-pulse delay-700"></div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-rose-900/60"></div>
        <p className="text-rose-700/80 text-[9px] tracking-[0.5em] font-black uppercase flex items-center gap-2">
          <span className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]"></span>
          木生火旺 · 景曜临宫
          <span className="w-1 h-1 bg-rose-500 rounded-full shadow-[0_0_6px_#f43f5e]"></span>
        </p>
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-rose-900/60"></div>
      </div>

      <p className="text-slate-400 max-w-lg mx-auto text-xs leading-loose px-8 tracking-[0.15em] font-light italic opacity-90 font-serif">
        “木之生机，火之通明。”
        <br />
        以青木之韧，洞察时空枢机，助君决胜千里。
      </p>
    </header>
  );
};

export default Header;
