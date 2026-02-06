
import React, { useMemo } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

const SECTION_TITLES = [
  '一、', '二、', '三、', '四、',
  '【命局分析报告】',
  '【命盘基础信息】',
  '【命格核心诊断】',
  '【多维优化方案】',
  '【综合建议总结】',
  '【流年趋势】',
  '【环境能量调整】',
  '【事业财富策略】',
  '【情感关系指导】',
  '【健康养生要点】',
  '【近期运势节奏】'
];

const SECTION_SPLIT_REGEX = new RegExp(`(?=${SECTION_TITLES.map(t => t.replace(/[、[\]]/g, '\\$&')).join('|')})`, 'g');
const TITLE_EXTRACT_REGEX = /^([一二三四]、|【.+?】)/;

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  const sections = useMemo(() => {
    if (!prediction) return [];
    const parts = prediction.split(SECTION_SPLIT_REGEX).map(p => p.trim()).filter(Boolean);
    
    return parts.map(part => {
      const titleMatch = part.match(TITLE_EXTRACT_REGEX);
      const title = titleMatch ? titleMatch[0] : '';
      const content = part.replace(TITLE_EXTRACT_REGEX, '').trim();
      
      const isActionable = title.includes('建议') || title.includes('方案') || title.includes('策略') || title === '四、' || title === '三、';
      const isConclusion = title.includes('诊断') || title.includes('判定') || title === '二、';

      return { title, content, isActionable, isConclusion };
    });
  }, [prediction]);

  if (sections.length === 0) {
    return (
      <div className="text-[14px] md:text-[15px] text-slate-300 leading-relaxed font-serif pl-6 border-l-2 border-rose-500/20">
        {prediction.split('\n').map((line, i) => (
          line.trim() ? <p key={i} className="mb-5">{line.trim()}</p> : null
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12 md:space-y-20 font-serif leading-loose">
      <div className="border-b border-rose-900/10 pb-12 flex flex-col gap-3">
        <span className="text-[10px] text-rose-500 font-black tracking-[0.6em] uppercase">时空演化 · 全息分析报告</span>
        <span className="text-[8px] text-slate-600 font-mono tracking-widest">HOLOGRAPHIC LOGIC SYNC: SUCCESSFUL</span>
      </div>

      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in fade-in duration-1000">
          {sec.title && (
            <div className="flex items-center gap-6 mb-10">
              <div className={`w-2 h-8 rounded-full ${sec.isActionable ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : sec.isConclusion ? 'bg-amber-500 shadow-[0_0_15px_#f59e0b]' : 'bg-rose-600'}`}></div>
              <h3 className={`text-[16px] md:text-[19px] font-black tracking-[0.5em] uppercase ${sec.isActionable ? 'text-emerald-400' : sec.isConclusion ? 'text-amber-400' : 'text-rose-500'}`}>
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[14px] md:text-[16px] 
            ${sec.isActionable ? 'bg-emerald-500/5 p-8 md:p-14 rounded-[3rem] border border-emerald-500/10 italic text-emerald-100/90 shadow-2xl' : 'pl-8 text-slate-300'}
            ${sec.isConclusion ? 'bg-amber-500/5 p-8 md:p-14 rounded-[3rem] border border-amber-500/10 text-amber-50/90 font-medium' : ''}
          `}>
            {sec.content.split('\n').map((line, lidx) => {
              const l = line.trim();
              if (!l) return null;
              
              // 自动识别年份、列表、医学条目等进行差异化渲染
              const isYearItem = /^\d{4}年：|^\d+月：|^\d+\./.test(l);
              const isSubHeader = (l.startsWith('【') && l.endsWith('】')) || (l.includes('：') && l.length < 20 && !isYearItem);
              const isItemBullet = l.startsWith('- ') || l.startsWith('· ') || l.startsWith('* ');

              return (
                <p key={lidx} className={`
                  ${lidx > 0 ? 'mt-7' : ''}
                  ${isYearItem ? 'bg-slate-900/60 p-6 rounded-[1.5rem] border-l-4 border-rose-600/60 my-6 text-slate-200 shadow-md ring-1 ring-white/5' : ''}
                  ${isSubHeader ? 'text-emerald-400/95 font-black tracking-[0.2em] mt-12 mb-3 border-b border-emerald-900/30 pb-2 inline-block' : ''}
                  ${isItemBullet ? 'pl-4 border-l border-slate-800 ml-2' : ''}
                `}>
                  {l.replace(/^[-·*]\s+/, '')}
                </p>
              );
            })}
          </div>
        </div>
      ))}
      
      <div className="pt-10 opacity-30 text-center">
        <p className="text-[10px] tracking-[0.5em] font-light">END OF HOLOGRAPHIC REPORT</p>
      </div>
    </div>
  );
};

export default React.memo(AnalysisDisplay);
