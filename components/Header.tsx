
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center py-8 border-b border-amber-900/30">
      <div className="inline-block px-4 py-1 mb-4 border border-amber-600/30 rounded-full">
        <span className="text-[10px] text-amber-600/80 tracking-[0.3em] font-bold uppercase">
          www.qimenmasterclass.cn
        </span>
      </div>
      <h1 className="text-5xl md:text-7xl qimen-font text-amber-500 mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
        奇门大师课
      </h1>
      <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed px-4 tracking-wide font-light">
        林毅体系官方实战预测平台。通过天、地、人、神四盘演化，
        <br className="hidden md:block" />
        为您在复杂的现代决策中洞见先机。
      </p>
    </header>
  );
};

export default Header;
