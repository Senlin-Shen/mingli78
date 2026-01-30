
import React from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  // Enhanced deep clean to remove all markdown formatting symbols
  const cleanPrediction = prediction
    .replace(/\*{1,}/g, '') // Remove *
    .replace(/#{1,}/g, '')  // Remove #
    .replace(/-{3,}/g, '')  // Remove lines like ---
    .replace(/_{1,}/g, '')  // Remove _
    .replace(/`{1,}/g, '')  // Remove `
    .trim();
  
  const sections = cleanPrediction.split(/(?=第[一二三四]步[：:])/);

  return (
    <div className="max-w-none text-slate-300 space-y-8">
      {sections.map((section, idx) => {
        const titleMatch = section.match(/^(第[一二三四]步[：:][^ \n]*)/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = section.replace(title, '').trim();

        if (!title && !content) return null;

        return (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {title && (
              <h3 className="text-amber-600 text-sm font-black border-b border-amber-900/30 pb-2 mb-4 tracking-[0.2em] uppercase">
                {title}
              </h3>
            )}
            <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base text-slate-200 pl-2">
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisDisplay;
