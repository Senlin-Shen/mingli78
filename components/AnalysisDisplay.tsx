
import React from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  // 极致清洗：移除所有 Markdown 符号，保留段落结构
  const cleanPrediction = prediction
    .replace(/\*{1,}/g, '') // 移除星号
    .replace(/#{1,}/g, '')  // 移除井号标题
    .replace(/-{3,}/g, '')  // 移除分割线
    .replace(/_{1,}/g, '')  // 移除下划线
    .replace(/`{1,}/g, '')  // 移除代码块符号
    .replace(/\[/g, '')     // 移除左中括号
    .replace(/\]/g, '')     // 移除右中括号
    .replace(/> /g, '')     // 移除引用符号
    .trim();
  
  // 按照“第X步”进行分割，保留传统古法预测的层次感
  const sections = cleanPrediction.split(/(?=第[一二三四五六七八九]步[：:])/);

  return (
    <div className="max-w-none text-slate-300 space-y-10 py-4">
      {sections.map((section, idx) => {
        // 匹配标题
        const titleMatch = section.match(/^(第[一二三四五六七八九]步[：:][^ \n]*)/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = section.replace(title, '').trim();

        if (!title && !content) return null;

        return (
          <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ transitionDelay: `${idx * 100}ms` }}>
            {title && (
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-900/50 to-transparent"></div>
                <h3 className="text-amber-500 text-sm font-black tracking-[0.3em] qimen-font whitespace-nowrap px-4 bg-slate-900/40 py-1 rounded-full border border-amber-900/20 shadow-inner">
                  {title}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-900/50 to-transparent"></div>
              </div>
            )}
            <div className="whitespace-pre-wrap leading-loose text-sm md:text-base text-slate-200 pl-4 border-l-2 border-amber-900/10 italic font-light font-sans tracking-wide">
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisDisplay;
