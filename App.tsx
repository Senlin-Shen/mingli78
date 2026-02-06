
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaZiChart from './components/BaZiChart';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import ProfilePanel from './components/ProfilePanel';
import { calculateBoard, calculateBaZi } from './qimenLogic';
import { QiMenBoard, LocationData, AppMode, LiuYaoInput, BaZiInput } from './types';

const CHINA_CENTER = { lng: 108.9, lat: 34.2 };
const UNIFIED_MODEL = "ep-20260206175318-v6cl7";

export interface PredictionHistory {
  id: string;
  timestamp: number;
  mode: AppMode;
  input: string;
  result: string;
  board?: QiMenBoard | null;
  bazi?: any;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('QIMEN');
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [baziData, setBaziData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<(LocationData & { city?: string, ip?: string, palaceName?: string }) | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [displayPrediction, setDisplayPrediction] = useState('');
  const [followUpText, setFollowUpText] = useState('');
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [history, setHistory] = useState<PredictionHistory[]>([]);
  
  const fullTextRef = useRef('');
  const lastUpdateTimeRef = useRef(0);
  const isStreamingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('qimen_history_v1');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error("历史记录解析失败"); }
    }
  }, []);

  useEffect(() => {
    const fetchGeo = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const palace = getPalaceFromCoords(data.longitude, data.latitude);
          setUserLocation({
            latitude: Number(data.latitude.toFixed(4)),
            longitude: Number(data.longitude.toFixed(4)),
            city: `${data.city}, ${data.region}`,
            ip: data.ip,
            palaceName: palace,
            isAdjusted: true
          });
        }
      } catch (e) { console.warn("定位受限"); }
    };
    fetchGeo();
  }, []);

  const saveToHistory = (result: string, currentInput: string, currentBoard: any, currentBazi: any) => {
    const newEntry: PredictionHistory = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      mode,
      input: currentInput,
      result,
      board: currentBoard,
      bazi: currentBazi
    };
    const updatedHistory = [newEntry, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('qimen_history_v1', JSON.stringify(updatedHistory));
  };

  const loadFromHistory = (entry: PredictionHistory) => {
    setDisplayPrediction('');
    setMode(entry.mode);
    setBoard(entry.board || null);
    setBaziData(entry.bazi || null);
    setChatHistory([{ role: 'assistant', content: entry.result }]);
    setIsProfileOpen(false);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('qimen_history_v1');
  };

  const getPalaceFromCoords = (lng: number, lat: number) => {
    const angle = Math.atan2(lat - CHINA_CENTER.lat, lng - CHINA_CENTER.lng);
    let degrees = angle * (180 / Math.PI);
    if (degrees < 0) degrees += 360;
    if (degrees >= 337.5 || degrees < 22.5) return "震三宫";
    if (degrees >= 22.5 && degrees < 67.5) return "艮八宫";
    if (degrees >= 67.5 && degrees < 112.5) return "坎一宫";
    if (degrees >= 112.5 && degrees < 157.5) return "乾六宫";
    if (degrees >= 157.5 && degrees < 202.5) return "兑七宫";
    if (degrees >= 202.5 && degrees < 247.5) return "坤二宫";
    if (degrees >= 247.5 && degrees < 292.5) return "离九宫";
    return "巽四宫";
  };

  const throttledUpdate = useCallback((isFinal = false) => {
    const now = Date.now();
    if (isFinal || lastUpdateTimeRef.current === 0 || now - lastUpdateTimeRef.current > 32) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        setDisplayPrediction(fullTextRef.current);
        lastUpdateTimeRef.current = now;
      });
    }
  }, []);

  const streamResponse = async (messages: ChatMessage[]) => {
    setError('');
    fullTextRef.current = '';
    setDisplayPrediction('');
    isStreamingRef.current = true;
    lastUpdateTimeRef.current = 0;
    
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

      if (!response.ok) throw new Error("通联链路异常");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取流数据");

      const decoder = new TextDecoder();
      let buffer = ""; 
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
          
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              const content = data.choices[0]?.delta?.content || "";
              if (content) {
                fullTextRef.current += content;
                throttledUpdate();
              }
            } catch (e) {
              buffer = line + "\n" + buffer;
            }
          }
        }
      }
      
      throttledUpdate(true);
      isStreamingRef.current = false;
      return fullTextRef.current;
    } catch (err: any) {
      isStreamingRef.current = false;
      throw new Error(err.message || "推演中断");
    }
  };

  const handlePredict = useCallback(async (userInput: string | any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    fullTextRef.current = '';
    setChatHistory([]);
    
    let systemInstruction = "";
    let finalUserInput = "";
    let summaryInput = typeof userInput === 'string' ? userInput : JSON.stringify(userInput);
    let currentCalculatedBoard: any = null;
    let currentCalculatedBazi: any = null;

    const baseConstraints = `严禁使用 # 和 * 符号。严禁使用 Markdown 加粗格式。严禁复述用户输入的原始参数。严禁寒暄。语气：专业、中立、逻辑严密，具有慈悲心但拒绝恐吓。`;

    // 第一步：立即生成并展示排盘，让用户先看到准确的数据
    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      currentCalculatedBoard = calculateBoard(targetDate, userLocation?.longitude);
      const autoPalace = userLocation?.palaceName || '中五宫';
      currentCalculatedBoard.direction = autoPalace;
      if (userLocation) currentCalculatedBoard.location = { ...userLocation, isAdjusted: true };
      setBoard(currentCalculatedBoard);

      finalUserInput = `[奇门起局数据] ${JSON.stringify(currentCalculatedBoard)}。\n[用户诉求] ${userInput as string}`;
      systemInstruction = `你是一名深谙现代应用理念的奇门遁甲专家，擅长将传统术数转化为清晰、可操作的决策建议。请根据提供的盘局数据进行分析。分析框架：1.【乾坤定局】；2.【核心能量】；3.【纵横博弈】；4.【实战理法】。${baseConstraints}`;
    } else if (mode === 'YI_LOGIC') {
      if (type === 'LI_YAO') {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻逻辑推演] 占问事项：${input.question}。卦象动数：${input.numbers.join(',')}。`;
        systemInstruction = `你是一位精通六爻演化的专家。${baseConstraints}`;
      } else {
        const input = userInput as BaZiInput;
        const hasTime = !!input.birthTime && input.birthTime !== '';
        currentCalculatedBazi = calculateBaZi(new Date(input.birthDate + ' ' + (input.birthTime || '00:00')), hasTime);
        setBaziData(currentCalculatedBazi);
        
        finalUserInput = `性别：${input.gender}\n四柱：${JSON.stringify(currentCalculatedBazi)}\n公历生日：${input.birthDate}\n出生地点：${input.birthPlace}\n诉求：${userInput?.question || '深度分析命局特质。'}`;
        systemInstruction = `你是一位精通命理气象论的专家。请基于已排定的四柱干支进行深度分析。严禁自行重排。${baseConstraints}`;
      }
    } else if (mode === 'TCM_AI') {
      finalUserInput = `【全息辨证】${userInput as string}`;
      systemInstruction = `你是精通“医易同源”的中医专家。${baseConstraints}`;
    }

    // 第二步：开始流式分析
    try {
      const initialMessages: ChatMessage[] = [
        { role: "system", content: systemInstruction },
        { role: "user", content: finalUserInput }
      ];
      const fullResponse = await streamResponse(initialMessages);
      
      // 原子切换：清空流显示，更新历史显示，存入历史
      setDisplayPrediction('');
      setChatHistory([{ role: "assistant", content: fullResponse }]);
      saveToHistory(fullResponse, summaryInput, currentCalculatedBoard, currentCalculatedBazi);
    } catch (err: any) { 
      setError(err.message); 
      setDisplayPrediction('');
    } finally { 
      setLoading(false); 
    }
  }, [userLocation, mode, streamResponse]);

  const handleFollowUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followUpText.trim() || followUpLoading) return;
    const query = followUpText;
    setFollowUpText('');
    setFollowUpLoading(true);
    
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: query }];
    setChatHistory(newHistory);
    
    try {
      const fullResponse = await streamResponse(newHistory);
      setDisplayPrediction('');
      setChatHistory(prev => [...prev, { role: "assistant", content: fullResponse }]);
    } catch (err: any) { 
      setError(err.message); 
      setDisplayPrediction('');
    } finally { 
      setFollowUpLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col parchment-bg">
      <Header onOpenProfile={() => setIsProfileOpen(true)} />
      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        history={history}
        onLoadHistory={loadFromHistory}
        onClearHistory={clearHistory}
      />

      <div className="bg-slate-900/90 border-y border-rose-500/20 backdrop-blur-2xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center h-16 px-4">
          <button onClick={() => setMode('QIMEN')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'QIMEN' ? 'text-rose-400' : 'text-slate-500'}`}>
            {mode === 'QIMEN' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 shadow-[0_0_20px_#f43f5e] animate-pulse"></div>}
            奇门
          </button>
          <button onClick={() => setMode('YI_LOGIC')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'YI_LOGIC' ? 'text-rose-400' : 'text-slate-500'}`}>
            {mode === 'YI_LOGIC' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 shadow-[0_0_20px_#f43f5e]"></div>}
            易理
          </button>
          <button onClick={() => setMode('TCM_AI')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'TCM_AI' ? 'text-rose-400' : 'text-slate-500'}`}>
            {mode === 'TCM_AI' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 shadow-[0_0_20px_#f43f5e]"></div>}
            中医
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        <section className={`bg-slate-950/40 border border-emerald-900/30 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl ring-1 ring-emerald-500/10`}>
          <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
        </section>
        
        {mode === 'QIMEN' && board && <BoardGrid board={board} />}
        {mode === 'YI_LOGIC' && baziData && <BaZiChart pillars={baziData} />}

        {(chatHistory.length > 0 || displayPrediction || loading || error) && (
          <section className="bg-slate-950/80 border border-rose-900/20 p-8 md:p-14 rounded-[3rem] backdrop-blur-3xl relative shadow-[0_0_50px_rgba(244,63,94,0.05)]">
            <div className="relative z-10 space-y-20">
              {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`animate-in fade-in duration-700 ${msg.role === 'user' ? 'opacity-40 border-l-2 border-emerald-500/20 pl-8 py-4 mb-14 italic' : ''}`}>
                  <AnalysisDisplay prediction={msg.content} />
                </div>
              ))}
              
              {displayPrediction && (
                <div className="pt-12 border-t border-rose-950/80">
                   <p className="text-[11px] mb-10 tracking-[1.2em] font-black uppercase text-rose-500 animate-pulse flex items-center gap-4">
                     <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                     解析中...
                   </p>
                   <AnalysisDisplay prediction={displayPrediction} />
                </div>
              )}

              {loading && !displayPrediction && (
                <div className="flex flex-col items-center justify-center py-32 opacity-60">
                  <div className="w-16 h-16 border-[3px] border-emerald-500/10 border-t-rose-500 rounded-full animate-spin"></div>
                </div>
              )}
              
              {error && (
                <div className="p-8 bg-red-950/30 border border-red-900/40 rounded-3xl text-red-400 text-[11px] font-black">
                   ✕ {error}
                </div>
              )}
            </div>

            {chatHistory.length > 0 && !loading && !error && (
              <div className="mt-24 pt-12 border-t border-rose-950/80">
                <form onSubmit={handleFollowUp} className="relative max-w-2xl mx-auto">
                   <textarea value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="进一步研讨..." className="w-full h-32 bg-slate-950 border border-slate-900 rounded-[2rem] p-7 text-slate-200 focus:outline-none resize-none text-[13px]" />
                   <button type="submit" className="absolute bottom-6 right-6 bg-rose-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest">发送</button>
                </form>
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
