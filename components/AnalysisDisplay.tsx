
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
  
  // 按照“第X步”或具体的概率结论进行分割
  const sections = cleanPrediction.split(/(?=第[一二三四五六七八九]步[：:])|(?=最终成算[：:])|(?=结论[：:])/);

  return (
    <div className="max-w-none text-slate-300 space-y-12 py-6">
      {sections.map((section, idx) => {
        // 匹配标题
        const titleMatch = section.match(/^([^：\n]+[：:])/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = section.replace(title, '').trim();

        if (!title && !content) return null;

        const isResult = title.includes('最终') || title.includes('结论');

        return (
          <div 
            key={idx} 
            className="animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-both" 
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            {title && (
              <div className="flex items-center gap-6 mb-6">
                <div className={`h-px flex-1 ${isResult ? 'bg-amber-500/30' : 'bg-amber-900/20'}`}></div>
                <h3 className={`text-sm font-black tracking-[0.4em] qimen-font whitespace-nowrap px-6 py-1.5 rounded-full border shadow-lg transition-all
                  ${isResult 
                    ? 'text-amber-400 bg-amber-950/40 border-amber-500/40 scale-110' 
                    : 'text-amber-600 bg-slate-900/60 border-amber-900/20'}
                `}>
                  {title}
                </h3>
                <div className={`h-px flex-1 ${isResult ? 'bg-amber-500/30' : 'bg-amber-900/20'}`}></div>
              </div>
            )}
            <div className={`whitespace-pre-wrap leading-loose tracking-widest font-light pl-6 border-l-2 transition-all
              ${isResult 
                ? 'text-amber-100 text-lg border-amber-500/50' 
                : 'text-slate-200 text-sm md:text-base border-amber-900/10 italic'}
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
