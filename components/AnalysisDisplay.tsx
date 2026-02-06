
import React, { useMemo } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

const SECTION_TITLES = [
  '一、', '二、', '三、', '四、',
  '【全息失衡判定】',
  '【核心病机解析】',
  '【临床调理原则】',
  '【综合方案建议】',
  '【命局排盘】',
  '【流年趋势】'
];

// 更严谨的正则，确保匹配标题且不留重复痕迹
const SECTION_SPLIT_REGEX = new RegExp(`(?=${SECTION_TITLES.map(t => t.replace(/[、[\]]/g, '\\$&')).join('|')})`, 'g');
const TITLE_EXTRACT_REGEX = /^([一二三四]、|【.+?】)/;

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  const sections = useMemo(() => {
    if (!prediction) return [];
    
    // 分割并去重/去空
    const parts = prediction.split(SECTION_SPLIT_REGEX).map(p => p.trim()).filter(Boolean);
    
    return parts.map(part => {
      const titleMatch = part.match(TITLE_EXTRACT_REGEX);
      const title = titleMatch ? titleMatch[0] : '';
      const content = part.replace(TITLE_EXTRACT_REGEX, '').trim();
      
      const isActionable = title.includes('建议') || title.includes('方案') || title.includes('实操') || title === '四、';
      const isConclusion = title.includes('结论') || title.includes('判定') || title === '三、';

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
    <div className="space-y-12 md:space-y-16 font-serif leading-loose">
      <div className="border-b border-rose-900/10 pb-10 flex flex-col gap-2">
        <span className="text-[10px] text-rose-500 font-black tracking-[0.6em] uppercase">全息演化分析报告</span>
        <span className="text-[8px] text-slate-600 font-mono tracking-widest">QUANTUM DECODING STATUS: COMPLETED</span>
      </div>

      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in fade-in duration-700">
          {sec.title && (
            <div className="flex items-center gap-5 mb-8">
              <div className={`w-1.5 h-6 rounded-full ${sec.isActionable ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : sec.isConclusion ? 'bg-amber-500 shadow-[0_0_12px_#f59e0b]' : 'bg-rose-600'}`}></div>
              <h3 className={`text-[15px] md:text-[17px] font-black tracking-[0.4em] uppercase ${sec.isActionable ? 'text-emerald-400' : sec.isConclusion ? 'text-amber-400' : 'text-rose-500'}`}>
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[14px] md:text-[16px] 
            ${sec.isActionable ? 'bg-emerald-500/5 p-8 md:p-12 rounded-[2.5rem] border border-emerald-500/10 italic text-emerald-100/90 shadow-inner' : 'pl-7 text-slate-300'}
            ${sec.isConclusion ? 'bg-amber-500/5 p-8 md:p-12 rounded-[2.5rem] border border-amber-500/10 text-amber-50/90 font-medium' : ''}
          `}>
            {sec.content.split('\n').map((line, lidx) => {
              const l = line.trim();
              if (!l) return null;
              
              // 精准识别流年、月份或医学小标题
              const isListItem = /^\d{4}年：|^\d+月：|^\d+\./.test(l);
              const isSubTitle = (l.startsWith('【') && l.endsWith('】')) || (l.includes('：') && l.length < 15 && !isListItem);

              return (
                <p key={lidx} className={`
                  ${lidx > 0 ? 'mt-6' : ''}
                  ${isListItem ? 'bg-slate-900/40 p-5 rounded-2xl border-l-4 border-rose-600/50 my-4 text-slate-200' : ''}
                  ${isSubTitle ? 'text-emerald-400/90 font-black tracking-widest mt-10 mb-2' : ''}
                `}>
                  {l}
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(AnalysisDisplay);
