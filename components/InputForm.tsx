
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

  const handleTemplateClick = (tpl: string) => {
    setText(tpl);
  };

  const category = SCENARIOS.find(c => c.id === activeCategory);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setType('SHI_JU')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
            type === 'SHI_JU' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          事局 (当前时空)
        </button>
        <button
          onClick={() => setType('MING_JU')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
            type === 'MING_JU' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          命局 (生辰本命)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {type === 'MING_JU' && (
          <div className="animate-in fade-in slide-in-from-top-1">
            <label className="text-[10px] text-slate-500 mb-1 block">出生时间：</label>
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/50">
        {SCENARIOS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 text-[10px] rounded-full transition-all ${
              activeCategory === cat.id
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
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
            className="text-left text-[10px] bg-slate-900/40 hover:bg-slate-800/60 p-2 rounded border border-slate-800 text-slate-400 transition-colors"
          >
            {tpl}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请精准描述您的问题..."
          className="w-full h-24 bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none text-xs"
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim() || (type === 'MING_JU' && !customDate)}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 text-xs flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              九维演算中...
            </>
          ) : '拨动时空'}
        </button>
      </form>
    </div>
  );
};

export default InputForm;
