
import React, { useMemo } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

// 预编译正则以提升高频更新时的执行速度。增加对部分匹配头部的兼容处理。
const SECTION_TITLES = [
  '【乾坤定局 · 基础信息】',
  '【核心宫位 · 能量透视】',
  '【宫位互动 · 纵横博弈】',
  '【实战理法 · 时空调整】',
  '【命造流转 · 乾坤排定】',
  '【气象格局 · 虚实辨证】',
  '【天人合一 · 景曜调理】',
  '【整合观照】',
  '【能量态势透视】', 
  '【深度逻辑分析】', 
  '【核心判定结论】', 
  '【全息理法建议】', 
  '【全息失衡判定】', 
  '【核心病机】', 
  '【核心调理原则】', 
  '【全息方案建议】',
  '【命局排盘】',
  '【全息定格】',
  '【命格定式】',
  '【流年趋势】',
  '【定格点睛】',
  '【辨旺衰】',
  '【找病药】',
  '【论调候与通关】',
  '一、', '二、', '三、', '四、',
  'A\\.', 'B\\.', 'C\\.', 'D\\.'
];

const SECTION_SPLIT_REGEX = new RegExp(`(?=${SECTION_TITLES.join('|')})`, 'g');
const TITLE_EXTRACT_REGEX = /^([【一二三四].+?[】、]|[ABCD]\.\s*[^\\n]+)/;
const CLEAN_MARKDOWN_REGEX = /[\*#`\-]{2,}/g;

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  const sections = useMemo(() => {
    if (!prediction) return [];
    
    // 快速清理 Markdown 噪音，避免正则引擎在超长文本下回溯
    const processedText = prediction.replace(CLEAN_MARKDOWN_REGEX, '').trim();
    
    // 按标题分段，由于使用了前瞻匹配，性能消耗极低
    const parts = processedText.split(SECTION_SPLIT_REGEX).filter(s => s.length > 0);
    
    return parts.map(part => {
      const trimmed = part.trim();
      const titleMatch = trimmed.match(TITLE_EXTRACT_REGEX);
      const title = titleMatch ? titleMatch[0].replace(/[【】]/g, '').trim() : '';
      const content = trimmed.replace(TITLE_EXTRACT_REGEX, '').trim();
      
      const isThematicHeader = title.includes('·') || title.includes('观照');
      const isSubHeader = /^[ABCD]\./.test(title);
      const isActionable = title.includes('建议') || title.includes('调理') || title.includes('方案') || title.includes('调整');

      return { 
        title, 
        content, 
        isThematicHeader, 
        isSubHeader,
        isActionable
      };
    });
  }, [prediction]);

  if (sections.length === 0) {
    return (
      <div className="text-[12px] md:text-[13px] text-slate-300 leading-relaxed tracking-wider font-serif pl-4 border-l border-emerald-500/20">
        {prediction.split('\n').map((line, i) => (
          <p key={i} className="mb-3">{line.trim()}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10 md:space-y-16 font-serif leading-relaxed tracking-normal">
      {sections.map((sec, idx) => (
        <div key={idx} className="transition-all duration-300">
          {sec.title && (
            <div className={`flex items-center gap-3 mb-4 md:mb-8 ${sec.isThematicHeader ? 'justify-center flex-col' : ''}`}>
              {sec.isThematicHeader && (
                 <div className="w-8 h-px bg-gradient-to-r from-transparent via-rose-500 to-transparent mb-1 opacity-60"></div>
              )}
              <h3 className={`font-black tracking-[0.2em] md:tracking-[0.4em] uppercase
                ${sec.isThematicHeader ? 'text-sm md:text-lg text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400 text-center' : ''}
                ${sec.isSubHeader ? 'text-[10px] md:text-[11px] text-emerald-500 border-b border-emerald-900/20 pb-1 w-full' : ''}
                ${!sec.isThematicHeader && !sec.isSubHeader ? 'text-[11px] md:text-[12px] text-rose-500 flex items-center gap-2' : ''}
              `}>
                {!sec.isThematicHeader && !sec.isSubHeader && (
                  <span className="w-1 h-2.5 bg-rose-600 rounded-full shadow-[0_0_5px_#f43f5e]"></span>
                )}
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[12px] md:text-[14px] 
            ${sec.isThematicHeader ? 'text-center italic text-slate-300' : 'pl-4 md:pl-7'}
            ${sec.isActionable ? 'bg-rose-500/5 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-l border-rose-500/30 shadow-lg' : 'text-slate-400'}
            ${sec.isSubHeader ? 'bg-emerald-500/5 p-4 md:p-6 rounded-xl md:rounded-2xl border-l border-emerald-500/20 mb-2' : ''}
          `}>
            {sec.content.split('\n').map((line, lidx) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;
              
              const isPoetry = trimmedLine.length > 10 && trimmedLine.includes('，') && trimmedLine.includes('。');
              
              return (
                <p key={lidx} className={`
                  ${lidx > 0 ? 'mt-3 md:mt-5' : ''}
                  ${isPoetry ? 'text-center text-rose-300/90 font-medium italic text-sm md:text-base py-3 md:py-4 leading-loose' : ''}
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
