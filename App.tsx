
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
          temperature: 0.2,
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
      
      systemInstruction = `你是一位资深奇门遁甲时空建模与预测专家。精通数理逻辑、现代决策科学与心理学。将奇门视为高维时空信息处理系统。
严禁使用 Markdown（#，*）。

你的解析需遵循：
1. 时空建模：结合北京时间、真太阳时及地理位置。
2. 九维立体分析：分析地、天、人、神四盘，识别吉凶格（如青龙返首、庚格等），评估空亡与马星。
3. 交互原则：严谨科学、拒绝宿命论。

必须严格按以下结构输出：
【⚖️ 时空起局公示】
- 测算时间：[干支四柱]
- 地理坐标：[城市及经纬度]
- 局式信息：[局数、值符、值使]

【🔍 盘局深度解析】
1. 用神状态：(定位关键用神，分析旺衰生克)
2. 时空环境：(利进攻/防守/等待)
3. 关键矛盾点：(核心阻碍或突破口)

【💡 预测结论】
(对趋势给出清晰肯定预判)

【🚀 实战运筹建议】
- 心态指导：(对镜观心建议)
- 行为决策：(具体行动步骤)
- 空间优化：(利事方位建议)`;

      finalUserInput = `[用户诉求]：${userInput}\n[当前盘面数据]：${JSON.stringify(activeBoard)}\n[真太阳时]：${activeBoard.trueSolarTime}\n[地理坐标]：${location ? `北纬${location.latitude} 东经${location.longitude}` : '默认120E'}`;

    } else if (mode === 'YI_LOGIC') {
      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi);
        
        systemInstruction = `你是一位精通中国传统命理学，同时融合现代心理学、商业战略的人生系统优化顾问。核心原则：严谨遵循子平八字理论，用神判定经“病药→调候→通关”验证。严禁 Markdown 符号（不要出现 #, *, ** 等）。

必须严格按照以下格式和内容板块输出：
# 【八字命理分析报告】
## 一、命盘基础信息
- 八字：[干支]
- 十神：[分布]
- 大运：[当前大运]

## 二、命格核心诊断
1. 能量状态（日主旺衰、五行分布、是否偏枯）
2. 用神判定（病药、调候、通关三步推导结论）
3. 格局特征（格局名称、优势、挑战）

## 三、多维优化方案
### 🏠 环境能量调整
[方位、色彩、材质建议]
### 💼 事业财富策略
[适配行业、能力重心、周期建议]
### ❤️ 情感关系指导
[模式、佳期、考验期]
### 🌱 健康养生要点
[脏腑、饮食、功法建议]
### 🕐 近期运势节奏
[大运解读、未来三年关键年份数字提醒]

## 四、综合建议总结
[150字个性化实操总结]`;

        const p = activeBazi.pillars;
        finalUserInput = `[命盘输入] 性别：${input.gender} 公历：${input.birthDate} 时辰：${input.birthTime || '不详'}
排盘：${p.year.stem}${p.year.branch} ${p.month.stem}${p.month.branch} ${p.day.stem}${p.day.branch} ${p.hour.stem}${p.hour.branch}
地理信息：${input.birthPlace} (真太阳时已修正)
诉求：${input.question || '深度推演个人命理气象与发展路径。'}`;
      } else {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻分析] 卦数：${input.numbers.join(', ')} 诉求：${input.question}`;
        systemInstruction = `你是一位六爻推演专家。以《增删卜易》为宗，严禁 Markdown。结构：一、卦象组合 二、用神旺衰 三、动变解析 四、最终定论。`;
      }
    } else {
      finalUserInput = userInput;
      systemInstruction = `中医全息调理专家。以五行气象论为基础，分析脏腑虚实。严禁 Markdown。结构：一、辨证分析 二、病机探讨 三、调理建议 四、生活禁忌。`;
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
      
      <div className="bg-slate-900/90 border-y border-rose-500/20 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex h-14 px-4">
          <button onClick={() => handleModeChange('QIMEN')} className={`flex-1 text-[10px] font-black tracking-widest transition-all ${mode === 'QIMEN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>奇门</button>
          <button onClick={() => handleModeChange('YI_LOGIC')} className={`flex-1 text-[10px] font-black tracking-widest transition-all ${mode === 'YI_LOGIC' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>易理</button>
          <button onClick={() => handleModeChange('TCM_AI')} className={`flex-1 text-[10px] font-black tracking-widest transition-all ${mode === 'TCM_AI' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>中医</button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-500 text-[10px] text-center font-black animate-shake">{error}</div>}
        
        <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} location={location} onSetLocation={setLocation} />
        
        {(board || baziData) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {board && <BoardGrid board={board} />}
             {baziData && <BaziResult data={baziData} />}
          </div>
        )}

        {isAiThinking && (
          <section className="bg-slate-950/40 border border-emerald-900/10 p-10 rounded-[2rem] flex flex-col items-center justify-center gap-6 min-h-[250px]">
            <div className="relative">
              <div className="w-14 h-14 border-2 border-rose-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] text-rose-500 font-black">思</span></div>
            </div>
            <p className="text-[9px] text-emerald-500 font-black tracking-[0.4em] uppercase">逻辑引擎推演中 · Processing</p>
          </section>
        )}

        {displayPrediction && (
          <section className="bg-slate-950/80 border border-rose-900/20 p-6 md:p-10 rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] pointer-events-none"></div>
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
