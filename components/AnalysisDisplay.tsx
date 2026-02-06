
import React from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  isYiLogic?: boolean;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  const cleanText = (text: string) => {
    return text
      .replace(/\*{1,}/g, '')
      .replace(/#{1,}/g, '')
      .replace(/`{1,}/g, '')
      .replace(/-{3,}/g, '')
      .replace(/_{1,}/g, '')
      .replace(/[\[\]]/g, '')
      .replace(/> /g, '')
      .trim();
  };

  const processedText = cleanText(prediction);
  const sections = processedText.split(/(?=一、|二、|三、|四、|理法发微|理法依据|深度象数|实战建议|多维度实战|乾坤断语|卦理法要|象义解析|道学修持|应期分析|避坑指南)/);

  return (
    <div className="max-w-none text-slate-300 space-y-10 font-serif leading-relaxed tracking-wider">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        const titleMatch = trimmed.match(/^([^：\n。]+[：:、])/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = trimmed.replace(title, '').trim();

        const isHighlight = title.includes('最终') || title.includes('结论') || title.includes('胜算') || title.includes('避坑') || title.includes('判定');

        return (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {title && (
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-1.5 w-1.5 rounded-full ${isHighlight ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-slate-700'}`}></div>
                <h3 className={`text-xs font-bold tracking-[0.4em] uppercase accent-font ${isHighlight ? 'text-amber-500' : 'text-slate-500'}`}>
                  {title.replace(/[：:、]/g, '').trim()}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
              </div>
            )}
            <div className={`text-sm md:text-[14px] border-l border-slate-800/60 pl-6 py-2 transition-all
              ${isHighlight ? 'text-amber-100 bg-amber-500/5 rounded-r-2xl border-l-amber-500/50 p-6 italic' : 'text-slate-400'}
            `}>
              {content.split('\n').map((line, lidx) => (
                <p key={lidx} className={lidx > 0 ? 'mt-4' : ''}>{line.trim()}</p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisDisplay;
