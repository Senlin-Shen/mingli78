
import React, { useMemo, useState } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  onFollowUp?: (question: string) => void;
  isFollowUpLoading?: boolean;
}

const SECTION_TITLES = [
  '一、', '二、', '三、', '四、', '五、',
  '【⚖️ 时空起局公示】',
  '【🔍 盘局深度解析】',
  '【💡 预测结论】',
  '【🚀 实战运筹建议】',
  '【🧊 第一部分：时空能量画像 (Climate Analysis)】',
  '【⚙️ 第二部分：核心运作逻辑 (Operational Mechanism)】',
  '【⏳ 第三部分：时空波动窗口 (Temporal Windows)】',
  '【🛠️ 第四部分：全息优化方案 (Holistic Optimization)】',
  '【🌊 命局气象透视】',
  '【🛠️ 深度逻辑拆解】',
  '【🎯 核心预测结论】',
  '【💡 调理与指引】',
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

const SECTION_SPLIT_REGEX = new RegExp(`(?=${SECTION_TITLES.map(t => t.replace(/[、[\]⚖️🔍💡🚀🏠💼❤️🌱🕐🌊🛠️🎯🧊⚙️⏳()]/g, '\\$&')).join('|')})`, 'g');
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
      
      const isActionable = title.includes('建议') || title.includes('方案') || title.includes('策略') || title.includes('指引') || title.includes('优化') || /[🏠💼❤️🌱🚀🎯🛠️]/.test(title) || title === '三、' || title === '四、';
      const isConclusion = title.includes('诊断') || title.includes('分析') || title.includes('解析') || title.includes('结论') || title.includes('透视') || title.includes('拆解') || title.includes('逻辑') || title.includes('窗口') || title === '二、' || title.includes('💡') || title.includes('🌊') || title.includes('🧊') || title.includes('⚙️') || title.includes('⏳');

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
      <div className="text-[13px] md:text-[14px] text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
        {prediction}
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-10 font-serif leading-relaxed">
      <div className="border-b border-rose-900/10 pb-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-rose-500 font-black tracking-[0.4em] uppercase">全息推演分析报告</span>
          <span className="text-[7px] text-slate-600 font-mono tracking-widest uppercase">SYNCED HIGH FIDELITY REPORT</span>
        </div>
      </div>

      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in fade-in duration-500">
          {sec.title && (
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-1 h-4 rounded-full ${sec.isActionable ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : sec.isConclusion ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-rose-600'}`}></div>
              <h3 className={`text-[13px] md:text-[14px] font-black tracking-[0.2em] uppercase ${sec.isActionable ? 'text-emerald-400' : sec.isConclusion ? 'text-amber-400' : 'text-rose-500'}`}>
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[13px] md:text-[14px] leading-relaxed
            ${sec.isActionable ? 'bg-emerald-500/5 p-5 md:p-8 rounded-2xl border border-emerald-500/10 italic text-emerald-50/80' : 'pl-4 text-slate-300'}
            ${sec.isConclusion ? 'bg-amber-500/5 p-5 md:p-8 rounded-2xl border border-amber-500/10 text-amber-50/80 font-medium' : ''}
          `}>
            {sec.content.split('\n').map((line, lidx) => {
              const l = line.trim();
              if (!l) return null;
              
              const isYearItem = /^\d{4}年/.test(l);
              const isNumbered = /^\d+[.、]/.test(l);
              const isBullet = l.startsWith('-') || l.startsWith('·');
              const isSubHeader = l.includes('：') && l.length < 25 && !isYearItem && !isNumbered;

              return (
                <p key={lidx} className={`
                  ${lidx > 0 ? 'mt-4' : ''}
                  ${isYearItem ? 'bg-slate-900/60 p-4 rounded-xl border-l-2 border-rose-600/50 my-2 text-slate-200 shadow-sm ring-1 ring-white/5' : ''}
                  ${isSubHeader ? 'text-rose-400/80 font-black tracking-widest border-b border-rose-900/10 pb-0.5 mb-1 inline-block text-[12px]' : ''}
                  ${isNumbered || isBullet ? 'pl-4 relative before:content-[""] before:absolute before:left-0 before:top-2 before:w-1 before:h-1 before:bg-rose-500/30 before:rounded-full' : ''}
                `}>
                  {l.replace(/^[-·]\s*/, '')}
                </p>
              );
            })}
          </div>
        </div>
      ))}

      {onFollowUp && (
        <div className="mt-12 pt-8 border-t border-rose-900/10">
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50 shadow-lg">
            <h4 className="text-[9px] text-rose-500 font-black tracking-[0.3em] uppercase mb-4 flex items-center gap-2">
              <span className="w-1 h-1 bg-rose-500 rounded-full animate-pulse"></span>
              基于推演结论持续追问
            </h4>
            <form onSubmit={handleFollowUpSubmit} className="flex gap-3">
              <input 
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="追问详情..."
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-[11px] text-slate-300 focus:outline-none focus:border-rose-500/40 transition-all shadow-inner placeholder:text-slate-800"
              />
              <button 
                type="submit" 
                disabled={isFollowUpLoading || !followUpText.trim()}
                className="px-6 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[9px] font-black tracking-widest rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                {isFollowUpLoading ? '思考' : '提交'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <div className="pt-6 opacity-20 text-center">
        <p className="text-[8px] tracking-[0.4em] font-light uppercase">END OF HOLOGRAPHIC REPORT</p>
      </div>
    </div>
  );
};

export default React.memo(AnalysisDisplay);
