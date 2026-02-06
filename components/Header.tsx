
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center py-16 border-b border-orange-900/20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none"></div>
      <div className="inline-block px-5 py-1 mb-8 border border-orange-600/20 rounded-full bg-slate-950/50 backdrop-blur-md">
        <span className="text-[9px] text-orange-500/80 tracking-[0.5em] font-black uppercase">
          Jing Yao Framework · Contemporary Application
        </span>
      </div>
      <h1 className="text-7xl md:text-9xl qimen-font text-orange-500 mb-8 drop-shadow-[0_0_35px_rgba(245,158,11,0.5)] animate-glow">
        奇门景曜
      </h1>
      <div className="flex items-center justify-center gap-5 mb-8">
        <div className="h-px w-10 bg-orange-900/40"></div>
        <p className="text-orange-700/60 text-[9px] tracking-[0.6em] font-black uppercase">正统奇门当代实战推演</p>
        <div className="h-px w-10 bg-orange-900/40"></div>
      </div>
      <p className="text-slate-500 max-w-xl mx-auto text-xs md:text-sm leading-loose px-8 tracking-[0.2em] font-light italic opacity-80">
        “景者，明也；曜者，辉也。”
        <br />
        以离火之明照破时空迷雾，辅君理性决策。
      </p>
    </header>
  );
};

export default Header;
