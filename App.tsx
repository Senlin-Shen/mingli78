
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
  const getCacheKey = (query: string, type: string, date: string, direction: string) => {
    return `qimen_cache_${btoa(unescape(encodeURIComponent(`${query}_${type}_${date}_${direction}`))).slice(0, 32)}`;
  };

  const handleEnterSystem = () => {
    setIsEntered(true);
  };

  const handlePredict = useCallback(async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string, direction: string) => {
    setLoading(true);
    setError('');
    setPrediction('');
    
    // 1. 本地逻辑排盘
    const targetDate = date ? new Date(date) : new Date();
    const newBoard = calculateBoard(targetDate);
    newBoard.predictionType = type;
    newBoard.targetTime = targetDate.toLocaleString();
    newBoard.direction = direction;
    setBoard(newBoard);

    // 2. 检查本地缓存实现“瞬间返回”
    const cacheKey = getCacheKey(userInput, type, date, direction);
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      setTimeout(() => {
        setPrediction(cachedData);
        setLoading(false);
      }, 300);
      return;
    }

    try {
      const systemInstruction = `你是一位精通正统体系的“奇门当代应用”实战分析专家。你的推演逻辑严密，融合了传统理法与当代博弈论。

【当前排盘】：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局。
【求测方位】：${direction}
【核心数据】：${JSON.stringify(newBoard.palaces)}

【推演要求】：
1. **理法深剖**：必须详细分析“方位”与“落宫”的生克关系。解释值符、值使、三奇六仪在该时空的动态变化。
2. **多维演绎**：
   - 投资/事业：结合“十二长生”和“戊”落宫谈资金流动性。
   - 情感/人际：分析乙庚落宫及其神煞的相互作用。
   - 健康：从天芮星落宫深度剖析五行偏胜导致的身体隐患。
3. **切实建议**：禁止模棱两可。必须给出具体的、可执行的建议（如：避开某方位、在某时段行动、调整某种心态、具体的体检方向等）。
4. **输出格式**：严禁Markdown符号。逻辑分为：
   - 第一步：审局辨势（宏观理法分析）
   - 第二步：方位剖析（结合用户选定方位的专项推演）
   - 第三步：落地指南（给出具体的、切实的行动建议）
   - 最终成算：给出胜算概率。`;

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
                setPrediction(prev => prev + content);
              } catch (e) { }
            }
          }
        }
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
              当代应用推演
            </h2>
            
            {loading && !prediction && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-500">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 bg-amber-500/5 blur-xl animate-pulse"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs tracking-[0.4em] text-amber-500/80 animate-pulse font-bold">正在拨动干支齿轮...</p>
                  <p className="text-[10px] text-slate-600">正在跨越时空链接推演模型</p>
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
                 请在左侧输入预测问题并选择方位，系统将根据当代实战逻辑为您深度推演。
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
