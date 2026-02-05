
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
      const systemInstruction = `你是一位精通正统体系的“奇门当代应用”实战分析专家。你的分析不限于玄学，更融合了现代行为科学、中西医学逻辑以及经济学视野。

【奇门理法体系核心】：
1. 拆补定局：一切分析建立在 ${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 的基础上。
2. 核心分析维度：
   - 投资决策：分析市场趋势与资金动向（戊落宫），尤其关注虚拟经济、文化产业等新兴领域，判断时机与风险。
   - 事业创业：运用“十二长生”（如“胎”位判断萌芽酝酿期）评估项目阶段，指导静守筹备或发力推进，规避盲目投入。
   - 感情人际：以乙代表女方、庚代表男方，结合宫位神煞分析关系走向、萌芽状态及沟通契机。
   - 健康养生：重点观测天芮星（病星）落宫，结合五行分析身体隐患（如木主肝胆、水主肾泌），提供体检建议与日常调养方向（涵盖中西医常识）。
   - 学业择业：评估个人能量与机遇匹配度，给出学科调整或职场赛道选择的建议。
   - 日常择吉：利用八门（开门、休门等）选择吉时，用于签约、搬家、出行等当代生活场景。

【当前排盘数据】：
${JSON.stringify(newBoard.palaces)}

【输出要求】：
- 严禁任何 Markdown 标记。
- 逻辑清晰，分为：第一步：审局辨势、第二步：多维推演（结合具体场景）、第三步：行动建议。
- 风格：睿智、实战、既有传统韵味又符合现代逻辑，强调“胜算概率”。`;

      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
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
        const errJson = await response.json().catch(() => ({ error: '时空链路通讯失败' }));
        throw new Error(errJson.detail || errJson.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";
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
            if (!trimmed || trimmed === "data: [DONE]") continue;
            
            if (trimmed.startsWith("data: ")) {
              try {
                const jsonStr = trimmed.slice(6);
                const data = JSON.parse(jsonStr);
                const content = data.choices[0]?.delta?.content || "";
                fullContent += content;
                setPrediction(fullContent);
              } catch (e) {
                // 仅忽略解析不全的碎片
              }
            }
          }
        }
      }

    } catch (err: any) {
      console.error('演算失败:', err);
      setError(err.message || '未知时空扰动，请检查 API 配置');
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
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md min-h-[600px] flex flex-col">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm">贰</span>
              当代应用分析
            </h2>
            
            {loading && !prediction && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
                <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                <p className="text-xs tracking-[0.3em] animate-pulse">正在拨动干支齿轮...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-950/30 border border-red-900/50 p-6 rounded-2xl text-red-400 text-sm italic leading-relaxed">
                <div className="font-bold mb-2">演算受阻：</div>
                {error}
                <div className="mt-4 text-[10px] text-red-500/60 font-mono">
                  提示：请确保 Vercel 已配置 ARK_API_KEY。
                </div>
              </div>
            )}

            {prediction && <AnalysisDisplay prediction={prediction} />}
            
            {!loading && !prediction && !error && (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic tracking-widest text-center px-12">
                 请在左侧输入预测问题，系统将根据当代应用逻辑为您进行深度推演。
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
