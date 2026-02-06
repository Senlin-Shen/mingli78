
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
    const saved = localStorage.getItem('qimen_history_v7');
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
      localStorage.setItem('qimen_history_v7', JSON.stringify(history));
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

  const streamResponse = async (messages: ChatMessage[]) => {
    if (isStreamingRef.current) return; 
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

      if (!response.ok) throw new Error('星盘连接异常，请稍后重试');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('读取器未就绪');

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

    let systemInstruction = "";
    let finalUserInput = "";
    let activeBoard: QiMenBoard | null = null;
    let activeBazi: BaziResultData | null = null;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, 120);
      setBoard(activeBoard);
      finalUserInput = `[任务：奇门全息解析]\n盘面数据：${JSON.stringify(activeBoard)}\n诉求：${userInput}`;
      systemInstruction = `你是一位精通林毅老师体系的奇门专家。严禁使用 Markdown 符号。重点分析气象平衡。`;
    } else if (mode === 'YI_LOGIC') {
      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi);
        
        systemInstruction = `八字命理分析AI专家提示词（生产环境版）

你是一位精通中国传统命理学，同时融合现代心理学、行为科学、商业战略的人生系统优化顾问。
分析必须遵循“病药→调候→通关”三重验证。严禁 Markdown 符号（如 #, *, **）。

输出结构标准：
一、 命盘基础信息
- 八字：干支四柱
- 十神：分布情况
- 大运：当前大运与年份范围

二、 命格核心诊断
1. 能量状态（日主旺衰判断、五行强弱、是否偏枯）
2. 用神判定（详细推导病药、调候、通关逻辑，给出主用神、次用神、喜神、忌神）
3. 格局特征（格局名称、成败关键、优势特质、成长方向）

三、 多维优化方案
- 环境能量调整（吉位、色彩、材质物品布置）
- 事业发展策略（适配行业第一/第二梯队、能力重心、合作建议）
- 财富管理建议（财星状态、要求求财方式、风险警戒、周期建议）
- 情感关系指导（择偶倾向、相处模式、关键流年）
- 健康养生要点（重点关注脏腑、饮食作息、五行平衡功法）
- 运势节奏把握（当前大运解读、未来三年机遇与挑战）

四、 综合建议总结
150字个性化实操总结，包含医学、商业、行为小事。`;

        const p = activeBazi.pillars;
        finalUserInput = `[命局详情] 姓名：${input.name || '命主'} 性别：${input.gender} 公历：${input.birthDate} 时辰：${input.birthTime || '不详'}
排盘：${p.year.stem}${p.year.branch} ${p.month.stem}${p.month.branch} ${p.day.stem}${p.day.branch} ${p.hour.stem}${p.hour.branch}
诉求：${input.question || '请综合分析命局气象。'}`;
      } else {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[六爻卦象] 卦数：${input.numbers.join(', ')} 诉求：${input.question}`;
        systemInstruction = `六爻推演专家。分析月建日辰对用神影响。严禁 Markdown。`;
      }
    } else if (mode === 'TCM_AI') {
      finalUserInput = userInput;
      systemInstruction = `中医调理专家。全息失衡判定、病机解析、调理原则、综合方案。严禁 Markdown。`;
    }

    try {
      const result = await streamResponse([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: finalUserInput }
      ]);

      const historyInput: string = typeof userInput === 'string' 
        ? userInput 
        : (userInput.question || userInput.name || '深度全息推演');

      const newEntry: PredictionHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        mode,
        input: historyInput,
        result: result || '',
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
        {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs text-center font-black animate-pulse">{error}</div>}
        
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
              <p className="text-[10px] text-emerald-500 font-black tracking-[0.6em] uppercase">逻辑引擎推演中 · Processing</p>
              <p className="text-[12px] text-slate-500 italic font-serif">正在链接医学、商业与实战数据库，审视寒暖燥湿气象...</p>
            </div>
          </section>
        )}

        {displayPrediction && (
          <section className="bg-slate-950/80 border border-rose-900/20 p-8 md:p-14 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
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
