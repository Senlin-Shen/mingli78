
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard } from './qimenLogic';
import { QiMenBoard } from './types';

/**
 * 奇门大师课 - www.qimenmasterclass.cn 官方实战系统
 * 采用 Google Gemini 3 Pro 引擎进行理法推演
 */
const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnterSystem = () => {
    setIsEntered(true);
  };

  const handlePredict = async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    setLoading(true);
    setError('');
    setPrediction('');
    
    // 1. 起局演算
    const targetDate = date ? new Date(date) : new Date();
    const newBoard = calculateBoard(targetDate);
    newBoard.predictionType = type;
    newBoard.targetTime = targetDate.toLocaleString();
    setBoard(newBoard);

    try {
      // 2. 初始化 Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `你是一位精通林毅老师体系的奇门遁甲实战预测专家。你的任务是根据提供的【起局参数】和用户的问题进行深度推演。

【林毅理法体系核心要求】：
1. 必须包含具体的胜算/概率百分比（如：此事成算约65%）。
2. 分析必须严谨，按照：第x步：[步骤名称] 格式进行。
3. 深度引用：值符落宫、值使落宫、空亡、马星、乙庚合、生门戊土等理法。
4. 语言风格：玄学与现代决策科学结合，专业、冷静、具有穿透力。
5. 严禁使用 Markdown 符号（如 ** 或 #），仅使用纯文字和换行。

【当前局势】：
- 演算类型：${type === 'SHI_JU' ? '时空事局' : '本命命局'}
- 遁甲参数：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 (${newBoard.solarTerm})
- 九宫分布：${JSON.stringify(newBoard.palaces)}
- 四柱：${newBoard.yearPillar} ${newBoard.monthPillar} ${newBoard.dayPillar} ${newBoard.hourPillar}
- 值符：${newBoard.zhiFuStar}，值使：${newBoard.zhiShiGate}`;

      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
          topP: 0.95,
        }
      });

      const result = await chat.sendMessageStream({ message: userInput });
      
      let fullText = "";
      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setPrediction(fullText);
        }
      }

    } catch (err: any) {
      console.error('AI Deduction Error:', err);
      setError(`天机阻塞：${err.message || '连接 API 失败，请检查 API_KEY 配置'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center parchment-bg">
        <div className="max-w-md w-full">
          <div className="mb-8 relative inline-block">
             <div className="absolute -inset-4 bg-amber-500/10 blur-xl rounded-full"></div>
             <h1 className="text-5xl font-bold text-slate-100 mb-2 qimen-font tracking-[0.3em] relative">奇门大师课</h1>
          </div>
          <p className="text-amber-700/60 text-[10px] mb-16 tracking-[0.6em] font-light uppercase">WWW.QIMENMASTERCLASS.CN</p>
          <button 
            onClick={handleEnterSystem} 
            className="group relative px-16 py-4 overflow-hidden rounded-full border border-amber-600/30 text-amber-500 font-bold hover:text-white transition-all duration-500"
          >
            <div className="absolute inset-0 bg-amber-600 translate-y-[101%] group-hover:translate-y-0 transition-transform duration-500"></div>
            <span className="relative z-10 tracking-[0.4em]">进入演算系统</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parchment-bg p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-6xl w-full flex flex-col gap-8">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <section className="space-y-8">
            <div className="bg-slate-900/90 rounded-[2rem] border border-slate-800/50 p-8 shadow-2xl backdrop-blur-xl">
              <h2 className="text-xs text-amber-500/50 font-bold uppercase tracking-[0.3em] mb-6 border-b border-amber-900/20 pb-2">时空输入端</h2>
              <InputForm onPredict={handlePredict} isLoading={loading} />
            </div>
            {board && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                <BoardGrid board={board} />
              </div>
            )}
          </section>

          <section className="bg-slate-950/40 rounded-[2.5rem] border border-slate-800/40 p-8 min-h-[700px] shadow-2xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="text-9xl qimen-font">卦</span>
            </div>

            {loading && !prediction ? (
              <div className="flex flex-col items-center justify-center h-[600px] gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-amber-500 text-xs tracking-[0.3em] font-bold">九维时空演算中...</p>
                  <p className="text-slate-600 text-[10px] tracking-widest">正在解析天、地、人、神四盘生克</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-[600px]">
                <div className="p-10 border border-red-900/20 rounded-3xl bg-red-950/5 text-center max-w-sm">
                  <p className="text-red-400 text-sm mb-6 font-light">{error}</p>
                  <button onClick={() => setError('')} className="px-6 py-2 bg-red-900/20 text-red-500 text-[10px] rounded-full border border-red-900/30 uppercase tracking-widest hover:bg-red-900/40 transition-all">重新演算</button>
                </div>
              </div>
            ) : prediction ? (
              <AnalysisDisplay prediction={prediction} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-slate-700/30">
                <div className="text-6xl mb-6 select-none opacity-20">☯</div>
                <span className="text-3xl qimen-font tracking-[1em] select-none">静 待 天 机</span>
                <p className="mt-4 text-[10px] tracking-[0.5em] uppercase font-light">Waiting for celestial alignment</p>
              </div>
            )}
          </section>
        </div>
        
        <Footer />
      </div>
    </div>
  );
};

export default App;
