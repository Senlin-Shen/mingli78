
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
      systemInstruction = `你是一位精通奇门遁甲实战预测的顶级专家，擅长将传统时空模型应用于现代商业决策、战略规划、项目管理及风险预警。
# 角色定位
你拒绝空谈，只提供具有逻辑支撑的实战建议。你通过分析“星、门、神、仪”的组合，揭示隐藏在表象下的能量动向。
# 核心实战逻辑
- 市场趋势：通过“时干”与“产品”的生克比和判定供需。时干生产品为需求旺盛，比和为趋于饱和。
- 投资优化：通过落宫吉凶与“戊”（资本）的关系判断成功率及回报。
- 择时择位：重视“青龙返首”等吉格应用，谈判建议在“生门”或“开门”方位。
- 风险预警：通过“六仪击刑”、“白虎庚金”等格局提前识别陷阱。
# 任务流程
输出必须严格禁用 Markdown 符号（如 * 或 #）。直接输出以下分段内容：
1. 审局辨势：简述当前时空大环境的能量基调。
2. 核心解析：深入解构落宫数据（星门神仪）与求测目标的关联。
3. 实战建议：提供具体的落地策略（如择时、择地、避风险）。
4. 最终胜算：基于理法推导演算出的概率化结论。`;
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

      systemInstruction = `你是一位深研“碧海易学”体系、承袭姜兴道老师易学精髓的资深专家。你具备《增删卜易》的严密逻辑与道医结合的人文关怀。
# 核心分析架构
- 六爻：基于《增删卜易》，关注月建、日辰、动爻。合处逢冲必散，冲处逢合必成。重点看官鬼与父母爻关系。
- 四柱：姜氏五行气象论。优先判定寒暖燥湿，调候优先。将十神映射为现代职业逻辑（如伤官为创新、偏印为深度洞察）。
# 任务流程
当接收到测算请求时，请执行以下思维链并直接输出结果。
输出要求：严禁使用任何 Markdown 符号（如 * 或 #）。
格式必须为：
一、能量态势：当前处于蛰伏、爆发还是转折阶段？
二、职业建议：基于命理格局，给出行业分类（五行属性）与职能建议。
三、避坑指南：根据伤官克官或枭神夺食等模型，给出性格或行为警示。
四、道学环境建议：结合环境调理（方位、色系）或心态建设给出化解之道。
语言风格：专业严谨且温和治愈。杜绝迷信，定位为时空能量逻辑推演。`;
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
      
      <div className="bg-slate-900/95 border-y border-slate-800 backdrop-blur-xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center h-16">
          <button 
            type="button"
            onClick={() => { setMode('QIMEN'); setChatHistory([]); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all border-r border-slate-800/50 relative overflow-hidden group ${mode === 'QIMEN' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'QIMEN' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-in slide-in-from-left duration-300"></div>}
            奇门时空推演
          </button>
          <button 
            type="button"
            onClick={() => { setMode('YI_LOGIC'); setChatHistory([]); }} 
            className={`flex-1 h-full text-[11px] tracking-[0.4em] font-black transition-all relative overflow-hidden group ${mode === 'YI_LOGIC' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {mode === 'YI_LOGIC' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-in slide-in-from-left duration-300"></div>}
            多维易理实验室
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-12 sticky top-28">
          <section className="bg-slate-900/40 border border-slate-800 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl border-t-amber-500/10">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-5">
                <span className="w-12 h-12 rounded-[1.2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-black shadow-inner">01</span>
                {mode === 'QIMEN' ? '时空基准录入' : '演化模型构建'}
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
        </div>

        <div className="space-y-12 h-full">
          <section className="bg-slate-900/40 border border-slate-800 p-10 md:p-14 rounded-[2.5rem] backdrop-blur-xl flex flex-col relative overflow-hidden min-h-[700px] max-h-[1600px] shadow-2xl border-t-amber-500/10">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-5">
                <span className="w-12 h-12 rounded-[1.2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-black shadow-inner">02</span>
                {mode === 'QIMEN' ? '格局逻辑解构' : '深度理法报告'}
              </h2>
              <div className="h-px flex-1 bg-slate-800 ml-8 opacity-40"></div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-6 space-y-16 scroll-smooth pb-40 custom-scrollbar">
              {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`animate-in fade-in slide-in-from-bottom-6 duration-700 ${msg.role === 'user' ? 'opacity-80 border-l-2 border-amber-500/30 pl-8 py-6 my-10 bg-amber-500/5 rounded-r-3xl' : ''}`}>
                  {msg.role === 'user' && <p className="text-[10px] text-amber-600/80 uppercase tracking-[0.4em] font-black mb-4">访客咨询：</p>}
                  <AnalysisDisplay prediction={msg.content} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              ))}
              
              {prediction && (
                <div className="border-t border-slate-800/50 pt-12 mt-12">
                   <p className="text-[10px] text-amber-500 mb-8 tracking-[0.6em] font-black uppercase flex items-center gap-4">
                     <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                     正在研判理法变数...
                   </p>
                   <AnalysisDisplay prediction={prediction} isYiLogic={mode === 'YI_LOGIC'} />
                </div>
              )}

              {loading && !prediction && (
                <div className="flex-1 flex flex-col items-center justify-center gap-10 text-slate-500 min-h-[500px]">
                  <div className="relative">
                    <div className="w-20 h-20 border-[4px] border-amber-500/5 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-center space-y-3">
                    <p className="text-sm tracking-[0.8em] text-amber-500 font-black uppercase">时空信息通联中</p>
                    <p className="text-[10px] text-slate-600 tracking-widest italic">正在解析变数矩阵...</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="p-10 bg-red-950/10 border border-red-900/30 rounded-[2.5rem] text-red-400 text-sm leading-relaxed animate-in shake duration-500">
                  <p className="font-black tracking-[0.3em] uppercase mb-4 text-[10px]">链路通联异常</p>
                  {error}
                </div>
              )}
            </div>

            {chatHistory.length > 0 && !loading && (
              <div className="absolute bottom-0 left-0 right-0 p-10 pt-0 bg-gradient-to-t from-slate-900 via-slate-900/98 to-transparent backdrop-blur-sm">
                <form onSubmit={handleFollowUp} className="relative group">
                   <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-blue-500/20 rounded-3xl blur-md opacity-20 group-focus-within:opacity-100 transition duration-700"></div>
                   <textarea 
                     value={followUpText} 
                     onChange={(e) => setFollowUpText(e.target.value)} 
                     placeholder="关于推演结果，您还有什么需要深入研讨的变数？" 
                     className="relative w-full h-24 bg-slate-950/90 border border-slate-800 rounded-3xl p-6 text-slate-200 focus:outline-none focus:border-amber-500/50 transition-all resize-none text-xs leading-loose" 
                   />
                   <button 
                     type="submit" 
                     className="absolute bottom-6 right-6 bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black tracking-[0.4em] transition-all shadow-xl shadow-amber-900/50 hover:scale-105 active:scale-95"
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
