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
3. 动态博弈：分析值符（${newBoard.zhiFuStar}）与值使（${newBoard.zhiShiGate}）落宫生克。
4. 概率化决策：强调预测是为了决策。必须给出明确的“胜算概率”（0%-100%）。
5. 空亡与马星：必须考虑空亡带来的“象有实无”和马星带来的“动态变化”。

【当前排盘数据】：
${JSON.stringify(newBoard.palaces)}

【输出要求】：
- 严禁任何 Markdown 标记（如 ** 或 #）。
- 逻辑按“第一步：审局”、“第二步：辨主客”、“第三步：析胜算”输出。
- 语言风格：专业、沉稳、充满洞察力。`;

      // 使用绝对路径或相对路径，取决于部署环境
      // 在 Vercel 部署后，/api/ark-proxy 将指向同源的 Edge Function
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
      }).catch(err => {
        // 捕获网络层面的 "Failed to fetch" 错误
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          throw new Error('时空连接中断：无法访问预测服务器。请确保 API 服务已部署或网络连接正常。');
        }
        throw err;
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: '时空链路响应异常', detail: `状态码: ${response.status}` }));
        throw new Error(errJson.error || errJson.detail || `HTTP 错误 ${response.status}`);
      }

      // 处理流式响应 (SSE)
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";
      let buffer = ""; // 用于处理被截断的 JSON 行

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // 将新读取的数据块与缓冲区内容合并
          buffer += decoder.decode(value, { stream: true });
          
          // 按行分割并处理每行数据
          const lines = buffer.split("\n");
          // 最后一行可能是不完整的，保留在缓冲区中
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
                // 如果解析失败，说明这一行可能是被截断的，尝试将其放回缓冲区
                console.warn('JSON 碎片解析失败，等待下一块数据:', trimmed);
                // 这种情况理论上在使用了 split 后的 buffer 机制中极少发生
              }
            }
          }
        }
      }

    } catch (err: any) {
      console.error('演算失败详情:', err);
      setError(err.message || '未知时空扰动');
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
             <p className="text-amber-500/60 text-xs tracking-[0.8em] font-black uppercase">Official System</p>
          </div>
          <button 
            onClick={handleEnterSystem}
            className="group relative px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-2xl hover:shadow-amber-500/40"
          >
            <span className="relative z-10 tracking-[1em] pl-4">开启演算</span>
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
              九维时空分析
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
                  [Error Check]: 检查 Vercel Settings -> Environment Variables 是否已配置 ARK_API_KEY 与 ARK_ENDPOINT_ID。
                </div>
              </div>
            )}

            {prediction && <AnalysisDisplay prediction={prediction} />}
            
            {!loading && !prediction && !error && (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic tracking-widest text-center px-12">
                 请在左侧输入您想要预测的问题，系统将通过火山引擎大模型进行深度理法推演。
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