
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center py-12 border-b border-amber-900/20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none"></div>
      <div className="inline-block px-6 py-1.5 mb-6 border border-amber-600/20 rounded-full bg-slate-950/50 backdrop-blur-md">
        <span className="text-[10px] text-amber-500/80 tracking-[0.4em] font-black uppercase">
          Official System · qimenmasterclass.cn
        </span>
      </div>
      <h1 className="text-6xl md:text-8xl qimen-font text-amber-500 mb-6 drop-shadow-[0_0_25px_rgba(245,158,11,0.4)] animate-glow">
        奇门大师课
      </h1>
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="h-px w-12 bg-amber-900/40"></div>
        <p className="text-amber-700/60 text-[10px] tracking-[0.5em] font-bold uppercase">正统奇门实战演算</p>
        <div className="h-px w-12 bg-amber-900/40"></div>
      </div>
      <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-loose px-6 tracking-widest font-light italic">
        基于天、地、人、神四盘深度模型，
        <br className="hidden md:block" />
        利用豆包大模型协助处理理法逻辑，为你锁定最精准的胜算概率。
      </p>
    </header>
  );
};

export default Header;
