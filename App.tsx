
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaZiChart from './components/BaZiChart';
import BaziResult from './components/BaziResult';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import ProfilePanel from './components/ProfilePanel';
import { calculateBoard } from './qimenLogic';
import { useBazi } from './hooks/useBazi';
import { QiMenBoard, LocationData, AppMode, LiuYaoInput, BaZiInput } from './types';
import { BaziResultData } from './types/bazi.types';

// 火山引擎 Ark 模型 ID (用户指定的火山API)
const UNIFIED_MODEL = "ep-20260206175318-v6cl7";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface PredictionHistory {
  id: string;
  timestamp: number;
  mode: AppMode;
  input: string;
  result: string;
  board?: QiMenBoard | null;
  baziData?: BaziResultData | null;
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('QIMEN');
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [baziData, setBaziData] = useState<BaziResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [displayPrediction, setDisplayPrediction] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [history, setHistory] = useState<PredictionHistory[]>([]);
  
  const { getBaziResult } = useBazi();
  const fullTextRef = useRef('');

  // 历史记录持久化
  useEffect(() => {
    const saved = localStorage.getItem('qimen_prediction_history_v2');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('qimen_prediction_history_v2', JSON.stringify(history));
    }
  }, [history]);

  // 使用火山引擎代理接口进行流式响应
  const streamResponse = async (messages: ChatMessage[]) => {
    fullTextRef.current = '';
    setDisplayPrediction('');
    
    try {
      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.3,
          model: UNIFIED_MODEL
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '服务响应异常');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('无法读取响应流');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const jsonStr = line.trim().slice(6);
            if (jsonStr === '[DONE]') break;
            try {
              const data = JSON.parse(jsonStr);
              const content = data.choices[0]?.delta?.content || "";
              fullTextRef.current += content;
              setDisplayPrediction(fullTextRef.current);
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      return fullTextRef.current;
    } catch (err: any) {
      console.error("Ark Proxy Error:", err);
      throw err;
    }
  };

  const handlePredict = useCallback(async (userInput: any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    setChatHistory([]);
    setBoard(null);
    setBaziData(null);

    let systemInstruction = "";
    let finalUserInput = "";
    let activeBoard: QiMenBoard | null = null;
    let activeBazi: BaziResultData | null = null;

    // 两步走逻辑：1. 立即计算并展示排盘结果；2. 发起 AI 深度解析
    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, 120);
      setBoard(activeBoard);
      finalUserInput = `[奇门起局数据] ${JSON.stringify(activeBoard)}。\n[诉求] ${userInput}`;
      systemInstruction = `你是一位精通奇门遁甲的实战预测专家。请基于以上盘局，重点分析星、门、神、干的互动，给出符合易理的专业化推演建议。`;
    } else if (mode === 'YI_LOGIC' && type === 'BA_ZI') {
      const input = userInput as BaZiInput;
      // 第一步：瞬时生成排盘结果
      activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
      setBaziData(activeBazi);
      
      // 第二步：构建 AI 提示词
      finalUserInput = `【排盘结果】${JSON.stringify(activeBazi)}\n【命主诉求】${input.question || '综合运势解析'}`;
      systemInstruction = `你是一位精通林毅奇门遁甲体系与八字气象论的专家。请基于提供的干支、十神、大运及藏干数据，进行深度全息分析，重点讨论气象平衡与现代职场/生活建议。`;
    } else if (mode === 'TCM_AI') {
      finalUserInput = userInput;
      systemInstruction = `你是一位精通传统中医全息调理的专家。请分析患者描述的症状，判明虚实寒热，并给出病机解析与调理方案。`;
    }

    try {
      const result = await streamResponse([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: finalUserInput }
      ]);
      setChatHistory([{ role: 'assistant', content: result }]);

      // 存入历史记录
      const newEntry: PredictionHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        mode,
        input: typeof userInput === 'string' ? userInput : (userInput.question || userInput.name || '时空推演'),
        result,
        board: activeBoard,
        baziData: activeBazi
      };
      setHistory(prev => [newEntry, ...prev].slice(0, 50));
    } catch (err: any) {
      setError(err.message || '推演连接超时或异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [mode, getBaziResult]);

  const handleLoadHistory = (entry: PredictionHistory) => {
    setMode(entry.mode);
    setBoard(entry.board || null);
    setBaziData(entry.baziData || null);
    setDisplayPrediction(entry.result);
    setChatHistory([{ role: 'assistant', content: entry.result }]);
    setIsProfileOpen(false);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleClearHistory = () => {
    if (window.confirm('确认清除所有历史推演记录？')) {
      setHistory([]);
      localStorage.removeItem('qimen_prediction_history_v2');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col parchment-bg">
      <Header onOpenProfile={() => setIsProfileOpen(true)} />
      
      <div className="bg-slate-900/90 border-y border-rose-500/20 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex h-16 px-4">
          <button onClick={() => setMode('QIMEN')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'QIMEN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>奇门</button>
          <button onClick={() => setMode('YI_LOGIC')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'YI_LOGIC' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>易理</button>
          <button onClick={() => setMode('TCM_AI')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'TCM_AI' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>中医</button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs text-center font-black animate-pulse">
            {error}
          </div>
        )}
        
        <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
        
        {/* 数据可视化层：计算完成后立即展示 */}
        {board && <BoardGrid board={board} />}
        {baziData && <BaziResult data={baziData} />}

        {/* AI 解析显示层 */}
        {(displayPrediction || chatHistory.length > 0) && (
          <section className="bg-slate-950/80 border border-rose-900/20 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
             {/* 装饰性背景 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] pointer-events-none"></div>
            
            <div className="mb-8 border-b border-rose-900/10 pb-4 flex items-center justify-between">
              <span className="text-[10px] text-rose-500 font-black tracking-[0.5em] uppercase">全息逻辑推演 · Insight Matrix</span>
              {loading && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 animate-pulse">正在转动玄枢...</span>
                  <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <AnalysisDisplay prediction={displayPrediction || chatHistory[0]?.content} />
          </section>
        )}
      </main>
      
      <Footer />

      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        history={history}
        onLoadHistory={handleLoadHistory}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
};

export default App;
