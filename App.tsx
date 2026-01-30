
import { GoogleGenAI } from "@google/genai";
import React, { useState } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay.tsx';
import BoardGrid from './components/BoardGrid.tsx';
import Header from './components/Header.tsx';
import InputForm from './components/InputForm.tsx';
import { calculateBoard } from './qimenLogic.ts';
import { QiMenBoard } from './types.ts';

const App: React.FC = () => {
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [boardImageUrl, setBoardImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePredict = async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    // 检查 API Key 是否存在
    if (!process.env.API_KEY) {
      setError('配置错误：未检测到 API Key，请在环境变量中设置。');
      return;
    }

    setLoading(true);
    setError('');
    setPrediction('');
    setBoardImageUrl('');
    
    const targetDate = date ? new Date(date) : new Date();
    const newBoard = calculateBoard(targetDate);
    newBoard.predictionType = type;
    newBoard.targetTime = targetDate.toLocaleString();
    setBoard(newBoard);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Generate Text Prediction
      const systemPrompt = `
        你是一位精通传统奇门遁甲教学体系的预测专家。
        
        【核心要求】：
        - 结果中绝对不要使用任何 "*"、"#" 或 "##" 符号。严禁使用 Markdown 的井号标题。
        - 每一节的标题请直接写成“第一步：...”的形式，不要带任何特殊格式符号。
        - 结果必须【落地实际】：禁止虚无缥缈的描述，必须给出具体的【成功概率】或【风险百分比】。
        - 遵循【理法严谨】：解析必须基于盘面符号的生克制化，引用具体的理法。
        - 提供【实战方案】：包含具体方位、时辰、行为建议或环境调理方法。
        - 【严禁幻觉】：所有的判断必须紧扣当前排出的九宫数据，不得编造符号。
        
        【当前盘局】：
        - 类型：${type === 'SHI_JU' ? '事局' : '命局'}
        - 时间：${newBoard.targetTime}
        - 局数：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 (${newBoard.solarTerm})
        - 值符：${newBoard.zhiFuStar}，值使：${newBoard.zhiShiGate}
        - 九宫数据：${JSON.stringify(newBoard.palaces)}
        
        用户问题：${userInput}
        请按：公示起局 -> 盘局概览 -> 理法解析与概率 -> 实战方案，四个步骤进行解析。
      `;

      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: userInput,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        },
      });
      setPrediction(textResponse.text || '解析异常。');

      // 2. Generate Traditional Alignment Chart Image
      const imagePrompt = `A professional traditional Chinese Qi Men Dun Jia alignment chart (排盘图). 
        Perfect 3x3 grid on a dark textured background. 
        Sharp and elegant grid lines in gold. 
        Traditional Chinese characters for stars, gates, and gods. 
        Clear title: "${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 - ${newBoard.solarTerm}".
        Style: Professional divination software, precise calligraphy, mystical yet technical look.`;

      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: imagePrompt,
      });

      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          setBoardImageUrl(`data:image/png;base64,${part.inlineData.data}`);
        }
      }

    } catch (err: any) {
      console.error(err);
      setError('推演中断：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen parchment-bg p-4 md:p-8 flex flex-col items-center overflow-y-auto">
      <div className="max-w-6xl w-full flex flex-col gap-8">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-12">
          <section className="flex flex-col gap-6 lg:sticky lg:top-8">
            <div className="bg-slate-900/90 rounded-2xl border border-slate-700 p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-amber-500 font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                实战起局
              </h2>
              <InputForm onPredict={handlePredict} isLoading={loading} />
            </div>
            
            {board && (
              <div className="bg-slate-950 rounded-2xl border-2 border-slate-800 p-6 shadow-2xl">
                <h2 className="text-amber-600 font-bold mb-4 text-center tracking-widest uppercase text-sm">专业排盘</h2>
                <BoardGrid board={board} />
              </div>
            )}
          </section>

          <section className="bg-slate-900/80 rounded-2xl border border-slate-700 p-6 min-h-[600px] shadow-2xl backdrop-blur-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[500px] gap-4 text-amber-400">
                <div className="w-16 h-16 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="animate-pulse text-sm">正在检索时空数据，排盘演卦...</p>
              </div>
            ) : error ? (
              <div className="text-red-400 p-4 border border-red-900 rounded bg-red-900/20 text-sm">
                {error}
              </div>
            ) : prediction ? (
              <div className="space-y-10">
                {boardImageUrl && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-amber-500 text-xs font-bold border-l-2 border-amber-500 pl-2 uppercase tracking-tighter">盘局意象</h3>
                    <img src={boardImageUrl} alt="Qi Men Traditional Chart" className="w-full rounded-lg border border-slate-700 shadow-xl brightness-110" />
                  </div>
                )}
                <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                  <AnalysisDisplay prediction={prediction} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-slate-500 italic text-center p-8">
                <div className="w-24 h-24 border border-slate-800 rounded-full flex items-center justify-center mb-6 opacity-20">
                  <span className="text-4xl">易</span>
                </div>
                <p className="text-sm">凡事预则立，不预则废。<br/>请在左侧发起实战预测。</p>
              </div>
            )}
          </section>
        </div>
      </div>
      
      <footer className="w-full py-8 text-slate-500 text-[10px] md:text-xs opacity-60 text-center space-y-2 border-t border-slate-800/50 mt-auto">
        <div>奇门遁甲实战预测系统 · 数字化易理实践</div>
        <div>易学工具旨在辅助决策，请保持理性思维。</div>
      </footer>
    </div>
  );
};

export default App;
