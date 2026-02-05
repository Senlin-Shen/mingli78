
import React, { useState, useCallback, useEffect } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard } from './qimenLogic';
import { QiMenBoard, LocationData } from './types';

const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);

  // 获取地理位置 - 提升起局精度关键
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: Number(position.coords.latitude.toFixed(4)),
            longitude: Number(position.coords.longitude.toFixed(4)),
            isAdjusted: true
          });
        },
        (err) => {
          console.warn("地理位置获取受限:", err.message);
        },
        { timeout: 10000 }
      );
    }
  }, []);

  const getCacheKey = (query: string, type: string, date: string, direction: string, loc?: LocationData) => {
    const locStr = loc ? `${loc.latitude}_${loc.longitude}` : 'default';
    return `qimen_cache_${btoa(unescape(encodeURIComponent(`${query}_${type}_${date}_${direction}_${locStr}`))).slice(0, 32)}`;
  };

  const handleEnterSystem = () => {
    setIsEntered(true);
  };

  const handlePredict = useCallback(async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string, direction: string) => {
    setLoading(true);
    setError('');
    setPrediction('');
    
    const targetDate = date ? new Date(date) : new Date();
    // 使用地理位置经度进行真太阳时修正
    const newBoard = calculateBoard(targetDate, userLocation?.longitude);
    newBoard.predictionType = type;
    newBoard.direction = direction;
    if (userLocation) {
        newBoard.location = { ...userLocation, isAdjusted: true };
    }
    setBoard(newBoard);

    const cacheKey = getCacheKey(userInput, type, date, direction, userLocation || undefined);
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      setTimeout(() => {
        setPrediction(cachedData);
        setLoading(false);
      }, 300);
      return;
    }

    try {
      const systemInstruction = `你是一位精通林毅奇门遁甲体系的“当代实战应用”专家。
本次演算已应用【真太阳时精准起局】与【地理时空定位】，理法逻辑必须极致严密。

【时空定位参数】：
- 原始北京时间：${newBoard.targetTime}
- 修正真太阳时：${newBoard.trueSolarTime || '未修正(默认120°E)'}
- 地理坐标：${userLocation ? `经度${userLocation.longitude}, 纬度${userLocation.latitude}` : '系统默认'}
- 局数理法：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局
- 核心落宫数据：${JSON.stringify(newBoard.palaces)}
- 求测人方位：${direction}

【推演要求】：
1. **深度理法剖析**：必须基于“天、地、人、神”四盘，结合“旺相休囚”与“十二长生”状态进行剖析。重点分析“值符”星与“值使”门在当前时空下的气场强弱。
2. **方位博弈分析**：针对求测人选择的【${direction}】，分析该宫位的吉凶格局（如青龙返首、飞鸟跌穴或六仪击刑、辛金入墓等）。
3. **切实落地建议**：拒绝模棱两可。针对“商业决策、情感选择或日常行事”，给出具体的“最佳行动窗口”和“风险规避方略”。
4. **输出结构**：
   - 第一步：【审局辨势】（理法深度推演）
   - 第二步：【时空布局】（方位能量与环境建议）
   - 第三步：【落地指南】（具体的、切实的行动建议）
   - 最终成算：给出具体的成算概率（0-100%）。

注意：禁止使用Markdown符号，保持纯文本或段落感，逻辑分明。`;

      // 针对中国大陆网络优化：使用 Vercel 同域名 Proxy 避免跨域及网络抖动
      const response = await fetch('/api/ark-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userInput }
          ],
          temperature: 0.7,
          stream: true
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `网络连接波动 (HTTP ${response.status})`);
      }

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
        sessionStorage.setItem(cacheKey, fullText);
      }

    } catch (err: any) {
      setError(err.name === 'AbortError' ? '推演超时，请检查网络后重试' : err.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 parchment-bg overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="mb-12 relative inline-block animate-glow">
             <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full"></div>
             <h1 className="text-7xl font-bold text-slate-100 mb-4 qimen-font tracking-[0.5em] relative">奇门当代应用</h1>
             <p className="text-amber-500/60 text-xs tracking-[0.8em] font-black uppercase">Official System</p>
          </div>
          <button 
            onClick={handleEnterSystem}
            className="group relative px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-2xl hover:shadow-amber-500/40"
          >
            <span className="relative z-10 tracking-[1em] pl-4">开启推演</span>
            <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-2xl"></div>
          </button>
          
          {userLocation && (
             <div className="mt-8 text-[10px] text-slate-600 tracking-widest animate-in fade-in duration-1000">
               已定位时空坐标：{userLocation.longitude}°E, {userLocation.latitude}°N
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      <Header />
      
      {/* 实时状态条 */}
      <div className="bg-slate-900/80 border-y border-slate-800 py-2 px-6 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[9px] tracking-[0.2em] font-bold text-slate-500 uppercase">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
            网络状态：连接正常 (Proxy Mode)
          </div>
          <div className="flex items-center gap-4">
            <span>坐标：{userLocation ? `${userLocation.longitude}°E, ${userLocation.latitude}°N` : '定位中...'}</span>
            <span className="text-amber-600/60">当前：{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm">壹</span>
              输入演算参数
            </h2>
            <InputForm onPredict={handlePredict} isLoading={loading} />
          </section>
          
          {board && (
            <section className="animate-in fade-in slide-in-from-top-4 duration-700">
              <BoardGrid board={board} />
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md min-h-[600px] flex flex-col relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm">贰</span>
              当代应用推演
            </h2>
            
            {loading && !prediction && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-500">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 bg-amber-500/5 blur-xl animate-pulse"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs tracking-[0.4em] text-amber-500/80 animate-pulse font-bold">正在拨动干支齿轮...</p>
                  <p className="text-[10px] text-slate-600">真太阳时已修正，正在跨越时空连接</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-950/20 border border-red-900/40 p-6 rounded-2xl text-red-400 text-sm italic animate-in zoom-in-95">
                <div className="font-bold mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  演算受阻
                </div>
                {error}
              </div>
            )}

            {prediction && <AnalysisDisplay prediction={prediction} />}
            
            {!loading && !prediction && !error && (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic tracking-widest text-center px-12 leading-loose">
                 请在左侧输入预测问题。系统将根据您的地理经纬度修正真太阳时，结合天、地、人、神四盘为您进行深度理法推演。
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
