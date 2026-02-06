
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
    if ("甲乙寅卯".includes(char)) return "text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]";
    if ("丙丁巳午".includes(char)) return "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse";
    if ("戊己辰戌丑未".includes(char)) return "text-amber-600";
    if ("庚辛申酉".includes(char)) return "text-yellow-100/80";
    if ("壬癸亥子".includes(char)) return "text-blue-500";
    if (char === "?") return "text-slate-800 animate-pulse";
    return "text-slate-500";
  };

  return (
    <div className="bg-slate-950/80 border border-emerald-900/20 rounded-[3rem] p-10 backdrop-blur-3xl shadow-2xl border-t-rose-500/20 relative overflow-hidden group">
      {/* 装饰性光影 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
      
      <div className="text-center mb-10">
        <span className="text-[11px] text-rose-500/80 tracking-[0.5em] font-black uppercase flex items-center justify-center gap-4">
          <span className="h-px w-8 bg-rose-900/30"></span>
          四柱气象结构 Matrix
          <span className="h-px w-8 bg-rose-900/30"></span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-5">
            <span className="text-[10px] text-emerald-800 font-black tracking-widest uppercase">{label}</span>
            <div className="flex flex-col items-center bg-slate-900/40 border border-slate-800/50 w-full py-8 rounded-3xl shadow-inner group-hover:border-rose-500/20 transition-all duration-500 relative">
              {data[i][0] === "?" ? (
                <div className="flex flex-col items-center py-4">
                  <span className="text-slate-700 text-[10px] mb-2 font-black">时辰</span>
                  <span className="text-slate-800 text-xl font-black">不详</span>
                </div>
              ) : (
                <>
                  <span className={`text-3xl font-black mb-3 ${getElementColor(data[i][0])}`}>
                    {data[i][0]}
                  </span>
                  <span className={`text-3xl font-black ${getElementColor(data[i][1])}`}>
                    {data[i][1]}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-10 text-center">
        <div className="inline-block px-4 py-1 rounded-full border border-emerald-950/40 bg-emerald-950/10">
          <p className="text-[9px] text-emerald-900 tracking-[0.2em] font-black uppercase italic">
            Structural Energy Distribution · Wood & Fire
          </p>
        </div>
      </div>
    </div>
  );
};

export default BaZiChart;
