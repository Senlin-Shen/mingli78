
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

// 火山引擎端点 ID
const ARK_ENDPOINT_ID = "ep-20260206175318-v6cl7";

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

  const streamResponse = async (messages: ChatMessage[], historyId: string, isFollowUp = false) => {
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
      // 切换回火山 API 代理
      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ARK_ENDPOINT_ID,
          messages: messages,
          temperature: 0.7,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`时空链路波动 (${response.status})，请重试`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('流读取失败');

      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices[0]?.delta?.content || "";
              
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
      setError(err.message || '时空链路异常');
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
## 🛠️ 持续对话协议 (Continuous Dialogue Protocol)
- **严禁终结对话**：绝对禁止使用“祝您好运”、“到此为止”或“感谢提问”等类似结语。
- **深度挖掘提示**：每次回答后，必须自动识别一个最值得深入探讨的“潜在风险”或“进阶机遇”，并以【🎯 进阶挖掘提示】作为标题。
- **交互式结语**：以极具启发性的提问结束。例如：“基于当前的态势，您是否需要我针对某个方面进一步给出具体分析？”
- **上下文依赖**：若用户追问，必须调用此前所有推演数据进行“叠加式分析”。`;

    if (appMode === 'QIMEN') {
      return `# Role: 林毅奇门遁甲实战预测专家
你是一位精通林毅老师数理奇门体系的预测专家。强调“理、象、数”三位一体，拒绝迷信，侧重于行为调理与时空决策。
${protocol}
结构要求：【⚖️ 时空参数配置】、【🔍 能量九宫解析】、【🎯 预测结论与决策指导】。`;
    } else if (appMode === 'YI_LOGIC') {
      return `# Role: 易理能量审计师 (姜氏逻辑)
强调五行气象论，侧重于能量补位与风险审计。
${protocol}`;
    } else {
      return `# Role: 中医全息调理专家
基于五运六气视角提供调理方案。
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

    const systemMsg: ChatMessage = { role: 'system', content: getSystemInstruction(mode) };
    const userMsg: ChatMessage = { role: 'user', content: finalUserInput };

    setHistory(prev => [{
      id: historyId,
      timestamp: Date.now(),
      mode,
      input: typeof userInput === 'string' ? userInput : (userInput.question || '全息推演'),
      result: '',
      status: 'loading' as const,
      board: activeBoard,
      baziData: activeBazi,
      messages: [systemMsg, userMsg]
    }, ...prev]);

    try {
      await streamResponse([systemMsg, userMsg], historyId);
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

    // 显式锁定点击状态
    setIsAiThinking(true);
    
    const newMessages: ChatMessage[] = [
      ...currentEntry.messages,
      { role: 'user', content: question }
    ];

    setHistory(prev => prev.map(item => 
      item.id === activeHistoryId ? { ...item, messages: newMessages, status: 'loading' as const } : item
    ));

    try {
      await streamResponse(newMessages, activeHistoryId, true);
    } catch (err: any) {
      setError(err.message || '追踪失败');
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
              <div className="animate-in fade-in slide-in-from-right-4 duration-1000 overflow-visible">
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
