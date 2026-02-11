
import React, { useMemo, useState } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  onFollowUp?: (question: string) => void;
  isFollowUpLoading?: boolean;
}

const KEYWORD_MAP = [
  { keywords: ['起局', '公示', '参数'], type: 'header', icon: '⚖️' },
  { keywords: ['解析', '盘局', '透视', '深度', '推播'], type: 'conclusion', icon: '🔍' },
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

  const isCompleted = prediction.includes('报告审计完毕') || prediction.includes('[END]');

  const sections = useMemo(() => {
    if (!prediction) return [];
    
    // 预处理：保护所有数字和关键符号，防止被错误分割
    const lines = prediction.split('\n');
    const result: { title: string; content: string[]; isActionable: boolean; isConclusion: boolean }[] = [];
    let currentSection: { title: string; content: string[]; isActionable: boolean; isConclusion: boolean } | null = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 识别标题：支持【】格式或“一、”格式
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
        currentSection.content.push(line); // 保持原样，不轻易修剪，保留缩进和数字
      }
    });

    if (currentSection) result.push(currentSection);
    return result;
  }, [prediction]);

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpText.trim() && onFollowUp) {
      onFollowUp(followUpText);
      setFollowUpText('');
    }
  };

  return (
    <div className="space-y-12 report-font leading-relaxed max-w-full overflow-hidden">
      {/* 状态头 */}
      <div className="border-b border-slate-800/60 pb-8 flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.4)] ${isCompleted ? 'bg-logic-blue' : 'bg-logic-blue animate-pulse'}`}></div>
            <span className="text-[13px] text-slate-100 font-black tracking-[0.4em] uppercase">全息时空解析操作说明书</span>
          </div>
          <span className="text-[9px] text-slate-600 font-mono tracking-[0.3em] uppercase block">Holographic Operational Protocol V3.1.2</span>
        </div>
        
        <div className="hidden md:flex flex-col items-end gap-1.5">
          {isCompleted ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-logic-blue/10 border border-logic-blue/30 rounded-lg">
              <span className="text-[9px] text-logic-blue font-black tracking-[0.2em] uppercase">状态：逻辑自洽 VERIFIED</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="w-1.5 h-1.5 bg-logic-blue rounded-full animate-ping"></div>
              <span className="text-[9px] text-slate-500 font-black tracking-[0.2em] uppercase">状态：变量计算中 SYNCING</span>
            </div>
          )}
        </div>
      </div>

      {/* 动态内容区 */}
      <div className="space-y-10">
        {sections.map((sec, idx) => (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {sec.title && (
              <div className="flex items-center gap-4 mb-5">
                <div className={`h-4 w-1 rounded-full ${sec.isActionable ? 'bg-slate-200 shadow-[0_0_10px_#fff]' : sec.isConclusion ? 'bg-logic-blue shadow-[0_0_10px_#38bdf8]' : 'bg-slate-700'}`}></div>
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
                const isBullet = line.trim().startsWith('-') || line.trim().startsWith('·');
                
                return (
                  <div key={lidx} className={`
                    ${lidx > 0 ? 'mt-4' : ''}
                    ${isNumbered || isBullet ? 'pl-6 relative' : ''}
                  `}>
                    {/* 列表项修饰，但不替换原文数字 */}
                    {(isNumbered || isBullet) && (
                      <div className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-logic-blue/30"></div>
                    )}
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!isCompleted && (
          <div className="pl-5 flex items-center gap-3">
            <div className="w-8 h-px bg-slate-800"></div>
            <span className="text-[10px] text-slate-600 italic tracking-widest animate-pulse">正在推演后续因果链条...</span>
          </div>
        )}
      </div>

      {/* 追问区 */}
      {onFollowUp && isCompleted && (
        <div className="mt-16 pt-10 border-t border-slate-900 animate-in fade-in zoom-in-95 duration-1000">
          <div className="bg-slate-900/40 p-6 md:p-8 rounded-[2.5rem] border border-slate-800/60 shadow-inner group">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-1.5 bg-logic-blue rounded-full"></div>
              <h4 className="text-[10px] text-slate-500 font-black tracking-[0.4em] uppercase">针对上述演算结果发起逻辑追问</h4>
            </div>
            <form onSubmit={handleFollowUpSubmit} className="flex gap-4">
              <input 
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="在此输入需要深挖的细节..."
                className="flex-1 bg-black/40 border border-slate-800 rounded-2xl px-5 py-4 text-[13px] text-slate-200 focus:outline-none focus:border-logic-blue/40 transition-all shadow-inner"
              />
              <button 
                type="submit" 
                disabled={isFollowUpLoading || !followUpText.trim()}
                className="px-8 bg-slate-100 hover:bg-white text-slate-950 text-[10px] font-black tracking-widest uppercase rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-20"
              >
                {isFollowUpLoading ? '计算中' : '发送'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AnalysisDisplay);
