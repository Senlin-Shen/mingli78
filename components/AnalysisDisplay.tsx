
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
  '【📊 能量维度定量分析】',
  '【🧊 命局气象透视 (Climate Analysis)】',
  '【🤝 人际能量博弈 (Game Position)】',
  '【⚙️ 核心运作逻辑 (Operational Mechanism)】',
  '【⚠️ 关键认知对冲 (Warning)】',
  '【⏳ 时空波动窗口 (Temporal Windows)】',
  '【🛠️ 全息场景方案 (Scenario-based)】',
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

const SECTION_SPLIT_REGEX = new RegExp(`(?=${SECTION_TITLES.map(t => t.replace(/[、[\]⚖️🔍💡🚀🏠💼❤️🌱🕐🌊🛠️🎯📊🧊🤝⚙️⚠️⏳()]/g, '\\$&')).join('|')})`, 'g');
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
      const isConclusion = title.includes('诊断') || title.includes('分析') || title.includes('解析') || title.includes('结论') || title.includes('透视') || title.includes('拆解') || title.includes('逻辑') || title.includes('窗口') || title.includes('博弈') || title.includes('画像') || title.includes('对冲') || title.includes('状态') || title === '二、' || title.includes('💡') || title.includes('🌊') || title.includes('🧊') || title.includes('⚙️') || title.includes('⏳') || title.includes('📊') || title.includes('🤝') || title.includes('⚠️');

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
      <div className="text-[14px] md:text-[15px] text-slate-300 leading-relaxed report-font whitespace-pre-wrap">
        {prediction}
      </div>
    );
  }

  return (
    <div className="space-y-12 report-font leading-relaxed">
      <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-logic-blue font-black tracking-[0.5em] uppercase">全息时空解析操作说明书</span>
          <span className="text-[7px] text-slate-600 font-mono tracking-widest uppercase">SYMMETRIC HOLOGRAPHIC OPERATIONAL MANUAL</span>
        </div>
      </div>

      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in fade-in duration-1000">
          {sec.title && (
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-1 h-5 rounded-full ${sec.isActionable ? 'bg-slate-100 shadow-[0_0_12px_#fff]' : sec.isConclusion ? 'bg-logic-blue shadow-[0_0_12px_#38bdf8]' : 'bg-slate-700'}`}></div>
              <h3 className={`text-[15px] md:text-[16px] font-black tracking-[0.2em] uppercase ${sec.isActionable ? 'text-slate-100' : sec.isConclusion ? 'text-logic-blue' : 'text-slate-400'}`}>
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[14px] md:text-[15px] leading-loose
            ${sec.isActionable ? 'bg-slate-100/5 p-6 md:p-10 rounded-3xl border border-slate-100/10 text-slate-100/90' : 'pl-5 text-slate-300'}
            ${sec.isConclusion ? 'bg-logic-blue/5 p-6 md:p-10 rounded-3xl border border-logic-blue/10 text-slate-200' : ''}
          `}>
            {sec.content.split('\n').map((line, lidx) => {
              const l = line.trim();
              if (!l) return null;
              
              const isYearItem = /^\d{4}年/.test(l);
              const isNumbered = /^\d+[.、]/.test(l);
              const isBullet = l.startsWith('-') || l.startsWith('·');
              const isSubHeader = (l.includes('：') || l.includes(':')) && l.length < 45 && !isYearItem && !isNumbered;

              return (
                <p key={lidx} className={`
                  ${lidx > 0 ? 'mt-5' : ''}
                  ${isYearItem ? 'bg-slate-900/60 p-5 rounded-2xl border-l-2 border-logic-blue/40 my-3 text-slate-100 shadow-md ring-1 ring-white/5' : ''}
                  ${isSubHeader ? 'text-slate-100 font-black tracking-widest border-b border-slate-800/60 pb-1 mb-2 inline-block text-[13px]' : ''}
                  ${isNumbered || isBullet ? 'pl-5 relative before:content-[""] before:absolute before:left-0 before:top-3 before:w-1.5 before:h-1.5 before:bg-logic-blue/40 before:rounded-full' : ''}
                `}>
                  {l.replace(/^[-·]\s*/, '')}
                </p>
              );
            })}
          </div>
        </div>
      ))}

      {onFollowUp && (
        <div className="mt-16 pt-10 border-t border-slate-800/40">
          <div className="bg-slate-900/50 p-6 md:p-8 rounded-[2rem] border border-slate-800/50 shadow-2xl">
            <h4 className="text-[10px] text-slate-500 font-black tracking-[0.4em] uppercase mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-logic-blue rounded-full animate-pulse"></div>
              根据决策逻辑持续追问
            </h4>
            <form onSubmit={handleFollowUpSubmit} className="flex gap-4">
              <input 
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="追问具体的场景方案细节..."
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-3.5 text-[12px] text-slate-200 focus:outline-none focus:border-logic-blue/50 transition-all shadow-inner"
              />
              <button 
                type="submit" 
                disabled={isFollowUpLoading || !followUpText.trim()}
                className="px-8 bg-slate-100 hover:bg-white text-slate-950 text-[10px] font-black tracking-widest uppercase rounded-2xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
              >
                {isFollowUpLoading ? '计算' : '发送'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <div className="pt-10 opacity-30 text-center">
        <p className="text-[9px] tracking-[0.6em] font-light uppercase">FIN OF STRATEGIC OPERATION MANUAL</p>
      </div>
    </div>
  );
};

export default React.memo(AnalysisDisplay);
