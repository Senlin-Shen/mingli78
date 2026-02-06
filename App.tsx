
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaziResult from './components/BaziResult';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import ProfilePanel from './components/ProfilePanel';
import { calculateBoard } from './qimenLogic';
import { useBazi } from './hooks/useBazi';
import { QiMenBoard, AppMode, BaZiInput, LiuYaoInput } from './types';
import { BaziResultData } from './types/bazi.types';

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
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [error, setError] = useState('');
  const [displayPrediction, setDisplayPrediction] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [history, setHistory] = useState<PredictionHistory[]>([]);
  
  const { getBaziResult } = useBazi();
  const fullTextRef = useRef('');
  const isStreamingRef = useRef(false);
  const renderAnimationFrame = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('qimen_history_v6');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    return () => {
      if (renderAnimationFrame.current) cancelAnimationFrame(renderAnimationFrame.current);
    };
  }, []);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('qimen_history_v6', JSON.stringify(history));
    }
  }, [history]);

  const handleModeChange = (newMode: AppMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setBoard(null);
    setBaziData(null);
    setDisplayPrediction('');
    setError('');
    setLoading(false);
    setIsAiThinking(false);
    fullTextRef.current = '';
    isStreamingRef.current = false;
  };

  // 极致流畅流式渲染引擎
  const streamResponse = async (messages: ChatMessage[]) => {
    if (isStreamingRef.current) return; // 物理层防止并发导致的“重复结果”
    isStreamingRef.current = true;
    fullTextRef.current = '';
    setDisplayPrediction('');
    setIsAiThinking(true); 
    
    try {
      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          temperature: 0.3,
          model: UNIFIED_MODEL,
          stream: true
        })
      });

      if (!response.ok) throw new Error('星盘能量传导中断，请刷新重试');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('流读取异常');

      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') break;
          
          try {
            const data = JSON.parse(jsonStr);
            const content = data.choices[0]?.delta?.content || "";
            
            if (isFirstChunk && content.trim()) {
              setIsAiThinking(false);
              isFirstChunk = false;
            }

            fullTextRef.current += content;
            
            // 使用单帧渲染锁，确保在高频流式输入下 UI 依然丝滑且不会出现状态回溯
            if (!renderAnimationFrame.current) {
              renderAnimationFrame.current = requestAnimationFrame(() => {
                setDisplayPrediction(fullTextRef.current);
                renderAnimationFrame.current = null;
              });
            }
          } catch (e) {}
        }
      }
      return fullTextRef.current;
    } catch (err: any) {
      setIsAiThinking(false);
      throw err;
    } finally {
      isStreamingRef.current = false;
    }
  };

  const handlePredict = useCallback(async (userInput: any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    setBoard(null);
    setBaziData(null);

    // 基准专家指令（不含 markdown）
    const EXPERT_BASE = `你是一位精通传统命理与现代实战的深度咨询顾问。严禁使用 # 或 * 等 Markdown 符号，严禁加粗。

一、 核心分析逻辑：
1. 评估“气象”：凡命局与卦象，首看寒暖燥湿。
2. 识别“轴心”：寻月令格局、核心用神与忌神。
3. 推演“路径”：查看冲、合、空、破、回头克。

二、 实战建议维度（强制包含且不重复）：
1. 【医学/生理】：根据五行偏枯提供具体的脏腑调理、饮食结构。
2. 【现代科学/商业逻辑】：融入风险管理、概率评估或博弈论视角。
3. 【切实行动】：给出“明天就可以开始做”的一件物理层小事。`;

    let systemInstruction = EXPERT_BASE;
    let finalUserInput = "";
    let activeBoard: QiMenBoard | null = null;
    let activeBazi: BaziResultData | null = null;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, 120);
      setBoard(activeBoard);
      finalUserInput = `[任务：奇门解析]\n盘面：${JSON.stringify(activeBoard)}\n诉求：${userInput}`;
    } else if (mode === 'YI_LOGIC') {
      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi);
        
        systemInstruction = `你是一位精通子平八字与现代优化顾问的专家。严禁使用 Markdown 符号。输出结构强制如下：
一、 命盘基础信息
二、 命格核心诊断（包含日主旺衰、五行分布、病药分析、用神判定、格局特征）
三、 多维优化方案（环境能量调整、事业财富策略、情感关系指导、健康养生要点、近期运势节奏）
四、 综合建议总结（150字左右）

建议原则：
- 医学：结合五行提供脏腑调理建议。
- 科学：提供风险概率、行为心理方面的现代视角。
- 行动：必须有一个立即执行的物理动作。`;

        const p = activeBazi.pillars;
        finalUserInput = `[命局分析]
性别：${input.gender} | 公历：${input.birthDate} | 时辰：${input.birthTime || '不详'}
排盘：${p.year.stem}${p.year.branch} ${p.month.stem}${p.month.branch} ${p.day.stem}${p.day.branch} ${p.hour.stem}${p.hour.branch}
诉求：${input.question || '全局深度推演'}`;
      } else {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[六爻推演]\n卦象：${input.numbers.join(', ')}\n诉求：${input.question}`;
      }
    } else if (mode === 'TCM_AI') {
      finalUserInput = userInput;
      systemInstruction = `中医全息调理专家。一、失衡判定 二、病机解析 三、调理原则 四、方案建议。严禁 Markdown。`;
    }

    try {
      const result = await streamResponse([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: finalUserInput }
      ]);

      const newEntry: PredictionHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        mode,
        input: typeof userInput === 'string' ? userInput : (userInput.question || userInput.name || '深度推演'),
        result,
        board: activeBoard,
        baziData: activeBazi
      };
      setHistory(prev => [newEntry, ...prev].slice(0, 50));
    } catch (err: any) {
      setError(err.message || '系统繁忙，请重试');
    } finally {
      setLoading(false);
      setIsAiThinking(false);
    }
  }, [mode, getBaziResult]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col parchment-bg">
      <Header onOpenProfile={() => setIsProfileOpen(true)} />
      
      <div className="bg-slate-900/90 border-y border-rose-500/20 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex h-16 px-4">
          <button onClick={() => handleModeChange('QIMEN')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'QIMEN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>奇门</button>
          <button onClick={() => handleModeChange('YI_LOGIC')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'YI_LOGIC' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>易理</button>
          <button onClick={() => handleModeChange('TCM_AI')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'TCM_AI' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>中医</button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs text-center font-black">{error}</div>}
        <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
        
        {(board || baziData) && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
             {board && <BoardGrid board={board} />}
             {baziData && <BaziResult data={baziData} />}
          </div>
        )}

        {isAiThinking && (
          <section className="bg-slate-950/40 border border-emerald-900/10 p-16 rounded-[2.5rem] flex flex-col items-center justify-center gap-8 min-h-[350px]">
            <div className="relative">
              <div className="w-20 h-20 border-2 border-rose-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] text-rose-500 font-black animate-pulse">思</span></div>
            </div>
            <div className="text-center space-y-3">
              <p className="text-[10px] text-emerald-500 font-black tracking-[0.6em] uppercase">逻辑引擎构思中 · Processing</p>
              <p className="text-[12px] text-slate-500 italic font-serif">正在根据“气象论”审视寒暖燥湿，权衡五行能量流通...</p>
            </div>
          </section>
        )}

        {displayPrediction && (
          <section className="bg-slate-950/80 border border-rose-900/20 p-8 md:p-14 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 blur-[150px] pointer-events-none"></div>
            <AnalysisDisplay prediction={displayPrediction} />
          </section>
        )}
      </main>
      <Footer />
      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        history={history}
        onLoadHistory={(entry) => {
          handleModeChange(entry.mode);
          setBoard(entry.board || null);
          setBaziData(entry.baziData || null);
          setDisplayPrediction(entry.result);
          setIsProfileOpen(false);
        }}
        onClearHistory={() => setHistory([])}
      />
    </div>
  );
};

export default App;
