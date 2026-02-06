
import React from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  const cleanText = (text: string) => {
    return text
      .replace(/\*{1,}/g, '')
      .replace(/#{1,}/g, '')
      .replace(/`{1,}/g, '')
      .replace(/-{3,}/g, '')
      .trim();
  };

  const processedText = cleanText(prediction);
  const patterns = [
    '【能量态势透视】', 
    '【深度逻辑分析】', 
    '【核心判定结论】', 
    '【全息理法建议】', 
    '【全息失衡判定】', 
    '【核心病机】', 
    '【核心调理原则】', 
    '【全息方案建议】'
  ];
  
  const regex = new RegExp(`(?=${patterns.join('|')})`, 'g');
  const sections = processedText.split(regex).filter(s => s.trim().length > 0);

  // 流式过程中，如果还没有匹配到任何标题，则直接渲染原始文本
  if (sections.length === 0) {
    return (
      <div className="text-[13px] text-slate-300 leading-relaxed tracking-widest font-serif pl-6 border-l border-orange-500/20 animate-in fade-in duration-300">
        {processedText.split('\n').map((line, i) => (
          <p key={i} className="mb-4">{line.trim()}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12 font-serif leading-loose tracking-widest">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        const titleMatch = trimmed.match(/^【([^】]+)】/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = trimmed.replace(/^【[^】]+】/, '').trim();
        const isHighlight = title.includes('判定') || title.includes('理法') || title.includes('方案') || title.includes('建议');

        return (
          <div key={idx} className="animate-in slide-in-from-left-2 fade-in duration-500">
            {title && (
              <div className="flex items-center gap-3 mb-6">
                <div className={`h-1 w-4 rounded-full ${isHighlight ? 'bg-orange-500' : 'bg-orange-900'}`}></div>
                <h3 className={`text-[10px] font-black tracking-[0.5em] uppercase ${isHighlight ? 'text-orange-500' : 'text-orange-800'}`}>
                  {title}
                </h3>
              </div>
            )}
            <div className={`text-[13px] pl-7 py-1 border-l border-orange-900/20 transition-all ${isHighlight ? 'text-orange-100 bg-orange-500/5 p-6 rounded-r-2xl border-l-orange-500/40 italic shadow-xl' : 'text-slate-400'}`}>
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
