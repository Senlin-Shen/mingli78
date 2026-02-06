
import React from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  isYiLogic?: boolean;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  // 深度清洗：移除所有 Markdown 符号、加粗符号、标题符号、反引号等
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
  
  // 按照关键词或标点分段，提升可读性
  const sections = processedText.split(/(?=一、|二、|三、|四、|理法发微|理法依据|深度象数|实战建议|多维度实战|乾坤断语|卦理法要|象义解析|道学修持|应期分析|避坑指南)/);

  return (
    <div className="max-w-none text-slate-300 space-y-12 font-serif leading-relaxed tracking-widest">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        // 判定是否为标题行
        const titleMatch = trimmed.match(/^([^：\n。]+[：:、])/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = trimmed.replace(title, '').trim();

        const isHighlight = title.includes('最终') || title.includes('结论') || title.includes('胜算') || title.includes('避坑') || title.includes('判定');

        return (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {title && (
              <div className="flex items-center gap-4 mb-6">
                <div className={`h-2.5 w-2.5 rounded-full ${isHighlight ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]' : 'bg-slate-700'}`}></div>
                <h3 className={`text-sm font-black tracking-[0.5em] uppercase ${isHighlight ? 'text-amber-500' : 'text-slate-500'}`}>
                  {title.replace(/[：:、]/g, '').trim()}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
              </div>
            )}
            <div className={`text-base md:text-lg border-l border-slate-800/40 pl-8 py-4 transition-all
              ${isHighlight ? 'text-amber-100 bg-amber-500/5 rounded-r-3xl border-l-amber-500/50 p-8 font-normal italic' : 'text-slate-300'}
            `}>
              {content.split('\n').map((line, lidx) => (
                <p key={lidx} className={lidx > 0 ? 'mt-6' : ''}>{line.trim()}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisDisplay;
