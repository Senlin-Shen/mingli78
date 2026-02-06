
import React, { useState, useEffect } from 'react';
import { SCENARIOS, YI_LOGIC_SCENARIOS, TCM_SCENARIOS, TCM_SYMPTOM_OPTIONS } from '../constants';
import { AppMode, LiuYaoInput, BaZiInput } from '../types';

interface InputFormProps {
  onPredict: (query: string | any, type: any, date?: string) => void;
  isLoading: boolean;
  mode: AppMode;
}

const InputForm: React.FC<InputFormProps> = ({ onPredict, isLoading, mode }) => {
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

  useEffect(() => {
    if (mode === 'QIMEN') setActiveCategory('investment');
    else if (mode === 'YI_LOGIC') setActiveCategory('liuyao');
    else if (mode === 'TCM_AI') setActiveCategory('tcm_consult');
  }, [mode]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
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
        if (!baziBirthDate || !baziBirthPlace) {
          alert('请完善出生日期与地点');
          return;
        }
        onPredict({
          name: baziName,
          gender: baziGender,
          birthDate: baziBirthDate,
          birthTime: baziBirthTime,
          birthPlace: baziBirthPlace,
          question: baziQuestion || text // 优先使用八字专属问题框，兼容快捷模板
        } as BaZiInput, 'BA_ZI');
      }
    } else if (mode === 'TCM_AI') {
      const fullTcmInput = `主诉症状：${selectedSymptoms.join(', ')}。背景描述：${tcmContext || text}`;
      onPredict(fullTcmInput, 'TCM');
    }
  };

  const currentScenarios = mode === 'QIMEN' ? SCENARIOS : (mode === 'YI_LOGIC' ? YI_LOGIC_SCENARIOS : TCM_SCENARIOS);
  const activeTemplates = currentScenarios.find(s => s.id === activeCategory)?.templates || [];

  const inputStyle = "bg-slate-950/60 border border-slate-900 rounded-xl p-4 text-slate-200 text-xs focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700 shadow-inner";

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in duration-700">
      {/* 顶部二级模式切换 */}
      <div className="flex flex-wrap gap-3">
        {currentScenarios.map((cat) => (
          <button 
            key={cat.id} 
            type="button" 
            onClick={() => setActiveCategory(cat.id)} 
            className={`px-6 py-2.5 text-[10px] rounded-full font-black tracking-widest transition-all border ${
              activeCategory === cat.id 
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/20' 
              : 'bg-slate-900/50 border-slate-800/50 text-slate-500 hover:text-emerald-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 1. 奇门板块 UI */}
      {mode === 'QIMEN' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <button type="button" onClick={() => setQimenType('SHI_JU')} className={`flex-1 py-4 text-[11px] font-black rounded-xl transition-all tracking-[0.4em] ${qimenType === 'SHI_JU' ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/40' : 'bg-slate-900 text-slate-500'}`}>事局分析</button>
            <button type="button" onClick={() => setQimenType('MING_JU')} className={`flex-1 py-4 text-[11px] font-black rounded-xl transition-all tracking-[0.4em] ${qimenType === 'MING_JU' ? 'bg-rose-600 text-white shadow-xl' : 'bg-slate-900 text-slate-500'}`}>终身命局</button>
          </div>
          {qimenType === 'MING_JU' && (
             <div className="animate-in slide-in-from-top-2">
               <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className={`w-full ${inputStyle}`} />
               <p className="mt-2 text-[10px] text-emerald-800 pl-2">※ 请准确输入出生时分</p>
             </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入您的具体推演诉求（如：某项投资项目的前景、近期事业变动方向等）..."
            className={`w-full h-36 resize-none leading-loose ${inputStyle}`}
          />
        </div>
      )}

      {/* 2. 易理 - 六爻 UI */}
      {mode === 'YI_LOGIC' && activeCategory === 'liuyao' && (
        <div className="space-y-6">
          <div className="bg-slate-950/40 p-6 rounded-2xl border border-rose-950/30">
            <h4 className="text-[11px] text-rose-800 font-black mb-6 tracking-[0.3em] uppercase flex items-center gap-2">
              <span className="w-1 h-3 bg-rose-600 rounded-full"></span>
              报数起卦（请输入三个 1-999 的数字）
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
                  placeholder={`数字 ${i+1}`}
                />
              ))}
            </div>
          </div>
          <textarea
            value={liuYaoQuestion}
            onChange={(e) => setLiuYaoQuestion(e.target.value)}
            placeholder="请详述求测事由（如：本月某笔应收款项能否顺利收回？）"
            className={`w-full h-28 resize-none ${inputStyle}`}
          />
        </div>
      )}

      {/* 2. 易理 - 八字 UI */}
      {mode === 'YI_LOGIC' && activeCategory === 'bazi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-emerald-800 font-black ml-2 uppercase tracking-widest">姓名 / 称号</label>
              <input type="text" value={baziName} onChange={(e) => setBaziName(e.target.value)} className={`w-full ${inputStyle}`} placeholder="如：张先生" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-emerald-800 font-black ml-2 uppercase tracking-widest">命造属性</label>
              <div className="flex gap-2 bg-slate-950/60 border border-slate-900 rounded-xl p-1.5 h-[54px] items-center">
                <button type="button" onClick={() => setBaziGender('男')} className={`flex-1 h-full text-[11px] font-black rounded-lg transition-all ${baziGender === '男' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600'}`}>乾造 (男)</button>
                <button type="button" onClick={() => setBaziGender('女')} className={`flex-1 h-full text-[11px] font-black rounded-lg transition-all ${baziGender === '女' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600'}`}>坤造 (女)</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-emerald-800 font-black ml-2 uppercase tracking-widest">公历日期</label>
              <input type="date" value={baziBirthDate} onChange={(e) => setBaziBirthDate(e.target.value)} className={`w-full ${inputStyle}`} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-emerald-800 font-black ml-2 uppercase tracking-widest">出生时分 (选填)</label>
              <input type="time" value={baziBirthTime} onChange={(e) => setBaziBirthTime(e.target.value)} className={`w-full ${inputStyle}`} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] text-emerald-800 font-black ml-2 uppercase tracking-widest">出生地点（定位真太阳时）</label>
              <input type="text" value={baziBirthPlace} onChange={(e) => setBaziBirthPlace(e.target.value)} className={`w-full ${inputStyle}`} placeholder="省份 - 城市 - 区县（如：广东省广州市天河区）" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-emerald-800 font-black ml-2 uppercase tracking-widest">详细诉求 (选填)</label>
            <textarea
              value={baziQuestion}
              onChange={(e) => setBaziQuestion(e.target.value)}
              placeholder="请输入您想重点咨询的问题（如：今年财运趋势、职业变动建议、健康注意等）..."
              className={`w-full h-24 resize-none leading-loose ${inputStyle}`}
            />
          </div>
          <p className="text-[10px] text-emerald-700/60 italic pl-2">※ 结合气象论与景曜体系，若不确定时辰，系统将进行精细的“三柱气象”推演。</p>
        </div>
      )}

      {/* 3. 中医板块 UI */}
      {mode === 'TCM_AI' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TCM_SYMPTOM_OPTIONS.map((group, i) => (
              <div key={i} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-900/50 hover:border-emerald-900/30 transition-colors shadow-xl">
                <h4 className="text-[11px] text-emerald-700 font-black mb-5 tracking-[0.2em] uppercase border-b border-emerald-950/40 pb-2">{group.category}</h4>
                <div className="flex flex-wrap gap-2.5">
                  {group.items.map(item => (
                    <button 
                      key={item} 
                      type="button" 
                      onClick={() => toggleSymptom(item)}
                      className={`px-3.5 py-1.5 text-[10px] rounded-lg border transition-all ${
                        selectedSymptoms.includes(item) 
                        ? 'bg-rose-500/10 border-rose-500/60 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-emerald-700'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <label className="text-[10px] text-emerald-900 font-black ml-2 uppercase tracking-widest">补充描述 / 详细诉求</label>
            <textarea
              value={tcmContext}
              onChange={(e) => setTcmContext(e.target.value)}
              placeholder="请输入其他体感描述、病史背景或主要担忧..."
              className={`w-full h-32 resize-none ${inputStyle}`}
            />
          </div>
          <div className="bg-emerald-500/5 border border-emerald-950/20 p-5 rounded-2xl">
             <p className="text-[10px] text-emerald-800 leading-relaxed italic">
               温馨提示：本推演仅供学术参考与调理建议。若症状严重，请及时前往正规医疗机构就诊。
             </p>
          </div>
        </div>
      )}

      {/* 快捷模板 */}
      <div className="flex flex-col gap-4 pt-6 border-t border-slate-900/50">
         <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest ml-1">推荐推演范例</span>
         <div className="flex flex-wrap gap-2.5">
           {activeTemplates.map((t, i) => (
             <button key={i} type="button" onClick={() => {
               if (mode === 'QIMEN') setText(t);
               else if (mode === 'YI_LOGIC' && activeCategory === 'liuyao') setLiuYaoQuestion(t);
               else if (mode === 'YI_LOGIC' && activeCategory === 'bazi') setBaziQuestion(t);
               else if (mode === 'TCM_AI') setTcmContext(t);
             }} className="text-[10px] bg-slate-950/40 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 border border-slate-900 hover:border-rose-900/50 px-4 py-2 rounded-xl transition-all text-left max-w-full truncate">
               {t}
             </button>
           ))}
         </div>
      </div>

      <button 
        type="submit" 
        disabled={isLoading} 
        className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-orange-500 text-white font-black py-7 rounded-2xl text-xs tracking-[1.2em] transition-all shadow-2xl shadow-rose-900/40 disabled:opacity-50 active:scale-[0.98] group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
        <span className="relative">{isLoading ? '解析运化中 · 景曜临宫' : '开启全息时空解析'}</span>
      </button>
    </form>
  );
};

export default InputForm;
