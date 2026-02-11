
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
import { GoogleGenAI } from "@google/genai";

// 采用最新的 Gemini 3 Pro 模型处理高维度预测
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

  const streamResponse = async (messages: ChatMessage[], historyId: string, systemInstruction: string, isFollowUp = false) => {
    if (isStreamingRef.current) return ""; 
    isStreamingRef.current = true;
    
    // 初始化显示状态
    setIsAiThinking(true);
    if (!isFollowUp) {
      fullTextRef.current = '';
      setDisplayPrediction('');
    } else {
      fullTextRef.current += "\n\n---\n\n";
    }
    
    let currentResponseContent = "";

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const genAiContents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const responseStream = await ai.models.generateContentStream({
        model: UNIFIED_MODEL,
        contents: genAiContents,
        config: {
          systemInstruction,
          temperature: 0.7, // 提升实战建议的灵活性
        },
      });

      let isFirstChunk = true;

      for await (const chunk of responseStream) {
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
      setError(err.message || '时空链路波动，请重试');
      setHistory(prev => prev.map(item => 
        item.id === historyId ? { ...item, status: 'error' as const } : item
      ));
      throw err;
    } finally {
      setIsAiThinking(false);
      isStreamingRef.current = false;
    }
  };

  const getSystemInstruction = (appMode: AppMode) => {
    const protocol = `
## 🛠️ 交互续航增补协议 (Continuous Dialogue Protocol)
- **严禁终结对话**：严禁使用“祝您好运”、“到此为止”等结语。
- **深度挖掘提示**：报告后，必须自动识别一个最值得探讨的“潜在风险”或“进阶机遇”，标题定为【🎯 进阶挖掘提示】。
- **交互式结语**：以极具针对性的启发式提问结束。
- **上下文依赖**：若用户追问，必须调用此前数据进行“叠加式分析”。`;

    if (appMode === 'QIMEN') {
      return `# Role: 林毅奇门遁甲实战预测专家
精通数理奇门与实战应期推演。强调“理、象、数”三位一体，以“对镜观心”为核心哲学。
${protocol}
请按照 Dashboard、Deep Analysis、Action Plan 的结构化输出。`;
    } else if (appMode === 'YI_LOGIC') {
      return `# Role: 易理能量审计师 (姜氏五行气象逻辑)
强调时空气象学，拒绝迷信，侧重决策风险对冲与能量补位。
${protocol}`;
    } else {
      return `# Role: 中医全息调理专家
从五运六气视角辨证，提供全息调理方案。
${protocol}`;
    }
  };

  const handlePredict = useCallback(async (userInput: any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    
    const historyId = Date.now().toString();
    setActiveHistoryId(historyId);

    let activeBoard: QiMenBoard | null = null;
    let activeBazi: BaziResultData | null = null;
    let finalUserInput = "";

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, location?.longitude || 120);
      setBoard(activeBoard);
      finalUserInput = `[实战求测]：${userInput}\n[奇门盘面数据]：${JSON.stringify(activeBoard)}`;
    } else if (mode === 'YI_LOGIC' && type === 'BA_ZI') {
      const bInput = userInput as BaZiInput;
      activeBazi = getBaziResult(bInput.birthDate, bInput.birthTime || '12:00', bInput.birthPlace, bInput.gender);
      setBaziData(activeBazi);
      finalUserInput = `[命理审计]：${bInput.question}\n[八字数据]：${JSON.stringify(activeBazi)}`;
    } else {
      finalUserInput = typeof userInput === 'string' ? userInput : JSON.stringify(userInput);
    }

    const initialMessages: ChatMessage[] = [{ role: 'user', content: finalUserInput }];

    setHistory(prev => [{
      id: historyId,
      timestamp: Date.now(),
      mode,
      input: typeof userInput === 'string' ? userInput : (userInput.question || '全息推演'),
      result: '',
      status: 'loading' as const,
      board: activeBoard,
      baziData: activeBazi,
      messages: initialMessages
    }, ...prev]);

    try {
      await streamResponse(initialMessages, historyId, getSystemInstruction(mode));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mode, location, getBaziResult]);

  const handleFollowUp = async (question: string) => {
    if (!activeHistoryId || isStreamingRef.current) return;
    
    const currentEntry = history.find(h => h.id === activeHistoryId);
    if (!currentEntry) return;

    // 显式设置状态，确保 AnalysisDisplay 收到反馈
    setIsAiThinking(true);
    
    const newMessages: ChatMessage[] = [
      ...currentEntry.messages,
      { role: 'user', content: question }
    ];

    setHistory(prev => prev.map(item => 
      item.id === activeHistoryId ? { ...item, messages: newMessages, status: 'loading' as const } : item
    ));

    try {
      await streamResponse(newMessages, activeHistoryId, getSystemInstruction(mode), true);
    } catch (err: any) {
      setError(err.message || '通讯异常');
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-logic-blue/30 selection:text-white pb-20 parchment-bg">
      <Header onOpenProfile={() => setIsProfileOpen(true)} />
      
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-20 relative z-10">
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
            {loading && !isStreamingRef.current && <TraditionalLoader />}
            {error && (
              <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500 text-xs tracking-widest text-center animate-pulse">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-12 min-h-[600px] relative">
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
