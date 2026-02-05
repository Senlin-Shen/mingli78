
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-20 py-12 border-t border-slate-800/50 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-amber-600/50 qimen-font text-2xl opacity-50">易经 · 奇门当代应用</div>
        <div className="text-[10px] text-slate-500 tracking-[0.2em] font-mono">
          COPYRIGHT © 2025 WWW.QIMENMASTERCLASS.CN ALL RIGHTS RESERVED.
        </div>
        <div className="flex gap-6 text-[10px] text-slate-600 uppercase tracking-widest">
          <span>当代推演</span>
          <span>•</span>
          <span>实战应用</span>
          <span>•</span>
          <span>理性决策</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
