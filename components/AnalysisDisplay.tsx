
import React, { useMemo } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

// 匹配“一、”、“二、”或“【模块】”样式的标题
const SECTION_TITLES = [
  '一、', '二、', '三、', '四、',
  '【能量态势透视】', 
  '【深度逻辑分析】', 
  '【核心判定结论】', 
  '【综合调理建议】', 
  '【流年趋势】',
  '【命局排盘】',
  '【全息失衡判定】',
  '【核心病机】',
  '【核心调理原则】',
  '【全息方案建议】'
];

const SECTION_SPLIT_REGEX = new RegExp(`(?=${SECTION_TITLES.join('|')})`, 'g');
const TITLE_EXTRACT_REGEX = /^([一二三四]、|【.+?】)/;

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  const sections = useMemo(() => {
    if (!prediction) return [];
    
    // 直接处理纯净文本，不再清理 markdown 符号（因为指令已禁用它们）
    const parts = prediction.split(SECTION_SPLIT_REGEX).filter(s => s.trim().length > 0);
    
    return parts.map(part => {
      const trimmed = part.trim();
      const titleMatch = trimmed.match(TITLE_EXTRACT_REGEX);
      const title = titleMatch ? titleMatch[0].trim() : '';
      const content = trimmed.replace(TITLE_EXTRACT_REGEX, '').trim();
      
      const isActionable = title.includes('建议') || title.includes('调理') || title.includes('方案') || title.includes('原则');
      const isConclusion = title.includes('结论') || title.includes('判定');

      return { 
        title, 
        content, 
        isActionable,
        isConclusion
      };
    });
  }, [prediction]);

  if (sections.length === 0) {
    return (
      <div className="text-[13px] md:text-[14px] text-slate-300 leading-relaxed tracking-wider font-serif pl-4 border-l-2 border-rose-500/20">
        {prediction.split('\n').map((line, i) => {
          const l = line.trim();
          if (!l) return null;
          return <p key={i} className="mb-4">{l}</p>;
        })}
      </div>
    );
  }

  return (
    <div className="space-y-12 md:space-y-16 font-serif leading-relaxed">
      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in fade-in duration-500">
          {sec.title && (
            <div className="flex items-center gap-4 mb-6">
              <span className={`w-1.5 h-4 rounded-full ${sec.isActionable ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-600 shadow-[0_0_8px_#f43f5e]'}`}></span>
              <h3 className={`text-[13px] md:text-[15px] font-black tracking-[0.3em] uppercase ${sec.isActionable ? 'text-emerald-400' : 'text-rose-500'}`}>
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[13px] md:text-[15px] leading-loose
            ${sec.isActionable ? 'bg-emerald-500/5 p-6 md:p-10 rounded-[2rem] border border-emerald-500/10 shadow-inner italic text-emerald-100/80' : 'pl-6 text-slate-300'}
            ${sec.isConclusion ? 'bg-rose-500/5 p-6 md:p-10 rounded-[2rem] border border-rose-500/10 shadow-lg text-rose-50/90 font-medium' : ''}
          `}>
            {sec.content.split('\n').map((line, lidx) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;
              
              // 自动识别流年趋势格式
              const isYearTrend = /^\d{4}年：/.test(trimmedLine);
              
              return (
                <p key={lidx} className={`
                  ${lidx > 0 ? 'mt-4 md:mt-6' : ''}
                  ${isYearTrend ? 'border-l-2 border-rose-900/30 pl-4 py-1 text-slate-200' : ''}
                `}>
                  {trimmedLine}
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
