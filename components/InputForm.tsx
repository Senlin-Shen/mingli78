
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
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'QIMEN') setActiveCategory('investment');
    else if (mode === 'YI_LOGIC') setActiveCategory('liuyao');
    else if (mode === 'TCM_AI') setActiveCategory('tcm_consult');
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (mode === 'QIMEN') {
      if (text.trim()) onPredict(text, qimenType, qimenType === 'MING_JU' ? customDate : '');
    } else if (mode === 'YI_LOGIC') {
      if (activeCategory === 'liuyao') onPredict({ numbers: ['7', '8', '3'], question: '示例咨询' }, 'LIU_YAO');
    } else if (mode === 'TCM_AI') {
      onPredict(text, 'TCM');
    }
  };

  const currentScenarios = mode === 'QIMEN' ? SCENARIOS : (mode === 'YI_LOGIC' ? YI_LOGIC_SCENARIOS : TCM_SCENARIOS);
  const activeTemplates = currentScenarios.find(s => s.id === activeCategory)?.templates || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {mode === 'QIMEN' && (
        <div className="flex gap-4 mb-4">
          <button type="button" onClick={() => setQimenType('SHI_JU')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all tracking-[0.4em] ${qimenType === 'SHI_JU' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'bg-slate-900 text-slate-500'}`}>事局</button>
          <button type="button" onClick={() => setQimenType('MING_JU')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all tracking-[0.4em] ${qimenType === 'MING_JU' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>命局</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {currentScenarios.map((cat) => (
          <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)} className={`px-4 py-1.5 text-[9px] rounded-full font-black tracking-widest transition-all border ${activeCategory === cat.id ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-900/50 border-slate-800 text-slate-600'}`}>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请输入您的具体推演诉求..."
          className="w-full h-36 bg-slate-950/50 border border-orange-900/20 rounded-2xl p-6 text-slate-200 text-xs resize-none focus:outline-none focus:border-orange-500/40 transition-all leading-loose placeholder:text-slate-800"
        />
        <div className="flex flex-col gap-2">
           {activeTemplates.map((t, i) => (
             <div key={i} onClick={() => setText(t)} className="text-[10px] text-slate-600 cursor-pointer hover:text-orange-400 transition-colors py-1 truncate">
               <span className="text-orange-900 mr-2">◎</span> {t}
             </div>
           ))}
        </div>
      </div>

      <button type="submit" disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-2xl text-[11px] tracking-[1em] transition-all shadow-2xl shadow-orange-900/50 disabled:opacity-50">
        {isLoading ? '运化推演中...' : '开启全息分析'}
      </button>
    </form>
  );
};

export default InputForm;
