
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
      .replace(/\[/g, '')    // 移除 [
      .replace(/\]/g, '')    // 移除 ]
      .replace(/> /g, '')    // 移除引用符号
      .trim();
  };

  const processedText = cleanText(prediction);
  
  // 按照预定义的标题或关键词进行分段，匹配：[一、...]，[1....]，[某某解析：]
  const sections = processedText.split(/(?=[一二三四五六七八九]、)|(?=\d\.)|(?=解析：)|(?=建议：)|(?=结论：)|(?=最终胜算：)|(?=实战建议：)/);

  return (
    <div className="max-w-none text-slate-300 space-y-8 font-serif">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        // 提取标题逻辑：匹配句首的标题类文字
        const titleMatch = trimmed.match(/^([^：\n。]+[：:])/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = trimmed.replace(title, '').trim();

        const isHighlight = title.includes('结论') || title.includes('最终') || title.includes('胜算');

        return (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {title && (
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-1.5 w-1.5 rounded-full ${isHighlight ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-slate-700'}`}></div>
                <h3 className={`text-xs font-black tracking-widest uppercase ${isHighlight ? 'text-amber-500' : 'text-slate-500'}`}>
                  {title.replace(/[：:]/g, '')}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
              </div>
            )}
            <div className={`leading-relaxed tracking-widest font-light text-sm md:text-base border-l border-slate-800/50 pl-5 py-1
              ${isHighlight ? 'text-amber-100 bg-amber-500/5 rounded-r-lg border-l-amber-500/40 p-4 font-normal italic' : 'text-slate-300'}
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
