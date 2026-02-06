
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
  const [isEntered, setIsEntered] = useState<boolean>(false);
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
  const predictionBuffer = useRef('');

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
    const response = await fetch('/api/ark-proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature: 0.8 }), 
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "推演链路连接失败");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    predictionBuffer.current = "";

    if (!reader) throw new Error("无法读取推演流");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || "";
            fullText += content;
            predictionBuffer.current += content;
            // 将更新阈值降低至 2 个字符，大幅提升视觉上的输出速度
            if (predictionBuffer.current.length > 2 || done) {
              setDisplayPrediction(fullText);
              predictionBuffer.current = ""; 
            }
          } catch (e) {}
        }
      }
    }
    return fullText;
  };

  const handlePredict = useCallback(async (userInput: string | any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    setChatHistory([]);
    setBaziData(null);
    
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
      systemInstruction = `你是一位精通奇门遁甲实战预测的顶级专家。你的回答需要具备极高的法理深度、详尽的象数剖析以及各维度的落地实践建议。
# 任务目标
请输出一份篇幅宏大、字数不少于1000字的深度分析报告。严禁使用 Markdown 符号。
# 核心解析逻辑
1. 理法发微：深度阐述当前时空干支的能量属性。
2. 深度象数解析：深度解剖星、门、神、仪。
3. 多维度实战策略：商业实战建议、心理/环境调理、应期分析。
输出分段：理法发微、深度象数解析、多维度实战策略、乾坤断语建议。`;
    } else {
      setBoard(null);
      if (type === 'LIU_YAO') {
        const input = userInput as LiuYaoInput;
        finalUserInput = `【六爻演化报数起卦】三组动数：${input.numbers.join(', ')}。求测事宜：${input.question}`;
      } else {
        const input = userInput as BaZiInput;
        // 模拟一个四柱排盘数据以便 UI 展示 (在真实生产环境中可由后端或更复杂的库计算)
        setBaziData({
          year: ["甲", "辰"],
          month: ["丙", "寅"],
          day: ["丁", "卯"],
          hour: ["戊", "申"]
        });
        finalUserInput = `【四柱气象结构推演】姓名：${input.name}，性别：${input.gender}，出生时空：${input.birthDate}，出生地址：${input.birthPlace}`;
      }

      systemInstruction = `你是一位承袭碧海易学精髓、深研《增删卜易》逻辑的资深预测专家。你的分析应结合法理深度与道医结合的人文视角。
# 任务目标
请输出一份极具专业厚度且内容详实的推演报告。严禁使用 Markdown 符号。
# 逻辑架构
1. 气象/卦理法理：分析月令日辰的生克制化。
2. 核心命局/卦象解析：解析现代职业、财富在命局中的具体映射。
3. 深度实践建议：职业建议、避坑指南、心态修持方案。
输出分段：气象/卦理法理、核心命局/卦象解析、深度实践建议、道学修持方案。`;
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
      setError(`推演链路异常: ${err.message}`); 
    } finally { 
      setLoading(false); 
    }
  }, [userLocation, mode]);

  const handleFollowUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followUpText.trim() || followUpLoading) return;
    const query = followUpText;
    setFollowUpText('');
    setFollowUpLoading(true);
    setDisplayPrediction('');
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: query }];
    setChatHistory(newHistory);
    try {
      const fullResponse = await streamResponse(newHistory);
      setChatHistory(prev => [...prev, { role: "assistant", content: fullResponse }]);
      setDisplayPrediction('');
    } catch (err: any) { 
      setError(`研讨中断: ${err.message}`); 
    } finally { 
      setFollowUpLoading(false); 
    }
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 parchment-bg overflow-hidden relative text-slate-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="mb-12 relative inline-block animate-glow">
             <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full"></div>
             <h1 className="text-7xl md:text-8xl font-bold text-slate-100 mb-6 qimen-font tracking-[0.5em] relative">奇门景曜</h1>
             <p className="text-amber-500/60 text-xs tracking-[1em] font-black uppercase text-white/80">Volcengine Powered Logic Lab</p>
          </div>
          <button onClick={() => setIsEntered(true)} className="group relative px-16 py-5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl transition-all shadow-2xl hover:shadow-amber-500/50 hover:scale-105 active:scale-95">
            <span className="relative z-10 tracking-[1.5em] pl-6 text-sm font-black text-white">开启推演</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col selection:bg-amber-500/30">
      <Header />
      
      <div className="bg-slate-900/95 border-y border-slate-800 backdrop-blur-xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center h-16 px-4">
          <button 
            type="button"
            onClick={() => { setMode('QIMEN'); setChatHistory([]); setDisplayPrediction(''); setBoard(null); setBaziData(null); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all border-r border-slate-800/50 relative overflow-hidden group ${mode === 'QIMEN' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'QIMEN' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"></div>}
            奇门时空推演
          </button>
          <button 
            type="button"
            onClick={() => { setMode('YI_LOGIC'); setChatHistory([]); setDisplayPrediction(''); setBoard(null); setBaziData(null); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all relative overflow-hidden group ${mode === 'YI_LOGIC' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'YI_LOGIC' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"></div>}
            多维易理实验室
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        <section className="bg-slate-900/40 border border-slate-800 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl border-t-amber-500/10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-5">
              <span className="w-12 h-12 rounded-[1.2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-black shadow-inner">01</span>
              参数录入
            </h2>
            <div className="h-px flex-1 bg-slate-800 ml-8 opacity-40"></div>
          </div>
          <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
        </section>
        
        {mode === 'QIMEN' && board && (
          <div className="animate-in fade-in zoom-in-95 duration-700">
             <BoardGrid board={board} />
          </div>
        )}

        {mode === 'YI_LOGIC' && baziData && (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <BaZiChart pillars={baziData} />
          </div>
        )}

        {(chatHistory.length > 0 || displayPrediction || loading) && (
          <section className="bg-slate-900/20 border border-slate-800/50 p-8 md:p-16 rounded-[2.5rem] backdrop-blur-3xl relative shadow-2xl border-t-amber-500/10">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-5">
                <span className="w-12 h-12 rounded-[1.2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-black shadow-inner">02</span>
                深度解构报告
              </h2>
              <div className="h-px flex-1 bg-slate-800 ml-8 opacity-40"></div>
            </div>

            <div className="space-y-24">
              {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`animate-in fade-in slide-in-from-bottom-6 duration-700 ${msg.role === 'user' ? 'opacity-70 border-l-2 border-amber-500/30 pl-8 py-6 my-10 bg-amber-500/5 rounded-r-3xl max-w-2xl' : ''}`}>
                  {msg.role === 'user' && <p className="text-[10px] text-amber-600/80 uppercase tracking-[0.4em] font-black mb-4 accent-font">访客咨询：</p>}
                  <AnalysisDisplay prediction={msg.content} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              ))}
              
              {displayPrediction && (
                <div className="pt-12 border-t border-slate-800/50">
                   <p className="text-[10px] text-amber-500 mb-8 tracking-[0.6em] font-black uppercase flex items-center gap-4 animate-pulse">
                     <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                     时空变数解析中...
                   </p>
                   <AnalysisDisplay prediction={displayPrediction} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              )}

              {loading && !displayPrediction && (
                <div className="flex flex-col items-center justify-center gap-10 text-slate-500 py-32">
                  <div className="relative">
                    <div className="w-20 h-20 border-[4px] border-amber-500/5 border-t-amber-500 rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center space-y-3">
                    <p className="text-sm tracking-[0.8em] text-amber-500 font-black uppercase">通联中</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="p-10 bg-red-950/10 border border-red-900/30 rounded-[2.5rem] text-red-400 text-sm leading-relaxed">
                  <p className="font-black tracking-[0.3em] uppercase mb-4 text-[10px]">链路异常</p>
                  {error}
                </div>
              )}
            </div>

            {chatHistory.length > 0 && !loading && (
              <div className="mt-24 pt-12 border-t border-slate-800/50">
                <form onSubmit={handleFollowUp} className="relative group max-w-2xl mx-auto">
                   <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-blue-500/20 rounded-3xl blur-md opacity-20 group-focus-within:opacity-100 transition duration-700"></div>
                   <textarea 
                     value={followUpText} 
                     onChange={(e) => setFollowUpText(e.target.value)} 
                     placeholder="关于推演结果，您还有什么需要深入研讨的变数？" 
                     className="relative w-full h-32 bg-slate-950/90 border border-slate-800 rounded-3xl p-6 text-slate-200 focus:outline-none focus:border-amber-500/50 transition-all resize-none text-[13px] leading-loose" 
                   />
                   <button 
                     type="submit" 
                     className="absolute bottom-6 right-6 bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black tracking-[0.4em] transition-all shadow-xl shadow-amber-900/50 hover:scale-105 active:scale-95"
                   >
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
