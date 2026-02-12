
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaziResult from './components/BaziResult';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import ProfilePanel from './components/ProfilePanel';
import TraditionalLoader from './components/TraditionalLoader';
import AdminDashboard from './components/AdminDashboard';
import AuthScreen from './components/AuthScreen'; // 新增认证屏幕
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
  const [currentUser, setCurrentUser] = useState<any>(null); // 用户身份状态
  const [mode, setMode] = useState<AppMode>('QIMEN');
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [baziData, setBaziData] = useState<BaziResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [error, setError] = useState('');
  const [displayPrediction, setDisplayPrediction] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [history, setHistory] = useState<PredictionHistory[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  
  const { getBaziResult } = useBazi();
  const fullTextRef = useRef('');
  const isStreamingRef = useRef(false);
  const renderAnimationFrame = useRef<number | null>(null);

  // 初始化：检查已存在的用户会话
  useEffect(() => {
    const savedUser = localStorage.getItem('qimen_session');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('qimen_session');
      }
    }

    const savedHistory = localStorage.getItem('qimen_history_v12');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {}
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

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('qimen_session', JSON.stringify(user));
    // 异步同步一次追踪数据
    fetch('/api/user-tracking', {
      method: 'POST',
      body: JSON.stringify({ uid: user.uid, mode: 'LOGIN_SYNC' })
    }).catch(() => {});
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('qimen_session');
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('qimen_history_v12', JSON.stringify(history));
    }
  }, [history, currentUser]);

  const trackActivity = async (currentMode: AppMode) => {
    if (!currentUser) return;
    fetch('/api/user-tracking', {
      method: 'POST',
      body: JSON.stringify({ uid: currentUser.uid, mode: currentMode })
    }).catch(() => {});
  };

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

  const streamResponse = async (messages: ChatMessage[], historyId: string, isContinuation = false, isFollowUp = false) => {
    if (isStreamingRef.current && !isContinuation && !isFollowUp) return ""; 
    isStreamingRef.current = true;
    
    if (!isContinuation && !isFollowUp) {
      fullTextRef.current = '';
      setDisplayPrediction('');
      setIsAiThinking(true);
    } else if (isFollowUp) {
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
      setIsAiThinking(false);
      setLoading(false);
    }
  };

  const handlePredict = useCallback(async (userInput: any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    
    // 追踪本次使用行为
    trackActivity(mode);

    const historyId = Date.now().toString();
    setActiveHistoryId(historyId);

    const interactiveProtocol = `
## 持续对话协议 (Continuous Dialogue Protocol)
1. 严禁终结对话：严禁使用“祝您好运”、“感谢提问”等类似结语。
2. ⚠️格式红线：严禁输出任何 Markdown 加粗符号（即禁止输出 ** 符号）。如需强调，请使用【】包裹或直接输出。
3. 深度挖掘提示：报告末尾必须包含【🎯 进阶挖掘提示】。
4. 交互式结语：以启发式提问结束。`;

    let systemInstruction = "";
    let finalUserInput = "";
    let activeBoard: QiMenBoard | null = null;
    let activeBazi: BaziResultData | null = null;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, location?.longitude || 120);
      setBoard(activeBoard);
      
      systemInstruction = `# Role: 奇门遁甲高维决策系统
## 1. 系统核心逻辑
你精通林毅老师数理奇门体系。强调“理、象、数”三位一体。
## 2. 交互界面设计
⚠️警告：禁止在输出中使用 ** 符号。
【⚖️ 时空参数配置 (Dashboard)】
【🔍 能量九宫解析 (Deep Analysis)】
【🎯 预测结论与决策指导 (Action Plan)】
${interactiveProtocol}
报告审计完毕`;

      finalUserInput = `[用户诉求]：${userInput}\n[盘面数据]：${JSON.stringify(activeBoard)}\n[真太阳时]：${activeBoard.trueSolarTime}`;

    } else if (mode === 'YI_LOGIC') {
      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi);
        
        systemInstruction = `# Role: 全息能量审计师
⚠️禁止输出 ** 符号。必须包含：【📊 核心诊断】、【⚙️ 逻辑路径】、【🛠️ 全息方案】。
${interactiveProtocol}
【能量审计闭环 】`;

        const p = activeBazi.pillars;
        finalUserInput = `[用户诉求]：${input.question || '全息能量审计'}\n[参数数据]：${JSON.stringify(activeBazi)}`;
      } else {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻分析] 卦数：${input.numbers.join(', ')} 诉求：${input.question}`;
        systemInstruction = `六爻推演专家。严禁输出 ** 符号。${interactiveProtocol}报告审计完毕`;
      }
    } else {
      finalUserInput = userInput;
      systemInstruction = `中医全息调理专家。严禁输出 ** 符号。${interactiveProtocol}报告审计完毕`;
    }

    const initialMessages: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: finalUserInput }
    ];

    const historyInput = typeof userInput === 'string' ? userInput : (userInput.question || '全息推演');
    
    setHistory(prev => [{
      id: historyId,
      timestamp: Date.now(),
      mode,
      input: historyInput,
      result: '',
      status: 'loading' as const,
      board: activeBoard,
      baziData: activeBazi,
      messages: initialMessages
    }, ...prev].slice(0, 50));

    try {
      await streamResponse(initialMessages, historyId);
    } catch (err: any) {
      setError(err.message || '推演链路异常');
    }
  }, [mode, getBaziResult, location, currentUser]);

  const handleFollowUp = async (question: string) => {
    if (!activeHistoryId || isStreamingRef.current) return;
    const currentEntry = history.find(h => h.id === activeHistoryId);
    if (!currentEntry) return;

    setError('');
    setIsAiThinking(true); 

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
    }
  };

  // 如果未登录，展示登录/注册屏幕
  if (!currentUser) {
    return <AuthScreen onSuccess={handleAuthSuccess} />;
  }

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
        {isAiThinking && !displayPrediction && <TraditionalLoader />}
        {displayPrediction && (
          <section className="frosted-glass p-6 md:p-12 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative border border-white/5 overflow-visible">
            <AnalysisDisplay prediction={displayPrediction} onFollowUp={handleFollowUp} isFollowUpLoading={isAiThinking} />
          </section>
        )}
      </main>
      <Footer onToggleAdmin={() => setIsAdminOpen(true)} />
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
        onLogout={handleLogout} // 传入登出逻辑
      />
      {isAdminOpen && <AdminDashboard isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
};

export default App;
