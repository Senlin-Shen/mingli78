
import React, { useState, useEffect } from 'react';
import { SCENARIOS, YI_LOGIC_SCENARIOS } from '../constants';
import { AppMode, LiuYaoInput, BaZiInput } from '../types';

interface InputFormProps {
  onPredict: (query: string | any, type: 'SHI_JU' | 'MING_JU' | 'LIU_YAO' | 'BA_ZI', date?: string) => void;
  isLoading: boolean;
  mode: AppMode;
}

const InputForm: React.FC<InputFormProps> = ({ onPredict, isLoading, mode }) => {
  const [text, setText] = useState('');
  const [qimenType, setQimenType] = useState<'SHI_JU' | 'MING_JU'>('SHI_JU');
  const [customDate, setCustomDate] = useState('');
  const [activeCategory, setActiveCategory] = useState(mode === 'QIMEN' ? 'investment' : 'liuyao');

  const [liuyao, setLiuyao] = useState<LiuYaoInput>({ numbers: ['', '', ''], question: '' });
  const [bazi, setBazi] = useState<BaZiInput & { birthTime: string }>({ 
    name: '', 
    gender: '男', 
    birthDate: '', 
    birthTime: '', 
    birthPlace: '' 
  });

  useEffect(() => {
    setActiveCategory(mode === 'QIMEN' ? 'investment' : 'liuyao');
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (mode === 'QIMEN') {
      if (text.trim()) onPredict(text, qimenType, qimenType === 'MING_JU' ? customDate : '');
    } else {
      if (activeCategory === 'liuyao') {
        if (liuyao.question.trim()) onPredict(liuyao, 'LIU_YAO');
      } else {
        if (bazi.name && bazi.birthDate) {
          const fullInput = { ...bazi, birthDate: `${bazi.birthDate} ${bazi.birthTime}` };
          onPredict(fullInput, 'BA_ZI');
        }
      }
    }
  };

  const currentScenarios = mode === 'QIMEN' ? SCENARIOS : YI_LOGIC_SCENARIOS;
  const activeTemplates = currentScenarios.find(s => s.id === activeCategory)?.templates || [];

  return (
    <div className="flex flex-col gap-6">
      {mode === 'QIMEN' && (
        <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner mb-2">
          <button 
            type="button"
            onClick={() => setQimenType('SHI_JU')} 
            className={`py-3 text-[10px] font-black rounded-xl transition-all tracking-[0.3em] ${qimenType === 'SHI_JU' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-slate-500 hover:text-slate-300'}`}
          >
            事局推演
          </button>
          <button 
            type="button"
            onClick={() => setQimenType('MING_JU')} 
            className={`py-3 text-[10px] font-black rounded-xl transition-all tracking-[0.3em] ${qimenType === 'MING_JU' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-slate-500 hover:text-slate-300'}`}
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
            className={`px-5 py-2 text-[10px] rounded-full font-black tracking-widest transition-all border ${activeCategory === cat.id ? 'bg-amber-600/10 border-amber-500/50 text-amber-500' : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'QIMEN' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {qimenType === 'MING_JU' && (
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
            <div className="space-y-4">
              <label className="text-[10px] text-slate-600 uppercase tracking-[0.4em] font-black pl-1">诉求详述</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="请详细描述您的推演诉求，例如：针对某某项目的投资时机、合作伙伴的诚信度等..."
                className="w-full h-44 bg-slate-950/50 border border-slate-800 rounded-3xl p-6 text-slate-200 text-sm resize-none focus:ring-1 focus:ring-amber-500/50 outline-none transition-all placeholder:text-slate-700 leading-relaxed"
              />
              
              <div className="space-y-3">
                <p className="text-[9px] text-amber-600/70 uppercase tracking-[0.2em] font-black pl-1 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-600"></span> 参考示例
                </p>
                <div className="flex flex-col gap-2.5">
                  {activeTemplates.map((template, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setText(template)}
                      className="text-left text-[11px] text-slate-400 hover:text-amber-500/90 transition-all bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 hover:border-amber-500/30 hover:bg-amber-500/5 group"
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
              <div className="space-y-3">
                <p className="text-[9px] text-amber-600/70 uppercase tracking-[0.2em] font-black pl-1 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-600"></span> 参考示例
                </p>
                <div className="flex flex-col gap-2.5">
                  {activeTemplates.map((template, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                         if (template.includes('数字')) {
                           const numsMatch = template.match(/\[(.*?)\]/);
                           if (numsMatch) {
                             const nums = numsMatch[1].split(',').map(n => n.trim());
                             setLiuyao({ ...liuyao, numbers: [nums[0] || '', nums[1] || '', nums[2] || ''], question: template.split('，')[1] || template });
                             return;
                           }
                         }
                         setLiuyao({ ...liuyao, question: template });
                      }}
                      className="text-left text-[11px] text-slate-400 hover:text-amber-500/90 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 group"
                    >
                      <span className="opacity-40 group-hover:opacity-100 transition-opacity">◎ </span>{template}
                    </button>
                  ))}
                </div>
              </div>
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
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none"
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
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black pl-1">具体时分</label>
                <input
                  type="time"
                  value={bazi.birthTime}
                  onChange={(e) => setBazi({ ...bazi, birthTime: e.target.value })}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black pl-1">出生地点</label>
              <input
                type="text"
                placeholder="例：四川省成都市"
                value={bazi.birthPlace}
                onChange={(e) => setBazi({ ...bazi, birthPlace: e.target.value })}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs text-white outline-none"
              />
            </div>
            <div className="space-y-3">
                <p className="text-[9px] text-amber-600/70 uppercase tracking-[0.2em] font-black pl-1 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-600"></span> 参考示例
                </p>
                <div className="flex flex-col gap-2.5">
                  {activeTemplates.map((template, i) => (
                    <button
                      key={i}
                      type="button"
                      className="text-left text-[11px] text-slate-400 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 group cursor-default"
                    >
                      <span className="opacity-40">◎ </span>{template}
                    </button>
                  ))}
                </div>
              </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full group relative overflow-hidden bg-amber-600 hover:bg-amber-500 text-white font-black py-6 rounded-[1.5rem] text-xs tracking-[1em] transition-all shadow-2xl shadow-amber-900/40 disabled:opacity-50"
        >
          <span className="relative z-10 pl-4">{isLoading ? '正在通联时空信息...' : '开启深度推演'}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
        </button>
      </form>
    </div>
  );
};

export default InputForm;
