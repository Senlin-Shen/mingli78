
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard } from './qimenLogic';
import { QiMenBoard, LocationData, AppMode, LiuYaoInput, BaZiInput } from './types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const CHINA_CENTER = { lng: 108.9, lat: 34.2 };

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [mode, setMode] = useState<AppMode>('QIMEN');
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<(LocationData & { city?: string, ip?: string, palaceName?: string }) | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followUpText, setFollowUpText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [prediction, chatHistory]);

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

  const streamResponse = async (messages: ChatMessage[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const contents = userMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }]
    }));

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: systemMsg?.content,
        temperature: 0.7,
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const content = (chunk as GenerateContentResponse).text || "";
      fullText += content;
      setPrediction(prev => prev + content);
    }
    return fullText;
  };

  const handlePredict = useCallback(async (userInput: string | any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setPrediction('');
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

      finalUserInput = userInput as string;
      systemInstruction = `你是一位精通“奇门景曜”体系的当代实战推演专家。
当前求测者入局【${autoPalace}】。
【起局参数】：修正时间：${newBoard.trueSolarTime}, 局数：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局。
【推演要求】：深入分析【${autoPalace}】宫内的星门神仪，给出实战落地建议。
输出格式：[审局辨势]、[${autoPalace}解析]、[实战建议]、[最终胜算]。禁用Markdown符号。`;
    } else {
      setBoard(null);
      if (type === 'LIU_YAO') {
        const input = userInput as LiuYaoInput;
        finalUserInput = `【六爻报数起卦】
报数：${input.numbers.join(', ')}
求问：${input.question}`;
      } else {
        const input = userInput as BaZiInput;
        finalUserInput = `【四柱气象分析】
姓名：${input.name}
性别：${input.gender}
出生日期：${input.birthDate}
出生地址：${input.birthPlace}`;
      }

      systemInstruction = `# Role
你是一位精通传统易学（四柱命理、六爻预测）与道家智慧的资深专家。
# Core Analysis Logic
1. 六爻演化模型：基于《增删卜易》，关注用神旺衰、回头生克。
2. 四柱命理模型：五行气象论。审视寒暖燥湿，调候优先。
3. 医易同源：分析五行过盈。
输出格式严格遵循：一、气象与能量态势分析；二、核心逻辑推论；三、详细判定结论；四、行为与环境调理建议。
健康建议备注“仅供参考，请遵医嘱”。`;
    }

    try {
      const initialMessages: ChatMessage[] = [
        { role: "system", content: systemInstruction },
        { role: "user", content: finalUserInput }
      ];
      const fullResponse = await streamResponse(initialMessages);
      setChatHistory([...initialMessages, { role: "assistant", content: fullResponse }]);
      setPrediction(''); 
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }, [userLocation, mode]);

  const handleFollowUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followUpText.trim() || followUpLoading) return;
    const query = followUpText;
    setFollowUpText('');
    setFollowUpLoading(true);
    setPrediction('');
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: query }];
    setChatHistory(newHistory);
    try {
      const fullResponse = await streamResponse(newHistory);
      setChatHistory(prev => [...prev, { role: "assistant", content: fullResponse }]);
      setPrediction('');
    } catch (err: any) { setError(`追问失败: ${err.message}`); } finally { setFollowUpLoading(false); }
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 parchment-bg overflow-hidden relative text-slate-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="mb-12 relative inline-block animate-glow">
             <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full"></div>
             <h1 className="text-7xl font-bold text-slate-100 mb-4 qimen-font tracking-[0.5em] relative">奇门景曜</h1>
             <p className="text-amber-500/60 text-xs tracking-[0.8em] font-black uppercase">The Master of Metaphysics Logic</p>
          </div>
          <button onClick={() => setIsEntered(true)} className="group relative px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-2xl hover:shadow-amber-500/40">
            <span className="relative z-10 tracking-[1em] pl-4 text-sm font-black">开启深度推演</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      <Header />
      <div className="bg-slate-900/80 border-y border-slate-800 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center h-12">
          <button onClick={() => { setMode('QIMEN'); setChatHistory([]); }} className={`flex-1 h-full text-[10px] tracking-[0.3em] font-black transition-all border-r border-slate-800 ${mode === 'QIMEN' ? 'bg-amber-600/20 text-amber-500 shadow-inner' : 'text-slate-500'}`}>奇门时空推演</button>
          <button onClick={() => { setMode('YI_LOGIC'); setChatHistory([]); }} className={`flex-1 h-full text-[10px] tracking-[0.3em] font-black transition-all ${mode === 'YI_LOGIC' ? 'bg-amber-600/20 text-amber-500 shadow-inner' : 'text-slate-500'}`}>多维易理实验室</button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md shadow-xl border-t-amber-500/10">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm font-black">01</span>
              {mode === 'QIMEN' ? '时空基准录入' : '演化模型构建'}
            </h2>
            <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
          </section>
          {mode === 'QIMEN' && board && <BoardGrid board={board} />}
        </div>

        <div className="space-y-8 flex flex-col h-full">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md flex-1 flex flex-col relative overflow-hidden max-h-[1200px] shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm font-black">02</span>
              {mode === 'QIMEN' ? '格局逻辑解构' : '深度理法报告'}
            </h2>
            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-4 space-y-8 scroll-smooth pb-20">
              {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'opacity-80 border-l-2 border-amber-500/30 pl-4 py-2 my-4 bg-amber-500/5 rounded-xl' : ''}`}>
                  <AnalysisDisplay prediction={msg.content} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              ))}
              {prediction && (
                <div className="border-t border-slate-800/50 pt-6 mt-6 animate-pulse">
                   <p className="text-[10px] text-amber-500 mb-4 tracking-[0.3em] font-black uppercase">正在解构理法数据...</p>
                   <AnalysisDisplay prediction={prediction} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              )}
              {loading && !prediction && <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-500 min-h-[400px]"><div className="w-12 h-12 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div><p className="text-xs tracking-[0.4em] text-amber-500 font-bold uppercase">正在拨动玄机...</p></div>}
              {error && <div className="p-6 bg-red-950/20 border border-red-900/40 rounded-2xl text-red-400 text-sm italic">{error}</div>}
            </div>

            {chatHistory.length > 0 && !loading && (
              <div className="mt-4 border-t border-slate-800 pt-6 bg-slate-900/40 -mx-8 px-8 pb-4">
                <form onSubmit={handleFollowUp} className="relative group">
                   <textarea value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="进一步研讨理法变数..." className="w-full h-24 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all resize-none text-xs" />
                   <button type="submit" className="absolute bottom-4 right-4 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all shadow-lg">继续探讨</button>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
