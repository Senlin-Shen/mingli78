
import React, { useState, useEffect } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay.tsx';
import BoardGrid from './components/BoardGrid.tsx';
import Header from './components/Header.tsx';
import InputForm from './components/InputForm.tsx';
import { calculateBoard } from './qimenLogic.ts';
import { QiMenBoard } from './types.ts';

/**
 * App component - Main entry point for the QiMen prediction system.
 * Optimized for Mainland China access using ByteDance Ark (Doubao) API.
 */
const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  // Default to a common Doubao/DeepSeek endpoint ID if not set
  const [modelId, setModelId] = useState<string>(localStorage.getItem('QIMEN_MODEL_ID') || 'deepseek-v3-2-251201');
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
      const systemPrompt = `你是一位精通传统奇门遁甲体系的预测专家。
              
【核心要求】：
- 结果中严禁使用任何 "*"、"#" 或 "##" 符号。
- 每一节标题直接写为“第一步：...”的形式，不要带任何 Markdown 格式。
- 必须提供具体的【成功概率】或【风险百分比】（基于理法推算）。
- 解析基于盘面符号（星、门、神、仪）的生克关系，引用具体理法，如“五不遇时”、“青龙返首”等。
- 提供具体的方位、时辰、行为建议或调理方案。
- 严禁幻觉：只解析当前提供的九宫数据。

【当前盘局】：
- 类型：${type === 'SHI_JU' ? '事局' : '命局'}
- 时间：${newBoard.targetTime}
- 局数：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 (${newBoard.solarTerm})
- 值符：${newBoard.zhiFuStar}，值使：${newBoard.zhiShiGate}
- 九宫数据：${JSON.stringify(newBoard.palaces)}`;

      // Use the provided ByteDance Ark v3 responses endpoint
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          stream: true,
          tools: [
            {
              type: "web_search",
              max_keyword: 3
            }
          ],
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: systemPrompt
                }
              ]
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: userInput
                }
              ]
            }
          ]
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `请求失败: ${response.status}`);
      }

      if (!response.body) throw new Error('响应正文为空');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
          
          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.slice(5).trim();
            try {
              const json = JSON.parse(dataStr);
              // Ark API v3 response structure for streaming choice deltas
              const content = json.choices?.[0]?.delta?.content || '';
              if (content) {
                accumulatedText += content;
                setPrediction(accumulatedText);
              }
            } catch (e) {
              // Ignore partial JSON or meta data
            }
          }
        }
      }

    } catch (err: any) {
      console.error(err);
      setError('演算中断：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const saveModelId = (id: string) => {
    setModelId(id);
    localStorage.setItem('QIMEN_MODEL_ID', id);
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center parchment-bg">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-700">
          <div className="w-32 h-32 mx-auto mb-8 relative">
             <div className="absolute inset-0 border-2 border-amber-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
             <div className="absolute inset-4 border border-amber-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
             <div className="absolute inset-0 flex items-center justify-center text-5xl text-amber-500 qimen-font">
                易
             </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2 qimen-font tracking-widest">奇门遁甲预测系统</h1>
          <p className="text-amber-600/80 text-sm mb-12 tracking-[0.3em]">数字化时空建模 · 大陆直连优化</p>
          
          <button 
            onClick={handleEnterSystem}
            className="group relative px-12 py-3 bg-transparent border border-amber-600/50 rounded-full text-amber-500 font-bold overflow-hidden transition-all hover:border-amber-500"
          >
            <span className="relative z-10">进入系统</span>
            <div className="absolute inset-0 bg-amber-600/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
          </button>
          
          <p className="mt-16 text-slate-600 text-[10px] leading-loose">
            基于传统奇门理法体系构建<br/>
            字节跳动豆包 Ark AI 引擎支持
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parchment-bg p-4 md:p-8 flex flex-col items-center overflow-y-auto animate-in fade-in duration-500">
      <div className="max-w-6xl w-full flex flex-col gap-8">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-12">
          <section className="flex flex-col gap-6 lg:sticky lg:top-8">
            <div className="bg-slate-900/90 rounded-2xl border border-slate-700 p-6 shadow-xl backdrop-blur-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-amber-500 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  引擎配置 (豆包 Ark)
                </h2>
                <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-400">大陆直连模式</span>
              </div>
              
              <div className="mb-6 space-y-2">
                <label className="text-[10px] text-slate-500 block uppercase tracking-widest font-bold">接入点 ID (Endpoint ID)</label>
                <input 
                  type="text" 
                  value={modelId} 
                  onChange={(e) => saveModelId(e.target.value)}
                  placeholder="例如: ep-2025..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-400 focus:ring-1 focus:ring-amber-600 outline-none transition-all placeholder:opacity-30"
                />
                <p className="text-[9px] text-slate-600 italic">请填入火山引擎控制台生成的推理接入点 ID</p>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <InputForm onPredict={handlePredict} isLoading={loading} />
              </div>
            </div>
            
            {board && (
              <div className="bg-slate-950 rounded-2xl border-2 border-slate-800 p-6 shadow-2xl">
                <h2 className="text-amber-600 font-bold mb-4 text-center tracking-widest uppercase text-sm">专业排盘</h2>
                <BoardGrid board={board} />
              </div>
            )}
          </section>

          <section className="bg-slate-900/80 rounded-2xl border border-slate-700 p-6 min-h-[600px] shadow-2xl backdrop-blur-sm">
            {loading && !prediction ? (
              <div className="flex flex-col items-center justify-center h-[500px] gap-6 text-amber-400">
                <div className="relative w-20 h-20">
                   <div className="absolute inset-0 border-4 border-amber-400/20 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-bold text-sm tracking-widest">正在拨动时空罗盘...</p>
                  <p className="text-[10px] text-slate-500 animate-pulse">豆包 AI 正在大陆节点进行高能演算</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-8 border border-red-900/30 rounded-2xl bg-red-900/10">
                <h4 className="text-red-500 font-bold mb-3 flex items-center gap-2">
                  <span>演算异常</span>
                </h4>
                <p className="text-red-400/80 text-sm leading-relaxed">{error}</p>
                <button 
                  onClick={() => setError('')}
                  className="mt-6 text-xs text-red-500/60 hover:text-red-500 underline underline-offset-4"
                >
                  清除错误
                </button>
              </div>
            ) : prediction ? (
              <div className="animate-in fade-in duration-300">
                 <AnalysisDisplay prediction={prediction} />
                 {loading && <div className="mt-4 text-[10px] text-amber-500 animate-pulse flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    演算文字输出中...
                 </div>}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-slate-600 gap-4">
                <div className="w-16 h-16 border border-slate-800 rounded-full flex items-center justify-center">
                  <span className="text-2xl opacity-20">卦</span>
                </div>
                <p className="text-xs tracking-widest uppercase">等待拨动时空以开启解析</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
