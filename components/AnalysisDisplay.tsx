
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
  
  // 按照“第X步”、“追问”、“解析”等关键词进行分割展示
  const sections = cleanPrediction.split(/(?=第[一二三四五六七八九]步[：:])|(?=最终成算[：:])|(?=结论[：:])|(?=追问解析[：:])|(?=建议[：:])/);

  return (
    <div className="max-w-none text-slate-300 space-y-8">
      {sections.map((section, idx) => {
        // 匹配标题
        const titleMatch = section.match(/^([^：\n]+[：:])/);
        const title = titleMatch ? titleMatch[1] : '';
        const content = section.replace(title, '').trim();

        if (!title && !content) return null;

        const isResult = title.includes('最终') || title.includes('结论') || title.includes('成算');
        const isStep = title.includes('第') && title.includes('步');

        return (
          <div 
            key={idx} 
            className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" 
          >
            {title && (
              <div className="flex items-center gap-4 mb-4">
                <h3 className={`text-[11px] font-black tracking-[0.3em] qimen-font whitespace-nowrap px-4 py-1 rounded-full border shadow-sm transition-all
                  ${isResult 
                    ? 'text-amber-400 bg-amber-950/40 border-amber-500/40' 
                    : isStep 
                    ? 'text-amber-600 bg-slate-900/60 border-amber-900/20'
                    : 'text-slate-500 bg-slate-950/30 border-slate-800/50'}
                `}>
                  {title}
                </h3>
                <div className={`h-px flex-1 ${isResult ? 'bg-amber-500/20' : 'bg-slate-800/50'}`}></div>
              </div>
            )}
            <div className={`whitespace-pre-wrap leading-relaxed tracking-widest font-light pl-4 border-l-2 transition-all
              ${isResult 
                ? 'text-amber-100 text-base border-amber-500/40 font-normal italic bg-amber-500/5 p-4 rounded-r-xl' 
                : 'text-slate-300 text-sm border-slate-800/50'}
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
