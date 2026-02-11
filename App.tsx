
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
// Fix: Import GoogleGenAI as required by guidelines
import { GoogleGenAI } from "@google/genai";

// Fix: Use gemini-3-pro-preview for complex reasoning and prediction tasks
const UNIFIED_MODEL = "gemini-3-pro-preview";

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

  // Fix: Refactored to use @google/genai generateContentStream instead of custom proxy
  const streamResponse = async (messages: ChatMessage[], historyId: string, systemInstruction: string, isContinuation = false, isFollowUp = false) => {
    if (isStreamingRef.current && !isContinuation && !isFollowUp) return ""; 
    isStreamingRef.current = true;
    
    if (!isContinuation && !isFollowUp) {
      fullTextRef.current = '';
      setDisplayPrediction('');
      setIsAiThinking(true);
    } else if (isFollowUp) {
      fullTextRef.current += "\n\n---\n\n";
    }
    
    let currentResponseContent = "";

    try {
      // Fix: Initialize GoogleGenAI with API Key from process.env
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Convert messages to GenAI format for use in contents
      const genAiContents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const responseStream = await ai.models.generateContentStream({
        model: UNIFIED_MODEL,
        contents: genAiContents,
        config: {
          systemInstruction,
          temperature: 0.5,
        },
      });

      let isFirstChunk = true;

      for await (const chunk of responseStream) {
        // Fix: Access .text property directly (not a method)
        const content = chunk.text || "";
        
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
      setError(err.message || '时空链路波动，请重试');
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

    const interactiveProtocol = `
## 持续对话协议 (Continuous Dialogue Protocol)
1. 严禁终结对话：严禁使用“祝您好运”、“到此为止”等结语。
2. 深度挖掘提示：在报告末尾，必须根据当前结果，自动识别出一个最值得深入探讨的“潜在风险”或“进阶机遇”，并以【🎯 进阶挖掘提示】作为标题。
3. 交互式结语：以一个具有启发性的、针对性极强的提问结束。例如：“基于当前的态势，您是否需要我针对某个方面进一步给出具体分析？”
4. 保持上下文依赖：后续对话必须基于之前的推演数据，进行“叠加式分析”，而非重新开始。`;

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
你是一个基于传统数理奇门与现代决策科学构建的智能化起局模型。你不仅具备严谨的数理推演能力，还能将复杂的符号体系转化为具备实战意义的行动指南。

### A. 起局算法约束 [核心控制]
1. 时空锚定：必须分析用户时间与地理位置。
2. 建模准则：严格遵循“值符随时干落宫，值使随时宫行进”的动盘原理。

### B. 哲学心法
坚持“对镜观心”原则：盘局是当下时空的能量缩影。不迷信宿命，强调行为调理（人盘）与环境优化（地利）寻找“生机”。

## 2. 交互界面设计 (UI/UX)
严禁使用 Markdown（如 #, *）。按以下模块化结构输出：

【⚖️ 时空参数配置 (Dashboard)】
> 测算时间、干支四柱、地理定位、地利属性、定局结果、值符/值使。

【🔍 能量九宫解析 (Deep Analysis)】
- 用神宫：[符号及能量状态（如击刑、入墓、空亡）]
- 日干宫：[求测人能量状态]
- 关键博弈：生克链条分析，识别“龙回首”、“虎狂躁”等关键格局。

【🎯 预测结论与决策指导 (Action Plan)】
1. 趋势预判：[成败可能性、难易程度及预期时间点]。
2. 行动策略：[基于“八门”的人事建议，宜守/攻/合/散]。
3. 时空运筹：有利方位、寻找贵人及具体的能量化解/环境微调方案。

${interactiveProtocol}
报告审计完毕`;

      finalUserInput = `分析诉求: ${userInput}\n\n当前盘局数据: ${JSON.stringify(activeBoard)}`;

    } else if (mode === 'YI_LOGIC') {
      if (type === 'LI_YAO') {
        const liuyaoInput = userInput as LiuYaoInput;
        systemInstruction = `你是一位精通《增删卜易》理法的六爻专家。请根据提供的数字卦及其动爻，结合月建、日辰，进行深度推演。${interactiveProtocol}`;
        finalUserInput = `求测内容: ${liuyaoInput.question}\n报数因子: ${liuyaoInput.numbers.join(', ')}`;
      } else {
        const baziInput = userInput as BaZiInput;
        activeBazi = getBaziResult(baziInput.birthDate, baziInput.birthTime || '12:00', baziInput.birthPlace, baziInput.gender);
        setBaziData(activeBazi);
        systemInstruction = `你是一位精通姜氏五行气象论与现代心理映射的八字命理专家。请分析全局寒暖燥湿，并针对用户的具体决策点给出建议。${interactiveProtocol}`;
        finalUserInput = `姓名: ${baziInput.name}, 性别: ${baziInput.gender}, 生日: ${baziInput.birthDate} ${baziInput.birthTime}. \n决策诉求: ${baziInput.question}\n\n排盘数据: ${JSON.stringify(activeBazi)}`;
      }
    } else if (mode === 'TCM_AI') {
      systemInstruction = `你是一位中医全息调理专家，精通五运六气与体质辨识。请根据用户症状，分析其内在脏腑能量偏颇，并给出调理方案。${interactiveProtocol}`;
      finalUserInput = `症状描述: ${userInput}`;
    }

    setHistory(prev => [{
      id: historyId,
      timestamp: Date.now(),
      mode,
      input: typeof userInput === 'string' ? userInput : (userInput.question || userInput.name || '复杂录入'),
      result: '',
      status: 'loading',
      board: activeBoard,
      baziData: activeBazi,
      messages: [{ role: 'user', content: finalUserInput }]
    }, ...prev]);

    try {
      await streamResponse([{ role: 'user', content: finalUserInput }], historyId, systemInstruction);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mode, location, getBaziResult]);

  const handleFollowUp = async (question: string) => {
    if (!activeHistoryId || isStreamingRef.current) return;
    
    const currentHistory = history.find(h => h.id === activeHistoryId);
    if (!currentHistory) return;

    const newMessages: ChatMessage[] = [
      ...currentHistory.messages,
      { role: 'user', content: question }
    ];

    setHistory(prev => prev.map(item => 
      item.id === activeHistoryId ? { ...item, messages: newMessages, status: 'loading' } : item
    ));

    // Fix: Derive system instruction based on mode for follow-up
    let systemInstruction = "";
    if (mode === 'QIMEN') systemInstruction = "你是一个奇门遁甲高维决策系统..."; 
    else if (mode === 'YI_LOGIC') systemInstruction = "你是一位精通易理的命理专家...";
    else if (mode === 'TCM_AI') systemInstruction = "你是一位中医全息调理专家...";

    try {
      await streamResponse(newMessages, activeHistoryId, systemInstruction, false, true);
    } catch (err: any) {
      setError(err.message || '追踪失败');
    }
  };

  const handleLoadHistory = (entry: PredictionHistory) => {
    setActiveHistoryId(entry.id);
    setMode(entry.mode);
    setBoard(entry.board || null);
    setBaziData(entry.baziData || null);
    setDisplayPrediction(entry.result);
    setIsProfileOpen(false);
    fullTextRef.current = entry.result;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-logic-blue/30 selection:text-white pb-20">
      <Header onOpenProfile={() => setIsProfileOpen(true)} />
      
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-20">
        <div className="flex justify-center gap-6">
          {(['QIMEN', 'YI_LOGIC', 'TCM_AI'] as AppMode[]).map(m => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-10 py-4 rounded-2xl text-[11px] font-black tracking-[0.3em] uppercase transition-all border ${
                mode === m 
                ? 'bg-logic-blue/10 border-logic-blue/40 text-logic-blue shadow-[0_0_20px_rgba(56,189,248,0.15)]' 
                : 'bg-slate-900/40 border-slate-800/40 text-slate-500 hover:text-slate-300'
              }`}
            >
              {m === 'QIMEN' ? '奇门景曜' : m === 'YI_LOGIC' ? '易理决策' : '中医全息'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-12">
            <InputForm 
              mode={mode} 
              isLoading={loading} 
              onPredict={handlePredict} 
              location={location}
              onSetLocation={setLocation}
            />
            {loading && <TraditionalLoader />}
            {error && (
              <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500 text-xs tracking-widest text-center animate-pulse">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-12 min-h-[600px]">
            {mode === 'QIMEN' && board && <BoardGrid board={board} />}
            {mode === 'YI_LOGIC' && baziData && <BaziResult data={baziData} />}
            
            {displayPrediction && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-1000">
                <AnalysisDisplay 
                  prediction={displayPrediction} 
                  onFollowUp={handleFollowUp}
                  isFollowUpLoading={isAiThinking}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      
      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        history={history}
        onLoadHistory={handleLoadHistory}
        onClearHistory={() => {
          setHistory([]);
          localStorage.removeItem('qimen_history_v12');
        }}
      />
    </div>
  );
};

// Fix: Added default export for App component
export default App;
