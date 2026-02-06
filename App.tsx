
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import BaZiChart from './components/BaZiChart';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard, calculateBaZi } from './qimenLogic';
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
  const [baziData, setBaziData] = useState<any>(null);
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
    // 采用更密集的帧同步，配合更轻量的组件渲染
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
              if (content) {
                fullTextRef.current += content;
                requestUpdate();
              }
            } catch (e) {
              // 遇到不完整JSON行时存回buffer等待
              buffer = line + "\n" + buffer;
            }
          }
        }
      }
      
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
    setBaziData(null);
    setBoard(null);
    
    let systemInstruction = "";
    let finalUserInput = "";

    const baseConstraints = `严禁使用 # 和 * 符号。严禁使用 Markdown 加粗格式。严禁复述用户输入的原始参数。严禁寒暄。语气：专业、中立、逻辑严密，具有慈悲心但拒绝恐吓。`;

    if (mode === 'QIMEN') {
      const targetDate = date ? new Date(date) : new Date();
      const newBoard = calculateBoard(targetDate, userLocation?.longitude);
      const autoPalace = userLocation?.palaceName || '中五宫';
      newBoard.direction = autoPalace;
      if (userLocation) newBoard.location = { ...userLocation, isAdjusted: true };
      setBoard(newBoard);

      finalUserInput = `[奇门起局] 方位：${autoPalace}。参数：${JSON.stringify(newBoard)}。诉求：${userInput as string}`;
      systemInstruction = `你是一位精通正统奇门实战理法的推演专家。${baseConstraints} 结构：一、能量态势透视；二、深度逻辑分析；三、核心判定结论；四、全息理法建议。`;
    } else if (mode === 'YI_LOGIC') {
      const yiSystemBase = `你是一位承袭“医易同源”智慧的深度易学专家。分析核心遵循“五行气象论”与“三才实战算法”，应用“碧海易学”分析体系。
分析模型：
1. 寒暖燥湿：判定命局气象。冬生冷寒需丙火解冻，夏生燥烈需壬癸滋润。
2. 十神现代映射：
   - 伤官：流量、创新、表达、破局能力。
   - 偏印：冷门技术、深度洞察、学术背书、防御性思维。
   - 官杀：管理能力、社会压力、公职属性。
3. 职业逻辑：遵循“身强财旺宜创业（自主权、扩张性），身弱财旺宜平台（借势、稳定支撑）”。
4. 碧海体系：输出必须包含清晰的【定格】（格局能量）与【定式】（核心运作模型）分析。
${baseConstraints}
结构必须包含：
一、 能量态势透视
【命局排盘】（年柱：XX 月柱：XX 日柱：XX 时柱：XX）
【定格分析】（碧海定格）
二、 深度逻辑分析（气象平衡、流通病药、定式推演）
三、 核心判定结论
【流年趋势】（2025年：内容 \\n 2026年：内容 ...）
四、 综合调理建议`;

      if (type === 'LIU_YAO') {
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻逻辑推演] 占问事项：${input.question}。卦象动数：${input.numbers.join(',')}。起卦时间：${new Date().toLocaleString()}。`;
        systemInstruction = yiSystemBase;
      } else {
        const input = userInput as BaZiInput;
        const calculatedPillars = calculateBaZi(new Date(input.birthDate));
        setBaziData(calculatedPillars);
        
        finalUserInput = `[任务：深度分析命局] 姓名：${input.name}，性别：${input.gender}，出生：${input.birthDate} ${input.birthTime || ''}，地点：${input.birthPlace}。请依气象论、碧海定格定式及职业逻辑进行解析。`;
        systemInstruction = yiSystemBase;
      }
    } else if (mode === 'TCM_AI') {
      finalUserInput = `【全息辨证】${userInput as string}`;
      systemInstruction = `你是精通“医易同源”的中医全息调理专家。${baseConstraints} 结构：一、能量态势透视；二、深度逻辑分析；三、核心判定结论；四、综合调理建议。`;
    }

    try {
      const initialMessages: ChatMessage[] = [
        { role: "system", content: systemInstruction },
        { role: "user", content: finalUserInput }
      ];
      const fullResponse = await streamResponse(initialMessages);
      // 批量处理状态更新，确保清空流式结果与展示正式结果在同一个渲染周期内，防止闪烁或重复
      setChatHistory([{ role: "assistant", content: fullResponse }]);
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
      setDisplayPrediction('');
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

        {mode === 'YI_LOGIC' && baziData && (
          <div className="animate-in fade-in slide-in-from-top-6 duration-1000">
             <BaZiChart pillars={baziData} />
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
