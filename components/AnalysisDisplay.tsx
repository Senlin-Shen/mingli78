
import React from 'react';

interface AnalysisDisplayProps {
  prediction: string;
  isYiLogic?: boolean;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction, isYiLogic }) => {
  // 如果是多维易理模式，我们允许更丰富的 Markdown 类展示
  if (isYiLogic) {
    const sections = prediction.split(/(?=### )|(?=## )/);
    return (
      <div className="max-w-none text-slate-300 space-y-6">
        {sections.map((section, idx) => {
          const isMainTitle = section.startsWith('## ');
          const isSubTitle = section.startsWith('### ');
          const content = section.replace(/^(## |### )/, '').trim();
          
          if (!content) return null;

          if (isMainTitle) {
            return (
              <div key={idx} className="border-b border-amber-500/20 pb-2 mb-4">
                <h2 className="text-amber-500 font-black tracking-[0.4em] text-lg qimen-font">{content}</h2>
              </div>
            );
          }

          if (isSubTitle) {
            return (
              <div key={idx} className="mt-8 mb-4">
                <h3 className="text-amber-600/80 font-bold text-xs tracking-widest bg-amber-500/5 px-4 py-1 rounded-full border border-amber-500/10 inline-block">{content}</h3>
              </div>
            );
          }

          return (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed tracking-widest font-light text-sm pl-4 border-l border-slate-800/50">
              {content.replace(/\*\*/g, '')}
            </div>
          );
        })}
      </div>
    );
  }

  // 奇门模式保持原有逻辑
  const cleanPrediction = prediction
    .replace(/\*{1,}/g, '').replace(/#{1,}/g, '').replace(/-{3,}/g, '').replace(/_{1,}/g, '').replace(/`{1,}/g, '').replace(/\[/g, '').replace(/\]/g, '').replace(/> /g, '').trim();
  
  const sections = cleanPrediction.split(/(?=第[一二三四五六七八九]步[：:])|(?=最终成算[：:])|(?=结论[：:])|(?=建议[：:])/);

  return (
    <div className="max-w-none text-slate-300 space-y-8">
      {sections.map((section, idx) => {
        const titleMatch = section.match(/^([^：\n]+[：:])/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = section.replace(title, '').trim();
        if (!title && !content) return null;
        const isResult = title.includes('最终') || title.includes('结论') || title.includes('成算');
        const isStep = title.includes('第') && title.includes('步');
        return (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {title && (
              <div className="flex items-center gap-4 mb-4">
                <h3 className={`text-[11px] font-black tracking-[0.3em] qimen-font whitespace-nowrap px-4 py-1 rounded-full border shadow-sm ${isResult ? 'text-amber-400 bg-amber-950/40 border-amber-500/40' : isStep ? 'text-amber-600 bg-slate-900/60 border-amber-900/20' : 'text-slate-500 bg-slate-950/30 border-slate-800/50'}`}>{title}</h3>
                <div className={`h-px flex-1 ${isResult ? 'bg-amber-500/20' : 'bg-slate-800/50'}`}></div>
              </div>
            )}
            <div className={`whitespace-pre-wrap leading-relaxed tracking-widest font-light pl-4 border-l-2 ${isResult ? 'text-amber-100 text-base border-amber-500/40 font-normal italic bg-amber-500/5 p-4 rounded-r-xl' : 'text-slate-300 text-sm border-slate-800/50'}`}>{content}</div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisDisplay;
