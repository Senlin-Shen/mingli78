
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaZiChart from './components/BaZiChart';
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
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [displayPrediction, setDisplayPrediction] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [history, setHistory] = useState<PredictionHistory[]>([]);
  
  const { getBaziResult } = useBazi();
  const fullTextRef = useRef('');

  useEffect(() => {
    const saved = localStorage.getItem('qimen_prediction_history_v2');
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
      localStorage.setItem('qimen_prediction_history_v2', JSON.stringify(history));
    }
  }, [history]);

  const streamResponse = async (messages: ChatMessage[]) => {
    fullTextRef.current = '';
    setDisplayPrediction('');
    
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

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '服务响应异常');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('无法读取响应流');

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
              fullTextRef.current += content;
              setDisplayPrediction(fullTextRef.current);
            } catch (e) {}
          }
        }
      }
      return fullTextRef.current;
    } catch (err: any) {
      console.error("Ark Proxy Error:", err);
      throw err;
    }
  };

  const handlePredict = useCallback(async (userInput: any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    setChatHistory([]);
    setBoard(null);
    setBaziData(null);

    let systemInstruction = "";
    let finalUserInput = "";
    let activeBoard: QiMenBoard | null = null;
    let activeBazi: BaziResultData | null = null;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      activeBoard = calculateBoard(targetDate, 120);
      setBoard(activeBoard);
      finalUserInput = `[奇门起局数据] ${JSON.stringify(activeBoard)}。\n[诉求] ${userInput}`;
      systemInstruction = `你是一位精通奇门遁甲的实战预测专家。请基于以上盘局，重点分析星、门、神、干在九宫中的互动（生克、反吟、伏吟、格局），给出符合易理的专业化推演建议。输出应逻辑严密，避免模棱两可。`;
    } else if (mode === 'YI_LOGIC') {
      const baseSystem = `你是一位承袭“医易同源”智慧的深度易学专家。你的分析核心严密遵循“五行气象论”与“三才实战算法”，强调逻辑推演，拒绝一切封建迷信与虚假断语。

一、 核心分析逻辑：
1. 评估“气象”：首看寒暖燥湿。冬生水冷金寒必用丙火解冻；夏生火炎土燥必用壬癸滋润。气象舒展则吉，偏枯则滞。
2. 识别“轴心”：寻月令格局、核心用神与忌神。
3. 推演“路径”：查看冲、合、空、破、回头克对能量流转的影响。旬空代表事未落实，月破代表根基已断，回头克代表内部变质。
4. 现代语义映射：食神为“创意/流量”，官杀为“压力/管理”，印星为“背书/保障”。

二、 输出约束（强制执行）：
1. 严禁使用 # 和 * 符号。严禁使用 Markdown 加粗格式。
2. 结构必须包含以下四大模块：
   一、 能量态势透视
   二、 深度逻辑分析
   三、 核心判定结论
   四、 综合调理建议`;

      if (type === 'BA_ZI') {
        const input = userInput as BaZiInput;
        activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
        setBaziData(activeBazi);
        
        const p = activeBazi.pillars;
        finalUserInput = `[任务：深度分析命局]
用户数据：
性别：${input.gender}
出生时间：${input.birthDate} ${input.birthTime || '时辰不详'}
历法：公历
姓名：${input.name || '命主'}
排盘：年柱：${p.year.stem}${p.year.branch} 月柱：${p.month.stem}${p.month.branch} 日柱：${p.day.stem}${p.day.branch} 时柱：${p.hour.stem}${p.hour.branch}
诉求：${input.question || '综合分析'}

请先进行“五行气象评估”，再判定“核心用神”，最后推演其在现代社会中的流通情况。输出必须包含【命局排盘】和未来五年【流年趋势】（格式如：2025年：内容）。`;
        systemInstruction = baseSystem;
      } else {
        // 六爻逻辑
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻逻辑推演]
占问事项：${input.question}
卦象数据：${input.numbers.join(', ')}
起卦时间：${new Date().toLocaleString()}

请执行“三才判定”：以月建为天时、日辰为地利、动爻为人心。重点排查是否存在“旬空、月破、回头克”等逻辑缺陷。给出明确的成败判断及应期，并输出【月份趋势】。`;
        systemInstruction = baseSystem;
      }
    } else if (mode === 'TCM_AI') {
      finalUserInput = userInput;
      systemInstruction = `你是一位精通传统中医全息调理的专家。请基于患者描述的症状，运用中医辨证逻辑（八纲辨证、脏腑辨证），判明虚实寒热，分析病机演变。
输出必须包含：
【全息失衡判定】
【核心病机】
【核心调理原则】
【全息方案建议】（包含食疗建议、生活习惯调整、情志调养）。
语气应专业、严谨且具有人文关怀。`;
    }

    try {
      const result = await streamResponse([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: finalUserInput }
      ]);
      setChatHistory([{ role: 'assistant', content: result }]);

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
      setError(err.message || '推演连接超时，请重试');
    } finally {
      setLoading(false);
    }
  }, [mode, getBaziResult]);

  const handleLoadHistory = (entry: PredictionHistory) => {
    setMode(entry.mode);
    setBoard(entry.board || null);
    setBaziData(entry.baziData || null);
    setDisplayPrediction(entry.result);
    setChatHistory([{ role: 'assistant', content: entry.result }]);
    setIsProfileOpen(false);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleClearHistory = () => {
    if (window.confirm('确认清除所有历史记录？')) {
      setHistory([]);
      localStorage.removeItem('qimen_prediction_history_v2');
    }
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
        
        {board && <BoardGrid board={board} />}
        {baziData && <BaziResult data={baziData} />}

        {(displayPrediction || chatHistory.length > 0) && (
          <section className="bg-slate-950/80 border border-rose-900/20 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] pointer-events-none"></div>
            
            <div className="mb-8 border-b border-rose-900/10 pb-4 flex items-center justify-between">
              <span className="text-[10px] text-rose-500 font-black tracking-[0.5em] uppercase">全息逻辑推演 · Insight Matrix</span>
              {loading && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 animate-pulse">正在转动玄枢...</span>
                  <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <AnalysisDisplay prediction={displayPrediction || chatHistory[0]?.content} />
          </section>
        )}
      </main>
      
      <Footer />

      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        history={history}
        onLoadHistory={handleLoadHistory}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
};

export default App;
