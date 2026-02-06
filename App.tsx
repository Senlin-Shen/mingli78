
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
  const isStreamingRef = useRef(false);

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
    if (updatePending.current || !isStreamingRef.current) return;
    updatePending.current = true;
    requestAnimationFrame(() => {
      if (isStreamingRef.current) {
        setDisplayPrediction(fullTextRef.current);
      }
      updatePending.current = false;
    });
  }, []);

  const streamResponse = async (messages: ChatMessage[]) => {
    setError('');
    fullTextRef.current = '';
    setDisplayPrediction('');
    isStreamingRef.current = true;
    
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
              buffer = line + "\n" + buffer;
            }
          }
        }
      }
      
      isStreamingRef.current = false;
      return fullTextRef.current;
    } catch (err: any) {
      isStreamingRef.current = false;
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
      if (type === 'LI_YAO') { // 修正 type 判断
        const input = userInput as LiuYaoInput;
        finalUserInput = `[任务：六爻逻辑推演] 占问事项：${input.question}。卦象动数：${input.numbers.join(',')}。起卦时间：${new Date().toLocaleString()}。`;
        systemInstruction = `你是一位精通六爻演化与三才判定的易学专家。${baseConstraints} 结构：一、能量态势透视；二、深度逻辑分析；三、核心判定结论；四、综合调理建议。`;
      } else {
        const input = userInput as BaZiInput;
        const calculatedPillars = calculateBaZi(new Date(input.birthDate));
        setBaziData(calculatedPillars);
        
        finalUserInput = `性别：${input.gender}\n公历生日：${input.birthDate}\n出生时间：${input.birthTime || '不详'}\n出生地点：${input.birthPlace}\n特定问题：${userInput?.question || '深度分析命局特质及全方位优化方案。'}`;
        
        systemInstruction = `你是一位精通中国古典命理学（尤其擅长姜氏五行气象论与碧海易学体系）、环境风水学、现代商业战略与认知心理学的整合咨询专家。

核心任务：
根据用户提供的生辰信息，生成一份包括八字命盘诊断、命格特质解读（定格与定式分析）、以及涵盖风水、商业、心理、时运的整合优化方案的个人报告。

输出格式与步骤要求：
第一步：核验与排盘。将公历生日转换为农历，排定八字四柱、十神。推算起运岁数、当前大运及重要流年。
第二步：命格核心诊断（用神分析）。
1. 辨旺衰：分析日主强弱。
2. 找病药：指出命局中最突出的不平衡（病），明确核心“用神”与“喜神”（药），以及“忌神”与“仇神”。
3. 论调候与通关：结合出生月份分析寒暖燥湿。
4. 格局点睛（碧海定格分析）：用“定格”、“定式”逻辑概括命局核心运作模型（如：伤官生财格，流量定式）。
第三步：多维度优化方案生成。建议必须紧扣用神与忌神五行。
A. 空间场能（风水布局）：指明增益方位、环境布置建议、规避要点。
B. 行为策略（商业与生涯）：根据十神现代映射（如伤官为流量，偏印为深度技术）提供赛道建议、合作模式、资源策略。
C. 心智调频（心理与能量）：提供能量管理仪式、认知框架引导、行为边界设定。
D. 时空节奏（运势与决策）：大运指南、未来2-3年流年提醒、年度行动节奏。
第四步：生成整合总结与开篇诗句。
1. 开篇诗句：生成一首契合命主核心格局的七律或古诗点睛。
2. 系统整合：提供一个人生优化“公式”或“系统观”。
3. 免责说明：文末附带“以上内容由AI生成，仅供参考”的提示。

${baseConstraints}`;
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
      setDisplayPrediction('');
      setChatHistory([{ role: "assistant", content: fullResponse }]);
    } catch (err: any) { 
      setError(err.message); 
      setDisplayPrediction('');
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
    
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: query }];
    setChatHistory(newHistory);
    
    try {
      const fullResponse = await streamResponse(newHistory);
      setDisplayPrediction('');
      setChatHistory(prev => [...prev, { role: "assistant", content: fullResponse }]);
    } catch (err: any) { 
      setError(err.message); 
      setDisplayPrediction('');
    } finally { 
      setFollowUpLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col parchment-bg">
      <Header />
      
      <div className="bg-slate-900/90 border-y border-rose-500/20 backdrop-blur-2xl sticky top-0 z-50 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center h-16 px-4">
          <button onClick={() => setMode('QIMEN')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'QIMEN' ? 'text-rose-400' : 'text-slate-500'}`}>
            {mode === 'QIMEN' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 shadow-[0_0_20px_#f43f5e] animate-pulse"></div>}
            奇门
          </button>
          <button onClick={() => setMode('YI_LOGIC')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'YI_LOGIC' ? 'text-rose-400' : 'text-slate-500'}`}>
            {mode === 'YI_LOGIC' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 shadow-[0_0_20px_#f43f5e]"></div>}
            易理
          </button>
          <button onClick={() => setMode('TCM_AI')} className={`flex-1 h-full text-[11px] tracking-[0.5em] font-black transition-all relative overflow-hidden ${mode === 'TCM_AI' ? 'text-rose-400' : 'text-slate-500'}`}>
            {mode === 'TCM_AI' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 shadow-[0_0_20px_#f43f5e]"></div>}
            中医
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        <section className={`bg-slate-950/40 border border-emerald-900/30 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl ring-1 ring-emerald-500/10`}>
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-sm font-black text-emerald-200 flex items-center gap-5">
              <span className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 text-xs font-serif">木</span>
              录入参数
            </h2>
            {userLocation && (
              <div className="text-[10px] text-emerald-500/60 tracking-widest font-mono flex items-center gap-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
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
          <section className="bg-slate-950/80 border border-rose-900/20 p-8 md:p-14 rounded-[3rem] backdrop-blur-3xl relative shadow-[0_0_50px_rgba(244,63,94,0.05)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-sm font-black text-rose-100 flex items-center gap-5">
                  <span className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-500 text-xs font-serif shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-fire">火</span>
                  景曜推演报告
                </h2>
              </div>

              <div className="space-y-20">
                {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                  <div key={i} className={`animate-in fade-in duration-1000 ${msg.role === 'user' ? 'opacity-40 border-l-2 border-emerald-500/20 pl-8 py-4 mb-14 italic' : ''}`}>
                    <AnalysisDisplay prediction={msg.content} />
                  </div>
                ))}
                
                {displayPrediction && (
                  <div className="pt-12 border-t border-rose-950/80">
                     <p className="text-[11px] mb-10 tracking-[1.2em] font-black uppercase text-rose-500 animate-pulse flex items-center gap-4">
                       <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e]"></span>
                       离火运化 · 解析中
                     </p>
                     <AnalysisDisplay prediction={displayPrediction} />
                  </div>
                )}

                {loading && !displayPrediction && (
                  <div className="flex flex-col items-center justify-center gap-10 py-32 opacity-60">
                    <div className="w-16 h-16 border-[3px] border-emerald-500/10 border-t-rose-500 rounded-full animate-spin"></div>
                    <p className="text-[11px] tracking-[1.5em] text-rose-500 font-black">通联时空</p>
                  </div>
                )}
                
                {error && (
                  <div className="p-8 bg-red-950/30 border border-red-900/40 rounded-3xl text-red-400 text-[11px] tracking-[0.3em] font-black border-l-8 border-l-red-600 shadow-xl">
                     <span className="text-red-500 mr-4 text-sm font-black">✕</span> {error}
                  </div>
                )}
              </div>

              {chatHistory.length > 0 && !loading && !error && (
                <div className="mt-24 pt-12 border-t border-rose-950/80">
                  <form onSubmit={handleFollowUp} className="relative group max-w-2xl mx-auto">
                     <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/10 to-rose-600/10 rounded-[2rem] blur opacity-30 group-focus-within:opacity-100 transition duration-1000"></div>
                     <textarea 
                       value={followUpText} 
                       onChange={(e) => setFollowUpText(e.target.value)} 
                       placeholder="进一步研讨变数..." 
                       className="relative w-full h-32 bg-slate-950/95 border border-slate-900 rounded-[2rem] p-7 text-slate-200 focus:outline-none focus:border-rose-500/30 transition-all resize-none text-[13px] leading-loose shadow-inner" 
                     />
                     <button type="submit" className="absolute bottom-6 right-6 bg-rose-600 hover:bg-rose-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black tracking-[0.4em] transition-all shadow-2xl shadow-rose-900/60 active:scale-95">
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
