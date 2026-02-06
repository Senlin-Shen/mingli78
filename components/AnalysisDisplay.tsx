
import React, { useMemo } from 'react';

interface AnalysisDisplayProps {
  prediction: string;
}

// 预定义常量与正则，增加对最新 Prompt 结构的标题识别支持
const PATTERNS = [
  '一、\\s*能量态势透视', 
  '二、\\s*深度逻辑分析', 
  '三、\\s*核心判定结论', 
  '四、\\s*综合调理建议',
  '四、\\s*全息理法建议',
  '第一步：\\s*核验与排盘',
  '第二步：\\s*命格核心诊断',
  '第三步：\\s*多维度优化方案生成',
  '第四步：\\s*生成整合总结与开篇诗句',
  '[ABCD]\\.\\s*[^\\n]+',
  '【能量态势透视】', 
  '【深度逻辑分析】', 
  '【核心判定结论】', 
  '【全息理法建议】', 
  '【全息失衡判定】', 
  '【核心病机】', 
  '【核心调理原则】', 
  '【全息方案建议】',
  '【命局排盘】',
  '【定格分析】',
  '【定式分析】',
  '【流年趋势】',
  '【定格点睛】',
  '【辨旺衰】',
  '【找病药】',
  '【论调候与通关】'
];

const SECTION_SPLIT_REGEX = new RegExp(`(?=${PATTERNS.join('|')})`, 'g');
const TITLE_MATCH_REGEX = /^([一二三四]、\s*[^\\n]+|第[一二三四]步：\s*[^\\n]+|[ABCD]\.\s*[^\\n]+|【[^】]+】)/;
const CLEAN_MARKDOWN_REGEX = /[\*#`\-]{2,}/g;

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ prediction }) => {
  const sections = useMemo(() => {
    if (!prediction) return [];
    
    const processedText = prediction
      .replace(CLEAN_MARKDOWN_REGEX, '')
      .trim();
    
    const parts = processedText.split(SECTION_SPLIT_REGEX).filter(s => s.trim().length > 0);
    
    return parts.map(part => {
      const trimmed = part.trim();
      const titleMatch = trimmed.match(TITLE_MATCH_REGEX);
      const title = titleMatch ? titleMatch[0].replace(/[【】]/g, '').trim() : '';
      const content = trimmed.replace(TITLE_MATCH_REGEX, '').trim();
      const isHighlight = 
        title.includes('判定') || 
        title.includes('理法') || 
        title.includes('建议') || 
        title.includes('结论') || 
        title.includes('趋势') || 
        title.includes('定格') || 
        title.includes('定式') ||
        title.includes('第三步') ||
        /^[ABCD]\./.test(title);
      
      return { title, content, isHighlight };
    });
  }, [prediction]);

  if (sections.length === 0) {
    return (
      <div className="text-[13px] text-slate-300 leading-relaxed tracking-widest font-serif pl-6 border-l border-orange-500/20 animate-in fade-in duration-300">
        {prediction.split('\n').map((line, i) => (
          <p key={i} className="mb-4">{line.trim()}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12 font-serif leading-loose tracking-widest">
      {sections.map((sec, idx) => (
        <div key={idx} className="animate-in slide-in-from-left-2 fade-in duration-500">
          {sec.title && (
            <div className="flex items-center gap-3 mb-6">
              <div className={`h-1.5 w-4 rounded-full ${sec.isHighlight ? 'bg-orange-500 shadow-[0_0_8px_orange]' : 'bg-orange-900'}`}></div>
              <h3 className={`text-[11px] font-black tracking-[0.5em] uppercase ${sec.isHighlight ? 'text-orange-400' : 'text-orange-800'}`}>
                {sec.title}
              </h3>
            </div>
          )}
          <div className={`text-[13px] pl-7 py-1 border-l border-orange-900/20 transition-all ${sec.isHighlight ? 'text-orange-50 bg-orange-500/5 p-6 rounded-r-2xl border-l-orange-500/40 italic shadow-xl' : 'text-slate-400'}`}>
            {sec.content.split('\n').map((line, lidx) => (
              <p key={lidx} className={lidx > 0 ? 'mt-4' : ''}>{line.trim()}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(AnalysisDisplay);
