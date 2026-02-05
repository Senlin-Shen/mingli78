
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard } from './qimenLogic';
import { QiMenBoard, LocationData } from './types';

// 中国地理中心（大地原点坐标）
const CHINA_CENTER = { lng: 108.9, lat: 34.2 };

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<(LocationData & { city?: string, ip?: string, palaceName?: string }) | null>(null);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followUpText, setFollowUpText] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
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
          return;
        }
      } catch (e) {
        console.warn("API定位受限，使用浏览器定位...");
      }

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const palace = getPalaceFromCoords(position.coords.longitude, position.coords.latitude);
            setUserLocation({
              latitude: Number(position.coords.latitude.toFixed(4)),
              longitude: Number(position.coords.longitude.toFixed(4)),
              palaceName: palace,
              isAdjusted: true
            });
          },
          null,
          { timeout: 8000 }
        );
      }
    };
    
    fetchGeo();
  }, []);

  const streamResponse = async (messages: ChatMessage[]) => {
    const response = await fetch('/api/ark-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`时空链路同步异常 (HTTP ${response.status})`);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let buffer = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices[0]?.delta?.content || "";
              fullText += content;
              setPrediction(prev => prev + content);
            } catch (e) { }
          }
        }
      }
    }
    return fullText;
  };

  const handlePredict = useCallback(async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    setLoading(true);
    setError('');
    setPrediction('');
    setChatHistory([]);
    
    const targetDate = date ? new Date(date) : new Date();
    const newBoard = calculateBoard(targetDate, userLocation?.longitude);
    newBoard.predictionType = type;
    
    const autoPalace = userLocation?.palaceName || '中五宫';
    newBoard.direction = autoPalace;

    if (userLocation) {
        newBoard.location = { ...userLocation, isAdjusted: true };
    }
    setBoard(newBoard);

    try {
      const systemInstruction = `你是一位精通“奇门景曜”体系的当代实战推演专家。
当前求测者地理位置 (${userLocation?.city || '未知'})，已自动入局【${autoPalace}】。

【起局参数】：
- 修正真太阳时：${newBoard.trueSolarTime || '标准时间'}
- 判定入局宫位：${autoPalace}
- 局数理法：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局
- 盘面数据：${JSON.stringify(newBoard.palaces)}

【推演要求】：
1. 深入分析【${autoPalace}】宫内的能量态势（星、门、神、仪）。
2. 将传统术数逻辑映射到当代生活决策中。
3. 保持推演的专业性、客观性与实操性。

输出格式：[审局辨势]、[${autoPalace}解析]、[实战建议]、[最终胜算]。请禁用Markdown符号，保持纯文本段落感。`;

      const initialMessages: ChatMessage[] = [
        { role: "system", content: systemInstruction },
        { role: "user", content: userInput }
      ];

      const fullResponse = await streamResponse(initialMessages);
      setChatHistory([
        ...initialMessages,
        { role: "assistant", content: fullResponse }
      ]);
      setPrediction(''); 

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  const handleFollowUp = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const query = customText || followUpText;
    if (!query.trim() || followUpLoading) return;

    setFollowUpText('');
    setFollowUpLoading(true);
    setError('');
    setPrediction('');

    const newHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "user", content: query }
    ];
    setChatHistory(newHistory);

    try {
      const fullResponse = await streamResponse(newHistory);
      setChatHistory(prev => [
        ...prev,
        { role: "assistant", content: fullResponse }
      ]);
      setPrediction('');
    } catch (err: any) {
      setError(`追问失败: ${err.message}`);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const quickFollowUps = [
    "如何根据此局进行避险化解？",
    "此事的转机出现在何时？",
    "该方位的贵人特征是什么？",
    "目前最需要警惕的变数是什么？"
  ];

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 parchment-bg overflow-hidden relative text-slate-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="mb-12 relative inline-block animate-glow">
             <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full"></div>
             <h1 className="text-7xl font-bold text-slate-100 mb-4 qimen-font tracking-[0.5em] relative">奇门景曜</h1>
             <p className="text-amber-500/60 text-xs tracking-[0.8em] font-black uppercase">Official Application Platform</p>
          </div>
          <button 
            onClick={() => setIsEntered(true)}
            className="group relative px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-2xl hover:shadow-amber-500/40"
          >
            <span className="relative z-10 tracking-[1em] pl-4 text-sm font-black">开启推演</span>
            <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-2xl"></div>
          </button>
          
          {userLocation && (
             <div className="mt-8 text-[10px] text-slate-500 tracking-widest animate-in fade-in duration-1000">
               时空锚点已就绪：{userLocation.palaceName}
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      <Header />
      
      <div className="bg-slate-900/80 border-y border-slate-800 py-2 px-6 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[9px] tracking-[0.2em] font-bold text-slate-500 uppercase">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"></span>
            方位自动判定：{userLocation?.palaceName || '计算中...'}
          </div>
          <div className="flex items-center gap-4">
            <span>坐标：{userLocation ? `${userLocation.longitude}°E, ${userLocation.latitude}°N` : '定位中...'}</span>
            <span className="text-amber-600/60 font-mono">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm">壹</span>
              起局预测请求
            </h2>
            <InputForm onPredict={handlePredict} isLoading={loading} />
          </section>
          
          {board && (
            <section className="animate-in fade-in slide-in-from-top-4 duration-700">
              <BoardGrid board={board} />
            </section>
          )}
        </div>

        <div className="space-y-8 flex flex-col h-full">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md flex-1 flex flex-col relative overflow-hidden max-h-[1200px] shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm">贰</span>
              专家理法推演
            </h2>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-4 space-y-8 scroll-smooth pb-20">
              {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'opacity-80 border-l-2 border-amber-500/30 pl-4 py-2 my-4 bg-amber-500/5 rounded-xl' : ''}`}>
                  {msg.role === 'user' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-amber-500 font-black tracking-widest uppercase">追问详情：</span>
                      <div className="h-px flex-1 bg-amber-500/10"></div>
                    </div>
                  )}
                  <AnalysisDisplay prediction={msg.content} />
                </div>
              ))}

              {prediction && (
                <div className="border-t border-slate-800/50 pt-6 mt-6 animate-pulse">
                   <p className="text-[10px] text-amber-500 mb-4 tracking-[0.3em] font-black uppercase">正在深入解析理法...</p>
                   <AnalysisDisplay prediction={prediction} />
                </div>
              )}

              {loading && !prediction && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-500 min-h-[400px]">
                  <div className="w-12 h-12 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                  <p className="text-xs tracking-[0.4em] text-amber-500 font-bold uppercase">奇门景曜·正在入局推演</p>
                </div>
              )}

              {error && <div className="p-6 bg-red-950/20 border border-red-900/40 rounded-2xl text-red-400 text-sm italic">{error}</div>}
              
              {!loading && chatHistory.length === 0 && !error && (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic tracking-widest text-center px-12 leading-loose min-h-[400px]">
                   系统已锁定时空坐标。输入问题并起局后，您可以针对分析结果继续研讨。
                </div>
              )}
            </div>

            {/* 继续提问 UI */}
            {chatHistory.length > 0 && !loading && (
              <div className="mt-4 border-t border-slate-800 pt-6 bg-slate-900/40 -mx-8 px-8 pb-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {quickFollowUps.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => handleFollowUp(undefined, text)}
                      disabled={followUpLoading}
                      className="text-[9px] px-3 py-1.5 bg-slate-800/80 hover:bg-amber-600/20 border border-slate-700 hover:border-amber-500/40 rounded-full text-slate-400 hover:text-amber-500 transition-all disabled:opacity-30"
                    >
                      {text}
                    </button>
                  ))}
                </div>
                
                <form onSubmit={handleFollowUp} className="relative group">
                   <textarea
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    placeholder="进一步追问或探讨..."
                    disabled={followUpLoading}
                    className="w-full h-24 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all resize-none text-xs shadow-2xl"
                  />
                  <button
                    type="submit"
                    disabled={followUpLoading || !followUpText.trim()}
                    className="absolute bottom-4 right-4 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all shadow-xl hover:shadow-amber-500/40 disabled:opacity-10"
                  >
                    {followUpLoading ? '解析中...' : '继续提问'}
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
