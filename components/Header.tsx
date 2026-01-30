
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center py-6 border-b border-amber-900/30">
      <h1 className="text-4xl md:text-6xl qimen-font text-amber-500 mb-2 drop-shadow-lg">
        奇门遁甲实战预测系统
      </h1>
      <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed px-4">
        融汇传统易理与时空能量场分析，通过地、天、人、神四盘演化，为您提供客观理性的决策参考。
      </p>
    </header>
  );
};

export default Header;
