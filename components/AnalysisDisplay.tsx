
import React, { useMemo, useState } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  onFollowUp?: (question: string) => void;
  isFollowUpLoading?: boolean;
}

const KEYWORD_MAP = [
  { keywords: ['起局', '参数', 'dashboard', '热力扫描'], type: 'header', icon: '⚖️' },
  { keywords: ['九宫', '解析', '博弈', '深度', '逻辑路径'], type: 'conclusion', icon: '🔍' },
  { keywords: ['结论', '定论', '预判'], type: 'conclusion', icon: '🎯' },
  { keywords: ['建议', '行动', '策略', '方案', '指导', '处方'], type: 'actionable', icon: '🛠️' },
  { keywords: ['进阶挖掘', '潜在风险', '机遇'], type: 'conclusion', icon: '🎯' },
  { keywords: ['首要动作', 'priority'], type: 'actionable', icon: '📍' }
];

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction, onFollowUp, isFollowUpLoading }) => {
  const [followUpText, setFollowUpText] = useState('');

  const isCompleted = 
    prediction.includes('报告审计完毕') || 
    prediction.includes('能量审计闭环') || 
    prediction.includes('闭环') || 
    prediction.includes('？') || 
    prediction.includes('?');

  const sections = useMemo(() => {
    if (!prediction) return [];
    
    const lines = prediction.split('\n');
    const result: { title: string; content: string[]; isActionable: boolean; isConclusion: boolean; isDivider?: boolean }[] = [];
    let currentSection: { title: string; content: string[]; isActionable: boolean; isConclusion: boolean; isDivider?: boolean } | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (trimmed === '---') {
        if (currentSection) result.push(currentSection);
        result.push({ title: '', content: [], isActionable: false, isConclusion: false, isDivider: true });
        currentSection = null;
        return;
      }

      if (!trimmed && !currentSection) return;

      const isHeader = (trimmed.startsWith('【') && trimmed.includes('】')) || /^[一二三四五六七八九十]、/.test(trimmed);

      if (isHeader) {
        if (currentSection) result.push(currentSection);
        
        let isActionable = false;
        let isConclusion = false;
        const lowerTitle = trimmed.toLowerCase();
        KEYWORD_MAP.forEach(km => {
          if (km.keywords.some(k => lowerTitle.includes(k))) {
            if (km.type === 'actionable') isActionable = true;
            if (km.type === 'conclusion') isConclusion = true;
          }
        });

        currentSection = { title: trimmed, content: [], isActionable, isConclusion };
      } else {
        if (!currentSection) {
          currentSection = { title: '', content: [], isActionable: false, isConclusion: false };
        }
        currentSection.content.push(line);
      }
    });

    if (currentSection) result.push(currentSection);
    return result;
  }, [prediction]);

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpText.trim() && onFollowUp && !isFollowUpLoading) {
      onFollowUp(followUpText);
      setFollowUpText('');
    }
  };

  return (
    <div className="space-y-12 report-font leading-relaxed max-w-full overflow-visible relative">
      {/* 状态头 */}
      <div className="border-b border-slate-800/60 pb-8 flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.4)] ${isCompleted ? 'bg-logic-blue' : 'bg-logic-blue animate-pulse'}`}></div>
            <span className="text-[13px] text-slate-100 font-black tracking-[0.4em] uppercase">全息高维解析操作报告</span>
          </div>
          <span className="text-[9px] text-slate-600 font-mono tracking-[0.3em] uppercase block">Operational Protocol V3.6.2</span>
        </div>
      </div>

      <div className="space-y-10">
        {sections.map((sec, idx) => {
          if (sec.isDivider) {
            return (
              <div key={idx} className="flex items-center gap-4 py-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800"></div>
                <span className="text-[9px] text-slate-700 font-black tracking-[0.5em] uppercase">深度决策追问链</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800"></div>
              </div>
            );
          }

          return (
            <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              {sec.title && (
                <div className="flex items-center gap-4 mb-5">
                  <div className={`h-4 w-1 rounded-full ${sec.isActionable ? 'bg-white shadow-[0_0_10px_#fff]' : sec.isConclusion ? 'bg-logic-blue shadow-[0_0_10px_#38bdf8]' : 'bg-slate-700'}`}></div>
                  <h3 className={`text-[16px] font-black tracking-[0.2em] uppercase ${sec.isActionable ? 'text-slate-100' : sec.isConclusion ? 'text-logic-blue' : 'text-slate-400'}`}>
                    {sec.title}
                  </h3>
                </div>
              )}
              
              <div className={`text-[14px] md:text-[15px] leading-relaxed break-words whitespace-pre-wrap font-variant-numeric-tabular-nums
                ${sec.isActionable ? 'bg-white/[0.03] p-6 md:p-10 rounded-[2rem] border border-white/10 text-slate-100/90 shadow-2xl' : 'pl-5 text-slate-300'}
                ${sec.isConclusion ? 'bg-logic-blue/[0.03] p-6 md:p-10 rounded-[2rem] border border-logic-blue/10 text-slate-100 shadow-2xl' : ''}
              `}>
                {sec.content.map((line, lidx) => {
                  const isNumbered = /^\d+[.、]/.test(line.trim());
                  const isBullet = line.trim().startsWith('-') || line.trim().startsWith('·') || line.trim().startsWith('>');
                  return (
                    <div key={lidx} className={`${lidx > 0 ? 'mt-4' : ''} ${(isNumbered || isBullet) ? 'pl-6 relative' : ''}`}>
                      {(isNumbered || isBullet) && <div className="absolute left-0 top-2.5 w-1.5 h-1.5 rounded-full bg-logic-blue/30"></div>}
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!isCompleted && (
          <div className="pl-5 flex items-center gap-3">
            <div className="w-8 h-px bg-slate-800"></div>
            <span className="text-[10px] text-slate-600 italic tracking-widest animate-pulse">正在同步跨维度深度数据...</span>
          </div>
        )}
      </div>

      {onFollowUp && (
        <div className="mt-16 pt-10 border-t border-slate-900 relative z-[60] pointer-events-auto">
          <div className="bg-slate-900/40 p-6 md:p-8 rounded-[2.5rem] border border-slate-800/60 shadow-inner group transition-all hover:border-logic-blue/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-1.5 bg-logic-blue rounded-full shadow-[0_0_8px_#38bdf8]"></div>
              <h4 className="text-[10px] text-slate-500 font-black tracking-[0.4em] uppercase">发起逻辑追问，获得更深入的全息指导</h4>
            </div>
            <form onSubmit={handleFollowUpSubmit} className="flex gap-4 relative z-[70]">
              <input 
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="在此输入您的深度追问..."
                className="flex-1 bg-black/40 border border-slate-800 rounded-2xl px-5 py-4 text-[13px] text-slate-200 focus:outline-none focus:border-logic-blue/40 focus:ring-1 focus:ring-logic-blue/20 transition-all shadow-inner placeholder:text-slate-700 pointer-events-auto"
                disabled={isFollowUpLoading}
              />
              <button 
                type="submit" 
                disabled={isFollowUpLoading || !followUpText.trim()}
                className="px-8 bg-slate-100 hover:bg-white text-slate-950 text-[10px] font-black tracking-widest uppercase rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed h-[54px] pointer-events-auto cursor-pointer"
              >
                {isFollowUpLoading ? '同步中' : '发送'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AnalysisDisplay);
