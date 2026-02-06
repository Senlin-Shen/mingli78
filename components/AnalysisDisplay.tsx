
import React from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  isYiLogic?: boolean;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  // 深度清洗：移除所有 Markdown 符号、加粗符号、标题符号等，确保字体一致性
  const cleanText = (text: string) => {
    return text
      .replace(/\*{1,}/g, '') // 移除 * 或 **
      .replace(/#{1,}/g, '') // 移除 #
      .replace(/`{1,}/g, '') // 移除 `
      .replace(/-{3,}/g, '') // 移除 ---
      .replace(/_{1,}/g, '') // 移除 _
      .replace(/[\[\]]/g, '') // 移除 [ ]
      .replace(/> /g, '')    // 移除引用符号
      .trim();
  };

  const processedText = cleanText(prediction);
  
  // 按逻辑关键词分段
  const sections = processedText.split(/(?=一、|二、|三、|四、|五、|1\.|2\.|3\.|4\.|审局辨势|核心解析|实战建议|最终胜算|能量态势|职业建议|避坑指南|道学建议)/);

  return (
    <div className="max-w-none text-slate-300 space-y-10 font-serif leading-relaxed tracking-widest">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        // 判定是否为关键标题行
        const titleMatch = trimmed.match(/^([^：\n。]+[：:、.])/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = trimmed.replace(title, '').trim();

        const isHighlight = title.includes('最终') || title.includes('结论') || title.includes('胜算') || title.includes('避坑');

        return (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-3 duration-700">
            {title && (
              <div className="flex items-center gap-4 mb-4">
                <div className={`h-2 w-2 rounded-full ${isHighlight ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : 'bg-slate-700'}`}></div>
                <h3 className={`text-xs font-black tracking-[0.4em] uppercase ${isHighlight ? 'text-amber-500' : 'text-slate-500'}`}>
                  {title.replace(/[：:、.]/g, '').trim()}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
              </div>
            )}
            <div className={`text-sm md:text-base border-l border-slate-800/40 pl-6 py-2 transition-all
              ${isHighlight ? 'text-amber-100 bg-amber-500/5 rounded-r-2xl border-l-amber-500/50 p-6 font-normal italic' : 'text-slate-300'}
            `}>
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisDisplay;
