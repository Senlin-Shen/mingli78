
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center py-20 border-b border-rose-900/20 relative overflow-hidden">
      {/* 能量背景层 */}
      <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full opacity-20 pointer-events-none blur-3xl bg-gradient-to-tr from-emerald-500/20 via-rose-500/20 to-violet-500/20"></div>
      
      {/* 装饰性浮动粒子 */}
      {[...Array(6)].map((_, i) => (
        <div 
          key={i} 
          className="energy-particle"
          style={{ 
            left: `${15 + i * 15}%`, 
            animationDelay: `${i * 0.5}s`, 
            bottom: '20%' 
          }}
        ></div>
      ))}

      <div className="inline-block px-6 py-1.5 mb-10 border border-rose-600/30 rounded-full bg-slate-950/60 backdrop-blur-xl ring-1 ring-rose-500/10">
        <span className="text-[10px] text-rose-400/90 tracking-[0.5em] font-black uppercase">
          Jing Yao Framework · Fire-Wood Resonance
        </span>
      </div>

      <div className="relative inline-block">
        <h1 className="text-8xl md:text-9xl qimen-font text-transparent bg-clip-text bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 mb-8 animate-fire">
          奇门景曜
        </h1>
        {/* 朱雀羽翼光影 */}
        <div className="absolute -top-10 -left-10 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl animate-pulse delay-700"></div>
      </div>

      <div className="flex items-center justify-center gap-6 mb-10">
        <div className="h-px w-14 bg-gradient-to-r from-transparent to-rose-900/60"></div>
        <p className="text-rose-700/80 text-[10px] tracking-[0.6em] font-black uppercase flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
          木生火旺 · 景曜临宫
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e]"></span>
        </p>
        <div className="h-px w-14 bg-gradient-to-l from-transparent to-rose-900/60"></div>
      </div>

      <p className="text-slate-400 max-w-xl mx-auto text-sm leading-loose px-10 tracking-[0.2em] font-light italic opacity-90 font-serif">
        “木之生机，火之通明。”
        <br />
        以青木之韧，燃红莲之火，洞察时空枢机，助君决胜千里。
      </p>
    </header>
  );
};

export default Header;
