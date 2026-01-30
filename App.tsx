
import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay.tsx';
import BoardGrid from './components/BoardGrid.tsx';
import Header from './components/Header.tsx';
import InputForm from './components/InputForm.tsx';
import { calculateBoard } from './qimenLogic.ts';
import { QiMenBoard } from './types.ts';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [boardImageUrl, setBoardImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 检查环境变量
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
      setHasKey(false);
    }
  }, []);

  const handlePredict = async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    if (!process.env.API_KEY) {
      setError('检测到 API 密钥配置缺失，请检查 Vercel 环境变量。');
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
      
      // 1. 生成文字解析
      const systemPrompt = `
        你是一位精通传统奇门遁甲体系的预测专家。
        
        【核心要求】：
        - 结果中严禁使用任何 "*"、"#" 或 "##" 符号。
        - 每一节标题直接写为“第一步：...”的形式。
        - 必须提供具体的【成功概率】或【风险百分比】。
        - 解析基于盘面符号生克，引用具体理法。
        - 提供具体的方位、时辰、行为建议。
        - 严禁幻觉：只解析当前数据。
        
        【当前盘局】：
        - 类型：${type === 'SHI_JU' ? '事局' : '命局'}
        - 时间：${newBoard.targetTime}
        - 局数：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 (${newBoard.solarTerm})
        - 值符：${newBoard.zhiFuStar}，值使：${newBoard.zhiShiGate}
        - 九宫数据：${JSON.stringify(newBoard.palaces)}
        
        用户问题：${userInput}
      `;

      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: userInput,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        },
      });
      setPrediction(textResponse.text || '演算未获响应。');

      // 2. 生成意象图
      const imagePrompt = `Traditional Chinese Qi Men Dun Jia alignment chart (排盘图). Perfect 3x3 grid, golden lines on silk dark background, elegant calligraphy, high resolution, precise layout. Title: "${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局". Professional divination software style.`;

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
      setError('时空连接中断：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-amber-900/50 rounded-3xl p-8 shadow-2xl">
          <div className="text-amber-500 text-5xl mb-6">⚙️</div>
          <h1 className="text-2xl font-bold text-slate-100 mb-4">需配置 API 密钥</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            为了激活这套预测系统，请将您的 API Key 添加到 Vercel 的环境变量中：
          </p>
          <div className="bg-slate-800 rounded-xl p-4 text-left mb-8 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-amber-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">1</span>
              <span className="text-slate-300 text-xs">前往 Vercel 项目的 <b>Settings</b></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-amber-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">2</span>
              <span className="text-slate-300 text-xs">选择 <b>Environment Variables</b></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-amber-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">3</span>
              <span className="text-slate-300 text-xs">添加变量 <b>API_KEY</b> 并粘贴您的密钥</span>
            </div>
          </div>
          <p className="text-slate-500 text-[10px] italic">配置完成后重新部署（Redeploy）即可开启系统。</p>
        </div>
      </div>
    );
  }

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
