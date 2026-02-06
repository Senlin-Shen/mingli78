
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
  
  if (!processedText) return null;

  // 改进关键词分割逻辑
  const patterns = [
    '一、', '二、', '三、', '四、', '五、',
    '理法发微', '理法依据', '深度象数', '实战建议', '多维度实战', '乾坤断语',
    '卦理法要', '象义解析', '道学修持', '应期分析', '避坑指南',
    '命理模型定格', '体貌象义推演', '岁运大势纵横', '财官层级深度分析', '诚实铁口评价',
    '五行气象论', '碧海定格分析', '核心定式判定', '十神现代映射', '道学修持建议'
  ];
  
  const regex = new RegExp(`(?=${patterns.join('|')})`, 'g');
  const sections = processedText.split(regex).filter(s => s.trim().length > 0);

  // 如果没有匹配到任何板块，直接显示全文
  if (sections.length === 0) {
    return (
      <div className="text-[13.5px] text-slate-300 leading-relaxed font-serif tracking-wider pl-6 border-l border-slate-800/60">
        {processedText.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-4' : ''}>{line.trim()}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-none text-slate-300 space-y-10 font-serif leading-relaxed tracking-wider">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        const titleMatch = trimmed.match(/^([^：\n。]{1,25}[：:、])/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = trimmed.replace(title, '').trim();

        const isHighlight = title.includes('最终') || title.includes('结论') || 
                           title.includes('胜算') || title.includes('铁口') || 
                           title.includes('判定') || title.includes('评价') || 
                           title.includes('定格') || title.includes('定式');

        return (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {title && (
              <div className="flex items-center gap-3 mb-5">
                <div className={`h-1.5 w-1.5 rounded-full ${isHighlight ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1)]' : 'bg-slate-700'}`}></div>
                <h3 className={`text-[11px] font-bold tracking-[0.4em] uppercase accent-font ${isHighlight ? 'text-amber-500 font-black' : 'text-slate-500'}`}>
                  {title.replace(/[：:、]/g, '').trim()}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
              </div>
            )}
            <div className={`text-[13.5px] border-l border-slate-800/60 pl-8 py-2 transition-all
              ${isHighlight ? 'text-amber-50/95 bg-amber-500/5 rounded-r-3xl border-l-amber-500/60 p-8 italic leading-loose shadow-inner' : 'text-slate-400'}
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
