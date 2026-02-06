
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

// 火山引擎 Ark 模型 ID
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

  useEffect(() => {
    const saved = localStorage.getItem('qimen_prediction_history_v3');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('qimen_prediction_history_v3', JSON.stringify(history));
    }
  }, [history]);

  // 极速流式传输处理器
  const streamResponse = async (messages: ChatMessage[]) => {
    fullTextRef.current = '';
    setDisplayPrediction('');
    setIsAiThinking(true); // 进入 AI 逻辑构思状态
    
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

      if (!response.ok) throw new Error('星辰轨迹偏移，服务连接异常');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('无法感应能量流');

      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const jsonStr = line.trim().slice(6);
            if (jsonStr === '[DONE]') break;
            try {
              const data = JSON.parse(jsonStr);
              const content = data.choices[0]?.delta?.content || "";
              
              if (isFirstChunk && content) {
                setIsAiThinking(false); // 首字节到达，关闭构思界面，开启解析界面
                isFirstChunk = false;
              }

              fullTextRef.current += content;
              setDisplayPrediction(fullTextRef.current);
            } catch (e) {}
          }
        }
      }
      return fullTextRef.current;
    } catch (err: any) {
      setIsAiThinking(false);
      throw err;
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

    // 共享专家指令（严禁 Markdown 符号，强调气象论）
    const EXPERT_SYSTEM_BASE = `你是一位承袭“医易同源”智慧的深度易学专家。你的分析核心严密遵循“五行气象论”与“三才实战算法”，强调逻辑推演，拒绝一切封建迷信与虚假断语。

一、 核心分析逻辑（执行标准）：
1. 评估“气象”：凡命局与卦象，首看寒暖燥湿。冬生水冷金寒必用丙火解冻；夏生火炎土燥必用壬癸滋润。气象舒展则吉，偏枯则滞。
2. 识别“轴心”：识别核心用神与忌神，察月令之旺相休囚。
3. 推演“路径”：查看冲、合、空、破、回头克对能量流转的影响。旬空代表事未落实，月破代表根基已断，回头克代表内部变质。
4. 现代语义映射：食神为“创意/流量”，官杀为“压力/管理”，印星为“背书/保障”。

二、 输出约束（强制执行）：
1. 严禁使用 # 和 * 符号。严禁使用 Markdown 加粗格式。
2. 结构必须包含以下四大模块：
   一、 能量态势透视
   二、 深度逻辑分析（分析气象平衡、流通病药）
   三、 核心判定结论（不模棱两可）
   四、 综合调理建议`;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, 120);
      setBoard(activeBoard); // 立即展示排盘
      finalUserInput = `[任务：奇门全息解析]\n盘局数据：${JSON.stringify(activeBoard)}\n诉求：${userInput}`;
      systemInstruction = EXPERT_SYSTEM_BASE + `\n三、奇门专项：以值符为天时，值使为人心。重点分析星门神干互动。`;
    } else if (mode === 'YI_LOGIC') {
      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi); // 立即展示八字图表
        
        const p = activeBazi.pillars;
        finalUserInput = `[任务：深度分析命局]
用户数据：
性别：${input.gender}
出生时间：${input.birthDate} ${input.birthTime || '时辰不详'}
历法：公历
姓名：${input.name || '命主'}
【命局排盘】年柱：${p.year.stem}${p.year.branch} 月柱：${p.month.stem}${p.month.branch} 日柱：${p.day.stem}${p.day.branch} 时柱：${p.hour.stem}${p.hour.branch}
诉求：${input.question || '请综合评估此命局之气象平衡及未来五年流年趋势。'}`;
        systemInstruction = EXPERT_SYSTEM_BASE;
      } else {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻逻辑推演]
占问事项：${input.question}
卦象爻位：${input.numbers.join(', ')}
起卦时间：${new Date().toLocaleString()}

请执行“三才判定”：以月建为天时、日辰为地利、动爻为人心。给出成败判断及【月份趋势】。`;
        systemInstruction = EXPERT_SYSTEM_BASE;
      }
    } else if (mode === 'TCM_AI') {
      finalUserInput = userInput;
      systemInstruction = `你是一位精通传统中医全息调理的专家。严禁使用 Markdown 符号。
输出结构：
一、 全息失衡判定
二、 核心病机解析
三、 调理原则
四、 综合方案（食疗、生活习惯）`;
    }

    try {
      const result = await streamResponse([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: finalUserInput }
      ]);

      const newEntry: PredictionHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        mode,
        input: typeof userInput === 'string' ? userInput : (userInput.question || userInput.name || '时空推演'),
        result,
        board: activeBoard,
        baziData: activeBazi
      };
      setHistory(prev => [newEntry, ...prev].slice(0, 50));
    } catch (err: any) {
      setError(err.message || '因果律传导受阻，请重试');
    } finally {
      setLoading(false);
      setIsAiThinking(false);
    }
  }, [mode, getBaziResult]);

  const handleLoadHistory = (entry: PredictionHistory) => {
    setMode(entry.mode);
    setBoard(entry.board || null);
    setBaziData(entry.baziData || null);
    setDisplayPrediction(entry.result);
    setIsProfileOpen(false);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col parchment-bg">
      <Header onOpenProfile={() => setIsProfileOpen(true)} />
      
      <div className="bg-slate-900/90 border-y border-rose-500/20 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex h-16 px-4">
          <button onClick={() => setMode('QIMEN')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'QIMEN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>奇门</button>
          <button onClick={() => setMode('YI_LOGIC')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'YI_LOGIC' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>易理</button>
          <button onClick={() => setMode('TCM_AI')} className={`flex-1 text-[11px] font-black tracking-widest transition-all ${mode === 'TCM_AI' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-slate-500 hover:text-slate-200'}`}>中医</button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs text-center font-black animate-pulse">
            {error}
          </div>
        )}
        
        <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
        
        {/* 第一步：物理排盘展示 */}
        {(board || baziData) && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
             {board && <BoardGrid board={board} />}
             {baziData && <BaziResult data={baziData} />}
          </div>
        )}

        {/* AI 思维缓冲状态 */}
        {isAiThinking && (
          <section className="bg-slate-950/40 border border-emerald-900/20 p-12 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 min-h-[300px] animate-pulse">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 border-2 border-rose-500/30 rounded-full animate-ping"></div>
              <div className="absolute inset-2 border-2 border-emerald-500/30 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-rose-500 font-black">智</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-[10px] text-emerald-500 font-black tracking-[0.6em] uppercase">正在启动全息逻辑引擎</p>
              <p className="text-[12px] text-slate-500 italic">正在审视寒暖燥湿，权衡五行气象...</p>
            </div>
          </section>
        )}

        {/* 第二步：AI 深度推演流 */}
        {displayPrediction && (
          <section className="bg-slate-950/80 border border-rose-900/20 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-1000">
            <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 blur-[120px] pointer-events-none"></div>
            
            <div className="mb-10 border-b border-rose-900/10 pb-6 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-rose-500 font-black tracking-[0.5em] uppercase">全息演化报告 · Holographic Report</span>
                <span className="text-[8px] text-slate-600 font-mono tracking-widest">REAL-TIME QUANTUM DECODING...</span>
              </div>
              {loading && (
                <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-rose-500/20">
                  <span className="text-[9px] text-rose-400 font-black animate-pulse">专家逻辑连线中</span>
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></div>
                </div>
              )}
            </div>
            <AnalysisDisplay prediction={displayPrediction} />
          </section>
        )}
      </main>
      
      <Footer />

      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        history={history}
        onLoadHistory={handleLoadHistory}
        onClearHistory={() => setHistory([])}
      />
    </div>
  );
};

export default App;
