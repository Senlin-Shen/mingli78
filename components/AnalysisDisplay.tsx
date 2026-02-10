
import React, { useMemo, useState } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  onFollowUp?: (question: string) => void;
  isFollowUpLoading?: boolean;
}

const SECTION_TITLES = [
  '一、', '二、', '三、', '四、', '五、',
  '【八字命理分析报告】',
  '【命盘基础信息】',
  '【命格核心诊断】',
  '【多维优化方案】',
  '【综合建议总结】',
  '🏠 环境能量调整',
  '💼 事业财富策略',
  '❤️ 情感关系指导',
  '🌱 健康养生要点',
  '🕐 近期运势节奏',
  '【局象概述】',
  '【决策建议】'
];

const SECTION_SPLIT_REGEX = new RegExp(`(?=${SECTION_TITLES.map(t => t.replace(/[、[\]🏠💼❤️🌱🕐]/g, '\\$&')).join('|')})`, 'g');
const TITLE_EXTRACT_REGEX = /^([一二三四五]、|【.+?】|[🏠💼❤️🌱🕐]\s?.+?(\n|$))/;

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction, onFollowUp, isFollowUpLoading }) => {
  const [followUpText, setFollowUpText] = useState('');

  const sections = useMemo(() => {
    if (!prediction) return [];
    
    const rawParts = prediction.split(SECTION_SPLIT_REGEX);
    const parts = rawParts.map(p => p.trim()).filter(Boolean);
    
    return parts.map(part => {
      const titleMatch = part.match(TITLE_EXTRACT_REGEX);
      const title = titleMatch ? titleMatch[0].trim() : '';
      const content = part.replace(TITLE_EXTRACT_REGEX, '').trim();
      
      const isActionable = title.includes('建议') || title.includes('方案') || title.includes('策略') || /[🏠💼❤️🌱🕐]/.test(title) || title === '三、' || title === '四、';
      const isConclusion = title.includes('诊断') || title.includes('分析') || title === '二、';

      return { title, content, isActionable, isConclusion };
    });
  }, [prediction]);

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpText.trim() && onFollowUp) {
      onFollowUp(followUpText);
      setFollowUpText('');
    }
  };

  if (sections.length === 0) {
    return (
      <div className="text-[14px] md:text-[15px] text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
        {prediction}
      </div>
    );
  }

  return (
    <div className="space-y-12 md:space-y-16 font-serif leading-loose">
      <div className="border-b border-rose-900/10 pb-8 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-rose-500 font-black tracking-[0.5em] uppercase">全息推演分析报告</span>
          <span className="text-[8px] text-slate-600 font-mono tracking-widest">OUTPUT SYNCED · HIGH FIDELITY REPORT</span>
        </div>
      </div>

      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in fade-in duration-700">
          {sec.title && (
            <div className="flex items-center gap-5 mb-8">
              <div className={`w-1.5 h-6 rounded-full ${sec.isActionable ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : sec.isConclusion ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-rose-600'}`}></div>
              <h3 className={`text-[15px] md:text-[18px] font-black tracking-[0.4em] uppercase ${sec.isActionable ? 'text-emerald-400' : sec.isConclusion ? 'text-amber-400' : 'text-rose-500'}`}>
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[14px] md:text-[16px] leading-loose
            ${sec.isActionable ? 'bg-emerald-500/5 p-8 md:p-12 rounded-[2.5rem] border border-emerald-500/10 italic text-emerald-50/90' : 'pl-7 text-slate-300'}
            ${sec.isConclusion ? 'bg-amber-500/5 p-8 md:p-12 rounded-[2.5rem] border border-amber-500/10 text-amber-50/90 font-medium' : ''}
          `}>
            {sec.content.split('\n').map((line, lidx) => {
              const l = line.trim();
              if (!l) return null;
              
              // 自动识别年份、列表编号、行动项
              const isYearItem = /^\d{4}年/.test(l);
              const isNumbered = /^\d+[.、]/.test(l);
              const isBullet = l.startsWith('-') || l.startsWith('·');
              const isSubHeader = l.includes('：') && l.length < 25 && !isYearItem && !isNumbered;

              return (
                <p key={lidx} className={`
                  ${lidx > 0 ? 'mt-6' : ''}
                  ${isYearItem ? 'bg-slate-900/60 p-5 rounded-2xl border-l-4 border-rose-600/50 my-4 text-slate-200 shadow-md ring-1 ring-white/5' : ''}
                  ${isSubHeader ? 'text-rose-400/90 font-black tracking-widest border-b border-rose-900/10 pb-1 mb-2 inline-block' : ''}
                  ${isNumbered || isBullet ? 'pl-5 relative before:content-[""] before:absolute before:left-0 before:top-3 before:w-1.5 before:h-1.5 before:bg-rose-500/40 before:rounded-full' : ''}
                `}>
                  {l.replace(/^[-·]\s*/, '')}
                </p>
              );
            })}
          </div>
        </div>
      ))}

      {onFollowUp && (
        <div className="mt-20 pt-12 border-t border-rose-900/10">
          <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl">
            <h4 className="text-[10px] text-rose-500 font-black tracking-[0.4em] uppercase mb-6 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
              基于推演结论持续追问
            </h4>
            <form onSubmit={handleFollowUpSubmit} className="flex gap-4">
              <input 
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="例如：请进一步解析明年三月的财运细节..."
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl px-6 py-4 text-xs text-slate-300 focus:outline-none focus:border-rose-500/50 transition-all shadow-inner placeholder:text-slate-700"
              />
              <button 
                type="submit" 
                disabled={isFollowUpLoading || !followUpText.trim()}
                className="px-8 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[10px] font-black tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
              >
                {isFollowUpLoading ? '思考中...' : '提交追问'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <div className="pt-10 opacity-20 text-center">
        <p className="text-[9px] tracking-[0.6em] font-light uppercase">END OF HOLOGRAPHIC REPORT</p>
      </div>
    </div>
  );
};

export default React.memo(AnalysisDisplay);
