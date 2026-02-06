
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaZiChart from './components/BaZiChart';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard } from './qimenLogic';
import { QiMenBoard, LocationData, AppMode, LiuYaoInput, BaZiInput } from './types';

const CHINA_CENTER = { lng: 108.9, lat: 34.2 };

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
  const [followUpText, setFollowUpText] = useState('');
  const [displayPrediction, setDisplayPrediction] = useState('');
  const lastUpdateTime = useRef(0);

  const getPalaceFromCoords = (lng: number, lat: number) => {
    const angle = Math.atan2(lat - CHINA_CENTER.lat, lng - CHINA_CENTER.lng);
    let degrees = angle * (180 / Math.PI);
    if (degrees < 0) degrees += 360;
    // 依后天八宫方位映射
    if (degrees >= 337.5 || degrees < 22.5) return "震三宫";
    if (degrees >= 22.5 && degrees < 67.5) return "艮八宫";
    if (degrees >= 67.5 && degrees < 112.5) return "坎一宫";
    if (degrees >= 112.5 && degrees < 157.5) return "乾六宫";
    if (degrees >= 157.5 && degrees < 202.5) return "兑七宫";
    if (degrees >= 202.5 && degrees < 247.5) return "坤二宫";
    if (degrees >= 247.5 && degrees < 292.5) return "离九宫";
    return "巽四宫";
  };

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

  const updateDisplay = useCallback((text: string, force = false) => {
    const now = performance.now();
    if (force || now - lastUpdateTime.current > 16) { 
      setDisplayPrediction(text);
      lastUpdateTime.current = now;
    }
  }, []);

  const streamResponse = async (messages: ChatMessage[], customModel?: string) => {
    setError('');
    try {
      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.4,
          model: customModel
        })
      });

      if (!response.ok) throw new Error("通联链路异常");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取流数据");

      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              fullText += data.choices[0]?.delta?.content || "";
              updateDisplay(fullText);
            } catch (e) {}
          }
        }
      }
      updateDisplay(fullText, true);
      return fullText;
    } catch (err: any) {
      throw new Error(err.message || "推演中断");
    }
  };

  const handlePredict = useCallback(async (userInput: string | any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    setChatHistory([]);
    
    let systemInstruction = "";
    let finalUserInput = "";

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      const newBoard = calculateBoard(targetDate, userLocation?.longitude);
      const autoPalace = userLocation?.palaceName || '中五宫';
      newBoard.direction = autoPalace;
      if (userLocation) newBoard.location = { ...userLocation, isAdjusted: true };
      setBoard(newBoard);

      finalUserInput = `起局方位：${autoPalace}（当前IP定位映射）。盘象参数：${JSON.stringify(newBoard)}。诉求详述：${userInput as string}`;
      systemInstruction = `你是一位承袭“碧海易学”姜兴道老师心法的奇门专家。
分析逻辑：
1. **气象为先**：评估局中寒暖燥湿，看气机是否舒展。
2. **定局抽轴**：看值符值使落宫，断大势；看用神与时干，断细节。
3. **流通为贵**：分析宫位生克流转，找出阻塞点（如空亡、入墓、刑破）。
4. **实战映射**：将干支象意转化为现代商业、职业或情感的具体指导。
输出：严禁 Markdown，语气须专业、深邃、富有温情。分【能量态势】、【逻辑发微】、【核心判定】、【碧海调理】输出。`;
    } else if (mode === 'YI_LOGIC') {
      setBoard(null);
      if (type === 'LIU_YAO') {
        finalUserInput = `【六爻演化】动数：${(userInput as LiuYaoInput).numbers.join(',')}。事宜：${(userInput as LiuYaoInput).question}`;
        systemInstruction = `你是一位《增删卜易》实战专家。分析用神强弱、月建日辰影响及应期。严禁 Markdown。`;
      } else {
        finalUserInput = `【四柱气象】生辰：${(userInput as BaZiInput).birthDate}。诉求：职业定式。`;
        systemInstruction = `你是一位五行气象论顶级专家。分析格局气象与现代职业映射。严禁 Markdown。`;
      }
    } else if (mode === 'TCM_AI') {
      setBoard(null);
      finalUserInput = `全息辨证诉求：${userInput as string}`;
      systemInstruction = `你是一位“医易同源”全息辨证专家。严禁 Markdown。按【失衡判定】、【核心病机】、【全息方案】输出。`;
    }

    try {
      const initialMessages: ChatMessage[] = [
        { role: "system", content: systemInstruction },
        { role: "user", content: finalUserInput }
      ];
      const fullResponse = await streamResponse(initialMessages);
      setChatHistory([...initialMessages, { role: "assistant", content: fullResponse }]);
      setDisplayPrediction(''); 
    } catch (err: any) { 
      setError(err.message); 
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
    const systemMsg = chatHistory.find(m => m.role === 'system')?.content || "";
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: query }];
    setChatHistory(newHistory);
    try {
      const fullResponse = await streamResponse(newHistory);
      setChatHistory(prev => [...prev, { role: "assistant", content: fullResponse }]);
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setFollowUpLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col parchment-bg">
      <Header />
      
      <div className="bg-orange-950/80 border-y border-orange-500/20 backdrop-blur-xl sticky top-0 z-50 shadow-2xl shadow-orange-900/10">
        <div className="max-w-4xl mx-auto flex items-center h-14 px-4">
          <button onClick={() => setMode('QIMEN')} className={`flex-1 h-full text-[10px] tracking-[0.4em] font-black transition-all relative overflow-hidden ${mode === 'QIMEN' ? 'text-orange-500' : 'text-slate-500'}`}>
            {mode === 'QIMEN' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_10px_orange]"></div>}
            奇门推演
          </button>
          <button onClick={() => setMode('YI_LOGIC')} className={`flex-1 h-full text-[10px] tracking-[0.4em] font-black transition-all relative overflow-hidden ${mode === 'YI_LOGIC' ? 'text-orange-500' : 'text-slate-500'}`}>
            {mode === 'YI_LOGIC' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></div>}
            易理实验
          </button>
          <button onClick={() => setMode('TCM_AI')} className={`flex-1 h-full text-[10px] tracking-[0.4em] font-black transition-all relative overflow-hidden ${mode === 'TCM_AI' ? 'text-orange-500' : 'text-slate-500'}`}>
            {mode === 'TCM_AI' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></div>}
            中医辨证
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
        <section className={`bg-slate-900/60 border border-orange-900/30 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl shadow-orange-950/20 ring-1 ring-orange-500/10`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black text-orange-200 flex items-center gap-4">
              <span className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 text-xs">甲</span>
              录入参数
            </h2>
            {userLocation && (
              <div className="text-[9px] text-orange-400/60 tracking-widest font-mono">
                {userLocation.city} | {userLocation.ip}
              </div>
            )}
          </div>
          <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
        </section>
        
        {mode === 'QIMEN' && board && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
             <BoardGrid board={board} />
          </div>
        )}

        {(chatHistory.length > 0 || displayPrediction || loading || error) && (
          <section className="bg-slate-950/40 border border-orange-900/20 p-8 md:p-12 rounded-[2rem] backdrop-blur-3xl shadow-2xl shadow-orange-950/30">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-sm font-black text-orange-200 flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 text-xs">乙</span>
                推演解构
              </h2>
            </div>

            <div className="space-y-16">
              {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`animate-in fade-in duration-700 ${msg.role === 'user' ? 'opacity-50 border-l-2 border-orange-500/20 pl-6 py-4 mb-10' : ''}`}>
                  <AnalysisDisplay prediction={msg.content} />
                </div>
              ))}
              
              {displayPrediction && (
                <div className="pt-10 border-t border-orange-950/50">
                   <p className="text-[10px] mb-8 tracking-[0.6em] font-black uppercase text-orange-500 animate-pulse flex items-center gap-3">
                     <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_orange]"></span>
                     离火运化中...
                   </p>
                   <AnalysisDisplay prediction={displayPrediction} />
                </div>
              )}

              {loading && !displayPrediction && (
                <div className="flex flex-col items-center justify-center gap-8 py-24 opacity-40">
                  <div className="w-12 h-12 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                  <p className="text-[10px] tracking-[1em] text-orange-500">通联时空</p>
                </div>
              )}
              
              {error && (
                <div className="p-6 bg-red-950/20 border border-red-900/30 rounded-2xl text-red-400 text-xs tracking-widest font-bold">
                   <span className="text-red-600 mr-3">✕</span> {error}
                </div>
              )}
            </div>

            {chatHistory.length > 0 && !loading && !error && (
              <div className="mt-20 pt-10 border-t border-orange-950/50">
                <form onSubmit={handleFollowUp} className="relative group max-w-2xl mx-auto">
                   <textarea 
                     value={followUpText} 
                     onChange={(e) => setFollowUpText(e.target.value)} 
                     placeholder="关于推演结果，您还有什么需要深入研讨的变数？" 
                     className="w-full h-28 bg-slate-950/90 border border-orange-950 rounded-2xl p-5 text-slate-200 focus:outline-none focus:border-orange-500/40 transition-all resize-none text-xs leading-loose" 
                   />
                   <button type="submit" className="absolute bottom-5 right-5 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-xl shadow-orange-900/40">
                     追问研讨
                   </button>
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
