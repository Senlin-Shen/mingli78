
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

  // 六爻状态
  const [liuyao, setLiuyao] = useState<LiuYaoInput>({ numbers: ['', '', ''], question: '' });
  // 四柱状态
  const [bazi, setBazi] = useState<BaZiInput>({ name: '', gender: '男', birthDate: '', birthPlace: '' });

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
        if (bazi.name && bazi.birthDate) onPredict(bazi, 'BA_ZI');
      }
    }
  };

  const currentScenarios = mode === 'QIMEN' ? SCENARIOS : YI_LOGIC_SCENARIOS;

  return (
    <div className="flex flex-col gap-6">
      {/* 模式选择展示 */}
      {mode === 'QIMEN' && (
        <div className="flex bg-slate-950/50 p-1 rounded-xl border border-slate-800">
          <button onClick={() => setQimenType('SHI_JU')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${qimenType === 'SHI_JU' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}>事局推演</button>
          <button onClick={() => setQimenType('MING_JU')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${qimenType === 'MING_JU' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}>命局排盘</button>
        </div>
      )}

      {/* 分类切换 */}
      <div className="flex flex-wrap gap-2">
        {currentScenarios.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 text-[10px] rounded-full font-bold tracking-widest transition-all border ${activeCategory === cat.id ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-500'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'QIMEN' ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {qimenType === 'MING_JU' && (
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1">起局基准时间</label>
                <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-amber-500 outline-none" />
              </div>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="请描述您的推演诉求..."
              className="w-full h-32 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-slate-200 text-xs resize-none focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        ) : activeCategory === 'liuyao' ? (
          <div className="space-y-5 animate-in fade-in duration-500">
            <div className="grid grid-cols-3 gap-4">
              {liuyao.numbers.map((num, i) => (
                <div key={i} className="space-y-2">
                  <label className="text-[9px] text-slate-500 uppercase tracking-[0.2em] text-center block">报数 {i + 1}</label>
                  <input
                    type="number"
                    placeholder="0-999"
                    value={num}
                    onChange={(e) => {
                      const newNums = [...liuyao.numbers];
                      newNums[i] = e.target.value;
                      setLiuyao({ ...liuyao, numbers: newNums });
                    }}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center text-sm text-amber-500 font-bold focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 uppercase tracking-[0.2em] ml-1">所求之事</label>
              <textarea
                value={liuyao.question}
                onChange={(e) => setLiuyao({ ...liuyao, question: e.target.value })}
                placeholder="例如：求测此项商业合作的最终成败及变数？"
                className="w-full h-24 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-slate-200 text-xs resize-none focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">姓名/代号</label>
                <input
                  type="text"
                  value={bazi.name}
                  onChange={(e) => setBazi({ ...bazi, name: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">性别</label>
                <select
                  value={bazi.gender}
                  onChange={(e) => setBazi({ ...bazi, gender: e.target.value as '男' | '女' })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                >
                  <option>男</option>
                  <option>女</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">出生日期 (公历/农历皆可)</label>
              <input
                type="text"
                placeholder="如：1990年5月2日 14:30"
                value={bazi.birthDate}
                onChange={(e) => setBazi({ ...bazi, birthDate: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">出生地址 (省市/经纬度)</label>
              <input
                type="text"
                placeholder="如：四川省成都市"
                value={bazi.birthPlace}
                onChange={(e) => setBazi({ ...bazi, birthPlace: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full group relative overflow-hidden bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-2xl text-xs tracking-[0.5em] transition-all shadow-xl shadow-amber-900/20 disabled:opacity-50"
        >
          <span className="relative z-10">{isLoading ? '正在构筑时空模型...' : '开始深度推演'}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
        </button>
      </form>
    </div>
  );
};

export default InputForm;
