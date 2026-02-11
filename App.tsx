
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaziResult from './components/BaziResult';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import ProfilePanel from './components/ProfilePanel';
import TraditionalLoader from './components/TraditionalLoader';
import { calculateBoard } from './qimenLogic';
import { useBazi } from './hooks/useBazi';
import { QiMenBoard, AppMode, BaZiInput, LiuYaoInput, LocationData } from './types';
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
  status: 'loading' | 'completed' | 'error';
  board?: QiMenBoard | null;
  baziData?: BaziResultData | null;
  messages: ChatMessage[]; 
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
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  
  const { getBaziResult } = useBazi();
  const fullTextRef = useRef('');
  const isStreamingRef = useRef(false);
  const renderAnimationFrame = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('qimen_history_v12');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, isAdjusted: true }),
        () => console.log("Geolocation permission denied, using default longitude (120E)")
      );
    }

    return () => {
      if (renderAnimationFrame.current) cancelAnimationFrame(renderAnimationFrame.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('qimen_history_v12', JSON.stringify(history));
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
    setActiveHistoryId(null);
  };

  const streamResponse = async (messages: ChatMessage[], historyId: string) => {
    if (isStreamingRef.current) return ""; 
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
          temperature: 0.6,
          model: UNIFIED_MODEL,
          stream: true
        })
      });

      if (!response.ok) throw new Error('时空链路波动，请重试');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('读取器初始化失败');

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
            const content: string = data.choices[0]?.delta?.content || "";
            
            if (isFirstChunk && content.trim()) {
              setIsAiThinking(false);
              isFirstChunk = false;
            }

            fullTextRef.current += content;
            
            // 使用帧渲染优化，确保长文本渲染不掉帧、不漏字
            if (!renderAnimationFrame.current) {
              renderAnimationFrame.current = requestAnimationFrame(() => {
                setDisplayPrediction(fullTextRef.current);
                renderAnimationFrame.current = null;
              });
            }
          } catch (e) {}
        }
      }

      const finalResult = fullTextRef.current;
      
      setHistory(prev => prev.map(item => 
        item.id === historyId 
          ? { 
              ...item, 
              result: finalResult, 
              status: 'completed' as const, 
              messages: [...messages, { role: 'assistant' as const, content: finalResult }] 
            } 
          : item
      ));

      return finalResult;
    } catch (err: any) {
      setIsAiThinking(false);
      setHistory(prev => prev.map(item => 
        item.id === historyId ? { ...item, status: 'error' as const } : item
      ));
      throw err;
    } finally {
      isStreamingRef.current = false;
    }
  };

  const handlePredict = useCallback(async (userInput: any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    
    const historyId = Date.now().toString();
    setActiveHistoryId(historyId);

    let systemInstruction = "";
    let finalUserInput = "";
    let activeBoard: QiMenBoard | null = null;
    let activeBazi: BaziResultData | null = null;

    const currentLng = location?.longitude || 120;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, currentLng);
      setBoard(activeBoard);
      
      systemInstruction = `你是一位资深奇门遁甲时空建模与预测专家。请严格基于提供的盘面数据进行逻辑解析。
严禁使用 Markdown（#，*）。数字和关键指标必须清晰完整。

必须严格按以下结构输出，每个板块必须有独立的【】标题：
【⚖️ 时空起局公示】
- 测算时间：[干支四柱]
- 地理坐标：[城市及经纬度]
- 局式信息：[局数、值符、值使]

【🔍 盘局深度解析】
1. 用神状态：(定位关键用神，分析旺衰生克)
2. 时空环境：(利进攻/防守/等待)
3. 关键矛盾点：(核心阻碍或突破口)

【💡 预测结论】
(对趋势给出清晰肯定预判，必须包含确定性的百分比或量化评估)

【🚀 实战运筹建议】
- 心态指导：(对镜观心建议)
- 行为决策：(具体行动步骤，需列出 1. 2. 3. 条款)
- 空间优化：(利事方位建议)

报告审计完毕`;

      finalUserInput = `[用户诉求]：${userInput}\n[当前盘面数据]：${JSON.stringify(activeBoard)}\n[真太阳时]：${activeBoard.trueSolarTime}\n[地理坐标]：${location ? `北纬${location.latitude} 东经${location.longitude}` : '默认120E'}`;

    } else if (mode === 'YI_LOGIC') {
      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi);
        
        systemInstruction = `你是一位高级时空能量建模专家。基于“气象为先、流通为要、中和为贵”准则进行能量分析。
严禁神棍化，严禁使用 Markdown。报告需逻辑严密，保留所有数字和定量描述。

结构要求：
【📊 能量维度定量分析】
(对各项能量指标进行 1-100 打分)

【🧊 命局气象透视】
- 能效状态关键词
- 定量描述

【🤝 人际能量博弈】
- 社交站位分析

【⚙️ 核心运作逻辑】
- 动力与财富路径分析

【⏳ 时空波动窗口】
- 未来关键时间节点

【🛠️ 全息场景方案】
- 决策建议与微动作建议

报告审计完毕`;

        const p = activeBazi.pillars;
        finalUserInput = `[用户诉求]：${input.question || '全息能量分析'}
[背景信息]：性别 ${input.gender}，公历 ${input.birthDate} ${input.birthTime || '时辰不详'}，出生地 ${input.birthPlace}
[修正四柱]：${p.year.stem}${p.year.branch} ${p.month.stem}${p.month.branch} ${p.day.stem}${p.day.branch} ${p.hour.stem}${p.hour.branch}
[命盘详细参数]：${JSON.stringify(activeBazi)}`;
      } else {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻分析] 卦数：${input.numbers.join(', ')} 诉求：${input.question}`;
        systemInstruction = `你是一位六爻推演专家。以《增删卜易》为宗，分析需保留数字细节。结构：【一、卦象组合】 【二、用神旺衰】 【三、动变解析】 【四、最终定论】。报告审计完毕`;
      }
    } else {
      finalUserInput = userInput;
      systemInstruction = `中医全息调理专家。基于五行气象论分析。结构：【一、辨证分析】 【二、病机探讨】 【三、调理建议】 【四、生活禁忌】。报告审计完毕`;
    }

    const historyInput: string = typeof userInput === 'string' 
      ? userInput 
      : ((userInput as any).question || (userInput as any).name || '全息推演');

    const initialMessages: ChatMessage[] = [
      { role: 'system' as const, content: systemInstruction },
      { role: 'user' as const, content: finalUserInput }
    ];

    const newEntry: PredictionHistory = {
      id: historyId,
      timestamp: Date.now(),
      mode,
      input: historyInput,
      result: '',
      status: 'loading' as const,
      board: activeBoard,
      baziData: activeBazi,
      messages: initialMessages
    };

    setHistory(prev => [newEntry, ...prev].slice(0, 50));

    try {
      await streamResponse(initialMessages, historyId);
    } catch (err: any) {
      setError(err.message || '推演中断');
    } finally {
      setLoading(false);
      setIsAiThinking(false);
    }
  }, [mode, getBaziResult, location]);

  const handleFollowUp = async (question: string) => {
    if (!activeHistoryId || isStreamingRef.current) return;
    
    const currentEntry = history.find(h => h.id === activeHistoryId);
    if (!currentEntry || currentEntry.status !== 'completed') return;

    setLoading(true);
    const context = currentEntry.messages || [];
    const newMessages: ChatMessage[] = [...context, { role: 'user' as const, content: question }];

    setHistory(prev => prev.map(h => 
      h.id === activeHistoryId 
        ? { ...h, status: 'loading' as const } 
        : h
    ));

    try {
      await streamResponse(newMessages, activeHistoryId);
    } catch (err: any) {
      setError(err.message || '通讯异常');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col parchment-bg">
      <Header onOpenProfile={() => setIsProfileOpen(true)} />
      
      <div className="bg-slate-900/40 border-y border-slate-800/30 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex h-14 px-4">
          <button onClick={() => handleModeChange('QIMEN')} className={`flex-1 text-[10px] font-black tracking-[0.3em] transition-all ${mode === 'QIMEN' ? 'text-logic-blue border-b-2 border-logic-blue' : 'text-slate-500 hover:text-slate-200'}`}>奇门遁甲</button>
          <button onClick={() => handleModeChange('YI_LOGIC')} className={`flex-1 text-[10px] font-black tracking-[0.3em] transition-all ${mode === 'YI_LOGIC' ? 'text-logic-blue border-b-2 border-logic-blue' : 'text-slate-500 hover:text-slate-200'}`}>易理能量</button>
          <button onClick={() => handleModeChange('TCM_AI')} className={`flex-1 text-[10px] font-black tracking-[0.3em] transition-all ${mode === 'TCM_AI' ? 'text-logic-blue border-b-2 border-logic-blue' : 'text-slate-500 hover:text-slate-200'}`}>全息调理</button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8 overflow-x-hidden">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-[10px] text-center font-black animate-shake">{error}</div>}
        
        <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} location={location} onSetLocation={setLocation} />
        
        {(board || baziData) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-auto">
             {board && <BoardGrid board={board} />}
             {baziData && <BaziResult data={baziData} />}
          </div>
        )}

        {isAiThinking && (
          <TraditionalLoader />
        )}

        {displayPrediction && (
          <section className="frosted-glass p-6 md:p-12 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-80 h-80 bg-logic-blue/5 blur-[120px] pointer-events-none"></div>
            <AnalysisDisplay prediction={displayPrediction} onFollowUp={handleFollowUp} isFollowUpLoading={loading} />
          </section>
        )}
      </main>
      
      <Footer />
      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        history={history}
        onLoadHistory={(entry) => {
          setMode(entry.mode);
          setBoard(entry.board || null);
          setBaziData(entry.baziData || null);
          setDisplayPrediction(entry.result);
          setActiveHistoryId(entry.id);
          setIsProfileOpen(false);
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
        onClearHistory={() => setHistory([])}
      />
    </div>
  );
};

export default App;
