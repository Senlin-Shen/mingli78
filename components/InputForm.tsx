
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

      {type === 'MING_JU' && (
        <div className="animate-in fade-in slide-in-from-top-1">
          <label className="text-[10px] text-slate-500 mb-1 block">输入出生时间：</label>
          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/50">
        {