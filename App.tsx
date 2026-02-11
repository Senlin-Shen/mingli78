
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
        () => console.log("Geolocation permission denied")
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

  /**
   * 增强型流式传输引擎：支持自动续写与上下文承接
   */
  const streamResponse = async (messages: ChatMessage[], historyId: string, isContinuation = false, isFollowUp = false) => {
    // 允许续写和追问模式下的并发请求，但禁止初次请求的并发
    if (isStreamingRef.current && !isContinuation && !isFollowUp) return ""; 
    isStreamingRef.current = true;
    
    // 如果是续写或追问，我们不清空 fullTextRef，而是继续追加
    if (!isContinuation && !isFollowUp) {
      fullTextRef.current = '';
      setDisplayPrediction('');
      setIsAiThinking(true);
    } else if (isFollowUp) {
      // 追问时在文本末尾增加分隔符或换行，增强可读性
      fullTextRef.current += "\n\n---\n\n";
      setIsAiThinking(true);
    }
    
    let currentResponseContent = "";
    let finishReason = "";

    try {
      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          temperature: 0.5,
          model: UNIFIED_MODEL,
          stream: true
        })
      });

      if (!response.ok) throw new Error('时空链路波动，正在尝试重连...');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('流读取初始化失败');

      let isFirstChunk = true;
      let buffer = ""; 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; 

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') break;
          
          try {
            const data = JSON.parse(jsonStr);
            const content: string = data.choices[0]?.delta?.content || "";
            finishReason = data.choices[0]?.finish_reason || "";
            
            if (isFirstChunk && content.trim()) {
              setIsAiThinking(false);
              isFirstChunk = false;
            }

            fullTextRef.current += content;
            currentResponseContent += content;
            
            if (!renderAnimationFrame.current) {
              renderAnimationFrame.current = requestAnimationFrame(() => {
                setDisplayPrediction(fullTextRef.current);
                renderAnimationFrame.current = null;
              });
            }
          } catch (e) {}
        }
      }

      // 自动续写逻辑
      if (finishReason === 'length') {
        const nextMessages: ChatMessage[] = [
          ...messages,
          { role: 'assistant', content: currentResponseContent },
          { role: 'user', content: '继续往下写，不要重复，确保逻辑闭环' }
        ];
        return await streamResponse(nextMessages, historyId, true, false);
      }

      const finalResult = fullTextRef.current;
      
      setHistory(prev => prev.map(item => 
        item.id === historyId 
          ? { 
              ...item, 
              result: finalResult, 
              status: 'completed' as const, 
              messages: [...messages, { role: 'assistant' as const, content: currentResponseContent }] 
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

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, location?.longitude || 120);
      setBoard(activeBoard);
      
      systemInstruction = `# Role: 奇门遁甲高维决策系统 (Advanced Qimen Decision System)

## 1. 系统核心逻辑
你是一个基于传统数理奇门与现代决策科学构建的智能化起局模型。你拒绝封建迷信词汇，强调通过行为调理（人盘）与环境优化（地利）寻找“生机”。

## 2. 交互界面设计 (UI/UX 规范)
严禁使用 Markdown（如 #, *）。必须按以下模块化结构输出：

【⚖️ 时空参数配置 (Dashboard)】
- 测算时间、干支四柱、地理定位、地利属性。
- 定局结果：[阳/阴]遁 [X] 局 | 旬首 | 值符 | 值使。

【🔍 能量九宫解析 (Deep Analysis)】
- 重点分析“用神宫”与“日干宫”的生克链条。
- 识别关键格局（如：龙回首、虎狂躁、五不遇时等）。
- 符号映射：将符号转化为现实中的性格、行为、场景。

【🎯 预测结论与决策指导 (Action Plan)】
- 趋势预判：明确成败可能性、难易度及预期时间点。
- 行动策略：基于“八门”给出 宜守、宜攻、宜合、宜散 的具体建议。
- 时空运筹：给出有利方位建议及具体的能量化解/环境微调方案。

报告审计完毕`;

      finalUserInput = `[用户诉求]：${userInput}\n[当前盘面数据]：${JSON.stringify(activeBoard)}\n[真太阳时]：${activeBoard.trueSolarTime}`;

    } else if (mode === 'YI_LOGIC') {
      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi);
        
        systemInstruction = `# Role: 全息能量审计师 (秉承姜氏通解逻辑)
你是一个冷静、严谨、具备深度逻辑推演能力的战略咨询顾问。拒绝迷信，改用“能量物理学”与“时空气象学”为用户提供行动指导。

## 核心底层逻辑
1. 气象优先：优先判断全局阴阳平衡与燥湿。
2. 能量路径：分析能量流转路径是否通畅。
3. 符号映射：将干支精准映射到现实场景。

## 输出规范 (必须包含以下【】板块)
【📊 核心诊断：物理热力扫描】
【⚙️ 逻辑路径：能量转换效率】
【🛠️ 全息方案：处方级行动建议】
- 🧠 思维对冲、🏃 行为补位、🏠 环境校准、⏳ 时序避险。
【📍 首要动作 (Priority Action)】
- 立即执行的一个微小且具破局意义的动作。

【能量审计闭环 】`;

        const p = activeBazi.pillars;
        finalUserInput = `[用户诉求]：${input.question || '全息能量审计'}
[背景信息]：性别 ${input.gender}，公历 ${input.birthDate} ${input.birthTime || '时辰不详'}
[修正四柱]：${p.year.stem}${p.year.branch} ${p.month.stem}${p.month.branch} ${p.day.stem}${p.day.branch} ${p.hour.stem}${p.hour.branch}
[命盘参数]：${JSON.stringify(activeBazi)}`;
      } else {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻分析] 卦数：${input.numbers.join(', ')} 诉求：${input.question}`;
        systemInstruction = `六爻推演专家。以《增删卜易》为宗。结构：【一、卦象组合】 【二、用神旺衰】 【三、动变解析】 【四、最终定论】。报告审计完毕`;
      }
    } else {
      finalUserInput = userInput;
      systemInstruction = `中医全息调理专家。结构：【一、辨证分析】 【二、病机探讨】 【三、调理建议】 【四、生活禁忌】。报告审计完毕`;
    }

    const historyInput: string = typeof userInput === 'string' 
      ? userInput 
      : ((userInput as any).question || (userInput as any).name || '全息推演');

    const initialMessages: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: finalUserInput }
    ];

    const newEntry: PredictionHistory = {
      id: historyId,
      timestamp: Date.now(),
      mode,
      input: historyInput,
      result: '',
      status: 'loading',
      board: activeBoard,
      baziData: activeBazi,
      messages: initialMessages
    };

    setHistory(prev => [newEntry, ...prev].slice(0, 50));

    try {
      await streamResponse(initialMessages, historyId);
    } catch (err: any) {
      setError(err.message || '推演链路异常');
    } finally {
      setLoading(false);
      setIsAiThinking(false);
    }
  }, [mode, getBaziResult, location]);

  const handleFollowUp = async (question: string) => {
    if (!activeHistoryId || isStreamingRef.current) return;
    const currentEntry = history.find(h => h.id === activeHistoryId);
    if (!currentEntry) return;

    setLoading(true);
    // 增加追问上下文：将之前的 AI 回复也放入对话历史
    const newMessages: ChatMessage[] = [
      ...currentEntry.messages, 
      { role: 'user', content: question }
    ];
    
    // 更新本地历史状态为 loading
    setHistory(prev => prev.map(h => 
      h.id === activeHistoryId ? { ...h, status: 'loading' as const } : h
    ));

    try {
      await streamResponse(newMessages, activeHistoryId, false, true);
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
        {isAiThinking && <TraditionalLoader />}
        {displayPrediction && (
          <section className="frosted-glass p-6 md:p-12 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden border border-white/5">
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
          fullTextRef.current = entry.result; // 加载历史时同步 ref
          setActiveHistoryId(entry.id);
          setIsProfileOpen(false);
        }}
        onClearHistory={() => setHistory([])}
      />
    </div>
  );
};

export default App;
