
import React, { useRef } from 'react';

interface FooterProps {
  onToggleAdmin: () => void;
}

const Footer: React.FC<FooterProps> = ({ onToggleAdmin }) => {
  const timerRef = useRef<number | null>(null);

  const handleStart = () => {
    timerRef.current = window.setTimeout(() => {
      onToggleAdmin();
    }, 3000); // 长按3秒进入后台
  };

  const handleEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <footer className="mt-20 py-12 border-t border-slate-800/50 text-center">
      <div className="flex flex-col items-center gap-4">
        <div 
          onMouseDown={handleStart} 
          onMouseUp={handleEnd} 
          onTouchStart={handleStart} 
          onTouchEnd={handleEnd}
          className="text-amber-600/50 qimen-font text-2xl opacity-50 cursor-default select-none"
        >
          易经 · 奇门景曜
        </div>
        <div className="text-[10px] text-slate-500 tracking-[0.2em] font-mono uppercase">
          COPYRIGHT © 2025 WWW.QIMENJINGYAO.CN ALL RIGHTS RESERVED.
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
