
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
        onPredict({ numbers: liuYaoNumbers, question: liuYaoQuestion || text }, 'LIU_YAO');
      } else {
        onPredict({
          name: baziName,
          gender: baziGender,
          birthDate: baziBirthDate,
          birthTime: baziBirthTime,
          birthPlace: baziBirthPlace
        } as BaZiInput, 'BA_ZI');
      }
    } else if (mode === 'TCM_AI') {
      const fullTcmInput = `主诉症状：${selectedSymptoms.join(', ')}。背景描述：${tcmContext || text}`;
      onPredict(fullTcmInput, 'TCM');
    }
  };

  const currentScenarios = mode === 'QIMEN' ? SCENARIOS : (mode === 'YI_LOGIC' ? YI_LOGIC_SCENARIOS : TCM_SCENARIOS);
  const activeTemplates = currentScenarios.find(s => s.id === activeCategory)?.templates || [];

  const inputStyle = "bg-slate-950/50 border border-orange-950/40 rounded-xl p-4 text-slate-200 text-xs focus:outline-none focus:border-orange-500/40 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
      {/* 顶部模式切换 */}
      <div className="flex flex-wrap gap-2">
        {currentScenarios.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)} className={`px-4 py-2 text-[10px] rounded-full font-black tracking-widest transition-all border ${activeCategory === cat.id ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-900/50 border-slate-800/50 text-slate-600 hover:text-slate-400'}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* 奇门 UI */}
      {mode === 'QIMEN' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <button type="button" onClick={() => setQimenType('SHI_JU')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all tracking-[0.4em] ${qimenType === 'SHI_JU' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'bg-slate-900 text-slate-500'}`}>事局分析</button>
            <button type="button" onClick={() => setQimenType('MING_JU')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all tracking-[0.4em] ${qimenType === 'MING_JU' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>终身命局</button>
          </div>
          {qimenType === 'MING_JU' && (
             <div className="animate-in slide-in-from-top-2">
               <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className={`w-full ${inputStyle}`} placeholder="出生时间" />
             </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入您的具体推演诉求..."
            className={`w-full h-32 resize-none leading-loose placeholder:text-slate-800 ${inputStyle}`}
          />
        </div>
      )}

      {/* 易理 - 六爻 UI */}
      {mode === 'YI_LOGIC' && activeCategory === 'liuyao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
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
                placeholder={`报数 ${i+1}`}
              />
            ))}
          </div>
          <textarea
            value={liuYaoQuestion}
            onChange={(e) => setLiuYaoQuestion(e.target.value)}
            placeholder="求测事由（如：某项合同签约能否顺利？）"
            className={`w-full h-24 resize-none ${inputStyle}`}
          />
        </div>
      )}

      {/* 易理 - 八字 UI */}
      {mode === 'YI_LOGIC' && activeCategory === 'bazi' && (
        <div className="grid grid-cols-2 gap-4">
          <input type="text" value={baziName} onChange={(e) => setBaziName(e.target.value)} className={inputStyle} placeholder="姓名" />
          <div className="flex gap-2 bg-slate-950/50 border border-orange-950/40 rounded-xl p-1">
            <button type="button" onClick={() => setBaziGender('男')} className={`flex-1 text-[10px] font-black rounded-lg transition-all ${baziGender === '男' ? 'bg-orange-600 text-white' : 'text-slate-600'}`}>乾造</button>
            <button type="button" onClick={() => setBaziGender('女')} className={`flex-1 text-[10px] font-black rounded-lg transition-all ${baziGender === '女' ? 'bg-orange-600 text-white' : 'text-slate-600'}`}>坤造</button>
          </div>
          <input type="date" value={baziBirthDate} onChange={(e) => setBaziBirthDate(e.target.value)} className={inputStyle} />
          <input type="time" value={baziBirthTime} onChange={(e) => setBaziBirthTime(e.target.value)} className={inputStyle} />
          <input type="text" value={baziBirthPlace} onChange={(e) => setBaziBirthPlace(e.target.value)} className={`col-span-2 ${inputStyle}`} placeholder="出生地点（省、市、县）" />
        </div>
      )}

      {/* 中医 UI */}
      {mode === 'TCM_AI' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TCM_SYMPTOM_OPTIONS.map((cat, i) => (
              <div key={i} className="bg-slate-950/30 p-4 rounded-2xl border border-slate-900/50">
                <h4 className="text-[9px] text-orange-900 font-black mb-3 tracking-widest uppercase">{cat.category}</h4>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map(item => (
                    <button 
                      key={item} 
                      type="button" 
                      onClick={() => toggleSymptom(item)}
                      className={`px-3 py-1 text-[9px] rounded-lg border transition-all ${selectedSymptoms.includes(item) ? 'bg-orange-500/20 border-orange-500/60 text-orange-400' : 'bg-slate-900/50 border-slate-800 text-slate-600'}`}
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
            placeholder="请补充描述您的其他体感不适或病史..."
            className={`w-full h-24 resize-none ${inputStyle}`}
          />
        </div>
      )}

      {/* 模板快捷输入 */}
      <div className="flex flex-col gap-2 pt-2">
         {activeTemplates.map((t, i) => (
           <div key={i} onClick={() => {
             if (mode === 'QIMEN') setText(t);
             else if (mode === 'YI_LOGIC' && activeCategory === 'liuyao') setLiuYaoQuestion(t);
             else if (mode === 'TCM_AI') setTcmContext(t);
           }} className="text-[10px] text-slate-600 cursor-pointer hover:text-orange-400 transition-colors py-1 truncate">
             <span className="text-orange-900 mr-2">◎</span> {t}
           </div>
         ))}
      </div>

      <button type="submit" disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-2xl text-[11px] tracking-[1em] transition-all shadow-2xl shadow-orange-900/50 disabled:opacity-50">
        {isLoading ? '运化推演中...' : '开启全息分析'}
      </button>
    </form>
  );
};

export default InputForm;
