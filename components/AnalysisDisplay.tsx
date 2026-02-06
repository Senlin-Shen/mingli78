
import React, { useMemo } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

// Optimized patterns for a more fluid report structure
const PATTERNS = [
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
  '一、\\s*[^\\n]+',
  '二、\\s*[^\\n]+',
  '三、\\s*[^\\n]+',
  '四、\\s*[^\\n]+',
  '[ABCD]\\.\\s*[^\\n]+'
];

const SECTION_SPLIT_REGEX = new RegExp(`(?=${PATTERNS.join('|')})`, 'g');
const TITLE_MATCH_REGEX = /^([【一二三四].+?[】、]|[ABCD]\.\s*[^\\n]+)/;
const CLEAN_MARKDOWN_REGEX = /[\*#`\-]{2,}/g;

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  const sections = useMemo(() => {
    if (!prediction) return [];
    
    const processedText = prediction
      .replace(CLEAN_MARKDOWN_REGEX, '')
      .trim();
    
    const parts = processedText.split(SECTION_SPLIT_REGEX).filter(s => s.trim().length > 0);
    
    return parts.map(part => {
      const trimmed = part.trim();
      const titleMatch = trimmed.match(TITLE_MATCH_REGEX);
      const title = titleMatch ? titleMatch[0].replace(/[【】]/g, '').trim() : '';
      const content = trimmed.replace(TITLE_MATCH_REGEX, '').trim();
      
      const isThematicHeader = title.includes('·') || title.includes('观照');
      const isSubHeader = /^[ABCD]\./.test(title);
      const isActionable = title.includes('建议') || title.includes('调理') || title.includes('方案');

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
      <div className="text-[14px] text-slate-300 leading-relaxed tracking-widest font-serif pl-8 border-l border-emerald-500/20 animate-in fade-in duration-300">
        {prediction.split('\n').map((line, i) => (
          <p key={i} className="mb-5">{line.trim()}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-16 font-serif leading-loose tracking-[0.1em]">
      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in slide-in-from-bottom-4 fade-in duration-700">
          {sec.title && (
            <div className={`flex items-center gap-4 mb-8 ${sec.isThematicHeader ? 'justify-center flex-col' : ''}`}>
              {sec.isThematicHeader && (
                 <div className="w-12 h-px bg-gradient-to-r from-transparent to-rose-500 mb-2"></div>
              )}
              <h3 className={`font-black tracking-[0.4em] uppercase transition-all
                ${sec.isThematicHeader ? 'text-lg text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400' : ''}
                ${sec.isSubHeader ? 'text-[11px] text-emerald-500 border-b border-emerald-900/30 pb-1 w-full' : ''}
                ${!sec.isThematicHeader && !sec.isSubHeader ? 'text-[12px] text-rose-500 flex items-center gap-3' : ''}
              `}>
                {!sec.isThematicHeader && !sec.isSubHeader && (
                  <span className="w-1 h-3 bg-rose-600 rounded-full shadow-[0_0_8px_#f43f5e]"></span>
                )}
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[14px] transition-all duration-1000 
            ${sec.isThematicHeader ? 'text-center italic text-slate-200' : 'pl-7'}
            ${sec.isActionable ? 'bg-rose-500/5 p-8 rounded-[2rem] border-l-2 border-rose-500/40 shadow-xl shadow-rose-950/20' : 'text-slate-400'}
            ${sec.isSubHeader ? 'bg-emerald-500/5 p-6 rounded-2xl border-l-2 border-emerald-500/30 mb-4' : ''}
          `}>
            {sec.content.split('\n').map((line, lidx) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;
              
              // Detect specific poetic patterns or key labels within text
              const isPoetry = trimmedLine.length > 15 && trimmedLine.includes('，') && trimmedLine.includes('。');
              
              return (
                <p key={lidx} className={`
                  ${lidx > 0 ? 'mt-5' : ''}
                  ${isPoetry ? 'text-center text-rose-300 font-medium italic text-base py-4 leading-[2.5]' : ''}
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
