
import React, { useState } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay.tsx';
import BoardGrid from './components/BoardGrid.tsx';
import Header from './components/Header.tsx';
import InputForm from './components/InputForm.tsx';
import { calculateBoard } from './qimenLogic.ts';
import { QiMenBoard } from './types.ts';

/**
 * 奇门遁甲实战预测系统 - 方案1：后端代理版
 */
const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [modelId, setModelId] = useState<string>(localStorage.getItem('QIMEN_ENDPOINT_ID') || 'deepseek-v3-2-251201');
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnterSystem = () => {
    setIsEntered(true);
  };

  const saveModelId = (id: string) => {
    setModelId(id);
    localStorage.setItem('QIMEN_ENDPOINT_ID', id);
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
      const systemPrompt = `你是一位精通林毅老师体系的奇门遁甲实战预测专家。
      
【起局参数】：
- 局势：${type === 'SHI_JU' ? '时事演算' : '命理推演'}
- 时间：${newBoard.targetTime}
- 局数：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 (${newBoard.solarTerm})
- 值符：${newBoard.zhiFuStar}，值使：${newBoard.zhiShiGate}
- 九宫数据：${JSON.stringify(newBoard.palaces)}

【预测要求】：
1. 严禁 Markdown 格式符号。
2. 标题为：第一步：[标题]，第二步：[标题]...
3. 必须包含【成功概率】或【风险百分比】。
4. 引用具体理法。`;

      // 注意：这里改为调用我们自己的后端代理接口
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `${systemPrompt}\n\n用户问题：${userInput}`
                }
              ]
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `代理请求失败 (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('解析流无法建立');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data:')) {
            try {
              const dataStr = trimmed.slice(5).trim();
              const json = JSON.parse(dataStr);
              const content = json.choices?.[0]?.delta?.content || '';
              if (content) {
                accumulated += content;
                setPrediction(accumulated);
              }
            } catch (e) {
              // 忽略解析失败的块
            }
          }
        }
      }

    } catch (err: any) {
      console.error('Fetch Error:', err);
      setError(`演算异常：${err.message || '后端连接中断'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center parchment-bg">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-1000">
          <div className="relative w-40 h-40 mx-auto mb-10">
            <div className="absolute inset-0 border-2 border-amber-600/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
            <div className="absolute inset-4 border border-amber-500/10 rounded-full animate-[spin_12s_linear_infinite_reverse]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl text-amber-500 qimen-font drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">易</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-100 mb-4 qimen-font tracking-[0.2em]">奇门遁甲实战预测</h1>
          <p className="text-amber-700/80 text-xs mb-12 tracking-[0.5em] font-light">九维时空 · 后端代理模式 (Doubao)</p>
          
          <button 
            onClick={handleEnterSystem}
            className="group relative px-16 py-4 bg-transparent border border-amber-600/40 rounded-full text-amber-500 font-bold overflow-hidden transition-all hover:border-amber-500"
          >
            <span className="relative z-10 tracking-widest">进入推演系统</span>
            <div className="absolute inset-0 bg-amber-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          </button>
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
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-amber-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  后端中转模式 (代理已启用)
                </h2>
              </div>

              <div className="mb-8 space-y-2">
                <label className="text-[10px] text-slate-500 block uppercase tracking-widest font-bold">接入点 ID (Endpoint ID)</label>
                <input 
                  type="text" 
                  value={modelId} 
                  onChange={(e) => saveModelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-400 focus:ring-1 focus:ring-amber-600 outline-none"
                />
              </div>

              <div className="pt-6 border-t border-slate-800">
                <InputForm onPredict={handlePredict} isLoading={loading} />
              </div>
            </div>
            
            {board && (
              <div className="bg-slate-950 rounded-3xl border-2 border-slate-800 p-8 shadow-2xl">
                <h2 className="text-amber-600 font-bold mb-6 text-center tracking-[0.3em] uppercase text-sm qimen-font">当前盘局意象</h2>
                <BoardGrid board={board} />
              </div>
            )}
          </section>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-8 min-h-[700px] shadow-2xl backdrop-blur-md">
            {loading && !prediction ? (
              <div className="flex flex-col items-center justify-center h-[600px] gap-8">
                <div className="relative">
                  <div className="w-20 h-20 border-2 border-amber-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-t-2 border-amber-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-amber-500 font-bold text-sm tracking-[0.4em]">代理服务器正在请求时空数据</p>
              </div>
            ) : error ? (
              <div className="p-10 border border-red-900/30 rounded-3xl bg-red-950/10 text-center animate-in shake duration-500">
                <h4 className="text-red-500 font-bold mb-3">推演受阻</h4>
                <p className="text-red-400/80 text-xs leading-loose mb-8">{error}</p>
                <button 
                  onClick={() => setError('')}
                  className="px-8 py-2 bg-red-900/20 rounded-full text-[10px] text-red-500 hover:bg-red-900/40"
                >
                  重置干扰
                </button>
              </div>
            ) : prediction ? (
              <div className="animate-in fade-in duration-500">
                 <AnalysisDisplay prediction={prediction} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-slate-700 opacity-20">
                <span className="text-3xl qimen-font">等待显像</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
