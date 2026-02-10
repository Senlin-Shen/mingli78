
import React, { useMemo, useState } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  onFollowUp?: (question: string) => void;
  isFollowUpLoading?: boolean;
}

/**
 * 容错性更强的章节识别关键字
 * 用于解决 AI 输出标题不完全匹配的问题
 */
const KEYWORD_MAP = [
  { keywords: ['起局', '公示', '参数'], type: 'header', icon: '⚖️' },
  { keywords: ['解析', '盘局', '透视', '深度', '推演'], type: 'conclusion', icon: '🔍' },
  { keywords: ['结论', '定论', '预判'], type: 'conclusion', icon: '🎯' },
  { keywords: ['建议', '运筹', '行动', '方案', '调理', '策略'], type: 'actionable', icon: '💡' },
  { keywords: ['能量', '维度', '定量', '打分'], type: 'conclusion', icon: '📊' },
  { keywords: ['博弈', '社交', '人际', '站位'], type: 'conclusion', icon: '🤝' },
  { keywords: ['认知', '对冲', '预警', '注意'], type: 'conclusion', icon: '⚠️' },
  { keywords: ['窗口', '周期', '时间'], type: 'conclusion', icon: '⏳' },
  { keywords: ['场景', '模拟', '动作'], type: 'actionable', icon: '🛠️' }
];

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction, onFollowUp, isFollowUpLoading }) => {
  const [followUpText, setFollowUpText] = useState('');

  const sections = useMemo(() => {
    if (!prediction) return [];
    
    // 按【】或一、二、三、等模式分割，且支持换行后的标题
    const rawParts = prediction.split(/(?=\n【|\n[一二三四五]、|【)/g);
    const parts = rawParts.map(p => p.trim()).filter(Boolean);
    
    return parts.map(part => {
      // 提取标题行
      const lines = part.split('\n');
      const firstLine = lines[0].trim();
      const isTitle = (firstLine.startsWith('【') && firstLine.includes('】')) || /^[一二三四五]、/.test(firstLine);
      
      const title = isTitle ? firstLine : '';
      const content = isTitle ? lines.slice(1).join('\n').trim() : part;

      // 模糊匹配类型
      let isActionable = false;
      let isConclusion = false;
      
      const lowerTitle = title.toLowerCase();
      KEYWORD_MAP.forEach(km => {
        if (km.keywords.some(k => lowerTitle.includes(k))) {
          if (km.type === 'actionable') isActionable = true;
          if (km.type === 'conclusion') isConclusion = true;
        }
      });

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

  return (
    <div className="space-y-12 report-font leading-relaxed">
      <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-logic-blue font-black tracking-[0.5em] uppercase">全息时空解析操作说明书</span>
          <span className="text-[7px] text-slate-600 font-mono tracking-widest uppercase">SYMMETRIC HOLOGRAPHIC OPERATIONAL MANUAL</span>
        </div>
        {/* 流式状态指示器 */}
        {!prediction.includes('报告审计完毕') && !prediction.includes('[END]') && (
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-logic-blue rounded-full animate-ping"></div>
            <span className="text-[8px] text-slate-700 font-black uppercase tracking-tighter">Connecting...</span>
          </div>
        )}
      </div>

      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in fade-in slide-in-from-left-2 duration-700">
          {sec.title && (
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-1 h-5 rounded-full ${sec.isActionable ? 'bg-slate-100 shadow-[0_0_12px_#fff]' : sec.isConclusion ? 'bg-logic-blue shadow-[0_0_12px_#38bdf8]' : 'bg-slate-700'}`}></div>
              <h3 className={`text-[15px] md:text-[16px] font-black tracking-[0.2em] uppercase ${sec.isActionable ? 'text-slate-100' : sec.isConclusion ? 'text-logic-blue' : 'text-slate-400'}`}>
                {sec.title}
              </h3>
            </div>
          )}
          
          <div className={`text-[14px] md:text-[15px] leading-loose
            ${sec.isActionable ? 'bg-slate-100/5 p-6 md:p-10 rounded-3xl border border-slate-100/10 text-slate-100/90 shadow-inner' : 'pl-5 text-slate-300'}
            ${sec.isConclusion ? 'bg-logic-blue/5 p-6 md:p-10 rounded-3xl border border-logic-blue/10 text-slate-200 shadow-inner' : ''}
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
