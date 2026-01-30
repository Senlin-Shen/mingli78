
import React, { useState, useEffect } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay.tsx';
import BoardGrid from './components/BoardGrid.tsx';
import Header from './components/Header.tsx';
import InputForm from './components/InputForm.tsx';
import { calculateBoard } from './qimenLogic.ts';
import { QiMenBoard } from './types.ts';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [modelId, setModelId] = useState<string>(localStorage.getItem('DOUBAO_MODEL_ID') || '');
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
      setHasKey(false);
    }
  }, []);

  const handlePredict = async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    if (!process.env.API_KEY) {
      setError('检测到 API 密钥配置缺失，请在 Vercel 环境变量中设置。');
      return;
    }

    if (!modelId) {
      setError('请输入豆包推理接入点 ID (Endpoint ID)。');
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
      // 适配豆包 Ark 平台的 OpenAI 兼容协议
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_KEY}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'system',
              content: `你是一位精通传统奇门遁甲体系的预测专家。
              
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
- 九宫数据：${JSON.stringify(newBoard.palaces)}`
            },
            {
              role: 'user',
              content: userInput
            }
          ],
          temperature: 0.6
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '请求失败');
      }

      const data = await response.json();
      setPrediction(data.choices[0].message.content || '演算未获响应。');

    } catch (err: any) {
      console.error(err);
      setError('时空演算中断：' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const saveModelId = (id: string) => {
    setModelId(id);
    localStorage.setItem('DOUBAO_MODEL_ID', id);
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-amber-900/50 rounded-3xl p-8 shadow-2xl">
          <div className="text-amber-500 text-5xl mb-6">⚙️</div>
          <h1 className="text-2xl font-bold text-slate-100 mb-4">需配置 API 密钥</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            为了支持中国大陆 IP 正常访问，请在 Vercel 中配置您的<b>豆包 API 密钥</b>：
          </p>
          <div className="bg-slate-800 rounded-xl p-4 text-left mb-8 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-amber-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">1</span>
              <span className="text-slate-300 text-xs">前往 Vercel 项目的 <b>Settings</b></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-amber-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">2</span>
              <span className="text-slate-300 text-xs">添加变量 <b>API_KEY</b> (填入豆包 API Key)</span>
            </div>
          </div>
          <p className="text-slate-500 text-[10px] italic">完成后 Redeploy 即可。目前已针对中国大陆线路深度优化。</p>
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
            {/* 豆包模型配置区 */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-700 p-6 shadow-xl backdrop-blur-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-amber-500 font-bold flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  豆包 AI 引擎已就绪
                </h2>
              </div>
              <div className="mb-4">
                <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wider">推理接入点 ID (Endpoint ID)</label>
                <input 
                  type="text" 
                  value={modelId} 
                  onChange={(e) => saveModelId(e.target.value)}
                  placeholder="例如: ep-2024..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-amber-200 focus:ring-1 focus:ring-amber-600 outline-none"
                />
                <p className="text-[9px] text-slate-600 mt-1">请从字节跳动火山引擎控制台获取推理点 ID</p>
              </div>
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
                <p className="animate-pulse text-sm font-bold">豆包大模型正在演算时空变量...</p>
                <p className="text-[10px] text-slate-500">已连接至大陆专属高性能计算节点</p>
              </div>
            ) : error ? (
              <div className="text-red-400 p-6 border border-red-900/30 rounded-xl bg-red-900/10 text-xs leading-loose">
                <span className="font-bold block mb-1">推演提示：</span>
                {error}
              </div>
            ) : prediction ? (
              <div className="space-y-10">
                <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50">
                  <AnalysisDisplay prediction={prediction} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-slate-500 italic text-center p-8">
                <div className="w-24 h-24 border border-slate-800 rounded-full flex items-center justify-center mb-6 opacity-20">
                  <span className="text-4xl text-amber-500">☯</span>
                </div>
                <p className="text-sm">奇门无极，易理有踪。<br/>请选择场景并输入问题进行实战预测。</p>
              </div>
            )}
          </section>
        </div>
      </div>
      
      <footer className="w-full py-8 text-slate-500 text-[10px] md:text-xs opacity-60 text-center space-y-2 border-t border-slate-800/50 mt-auto">
        <div>奇门遁甲实战预测系统 · 豆包 AI 引擎版</div>
        <div>已针对中国大陆网络环境优化 · 易理逻辑由大模型深度推理</div>
      </footer>
    </div>
  );
};

export default App;
