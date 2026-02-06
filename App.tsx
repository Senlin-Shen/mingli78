
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaZiChart from './components/BaZiChart';
import BaziResult from './components/BaziResult';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import ProfilePanel from './components/ProfilePanel';
// Always use import {GoogleGenAI} from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import { calculateBoard } from './qimenLogic';
import { useBazi } from './hooks/useBazi';
import { QiMenBoard, LocationData, AppMode, LiuYaoInput, BaZiInput } from './types';
import { BaziResultData } from './types/bazi.types';

// Use gemini-3-pro-preview for complex reasoning tasks like QiMen and TCM analysis
const GEMINI_MODEL = "gemini-3-pro-preview";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Fix: Export PredictionHistory to resolve the error in components/ProfilePanel.tsx
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

  // Fix: Persistence for prediction history
  useEffect(() => {
    const saved = localStorage.getItem('qimen_prediction_history_v1');
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
      localStorage.setItem('qimen_prediction_history_v1', JSON.stringify(history));
    }
  }, [history]);

  // Fix: Refactor to use Google Gemini API with direct integration and streaming
  const streamResponse = async (messages: ChatMessage[]) => {
    fullTextRef.current = '';
    setDisplayPrediction('');
    
    // Create a new GoogleGenAI instance right before making an API call to ensure fresh configuration
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

      const responseStream = await ai.models.generateContentStream({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullTextRef.current += text;
          setDisplayPrediction(fullTextRef.current);
        }
      }
      return fullTextRef.current;
    } catch (err: any) {
      console.error("Gemini API Error:", err);
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
      systemInstruction = `你是一位精通奇门遁甲的专家。请基于以上盘局进行深度推演。分析星、门、神、干在宫位中的互动，给出针对性建议。`;
    } else if (mode === 'YI_LOGIC' && type === 'BA_ZI') {
      const input = userInput as BaZiInput;
      activeBazi = getBaziResult(input.birthDate, input.birthTime || '', input.birthPlace, input.gender);
      setBaziData(activeBazi);
      
      finalUserInput = `【排盘结果】${JSON.stringify(activeBazi)}\n【命主诉求】${input.question || '综合运势解析'}`;
      systemInstruction = `你是一位精通八字气象论与五行理法的专家。请基于排盘结果，分析命造气象分布、十神意向及运势起伏。`;
    } else if (mode === 'TCM_AI') {
      finalUserInput = userInput;
      systemInstruction = `你是一位精通传统中医全息调理的专家。请分析患者描述的症状，判明虚实寒热，并给出病机解析与调理方案。`;
    }

    try {
      const result = await streamResponse([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: finalUserInput }
      ]);
      setChatHistory([{ role: 'assistant', content: result }]);

      // Fix: Record history entry after successful prediction
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
      setError(err.message || '推演连接超时或异常，请稍后重试');
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
    if (window.confirm('确认清除所有历史推演记录？')) {
      setHistory([]);
      localStorage.removeItem('qimen_prediction_history_v1');
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
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs text-center font-black">
            {error}
          </div>
        )}
        
        <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
        
        {/* Core data visualization */}
        {board && <BoardGrid board={board} />}
        {baziData && <BaziResult data={baziData} />}

        {/* AI Insight section */}
        {(displayPrediction || chatHistory.length > 0) && (
          <section className="bg-slate-950/80 border border-rose-900/20 p-8 rounded-[2rem] shadow-2xl">
            <div className="mb-8 border-b border-rose-900/10 pb-4 flex items-center justify-between">
              <span className="text-[10px] text-rose-500 font-black tracking-[0.5em] uppercase">全息逻辑推演 · AI Insight</span>
              {loading && <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>}
            </div>
            <AnalysisDisplay prediction={displayPrediction || chatHistory[0]?.content} />
          </section>
        )}
      </main>
      
      <Footer />

      {/* Fix: Added the missing ProfilePanel rendering to handle user history and state loading */}
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
