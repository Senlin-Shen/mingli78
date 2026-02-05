
import React, { useState } from 'react';
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

  const handleEnterSystem = () => {
    setIsEntered(true);
  };

  const handlePredict = async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    setLoading(true);
    setError('');
    setPrediction('');
    
    const targetDate = date ? new Date(date) : new Date();
    const newBoard = calculateBoard(targetDate);
    newBoard.predictionType = type;
    newBoard.targetTime = targetDate.toLocaleString();
    setBoard(newBoard);

    try {
      const systemInstruction = `你是一位精通正统体系的奇门遁甲实战预测专家。

【奇门理法体系核心】：
1. 拆补定局：一切分析必须建立在 ${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 的基础上。
2. 主客关系：这是断卦的灵魂。如果是用户主动求测，用户为客，事情为主；如果是用户被动应付，用户为主，事情为客。
3. 动态博弈：分析值符（${newBoard.zhiFuStar}）与值使（${newBoard.zhiShiGate}）的落宫生克。
4. 概率化决策：强调预测是为了决策。必须给出明确的“胜算概率”（0%-100%）。
5. 空亡与马星：必须考虑空亡带来的“象有实无”和马星带来的“动态变化”。

【当前排盘数据】：
${JSON.stringify(newBoard.palaces)}

【输出要求】：
- 严禁任何 Markdown 标记（如 ** 或 #）。
- 逻辑按“第一步：审局”、“第二步：辨主客”、“第三步：析胜算”输出。
- 语言风格：专业、沉稳、充满洞察力。`;

      // 调用本地中间件地址，彻底解决 Failed to fetch (CORS) 问题
      const response = await fetch('/api/volc-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userInput }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || '连接服务器失败');
      }

      // 处理 SSE 流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break;
              try {
                const data = JSON.parse(dataStr);
                const content = data.choices[0]?.delta?.content || "";
                fullText += content;
                setPrediction(fullText);
              } catch (e) {
                // 忽略碎片化数据解析错误
              }
            }
          }
        }
      }

    } catch (err: any) {
      console.error('Prediction Error:', err);
      setError(`时空连接受阻：${err.message || '请检查 Vercel 环境变量配置'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 parchment-bg overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="mb-12 relative inline-block animate-glow">
             <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full"></div>
             <h1 className="text-7xl font-bold text-slate-100 mb-4 qimen-font tracking-[0.5em] relative">奇门大师课</h1>
             <p className="text-amber-500/60 text-xs tracking-[0.8em] font-light uppercase">QiMen Strategic Intelligence</p>
          </div>
          
          <div className="space-y-8 mb-16">
            <p className="text-slate-400 text-sm tracking-[0.2em] leading-relaxed italic">
              "善弈者谋势，不善弈者谋子"
              <br/>
              —— 欢迎进入正统奇门遁甲实战预测平台
            </p>
            <div className="h-px w-24 bg-amber-900/30 mx-auto"></div>
          </div>

          <button 
            onClick={handleEnterSystem} 
            className="group relative px-24 py-5 overflow-hidden rounded-full border border-amber-600/30 text-amber-500 font-black hover:text-white transition-all duration-1000"
          >
            <div className="absolute inset-0 bg-amber-600 translate-y-[101%] group-hover:translate-y-0 transition-transform duration-700 ease-out"></div>
            <span className="relative z-10 tracking-[0.6em] text-sm">启卦入局</span>
          </button>

          <div className="mt-20 text-[10px] text-slate-600 tracking-widest uppercase opacity-50">
             Official Domain: qimenmasterclass.cn
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] parchment-bg p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-7xl w-full flex flex-col gap-12">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <section className="space-y-12">
            <div className="bg-slate-900/80 rounded-[2.5rem] border border-slate-800/50 p-10 shadow-3xl backdrop-blur-2xl ring-1 ring-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                 <span className="text-8xl qimen-font">卦</span>
              </div>
              <h2 className="text-[11px] text-amber-500 font-black uppercase tracking-[0.5em] mb-10 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></span>
                时空参数录入
              </h2>
              <InputForm onPredict={handlePredict} isLoading={loading} />
            </div>
            
            {board && (
              <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
                <BoardGrid board={board} />
              </div>
            )}
          </section>

          <section className="bg-slate-950/40 rounded-[3.5rem] border border-slate-800/40 p-12 min-h-[900px] shadow-inner backdrop-blur-sm relative flex flex-col">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.03] pointer-events-none"></div>
             
             <div className="flex-1 relative z-10">
              {loading && !prediction ? (
                <div className="flex flex-col items-center justify-center h-[700px] gap-12">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 border-[6px] border-amber-500/5 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-4 border-[6px] border-amber-500/5 border-b-amber-600 rounded-full animate-spin-reverse opacity-40"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-amber-500 text-3xl font-bold animate-pulse">☯</span>
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <p className="text-amber-500 text-sm tracking-[0.6em] font-black uppercase">火山引擎 深度演算中</p>
                    <p className="text-slate-500 text-[10px] tracking-widest max-w-[280px] leading-relaxed mx-auto">正在通过边缘计算网关调用火山引擎 API，进行深度时空演算...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-[700px]">
                  <div className="p-16 border border-red-900/20 rounded-[3rem] bg-red-950/5 text-center max-w-sm backdrop-blur-2xl">
                    <div className="text-red-500 text-4xl mb-6">⚠️</div>
                    <p className="text-red-300 text-xs mb-10 font-light leading-relaxed tracking-wider">{error}</p>
                    <button onClick={() => setError('')} className="w-full py-4 bg-red-900/20 text-red-500 text-[11px] rounded-2xl border border-red-900/30 uppercase tracking-[0.4em] font-black hover:bg-red-900/40 transition-all">重启天机</button>
                  </div>
                </div>
              ) : prediction ? (
                <div className="space-y-12 pb-16">
                  <AnalysisDisplay prediction={prediction} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[700px] text-slate-800/30 group">
                  <div className="text-8xl mb-12 select-none transition-all duration-[2000ms] group-hover:rotate-[360deg] opacity-20">☯</div>
                  <span className="text-5xl qimen-font tracking-[1.5em] select-none text-slate-800/50 translate-x-[0.75em]">静待天机</span>
                  <div className="mt-10 h-px w-32 bg-slate-800/20"></div>
                </div>
              )}
            </div>
          </section>
        </div>
        
        <Footer />
      </div>
    </div>
  );
};

export default App;
