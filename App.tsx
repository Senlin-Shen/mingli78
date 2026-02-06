
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
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
    const response = await fetch('/api/ark-proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature: 0.7 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "推演链路连接失败");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

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
            setPrediction(prev => prev + content);
          } catch (e) {
            console.warn("解析块失败", e);
          }
        }
      }
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
输出格式要求：严禁使用 Markdown 符号（如 * 或 #）。直接输出段落。分阶段分析：1. 审局辨势；2. 核心解析；3. 实战建议；4. 最终胜算。`;
    } else {
      setBoard(null);
      if (type === 'LIU_YAO') {
        const input = userInput as LiuYaoInput;
        finalUserInput = `【六爻演化报数起卦】
三组动数：${input.numbers.join(', ')}
求测事宜：${input.question}`;
      } else {
        const input = userInput as BaZiInput;
        finalUserInput = `【四柱气象结构推演】
姓名：${input.name}
性别：${input.gender}
出生时空：${input.birthDate}
出生地址：${input.birthPlace}`;
      }

      systemInstruction = `# Role
你是一位精通传统易学（四柱命理、六爻预测）与道家智慧的资深专家。
# Core Analysis Logic
1. 六爻：关注用神旺衰、生克。2. 四柱：五行气象论，寒暖燥湿。
# Workflow
输出要求：严禁使用任何 Markdown 符号（如 * 或 #）。
格式：一、气象态势分析；二、逻辑推论；三、判定结论；四、调理建议。`;
    }

    try {
      const initialMessages: ChatMessage[] = [
        { role: "system", content: systemInstruction },
        { role: "user", content: finalUserInput }
      ];
      const fullResponse = await streamResponse(initialMessages);
      setChatHistory([...initialMessages, { role: "assistant", content: fullResponse }]);
      setPrediction(''); 
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
    setPrediction('');
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: query }];
    setChatHistory(newHistory);
    try {
      const fullResponse = await streamResponse(newHistory);
      setChatHistory(prev => [...prev, { role: "assistant", content: fullResponse }]);
      setPrediction('');
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
      
      {/* 顶部导航切换 */}
      <div className="bg-slate-900/95 border-y border-slate-800 backdrop-blur-xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center h-14">
          <button 
            type="button"
            onClick={() => { setMode('QIMEN'); setChatHistory([]); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all border-r border-slate-800/50 relative overflow-hidden group ${mode === 'QIMEN' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'QIMEN' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-in slide-in-from-left duration-300"></div>}
            奇门时空推演
          </button>
          <button 
            type="button"
            onClick={() => { setMode('YI_LOGIC'); setChatHistory([]); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all relative overflow-hidden group ${mode === 'YI_LOGIC' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'YI_LOGIC' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-in slide-in-from-left duration-300"></div>}
            多维易理实验室
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* 左侧录入区 */}
        <div className="space-y-10 sticky top-24">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl border-t-amber-500/10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-4">
                <span className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-black shadow-inner">01</span>
                {mode === 'QIMEN' ? '时空基准录入' : '演化模型构建'}
              </h2>
              <div className="h-px flex-1 bg-slate-800 ml-6 opacity-30"></div>
            </div>
            <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
          </section>
          
          {mode === 'QIMEN' && board && (
            <div className="animate-in fade-in zoom-in-95 duration-700">
               <BoardGrid board={board} />
            </div>
          )}
        </div>

        {/* 右侧解析区 */}
        <div className="space-y-10 h-full">
          <section className="bg-slate-900/40 border border-slate-800 p-8 md:p-10 rounded-[2rem] backdrop-blur-xl flex flex-col relative overflow-hidden min-h-[600px] max-h-[1400px] shadow-2xl border-t-amber-500/10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-4">
                <span className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-black shadow-inner">02</span>
                {mode === 'QIMEN' ? '格局逻辑解构' : '深度理法报告'}
              </h2>
              <div className="h-px flex-1 bg-slate-800 ml-6 opacity-30"></div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-4 space-y-12 scroll-smooth pb-32">
              {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${msg.role === 'user' ? 'opacity-70 border-l-2 border-amber-500/20 pl-6 py-4 my-8 bg-amber-500/5 rounded-r-2xl' : ''}`}>
                  {msg.role === 'user' && <p className="text-[10px] text-amber-600/60 uppercase tracking-widest font-black mb-2">问询：</p>}
                  <AnalysisDisplay prediction={msg.content} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              ))}
              
              {prediction && (
                <div className="border-t border-slate-800/50 pt-10 mt-10 animate-pulse">
                   <p className="text-[10px] text-amber-500 mb-6 tracking-[0.5em] font-black uppercase flex items-center gap-3">
                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                     正在解构理法数据...
                   </p>
                   <AnalysisDisplay prediction={prediction} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              )}

              {loading && !prediction && (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 text-slate-500 min-h-[400px]">
                  <div className="relative">
                    <div className="w-16 h-16 border-[3px] border-amber-500/5 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs tracking-[0.6em] text-amber-500 font-black uppercase">正在连接时空枢纽</p>
                    <p className="text-[9px] text-slate-600 tracking-widest italic">同步干支能量流中...</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="p-8 bg-red-950/10 border border-red-900/30 rounded-[2rem] text-red-400 text-sm leading-relaxed animate-in shake duration-500">
                  <p className="font-black tracking-widest uppercase mb-2 text-[10px]">链路异常</p>
                  {error}
                </div>
              )}
            </div>

            {/* 追问区域 */}
            {chatHistory.length > 0 && !loading && (
              <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent backdrop-blur-sm">
                <form onSubmit={handleFollowUp} className="relative group">
                   <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-blue-500/20 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
                   <textarea 
                     value={followUpText} 
                     onChange={(e) => setFollowUpText(e.target.value)} 
                     placeholder="进一步探讨变数细节..." 
                     className="relative w-full h-20 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:outline-none focus:border-amber-500/50 transition-all resize-none text-xs leading-relaxed" 
                   />
                   <button 
                     type="submit" 
                     className="absolute bottom-4 right-4 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-lg shadow-amber-900/40 hover:scale-105 active:scale-95"
                   >
                     研讨
                   </button>
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
