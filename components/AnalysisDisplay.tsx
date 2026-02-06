
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
  const patterns = ['【能量态势】', '【逻辑发微】', '【核心判定】', '【碧海调理】', '【失衡判定】', '【核心病机】', '【全息方案】'];
  const regex = new RegExp(`(?=${patterns.join('|')})`, 'g');
  const sections = processedText.split(regex).filter(s => s.trim().length > 0);

  if (sections.length === 0) {
    return (
      <div className="text-xs text-slate-400 leading-loose tracking-widest font-serif pl-6 border-l border-orange-900/30">
        {processedText.split('\n').map((line, i) => <p key={i} className="mb-4">{line.trim()}</p>)}
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
        const isHighlight = title.includes('核心') || title.includes('调理') || title.includes('方案');

        return (
          <div key={idx} className="animate-in fade-in duration-500">
            {title && (
              <div className="flex items-center gap-3 mb-6">
                <div className={`h-1 w-4 rounded-full ${isHighlight ? 'bg-orange-500' : 'bg-orange-900'}`}></div>
                <h3 className={`text-[10px] font-black tracking-[0.5em] uppercase ${isHighlight ? 'text-orange-500' : 'text-orange-800'}`}>
                  {title}
                </h3>
              </div>
            )}
            <div className={`text-[12.5px] pl-7 py-1 border-l border-orange-900/20 transition-all ${isHighlight ? 'text-orange-100 bg-orange-500/5 p-6 rounded-r-2xl border-l-orange-500/40 italic shadow-inner' : 'text-slate-400'}`}>
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
