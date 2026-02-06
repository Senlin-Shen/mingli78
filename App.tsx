
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
  const lastUpdateTime = useRef(0);

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

  const updateDisplay = useCallback((text: string, force = false) => {
    const now = performance.now();
    if (force || now - lastUpdateTime.current > 16) { 
      setDisplayPrediction(text);
      lastUpdateTime.current = now;
    }
  }, []);

  const streamResponse = async (messages: ChatMessage[], customModel?: string) => {
    setError('');
    const apiMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          temperature: 0.8,
          model: customModel
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || errData.error || "通联时空链路异常");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取时空流数据");

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
              const content = data.choices[0]?.delta?.content || "";
              fullText += content;
              updateDisplay(fullText);
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      updateDisplay(fullText, true);
      return fullText;
    } catch (err: any) {
      console.error("Ark API Error:", err);
      throw new Error(err.message || "时空推演链路中断，请检查网络环境。");
    }
  };

  const handlePredict = useCallback(async (userInput: string | any, type: string, date?: string) => {
    setLoading(true);
    setError('');
    setDisplayPrediction('');
    setChatHistory([]);
    setBaziData(null);
    
    let systemInstruction = "";
    let finalUserInput = "";
    let targetModel = "";

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      const newBoard = calculateBoard(targetDate, userLocation?.longitude);
      const autoPalace = userLocation?.palaceName || '中五宫';
      newBoard.direction = autoPalace;
      if (userLocation) newBoard.location = { ...userLocation, isAdjusted: true };
      setBoard(newBoard);

      finalUserInput = `起局方位：${autoPalace}。当前奇门盘象及干支历：${JSON.stringify(newBoard)}。诉求：${userInput as string}`;
      systemInstruction = `你是一位精通传统奇门遁甲体系的推演专家。请基于提供的盘面，进行理法发微、深度象数解析、实战建议推演。输出 2000 字以上深度报告，严禁 Markdown。`;
    } else if (mode === 'YI_LOGIC') {
      setBoard(null);
      if (type === 'LIU_YAO') {
        const input = userInput as LiuYaoInput;
        finalUserInput = `【六爻演化】动数：${input.numbers.join(', ')}。事宜：${input.question}`;
        systemInstruction = `你是一位深研《增删卜易》的六爻实战专家。分析用神强弱、月建日辰影响及应期判定。严禁 Markdown。`;
      } else {
        const input = userInput as BaZiInput;
        setBaziData({ year: ["甲", "辰"], month: ["丙", "寅"], day: ["丁", "卯"], hour: ["戊", "申"] });
        finalUserInput = `【四柱气象推演】生辰：${input.birthDate} ${input.birthTime || ''}。`;
        systemInstruction = `你是一位精通全息命理与五行气象论的顶级专家。深度分析五行气象定格、岁运大势。严禁 Markdown。`;
      }
    } else if (mode === 'TCM_AI') {
      setBoard(null);
      targetModel = "ep-20260206175318-v6cl7"; 
      finalUserInput = `基于以下症状和体感描述，进行深度中医全息辨证：${userInput as string}`;
      systemInstruction = `你是资深中医全息辨证专家。严禁提到特定个人姓名。
必须遵守规则：
1. 核心理论：以“神、气、形”三层失衡判定为核心。
2. 辨证逻辑：优先判断“神、气”波动。
3. 回复结构（强制固定）：
【全息失衡判定】：深度解析用户神、气、形失衡点。
【核心病机】：揭示病症根源。
【调理原则】：明确调理方向。
【全息方案】：含药食同源、经络导引、气机感受。
4. 语言要求：专业通俗，篇幅 400 字左右，严禁 Markdown。`;
    }

    try {
      const initialMessages: ChatMessage[] = [
        { role: "system", content: systemInstruction },
        { role: "user", content: finalUserInput }
      ];
      const fullResponse = await streamResponse(initialMessages, targetModel);
      setChatHistory([...initialMessages, { role: "assistant", content: fullResponse }]);
      setDisplayPrediction(''); 
    } catch (err: any) { 
      setError(`推演异常: ${err.message}`); 
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
    setDisplayPrediction('');
    setError('');

    const targetModel = mode === 'TCM_AI' ? "ep-20260206175318-v6cl7" : undefined;
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: query }];
    setChatHistory(newHistory);
    
    try {
      const fullResponse = await streamResponse(newHistory, targetModel);
      setChatHistory(prev => [...prev, { role: "assistant", content: fullResponse }]);
      setDisplayPrediction('');
    } catch (err: any) { 
      setError(`研讨中断: ${err.message}`); 
    } finally { 
      setFollowUpLoading(false); 
    }
  };

  const isTCM = mode === 'TCM_AI';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col selection:bg-amber-500/30">
      <Header />
      
      <div className="bg-slate-900/95 border-y border-slate-800 backdrop-blur-xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center h-16 px-4">
          <button 
            type="button"
            onClick={() => { setMode('QIMEN'); setChatHistory([]); setDisplayPrediction(''); setBoard(null); setBaziData(null); setError(''); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all border-r border-slate-800/50 relative overflow-hidden ${mode === 'QIMEN' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'QIMEN' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"></div>}
            奇门推演
          </button>
          <button 
            type="button"
            onClick={() => { setMode('YI_LOGIC'); setChatHistory([]); setDisplayPrediction(''); setBoard(null); setBaziData(null); setError(''); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all border-r border-slate-800/50 relative overflow-hidden ${mode === 'YI_LOGIC' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'YI_LOGIC' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"></div>}
            实验室
          </button>
          <button 
            type="button"
            onClick={() => { setMode('TCM_AI'); setChatHistory([]); setDisplayPrediction(''); setBoard(null); setBaziData(null); setError(''); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all relative overflow-hidden ${mode === 'TCM_AI' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'TCM_AI' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.8)]"></div>}
            顶尖中医AI
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        <section className={`bg-slate-900/40 border border-slate-800 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl border-t-amber-500/10 ${isTCM ? 'border-t-teal-500/20 shadow-teal-900/10' : ''}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-5">
              <span className={`w-12 h-12 rounded-[1.2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-black shadow-inner ${isTCM ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' : ''}`}>01</span>
              {isTCM ? '全息参数录入' : '参数录入'}
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

        {(chatHistory.length > 0 || displayPrediction || loading || error) && (
          <section id="results-area" className={`bg-slate-900/20 border border-slate-800/50 p-8 md:p-16 rounded-[2.5rem] backdrop-blur-3xl relative shadow-2xl border-t-amber-500/10 ${isTCM ? 'border-t-teal-500/20 shadow-teal-900/10' : ''}`}>
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-5">
                <span className={`w-12 h-12 rounded-[1.2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-black shadow-inner ${isTCM ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' : ''}`}>02</span>
                {isTCM ? '辨证解构报告' : '解构报告'}
              </h2>
              <div className="h-px flex-1 bg-slate-800 ml-8 opacity-40"></div>
            </div>

            <div className="space-y-24">
              {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`animate-in fade-in slide-in-from-bottom-6 duration-700 ${msg.role === 'user' ? 'opacity-70 border-l-2 border-amber-500/30 pl-8 py-6 my-10 bg-amber-500/5 rounded-r-3xl max-w-2xl' : ''}`}>
                  {msg.role === 'user' && <p className={`text-[10px] uppercase tracking-[0.4em] font-black mb-4 accent-font ${isTCM ? 'text-teal-500/80' : 'text-amber-600/80'}`}>反馈：</p>}
                  <AnalysisDisplay prediction={msg.content} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              ))}
              
              {displayPrediction && (
                <div className="pt-12 border-t border-slate-800/50">
                   <p className={`text-[10px] mb-8 tracking-[0.6em] font-black uppercase flex items-center gap-4 animate-pulse ${isTCM ? 'text-teal-400' : 'text-amber-500'}`}>
                     <span className={`w-2 h-2 rounded-full ${isTCM ? 'bg-teal-400 shadow-[0_0_8px_teal]' : 'bg-amber-500 shadow-[0_0_8px_amber]'}`}></span>
                     深度辨证推演中...
                   </p>
                   <AnalysisDisplay prediction={displayPrediction} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              )}

              {loading && !displayPrediction && (
                <div className="flex flex-col items-center justify-center gap-10 text-slate-500 py-32">
                  <div className={`w-20 h-20 border-[4px] border-slate-800/30 rounded-full animate-spin ${isTCM ? 'border-t-teal-500' : 'border-t-amber-500'}`}></div>
                  <p className={`text-sm tracking-[0.8em] font-black uppercase ${isTCM ? 'text-teal-500' : 'text-amber-500'}`}>通联中</p>
                </div>
              )}
              
              {error && (
                <div className="p-10 bg-red-950/10 border border-red-900/30 rounded-[2.5rem] text-red-400 text-sm border-l-4 border-l-red-500">
                  <p className="font-black tracking-[0.3em] uppercase mb-4 text-[10px] text-red-500">链路中断</p>
                  {error}
                </div>
              )}
            </div>

            {chatHistory.length > 0 && !loading && !error && (
              <div className="mt-24 pt-12 border-t border-slate-800/50">
                <form onSubmit={handleFollowUp} className="relative group max-w-2xl mx-auto">
                   <div className={`absolute -inset-1 rounded-3xl blur-md opacity-20 group-focus-within:opacity-100 transition duration-700 ${isTCM ? 'bg-gradient-to-r from-teal-500/20 to-blue-500/20' : 'bg-gradient-to-r from-amber-500/20 to-blue-500/20'}`}></div>
                   <textarea 
                     value={followUpText} 
                     onChange={(e) => setFollowUpText(e.target.value)} 
                     placeholder="关于推演结果，您还有什么需要深入研讨的变数？" 
                     className="relative w-full h-32 bg-slate-950/90 border border-slate-800 rounded-3xl p-6 text-slate-200 focus:outline-none focus:border-amber-500/50 transition-all resize-none text-[13px] leading-loose" 
                   />
                   <button 
                     type="submit" 
                     className={`absolute bottom-6 right-6 text-white px-8 py-3 rounded-2xl text-[10px] font-black tracking-[0.4em] transition-all shadow-xl hover:scale-105 active:scale-95 ${isTCM ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/50' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/50'}`}
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
