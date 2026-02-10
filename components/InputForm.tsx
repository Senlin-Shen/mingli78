
import React, { useState, useEffect } from 'react';
import { SCENARIOS, YI_LOGIC_SCENARIOS, TCM_SCENARIOS, TCM_SYMPTOM_OPTIONS } from '../constants';
import { AppMode, LiuYaoInput, BaZiInput, LocationData } from '../types';

interface InputFormProps {
  onPredict: (query: string | any, type: any, date?: string) => void;
  isLoading: boolean;
  mode: AppMode;
  location?: LocationData | null;
  onSetLocation?: (loc: LocationData) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onPredict, isLoading, mode, location, onSetLocation }) => {
  const [text, setText] = useState('');
  const [qimenType, setQimenType] = useState<'SHI_JU' | 'MING_JU'>('SHI_JU');
  const [customDate, setCustomDate] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  
  // 易理 - 六爻
  const [liuYaoNumbers, setLiuYaoNumbers] = useState(['', '', '']);
  const [liuYaoQuestion, setLiuYaoQuestion] = useState('');
  
  // 易理 - 八字
  const [baziName, setBaziName] = useState('');
  const [baziGender, setBaziGender] = useState<'男' | '女'>('男');
  const [baziBirthDate, setBaziBirthDate] = useState('');
  const [baziBirthTime, setBaziBirthTime] = useState('');
  const [baziBirthPlace, setBaziBirthPlace] = useState('');
  const [baziQuestion, setBaziQuestion] = useState('');

  // 中医
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [tcmContext, setTcmContext] = useState('');

  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (mode === 'QIMEN') setActiveCategory('biz_invest');
    else if (mode === 'YI_LOGIC') setActiveCategory('liuyao');
    else if (mode === 'TCM_AI') setActiveCategory('tcm_consult');
  }, [mode]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("您的浏览器不支持地理定位");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        if (onSetLocation) {
          onSetLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            isAdjusted: true
          });
        }
      },
      (err) => {
        setIsLocating(false);
        alert("定位获取失败，请手动输入地点或确保已授权权限。");
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (mode === 'QIMEN') {
      if (text.trim()) onPredict(text, qimenType, qimenType === 'MING_JU' ? customDate : '');
    } else if (mode === 'YI_LOGIC') {
      if (activeCategory === 'liuyao') {
        onPredict({ numbers: liuYaoNumbers, question: liuYaoQuestion || text }, 'LI_YAO');
      } else {
        if (!baziBirthDate) {
          alert('请完善出生日期');
          return;
        }
        onPredict({
          name: baziName,
          gender: baziGender,
          birthDate: baziBirthDate,
          birthTime: baziBirthTime,
          birthPlace: baziBirthPlace || (location ? `精准定位: ${location.longitude.toFixed(2)}E` : ''),
          question: baziQuestion || text 
        } as BaZiInput, 'BA_ZI');
      }
    } else if (mode === 'TCM_AI') {
      const fullTcmInput = `主诉症状：${selectedSymptoms.join(', ')}。背景描述：${tcmContext || text}`;
      onPredict(fullTcmInput, 'TCM');
    }
  };

  const currentScenarios = mode === 'QIMEN' ? SCENARIOS : (mode === 'YI_LOGIC' ? YI_LOGIC_SCENARIOS : TCM_SCENARIOS);
  const activeTemplates = currentScenarios.find(s => s.id === activeCategory)?.templates || [];

  const inputStyle = "bg-slate-950/80 border border-slate-800/60 rounded-xl p-4 text-slate-200 text-xs focus:outline-none focus:border-logic-blue/50 transition-all placeholder:text-slate-700 shadow-inner";

  return (
    <form onSubmit={handleSubmit} className="space-y-12 animate-in fade-in duration-1000">
      {/* 顶部二级模式切换 */}
      <div className="flex flex-wrap gap-3">
        {currentScenarios.map((cat) => (
          <button 
            key={cat.id} 
            type="button" 
            onClick={() => setActiveCategory(cat.id)} 
            className={`px-8 py-3 text-[10px] rounded-full font-black tracking-[0.2em] transition-all border ${
              activeCategory === cat.id 
              ? 'bg-slate-100 text-slate-950 border-white shadow-xl shadow-white/5 scale-105' 
              : 'bg-slate-900/50 border-slate-800/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 1. 奇门板块 UI */}
      {mode === 'QIMEN' && (
        <div className="space-y-8">
          <div className="flex gap-4 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800/30">
            <button type="button" onClick={() => setQimenType('SHI_JU')} className={`flex-1 py-4 text-[11px] font-black rounded-xl transition-all tracking-[0.4em] uppercase ${qimenType === 'SHI_JU' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-600'}`}>事局分析</button>
            <button type="button" onClick={() => setQimenType('MING_JU')} className={`flex-1 py-4 text-[11px] font-black rounded-xl transition-all tracking-[0.4em] uppercase ${qimenType === 'MING_JU' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-600'}`}>终身命盘</button>
          </div>
          
          <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between px-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">时空定位参数</span>
                <button 
                  type="button" 
                  onClick={handleGetLocation}
                  className={`text-[9px] px-4 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${location ? 'bg-logic-blue/10 border-logic-blue/30 text-logic-blue' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isLocating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {isLocating ? 'SYNCING...' : location ? `LONG: ${location.longitude.toFixed(2)}E` : '获取当前定位'}
                </button>
             </div>
             {qimenType === 'MING_JU' && (
                <div className="animate-in slide-in-from-top-2">
                  <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className={`w-full ${inputStyle}`} />
                </div>
             )}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入您的具体推演诉求（如：新项目投资前景、关键业务决策时机等）..."
            className={`w-full h-40 resize-none leading-relaxed ${inputStyle}`}
          />
        </div>
      )}

      {/* 2. 易理 - 六爻 UI */}
      {mode === 'YI_LOGIC' && activeCategory === 'liuyao' && (
        <div className="space-y-8">
          <div className="frosted-glass p-8 rounded-3xl border border-slate-700/30">
            <h4 className="text-[11px] text-slate-400 font-black mb-8 tracking-[0.4em] uppercase flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-logic-blue rounded-full shadow-[0_0_8px_#38bdf8]"></div>
              报数起卦（请输入三个逻辑序列数字）
            </h4>
            <div className="grid grid-cols-3 gap-6">
              {liuYaoNumbers.map((num, i) => (
                <input 
                  key={i} 
                  type="number" 
                  value={num} 
                  onChange={(e) => {
                    const newNums = [...liuYaoNumbers];
                    newNums[i] = e.target.value;
                    setLiuYaoNumbers(newNums);
                  }}
                  className={inputStyle}
                  placeholder={`因子 ${i+1}`}
                />
              ))}
            </div>
          </div>
          <textarea
            value={liuYaoQuestion}
            onChange={(e) => setLiuYaoQuestion(e.target.value)}
            placeholder="请详述求测逻辑详情..."
            className={`w-full h-32 resize-none ${inputStyle}`}
          />
        </div>
      )}

      {/* 2. 易理 - 八字 UI */}
      {mode === 'YI_LOGIC' && activeCategory === 'bazi' && (
        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 font-black ml-2 uppercase tracking-widest">主体名称 IDENTIFIER</label>
              <input type="text" value={baziName} onChange={(e) => setBaziName(e.target.value)} className={`w-full ${inputStyle}`} placeholder="如：张先生" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 font-black ml-2 uppercase tracking-widest">能量属性 POLARITY</label>
              <div className="flex gap-2 p-1 bg-slate-900/40 border border-slate-800/40 rounded-xl h-[54px]">
                <button type="button" onClick={() => setBaziGender('男')} className={`flex-1 text-[11px] font-black rounded-lg transition-all ${baziGender === '男' ? 'bg-slate-100 text-slate-900 shadow-lg' : 'text-slate-600'}`}>乾造 (M)</button>
                <button type="button" onClick={() => setBaziGender('女')} className={`flex-1 text-[11px] font-black rounded-lg transition-all ${baziGender === '女' ? 'bg-slate-100 text-slate-900 shadow-lg' : 'text-slate-600'}`}>坤造 (F)</button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 font-black ml-2 uppercase tracking-widest">公历时空起点 DATE</label>
              <input type="date" value={baziBirthDate} onChange={(e) => setBaziBirthDate(e.target.value)} className={`w-full ${inputStyle}`} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 font-black ml-2 uppercase tracking-widest">时分参数 TIME</label>
              <input type="time" value={baziBirthTime} onChange={(e) => setBaziBirthTime(e.target.value)} className={`w-full ${inputStyle}`} />
            </div>
            <div className="col-span-2 space-y-3">
              <label className="text-[10px] text-slate-500 font-black ml-2 uppercase tracking-widest flex justify-between">
                出生地理坐标 (真太阳时修正)
                <button type="button" onClick={handleGetLocation} className="text-[9px] text-logic-blue underline underline-offset-4">获取当前</button>
              </label>
              <input 
                type="text" 
                value={baziBirthPlace} 
                onChange={(e) => setBaziBirthPlace(e.target.value)} 
                className={`w-full ${inputStyle}`} 
                placeholder={location ? `COORD: ${location.longitude.toFixed(2)}E` : "请输入具体城市名称"} 
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] text-slate-500 font-black ml-2 uppercase tracking-widest">决策诉求 CONTEXT</label>
            <textarea
              value={baziQuestion}
              onChange={(e) => setBaziQuestion(e.target.value)}
              placeholder="请输入您需要深度解析的决策点..."
              className={`w-full h-28 resize-none leading-relaxed ${inputStyle}`}
            />
          </div>
        </div>
      )}

      {/* 3. 中医板块 UI */}
      {mode === 'TCM_AI' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TCM_SYMPTOM_OPTIONS.map((group, i) => (
              <div key={i} className="frosted-glass p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
                <h4 className="text-[11px] text-slate-400 font-black mb-6 tracking-[0.3em] uppercase border-b border-slate-800 pb-3">{group.category}</h4>
                <div className="flex flex-wrap gap-2.5">
                  {group.items.map(item => (
                    <button 
                      key={item} 
                      type="button" 
                      onClick={() => toggleSymptom(item)}
                      className={`px-4 py-2 text-[10px] rounded-lg border transition-all ${
                        selectedSymptoms.includes(item) 
                        ? 'bg-logic-blue/20 border-logic-blue/50 text-white shadow-lg shadow-logic-blue/10' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-600 hover:text-slate-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <textarea
            value={tcmContext}
            onChange={(e) => setTcmContext(e.target.value)}
            placeholder="主诉症状背景补充描述..."
            className={`w-full h-36 resize-none ${inputStyle}`}
          />
        </div>
      )}

      {/* 快捷模板 */}
      <div className="flex flex-col gap-5 pt-10 border-t border-slate-800/40">
         <span className="text-[10px] text-slate-700 font-black uppercase tracking-[0.5em] ml-2">精密逻辑推荐范例</span>
         <div className="flex flex-wrap gap-3">
           {activeTemplates.map((t, i) => (
             <button key={i} type="button" onClick={() => {
               if (mode === 'QIMEN') setText(t);
               else if (mode === 'YI_LOGIC' && activeCategory === 'liuyao') setLiuYaoQuestion(t);
               else if (mode === 'YI_LOGIC' && activeCategory === 'bazi') setBaziQuestion(t);
               else if (mode === 'TCM_AI') setTcmContext(t);
             }} className="text-[10px] bg-slate-950/60 hover:bg-slate-900 text-slate-600 hover:text-slate-200 border border-slate-800/50 hover:border-slate-600 px-5 py-2.5 rounded-xl transition-all max-w-[300px] truncate shadow-sm">
               {t}
             </button>
           ))}
         </div>
      </div>

      <button 
        type="submit" 
        disabled={isLoading} 
        className="silver-ripple w-full bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 text-slate-950 font-black py-8 rounded-[2rem] text-[11px] tracking-[1.5em] uppercase transition-all shadow-2xl shadow-white/5 active:scale-[0.97] disabled:opacity-30 relative overflow-hidden group"
      >
        <span className="relative z-10">{isLoading ? '正在进行全息建模...' : '开启全息时空解析'}</span>
      </button>
    </form>
  );
};

export default InputForm;
