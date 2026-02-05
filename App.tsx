
import React, { useState, useCallback } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard } from './qimenLogic';
import { QiMenBoard } from './types';

const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 极致性能：生成缓存指纹
  const getCacheKey = (query: string, type: string, date: string) => {
    return `qimen_cache_${btoa(unescape(encodeURIComponent(`${query}_${type}_${date}`))).slice(0, 32)}`;
  };

  const handleEnterSystem = () => {
    setIsEntered(true);
  };

  const handlePredict = useCallback(async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    setLoading(true);
    setError('');
    setPrediction('');
    
    // 1. 本地逻辑排盘
    const targetDate = date ? new Date(date) : new Date();
    const newBoard = calculateBoard(targetDate);
    newBoard.predictionType = type;
    newBoard.targetTime = targetDate.toLocaleString();
    setBoard(newBoard);

    // 2. 检查本地缓存实现“瞬间返回”
    const cacheKey = getCacheKey(userInput, type, date);
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      // 模拟微弱延时增加仪式感
      setTimeout(() => {
        setPrediction(cachedData);
        setLoading(false);
      }, 300);
      return;
    }

    try {
      const systemInstruction = `你是一位精通正统体系的“奇门当代应用”实战分析专家。

【当前排盘】：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局。
【数据】：${JSON.stringify(newBoard.palaces)}

请基于以上数据进行多维推演（投资/事业/情感/健康/学业/择吉）。
严禁Markdown，分步输出，给出胜算概率。`;

      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userInput }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`连接不稳定 (HTTP ${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let buffer = "";

      if (reader) {
        // 流式分片渲染优化
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
              try {
                const data = JSON.parse(trimmed.slice(6));
                const content = data.choices[0]?.delta?.content || "";
                fullText += content;
                // 使用函数式更新减少渲染压力
                setPrediction(prev => prev + content);
              } catch (e) { }
            }
          }
        }
        // 最终存入缓存
        sessionStorage.setItem(cacheKey, fullText);
      }

    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? '网络连接超时，请重试' : err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 parchment-bg overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="mb-12 relative inline-block animate-glow">
             <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full"></div>
             <h1 className="text-7xl font-bold text-slate-100 mb-4 qimen-font tracking-[0.5em] relative">奇门当代应用</h1>
             <p className="text-amber-500/60 text-xs tracking-[0.8em] font-black uppercase">Official System</p>
          </div>
          <button 
            onClick={handleEnterSystem}
            className="group relative px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-2xl hover:shadow-amber-500/40"
          >
            <span className="relative z-10 tracking-[1em] pl-4">开启推演</span>
            <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-2xl"></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm">壹</span>
              输入演算参数
            </h2>
            <InputForm onPredict={handlePredict} isLoading={loading} />
          </section>
          
          {board && (
            <section className="animate-in fade-in slide-in-from-top-4 duration-700">
              <BoardGrid board={board} />
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md min-h-[600px] flex flex-col relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm">贰</span>
              当代应用分析
            </h2>
            
            {loading && !prediction && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-500">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 bg-amber-500/5 blur-xl animate-pulse"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs tracking-[0.4em] text-amber-500/80 animate-pulse font-bold">正在拨动干支齿轮...</p>
                  <p className="text-[10px] text-slate-600">正在跨越时空链接服务器</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-950/20 border border-red-900/40 p-6 rounded-2xl text-red-400 text-sm italic animate-in zoom-in-95">
                <div className="font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  演算受阻
                </div>
                {error}
              </div>
            )}

            {prediction && <AnalysisDisplay prediction={prediction} />}
            
            {!loading && !prediction && !error && (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic tracking-widest text-center px-12">
                 请在左侧输入预测问题，系统将通过 AI 边缘计算为您深度推演。
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
