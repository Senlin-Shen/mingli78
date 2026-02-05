
import React, { useState } from 'react';
import { SCENARIOS } from '../constants';

interface InputFormProps {
  onPredict: (query: string, type: 'SHI_JU' | 'MING_JU', date: string) => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onPredict, isLoading }) => {
  const [text, setText] = useState('');
  const [type, setType] = useState<'SHI_JU' | 'MING_JU'>('SHI_JU');
  const [customDate, setCustomDate] = useState('');
  const [activeCategory, setActiveCategory] = useState(SCENARIOS[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onPredict(text, type, type === 'MING_JU' ? customDate : '');
    }
  };

  const handleTemplateClick = (tpl: string) => setText(tpl);
  const category = SCENARIOS.find(c => c.id === activeCategory);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button
          onClick={() => setType('SHI_JU')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
            type === 'SHI_JU' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          事局 (即时预测)
        </button>
        <button
          onClick={() => setType('MING_JU')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
            type === 'MING_JU' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          命局 (本命解析)
        </button>
      </div>

      {type === 'MING_JU' && (
        <div className="animate-in fade-in slide-in-from-top-1">
          <label className="text-[10px] text-slate-500 mb-1.5 block uppercase tracking-widest font-black">出生时间/起卦时间：</label>
          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/30">
        {SCENARIOS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 text-[10px] rounded-full transition-all border ${
              activeCategory === cat.id
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {category?.templates.map((tpl, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleTemplateClick(tpl)}
            className="text-left text-[10px] bg-slate-900/40 hover:bg-slate-800/60 p-2.5 rounded-lg border border-slate-800 text-slate-400 transition-colors leading-relaxed"
          >
            {tpl}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请精准描述您的问题（如：近期某项投资的时机...）"
          className="w-full h-28 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all resize-none text-xs leading-relaxed"
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim() || (type === 'MING_JU' && !customDate)}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-xl hover:shadow-amber-500/20 text-xs tracking-[0.5em] uppercase pl-4"
        >
          {isLoading ? '九维演算中...' : '拨动时空'}
        </button>
      </form>
    </div>
  );
};

export default InputForm;
