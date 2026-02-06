
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
const UNIFIED_MODEL = "ep-20260206175318-v6cl7";

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('QIMEN');
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<(LocationData & { city?: string, ip?: string, palaceName?: string }) | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followUpText, setFollowUpText] = useState('');
  const [displayPrediction, setDisplayPrediction] = useState('');
  
  const fullTextRef = useRef('');
  const updatePending = useRef(false);

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

  const requestUpdate = useCallback(() => {
    if (updatePending.current) return;
    updatePending.current = true;
    requestAnimationFrame(() => {
      setDisplayPrediction(fullTextRef.current);
      updatePending.current = false;
    });
  }, []);

  const streamResponse = async (messages: ChatMessage[]) => {
    setError('');
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
              fullTextRef.current += content;
              requestUpdate();
            } catch (e) {
              buffer = line + "\n" + buffer;
            }
          }
        }
      }
      
      setDisplayPrediction(fullTextRef.current);
      return fullTextRef.current;
    } catch (err: any) {
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

    // 核心禁令：绝不重复输入数据，绝不出现碧海字眼，奇门板块绝对不能输出方位和盘象描述
    const baseRule = `你是一位精通正统奇门实战理法的推演专家。
**极端禁令**：
1. **严禁在输出中重复、引用或复述用户提供的原始起局方位、盘象参数、JSON 字符串、出生日期、生辰、姓名、地址或报数。**
2. **严禁出现任何推演提示词（如“基于以上盘象分析如下”等废话）。**
3. **严禁出现“碧海”字眼。**
4. 直接、干练地输出核心逻辑与结论。`;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      const newBoard = calculateBoard(targetDate, userLocation?.longitude);
      const autoPalace = userLocation?.palaceName || '中五宫';
      newBoard.direction = autoPalace;
      if (userLocation) newBoard.location = { ...userLocation, isAdjusted: true };
      setBoard(newBoard);

      finalUserInput = `起局方位：${autoPalace}。盘象参数：${JSON.stringify(newBoard)}。诉求：${userInput as string}`;
      systemInstruction = `${baseRule}
请直接按以下结构输出，不要有任何前缀文字：
【能量态势透视】：直击当下核心矛盾与局势。
【深度逻辑分析】：运用理法进行宫位与能量拆解。
【核心判定结论】：给出定性、定量或定时的最终结论。
【全息理法建议】：基于推演结果给出的行动建议。`;
    } else if (mode === 'YI_LOGIC') {
      setBoard(null);
      if (type === 'LIU_YAO') {
        const input = userInput as LiuYaoInput;
        finalUserInput = `【六爻演化】事宜：${input.question}。动数：${input.numbers.join(',')}。`;
        systemInstruction = `${baseRule} 依据《增删卜易》理法进行深度推演。`;
      } else {
        const input = userInput as BaZiInput;
        finalUserInput = `【四柱气象】姓名：${input.name}，性别：${input.gender}，生辰：${input.birthDate} ${input.birthTime || ''}，出生地点：${input.birthPlace}。诉求：职业发展与全局气象分析。`;
        systemInstruction = `${baseRule} 依据姜氏五行气象论，针对该生辰进行深度全息解析。`;
      }
    } else if (mode === 'TCM_AI') {
      setBoard(null);
      finalUserInput = `【全息辨证】${userInput as string}`;
      systemInstruction = `${baseRule} 你是精通“医易同源”的辨证专家。请按【全息失衡判定】、【核心病机】、【核心调理原则】、【全息方案建议】四个板块进行深度回复。`;
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
  }, [userLocation, mode, streamResponse, requestUpdate]);

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
      
      <div className="bg-orange-950/90 border-y border-orange-500/30 backdrop-blur-2xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center h-16 px-4">
          <button onClick={() => setMode('QIMEN')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'QIMEN' ? 'text-orange-400' : 'text-slate-500'}`}>
            {mode === 'QIMEN' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 shadow-[0_0_15px_orange] animate-pulse"></div>}
            奇门
          </button>
          <button onClick={() => setMode('YI_LOGIC')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'YI_LOGIC' ? 'text-orange-400' : 'text-slate-500'}`}>
            {mode === 'YI_LOGIC' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 shadow-[0_0_15px_orange]"></div>}
            易理
          </button>
          <button onClick={() => setMode('TCM_AI')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'TCM_AI' ? 'text-orange-400' : 'text-slate-500'}`}>
            {mode === 'TCM_AI' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 shadow-[0_0_15px_orange]"></div>}
            中医
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        <section className={`bg-slate-900/70 border border-orange-800/40 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl ring-1 ring-orange-500/20`}>
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-sm font-black text-orange-200 flex items-center gap-5">
              <span className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-500 text-xs">甲</span>
              录入参数
            </h2>
            {userLocation && (
              <div className="text-[10px] text-orange-500/60 tracking-widest font-mono flex items-center gap-4">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                {userLocation.palaceName} | {userLocation.city}
              </div>
            )}
          </div>
          <InputForm onPredict={handlePredict} isLoading={loading} mode={mode} />
        </section>
        
        {mode === 'QIMEN' && board && (
          <div className="animate-in fade-in slide-in-from-top-6 duration-1000">
             <BoardGrid board={board} />
          </div>
        )}

        {(chatHistory.length > 0 || displayPrediction || loading || error) && (
          <section className="bg-slate-950/60 border border-orange-900/30 p-8 md:p-14 rounded-[3rem] backdrop-blur-3xl relative">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-sm font-black text-orange-100 flex items-center gap-5">
                  <span className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-500 text-xs shadow-[0_0_15px_rgba(249,115,22,0.4)]">乙</span>
                  景曜推演报告
                </h2>
              </div>

              <div className="space-y-20">
                {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                  <div key={i} className={`animate-in fade-in duration-1000 ${msg.role === 'user' ? 'opacity-40 border-l-2 border-orange-500/20 pl-8 py-4 mb-14 italic' : ''}`}>
                    <AnalysisDisplay prediction={msg.content} />
                  </div>
                ))}
                
                {displayPrediction && (
                  <div className="pt-12 border-t border-orange-950/80">
                     <p className="text-[11px] mb-10 tracking-[1.2em] font-black uppercase text-orange-500 animate-pulse flex items-center gap-4">
                       <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_12px_orange]"></span>
                       离火运化 · 解析中
                     </p>
                     <AnalysisDisplay prediction={displayPrediction} />
                  </div>
                )}

                {loading && !displayPrediction && (
                  <div className="flex flex-col items-center justify-center gap-10 py-32 opacity-60">
                    <div className="w-16 h-16 border-[3px] border-orange-500/10 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-[11px] tracking-[1.5em] text-orange-500 font-black">通联时空</p>
                  </div>
                )}
                
                {error && (
                  <div className="p-8 bg-red-950/30 border border-red-900/40 rounded-3xl text-red-400 text-[11px] tracking-[0.3em] font-black border-l-8 border-l-red-600 shadow-xl">
                     <span className="text-red-500 mr-4 text-sm font-black">✕</span> {error}
                  </div>
                )}
              </div>

              {chatHistory.length > 0 && !loading && !error && (
                <div className="mt-24 pt-12 border-t border-orange-950/80">
                  <form onSubmit={handleFollowUp} className="relative group max-w-2xl mx-auto">
                     <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 to-orange-900/20 rounded-[2rem] blur opacity-30 group-focus-within:opacity-100 transition duration-1000"></div>
                     <textarea 
                       value={followUpText} 
                       onChange={(e) => setFollowUpText(e.target.value)} 
                       placeholder="进一步研讨变数..." 
                       className="relative w-full h-32 bg-slate-950/95 border border-orange-950 rounded-[2rem] p-7 text-slate-200 focus:outline-none focus:border-orange-500/50 transition-all resize-none text-[13px] leading-loose shadow-inner" 
                     />
                     <button type="submit" className="absolute bottom-6 right-6 bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black tracking-[0.4em] transition-all shadow-2xl shadow-orange-900/60 active:scale-95">
                       追问研讨
                     </button>
                  </form>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
