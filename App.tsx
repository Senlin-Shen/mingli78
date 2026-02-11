
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
   * 增强型流式传输引擎
   */
  const streamResponse = async (messages: ChatMessage[], historyId: string, isContinuation = false, isFollowUp = false) => {
    if (isStreamingRef.current && !isContinuation && !isFollowUp) return ""; 
    isStreamingRef.current = true;
    
    if (!isContinuation && !isFollowUp) {
      fullTextRef.current = '';
      setDisplayPrediction('');
      setIsAiThinking(true);
    } else if (isFollowUp) {
      // 追问时在文本末尾增加分隔符
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

      if (!response.ok) throw new Error('时空链路波动，请重试');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('流读取失败');

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

      if (finishReason === 'length') {
        const nextMessages: ChatMessage[] = [
          ...messages,
          { role: 'assistant', content: currentResponseContent },
          { role: 'user', content: '继续，保持逻辑闭环' }
        ];
        return await streamResponse(nextMessages, historyId, true, false);
      }

      const finalTotalResult = fullTextRef.current;
      
      setHistory(prev => prev.map(item => 
        item.id === historyId 
          ? { 
              ...item, 
              result: finalTotalResult, 
              status: 'completed' as const, 
              messages: [...messages, { role: 'assistant' as const, content: currentResponseContent }] 
            } 
          : item
      ));

      return finalTotalResult;
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

    // 交互续航增补指令
    const interactiveProtocol = `
## 持续对话协议 (Continuous Dialogue Protocol)
1. 严禁终结对话：严禁使用“祝您好运”、“到此为止”、“感谢提问”等类似结语。
2. 深度挖掘提示：在报告末尾，必须根据当前结果，自动识别出一个最值得深入探讨的“潜在风险”或“进阶机遇”，并以【🎯 进阶挖掘提示】作为标题。
3. 交互式结语：以一个启发性、针对性极强的提问结束。
4. 保持上下文依赖：后续对话必须基于之前的推演数据。`;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, location?.longitude || 120);
      setBoard(activeBoard);
      
      systemInstruction = `# Role: 奇门遁甲高维决策系统 (Advanced Qimen Decision System)

## 1. 系统核心逻辑
你是一个基于传统数理奇门与现代决策科学构建的智能化起局模型。你不仅具备严谨的数理推演能力，还能将复杂的符号体系转化为具备实战意义的行动指南。

### A. 起局算法约束 [核心控制]
1. 时空锚定：必须分析用户时间与地理位置。
2. 建模准则：严格遵循“值符随时干落宫，值使随时宫行进”的动盘原理。

### B. 哲学心法
坚持“对镜观心”原则：盘局是当下时空的能量缩影。不迷信宿命，强调行为调理（人盘）与环境优化（地利）。

## 2. 交互界面设计 (UI/UX)
严禁使用 Markdown（如 #, *）。必须按以下模块化输出：

【⚖️ 时空参数配置 (Dashboard)】
> 📅 测算时间：[干支四柱]
> 📍 地理定位：[所在城市] | [地利属性]
> 🌀 定局结果：[阳/阴]遁 [X] 局 | 旬首 | 值符 | 值使

【🔍 能量九宫解析 (Deep Analysis)】
*使用清晰列表展示相关宫位的核心能量：*
- 用神宫：[符号及能量状态（如击刑、入墓、空亡）]
- 日干宫：[代表求测人本身的能量状态]
- 关键博弈：生克链条分析，识别“龙回首”、“虎狂躁”等关键格局。

【🎯 预测结论与决策指导 (Action Plan)】
1. 趋势预判：[明确给出成败可能性、难易程度及预期时间点]。
2. 行动策略：[基于“八门”的人事建议，宜守/攻/合/散]。
3. 时空运筹：建议方位、寻找贵人及具体的能量化解/环境微调方案。

${interactiveProtocol}
报告审计完毕`;

      finalUserInput = `[用户诉求]：${userInput}\n[当前盘面数据]：${JSON.stringify(activeBoard)}\n[真太阳时]：${activeBoard.trueSolarTime}\n[地理坐标]：${location ? `经度${location.longitude}` : '120E'}`;

    } else if (mode === 'YI_LOGIC') {
      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi);
        
        systemInstruction = `# Role: 全息能量审计师 (秉承姜氏通解逻辑)
你是一个冷静、严谨、具备深度逻辑推演能力的战略咨询顾问。拒绝迷信词汇，改用“能量物理学”与“时空气象学”为用户提供行动指导。

## 输出规范
1. 严禁使用 Markdown。
2. 包含模块：【📊 核心诊断：物理热力扫描】、【⚙️ 逻辑路径：能量转换效率】、【🛠️ 全息方案：处方级行动建议】、【📍 首要动作 (Priority Action)】。

${interactiveProtocol}
【能量审计闭环 】`;

        const p = activeBazi.pillars;
        finalUserInput = `[用户诉求]：${input.question || '全息能量审计'}
[修正四柱]：${p.year.stem}${p.year.branch} ${p.month.stem}${p.month.branch} ${p.day.stem}${p.day.branch} ${p.hour.stem}${p.hour.branch}
[参数数据]：${JSON.stringify(activeBazi)}`;
      } else {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻分析] 卦数：${input.numbers.join(', ')} 诉求：${input.question}`;
        systemInstruction = `六爻推演专家。以《增删卜易》为宗。结构：【一、卦象组合】 【二、用神旺衰】 【三、动变解析】 【四、最终定论】。${interactiveProtocol}报告审计完毕`;
      }
    } else {
      finalUserInput = userInput;
      systemInstruction = `中医全息调理专家。结构：【一、辨证分析】 【二、病机探讨】 【三、调理建议】 【四、生活禁忌】。${interactiveProtocol}报告审计完毕`;
    }

    const initialMessages: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: finalUserInput }
    ];

    setHistory(prev => [{
      id: historyId,
      timestamp: Date.now(),
      mode,
      input: typeof userInput === 'string' ? userInput : (userInput.question || '全息推演'),
      result: '',
      status: 'loading',
      board: activeBoard,
      baziData: activeBazi,
      messages: initialMessages
    }, ...prev].slice(0, 50));

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
    // 承接上下文对话
    const newMessages: ChatMessage[] = [
      ...currentEntry.messages, 
      { role: 'user', content: question }
    ];
    
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
        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-[10px] text-center font-black">{error}</div>}
        <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} location={location} onSetLocation={setLocation} />
        {(board || baziData) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-auto">
             {board && <BoardGrid board={board} />}
             {baziData && <BaziResult data={baziData} />}
          </div>
        )}
        {isAiThinking && <TraditionalLoader />}
        {displayPrediction && (
          <section className="frosted-glass p-6 md:p-12 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative border border-white/5">
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
          fullTextRef.current = entry.result;
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
