
import React from 'react';

interface BaZiChartProps {
  pillars: {
    year: [string, string];
    month: [string, string];
    day: [string, string];
    hour: [string, string];
  };
}

const BaZiChart: React.FC<BaZiChartProps> = ({ pillars }) => {
  const labels = ["年柱", "月柱", "日柱", "时柱"];
  const data = [pillars.year, pillars.month, pillars.day, pillars.hour];

  const getElementColor = (char: string) => {
    if ("甲乙寅卯".includes(char)) return "text-green-500";
    if ("丙丁巳午".includes(char)) return "text-red-500";
    if ("戊己辰戌丑未".includes(char)) return "text-amber-600";
    if ("庚辛申酉".includes(char)) return "text-yellow-200";
    if ("壬癸亥子".includes(char)) return "text-blue-500";
    return "text-slate-400";
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-[2rem] p-8 backdrop-blur-xl shadow-2xl border-t-amber-500/10">
      <div className="text-center mb-6">
        <span className="text-[10px] text-amber-500 tracking-[0.4em] font-black uppercase">四柱气象结构</span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-4">
            <span className="text-[9px] text-slate-600 font-black tracking-widest">{label}</span>
            <div className="flex flex-col items-center bg-slate-950/50 border border-slate-800 w-full py-6 rounded-2xl shadow-inner group hover:border-amber-500/30 transition-all">
              <span className={`text-2xl font-black mb-2 ${getElementColor(data[i][0])} drop-shadow-sm`}>
                {data[i][0]}
              </span>
              <span className={`text-2xl font-black ${getElementColor(data[i][1])} drop-shadow-sm`}>
                {data[i][1]}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center">
        <p className="text-[8px] text-slate-700 tracking-widest italic uppercase">Ba Zi Structural Matrix</p>
      </div>
    </div>
  );
};

export default BaZiChart;
