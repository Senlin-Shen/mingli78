
import React from 'react';

interface HeaderProps {
  onOpenProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenProfile }) => {
  return (
    <header className="text-center py-10 border-b border-slate-800/30 relative overflow-hidden">
      {/* 能量背景层：改为逻辑蓝与银灰光影 */}
      <div className="absolute inset-0 bg-gradient-to-b from-logic-blue/5 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full opacity-10 pointer-events-none blur-3xl bg-gradient-to-tr from-slate-400 via-logic-blue/20 to-slate-200/20"></div>
      
      {/* 个人中心入口：银色金属感 */}
      <button 
        onClick={onOpenProfile}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-900/40 border border-slate-700/30 flex items-center justify-center text-slate-400 hover:bg-logic-blue/10 hover:border-logic-blue/50 transition-all z-50 group shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>

      <div className="inline-block px-4 py-1 mb-6 border border-slate-700/30 rounded-full bg-slate-950/60 backdrop-blur-xl ring-1 ring-white/5 shadow-inner">
        <span className="text-[9px] text-slate-400 tracking-[0.4em] font-black uppercase">
          Jing Yao Framework · Purity Hologram
        </span>
      </div>

      <div className="relative inline-block">
        <h1 className="text-6xl md:text-7xl qimen-font text-transparent bg-clip-text bg-gradient-to-br from-slate-400 via-slate-100 to-logic-blue mb-4 drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]">
          奇门景曜
        </h1>
        <div className="absolute -top-6 -left-6 w-12 h-12 bg-logic-blue/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-slate-400/10 rounded-full blur-xl animate-pulse delay-700"></div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-slate-800"></div>
        <p className="text-slate-400 text-[9px] tracking-[0.5em] font-black uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-logic-blue rounded-full shadow-[0_0_8px_#38bdf8]"></span>
          清源定鼎 · 逻辑全息
          <span className="w-1.5 h-1.5 bg-slate-100 rounded-full shadow-[0_0_8px_#fff]"></span>
        </p>
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-slate-800"></div>
      </div>

      <p className="text-slate-500 max-w-lg mx-auto text-xs leading-loose px-8 tracking-[0.15em] font-light italic opacity-90 font-serif">
        “清源致远，定鼎乾坤。”
        <br />
        以全息逻辑洞察万象，于纷繁中厘清定数，助君运筹决策。
      </p>
    </header>
  );
};

export default Header;
