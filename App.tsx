
import React, { useState } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard } from './qimenLogic';
import { QiMenBoard } from './types';

/**
 * 奇门大师课 - www.qimenmasterclass.cn 官方主站
 */
const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [modelId, setModelId] = useState<string>(localStorage.getItem('QIMEN_ENDPOINT_ID') || '');
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnterSystem = () => {
    setIsEntered(true);
  };

  const saveModelId = (id: string) => {
    const cleanId = id.trim();
    setModelId(cleanId);
    localStorage.setItem('QIMEN_ENDPOINT_ID', cleanId);
  };

  const handlePredict = async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    if (!modelId) {
      setError("请先在左侧输入框填入您的推理接入点 ID (Endpoint ID)");
      return;
    }

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
- 局数：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局 (${newBoard.solarTerm})
- 九宫数据：${JSON.stringify(newBoard.palaces)}

【要求】：严禁 Markdown 符号。必须包含具体概率值。深度引用林毅理法。`;

      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
          ]
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.details || json.error || '连接服务器失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('流读取器初始化失败');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const l = line.trim();
          if (!l || l === 'data: [DONE]') continue;
          
          let dataStr = l;
          if (l.startsWith('data:')) dataStr = l.slice(5).trim();

          try {
            const json = JSON.parse(dataStr);
            const content = json.choices?.[0]?.delta?.content || 
                           json.choices?.[0]?.message?.content || 
                           json.content || '';
            if (content) {
              accumulated += content;
              setPrediction(accumulated);
            }
          } catch (e) {
            // 忽略解析失败的 chunk
          }
        }
      }

    } catch (err: any) {
      console.error('Frontend Error:', err);
      setError(`演算异常：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center parchment-bg">
        <div className="max-w-md w-full">
          <h1 className="text-4xl font-bold text-slate-100 mb-4 qimen-font tracking-[0.2em]">奇门大师课</h1>
          <p className="text-amber-700/80 text-xs mb-12 tracking-[0.5em] font-light">WWW.QIMENMASTERCLASS.CN</p>
          <button onClick={handleEnterSystem} className="px-16 py-4 border border-amber-600/40 rounded-full text-amber-500 font-bold hover:bg-amber-600/10 transition-all">
            进入系统
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parchment-bg p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-6xl w-full flex flex-col gap-8">
        <Header />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="space-y-6">
            <div className="bg-slate-900/95 rounded-3xl border border-slate-800 p-8 shadow-2xl">
              <div className="mb-6">
                <label className="text-[10px] text-slate-500 block uppercase tracking-widest font-bold mb-2">推理接入点 ID</label>
                <input 
                  type="text" 
                  value={modelId} 
                  onChange={(e) => saveModelId(e.target.value)}
                  placeholder="ep-202xxxx-xxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-400 font-mono outline-none"
                />
              </div>
              <InputForm onPredict={handlePredict} isLoading={loading} />
            </div>
            {board && <BoardGrid board={board} />}
          </section>

          <section className="bg-slate-900/80 rounded-3xl border border-slate-800 p-8 min-h-[600px] shadow-2xl backdrop-blur-md">
            {loading && !prediction ? (
              <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                <p className="text-amber-500 text-xs tracking-widest">正在拨动时空盘局...</p>
              </div>
            ) : error ? (
              <div className="p-8 border border-red-900/30 rounded-2xl bg-red-950/20 text-center">
                <p className="text-red-400 text-xs mb-4">{error}</p>
                <button onClick={() => setError('')} className="text-red-500 text-[10px] font-bold uppercase tracking-widest">重新连接</button>
              </div>
            ) : prediction ? (
              <AnalysisDisplay prediction={prediction} />
            ) : (
              <div className="flex items-center justify-center h-[500px] text-slate-800">
                <span className="text-2xl qimen-font tracking-[0.5em]">静待天机</span>
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
