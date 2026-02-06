
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
  
  // 中医模式专用状态
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const [liuyao, setLiuyao] = useState<LiuYaoInput>({ numbers: ['', '', ''], question: '' });
  const [bazi, setBazi] = useState<BaZiInput & { birthTime: string }>({ 
    name: '', 
    gender: '男', 
    birthDate: '', 
    birthTime: '', 
    birthPlace: '' 
  });

  useEffect(() => {
    if (mode === 'QIMEN') setActiveCategory('investment');
    else if (mode === 'YI_LOGIC') setActiveCategory('liuyao');
    else if (mode === 'TCM_AI') setActiveCategory('tcm_consult');
  }, [mode]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom) 
        : [...prev, symptom]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (mode === 'QIMEN') {
      if (text.trim()) onPredict(text, qimenType, qimenType === 'MING_JU' ? customDate : '');
    } else if (mode === 'YI_LOGIC') {
      if (activeCategory === 'liuyao') {
        if (liuyao.question.trim()) onPredict(liuyao, 'LIU_YAO');
      } else {
        if (bazi.name && bazi.birthDate) {
          const fullInput = { ...bazi, birthDate: `${bazi.birthDate} ${bazi.birthTime}` };
          onPredict(fullInput, 'BA_ZI');
        }
      }
    } else if (mode === 'TCM_AI') {
      const combinedPrompt = selectedSymptoms.length > 0 
        ? `【已选症状】：${selectedSymptoms.join('、')}。 【补充描述】：${text}`
        : text;
      
      if (combinedPrompt.trim()) onPredict(combinedPrompt, 'TCM_CONSULT');
    }
  };

  const currentScenarios = mode === 'QIMEN' ? SCENARIOS : (mode === 'YI_LOGIC' ? YI_LOGIC_SCENARIOS : TCM_SCENARIOS);
  const activeTemplates = currentScenarios.find(s => s.id === activeCategory)?.templates || [];
  const isTCM = mode === 'TCM_AI';

  return (
    <div className="flex flex-col gap-6">
      {mode === 'QIMEN' && (
        <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner mb-2">
          <button 
            type="button"
            onClick={() => setQimenType('SHI_JU')} 
            className={`py-3 text-[10px] font-black rounded-xl transition-all tracking-[0.3em] ${qimenType === 'SHI_JU' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            事局推演
          </button>
          <button 
            type="button"
            onClick={() => setQimenType('MING_JU')} 
            className={`py-3 text-[10px] font-black rounded-xl transition-all tracking-[0.3em] ${qimenType === 'MING_JU' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            命局排盘
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pb-2">
        {currentScenarios.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-5 py-2 text-[10px] rounded-full font-black tracking-widest transition-all border ${activeCategory === cat.id ? (isTCM ? 'bg-teal-600/10 border-teal-500/50 text-teal-400' : 'bg-amber-600/10 border-amber-500/50 text-amber-500') : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'QIMEN' || isTCM ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {qimenType === 'MING_JU' && mode === 'QIMEN' && (
              <div className="space-y-3">
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.4em] font-black pl-1">起局基准时间</label>
                <input 
                  type="datetime-local" 
                  value={customDate} 
                  onChange={(e) => setCustomDate(e.target.value)} 
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs text-white focus:ring-1 focus:ring-amber-500/50 outline-none transition-all shadow-inner" 
                />
              </div>
            )}

            {isTCM && (
              <div className="space-y-6 bg-slate-950/30 p-6 rounded-3xl border border-slate-800/50 shadow-inner">
                <label className="text-[10px] text-teal-500/80 uppercase tracking-[0.4em] font-black pl-1 block mb-4">精准症状勾选（可多选）</label>
                <div className="space-y-5">
                  {TCM_SYMPTOM_OPTIONS.map((group, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="text-[9px] text-slate-600 font-bold ml-1">{group.category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleSymptom(item)}
                            className={`px-3 py-1.5 text-[10px] rounded-lg transition-all border flex items-center gap-2 ${selectedSymptoms.includes(item) ? 'bg-teal-600/20 border-teal-500/50 text-teal-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                          >
                            {selectedSymptoms.includes(item) && <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>}
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className={`text-[10px] uppercase tracking-[0.4em] font-black pl-1 ${isTCM ? 'text-teal-600/70' : 'text-slate-600'}`}>
                {isTCM ? '补充细节 / 身体感受' : '诉求详述'}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isTCM ? "请描述您的其它感受，如冷热感、松紧感、情绪变化细节..." : "请详细描述您的推演诉求..."}
                className={`w-full h-44 bg-slate-950/50 border border-slate-800 rounded-3xl p-6 text-slate-200 text-sm resize-none focus:ring-1 outline-none transition-all placeholder:text-slate-700 leading-relaxed ${isTCM ? 'focus:ring-teal-500/50' : 'focus:ring-amber-500/50'}`}
              />
              
              <div className="space-y-3">
                <p className={`text-[9px] uppercase tracking-[0.2em] font-black pl-1 flex items-center gap-2 ${isTCM ? 'text-teal-600/70' : 'text-amber-600/70'}`}>
                  <span className={`w-1 h-1 rounded-full ${isTCM ? 'bg-teal-600' : 'bg-amber-600'}`}></span> 参考示例
                </p>
                <div className="flex flex-col gap-2.5">
                  {activeTemplates.map((template, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setText(template);
                        setSelectedSymptoms([]); // 模板输入时重置手动勾选，避免混淆
                      }}
                      className={`text-left text-[11px] text-slate-400 transition-all bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 group ${isTCM ? 'hover:text-teal-400 hover:border-teal-500/30 hover:bg-teal-500/5' : 'hover:text-amber-500/90 hover:border-amber-500/30 hover:bg-amber-500/5'}`}
                    >
                      <span className="opacity-40 group-hover:opacity-100 transition-opacity">◎ </span>{template}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeCategory === 'liuyao' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-3 gap-6">
              {liuyao.numbers.map((num, i) => (
                <div key={i} className="space-y-3 text-center">
                  <label className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black block">动数 {i + 1}</label>
                  <input
                    type="number"
                    placeholder="0-999"
                    value={num}
                    onChange={(e) => {
                      const newNums = [...liuyao.numbers];
                      newNums[i] = e.target.value;
                      setLiuyao({ ...liuyao, numbers: newNums });
                    }}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-5 text-center text-base text-amber-500 font-black focus:ring-1 focus:ring-amber-500/50 outline-none shadow-inner"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <label className="text-[10px] text-slate-600 uppercase tracking-[0.4em] font-black pl-1">求测事宜</label>
              <textarea
                value={liuyao.question}
                onChange={(e) => setLiuyao({ ...liuyao, question: e.target.value })}
                placeholder="请输入您要测算的具体事宜..."
                className="w-full h-36 bg-slate-950/50 border border-slate-800 rounded-3xl p-6 text-slate-200 text-sm resize-none focus:ring-1 focus:ring-amber-500/50 outline-none leading-relaxed"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black pl-1">姓名</label>
                <input
                  type="text"
                  placeholder="请输入姓名"
                  value={bazi.name}
                  onChange={(e) => setBazi({ ...bazi, name: e.target.value })}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black pl-1">性别</label>
                <select
                  value={bazi.gender}
                  onChange={(e) => setBazi({ ...bazi, gender: e.target.value as '男' | '女' })}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none appearance-none bg-slate-950"
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black pl-1">生辰日期</label>
                <input
                  type="date"
                  value={bazi.birthDate}
                  onChange={(e) => setBazi({ ...bazi, birthDate: e.target.value })}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black pl-1">出生时辰</label>
                <input
                  type="time"
                  value={bazi.birthTime}
                  onChange={(e) => setBazi({ ...bazi, birthTime: e.target.value })}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full group relative overflow-hidden text-white font-black py-6 rounded-[1.5rem] text-xs tracking-[1em] transition-all shadow-2xl disabled:opacity-50 ${isTCM ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/40' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'}`}
        >
          <span className="relative z-10 pl-4">{isLoading ? (isTCM ? '正在进行全息辨证...' : '正在进行时空推演...') : (isTCM ? '开启全息辨证' : '开启全息分析')}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
        </button>
      </form>
    </div>
  );
};

export default InputForm;
