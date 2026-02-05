
import React, { useState, useCallback, useEffect } from 'react';
import AnalysisDisplay from './components/AnalysisDisplay';
import BoardGrid from './components/BoardGrid';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import { calculateBoard } from './qimenLogic';
import { QiMenBoard, LocationData } from './types';

// 中国地理中心（大地原点附近坐标）作为推演参考基准
const CHINA_CENTER = { lng: 108.9, lat: 34.2 };

const App: React.FC = () => {
  const [isEntered, setIsEntered] = useState<boolean>(false);
  const [board, setBoard] = useState<QiMenBoard | null>(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<(LocationData & { city?: string, ip?: string, palaceName?: string }) | null>(null);

  // 根据经纬度计算相对于地理中心的八卦宫位
  const getPalaceFromCoords = (lng: number, lat: number) => {
    // 计算方位角 (弧度)
    const angle = Math.atan2(lat - CHINA_CENTER.lat, lng - CHINA_CENTER.lng);
    // 转换为角度 (0-360, 0为东)
    let degrees = angle * (180 / Math.PI);
    if (degrees < 0) degrees += 360;

    // 映射到八卦宫位 (每45度一个宫位，以东为起点顺时针/逆时针划分)
    // 0: 东(震), 45: 东北(艮), 90: 北(坎), 135: 西北(乾), 180: 西(兑), 225: 西南(坤), 270: 南(离), 315: 东南(巽)
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
        console.warn("IP定位接口异常，尝试浏览器原生定位...");
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

  const handlePredict = useCallback(async (userInput: string, type: 'SHI_JU' | 'MING_JU', date: string) => {
    setLoading(true);
    setError('');
    setPrediction('');
    
    const targetDate = date ? new Date(date) : new Date();
    const newBoard = calculateBoard(targetDate, userLocation?.longitude);
    newBoard.predictionType = type;
    
    // 自动判定方位：基于地理坐标的八卦宫位
    const autoPalace = userLocation?.palaceName || '中五宫';
    newBoard.direction = autoPalace;

    if (userLocation) {
        newBoard.location = { ...userLocation, isAdjusted: true };
    }
    setBoard(newBoard);

    try {
      const systemInstruction = `你是一位精通林毅奇门遁甲体系的“当代实战应用”推演专家。
本次演算应用了【时空方位自动映射技术】：已将求测者地理位置 (${userLocation?.city || '未知'}) 自动换算为【${autoPalace}】入局。

【核心起局参数】：
- 修正真太阳时：${newBoard.trueSolarTime || '标准时间'}
- 判定入局宫位：${autoPalace}
- 局数理法：${newBoard.isYang ? '阳' : '阴'}遁${newBoard.bureau}局
- 核心盘面数据：${JSON.stringify(newBoard.palaces)}

【实战推演逻辑要求】：
1. **深度理法解构**：必须分析【${autoPalace}】内的门、星、神、仪的能量态势。通过“旺相休囚”和“生克制化”判定该方位对问题的利弊。
2. **时空博弈策略**：将求测者视为处于【${autoPalace}】的主体，分析与值符、值使的动态感应，尤其注意是否有“击刑”、“入墓”或“三奇得使”等关键格局。
3. **落地指南**：针对当代生活（如商业博弈、情感决策、行事时机），给出极其具体的、可操作的落地建议。
4. **输出格式**：
   - 第一步：【审局辨势】（宏观能量分析）
   - 第二步：【${autoPalace}能量解析】（针对自动判定的方位进行深度推演）
   - 第三步：【实战落地策略】（具体行动方案、避坑指南）
   - 最终成算：胜算概率（0-100%）。

注意：禁止使用Markdown符号，保持段落感，文字精炼且具有大师风范。`;

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
        throw new Error(`时空链路同步异常 (HTTP ${response.status})`);
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
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 parchment-bg overflow-hidden relative text-slate-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10 animate-pulse"></div>
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="mb-12 relative inline-block animate-glow">
             <div className="absolute -inset-10 bg-amber-500/10 blur-3xl rounded-full"></div>
             <h1 className="text-7xl font-bold text-slate-100 mb-4 qimen-font tracking-[0.5em] relative">奇门当代应用</h1>
             <p className="text-amber-500/60 text-xs tracking-[0.8em] font-black uppercase">Official Expert System</p>
          </div>
          <button 
            onClick={() => setIsEntered(true)}
            className="group relative px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all shadow-2xl hover:shadow-amber-500/40"
          >
            <span className="relative z-10 tracking-[1em] pl-4">开启推演</span>
            <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-2xl"></div>
          </button>
          
          {userLocation && (
             <div className="mt-8 text-[10px] text-slate-500 tracking-widest animate-in fade-in duration-1000 flex flex-col gap-2">
               <span>已锁定方位：{userLocation.palaceName}</span>
               <span className="opacity-30 font-mono text-[8px] uppercase">{userLocation.city || '未知'} · {userLocation.ip || 'INTERNAL'}</span>
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col">
      <Header />
      
      <div className="bg-slate-900/80 border-y border-slate-800 py-2 px-6 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[9px] tracking-[0.2em] font-bold text-slate-500 uppercase">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"></span>
            自动映射宫位：{userLocation?.palaceName || '计算中...'}
          </div>
          <div className="flex items-center gap-4">
            <span>坐标：{userLocation ? `${userLocation.longitude}°E, ${userLocation.latitude}°N` : '定位中...'}</span>
            <span className="text-amber-600/60 font-mono">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
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

        <div className="space-y-8">
          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md min-h-[600px] flex flex-col relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-sm">贰</span>
              专家理法解析
            </h2>
            
            {loading && !prediction && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-500">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-xs tracking-[0.4em] text-amber-500 font-bold">正在针对【{userLocation?.palaceName}】进行深度推演...</p>
                  <p className="text-[10px] text-slate-600">真太阳时已校准 · 时空方位已映射</p>
                </div>
              </div>
            )}

            {error && <div className="p-6 bg-red-950/20 border border-red-900/40 rounded-2xl text-red-400 text-sm italic">{error}</div>}
            {prediction && <AnalysisDisplay prediction={prediction} />}
            
            {!loading && !prediction && !error && (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-sm italic tracking-widest text-center px-12 leading-loose">
                 输入预测问题后，系统将结合您的地理坐标自动判定宫位，并由林毅体系专家模型为您提供深度的理法建议。
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
