
import React from 'react';
import { PredictionHistory } from '../App';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: PredictionHistory[];
  onLoadHistory: (entry: PredictionHistory) => void;
  onClearHistory: () => void;
  onLogout?: () => void; // 新增登出回调
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ isOpen, onClose, history, onLoadHistory, onClearHistory, onLogout }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative w-full max-w-md h-full bg-slate-950 border-l border-rose-900/20 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        <div className="p-8 border-b border-rose-900/20 flex items-center justify-between">
          <h2 className="text-lg font-black text-rose-500 tracking-[0.2em] flex items-center gap-3">时空因果录</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] text-emerald-800 font-black uppercase tracking-[0.3em]">历史推演纪要</h3>
            <div className="flex gap-4">
              {onLogout && <button onClick={onLogout} className="text-[9px] text-slate-600 hover:text-white font-black uppercase transition-colors">注销身份</button>}
              {history.length > 0 && <button onClick={onClearHistory} className="text-[9px] text-rose-800 hover:text-rose-500 font-black uppercase">清理因果</button>}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="py-20 text-center opacity-30 text-[11px] tracking-widest text-slate-500">暂无时空扰动记录</div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => entry.status !== 'loading' && onLoadHistory(entry)}
                  disabled={entry.status === 'loading'}
                  className={`w-full text-left bg-slate-900/40 border p-5 rounded-2xl transition-all group relative overflow-hidden ${entry.status === 'loading' ? 'border-emerald-500/30 animate-pulse cursor-wait' : 'border-slate-900 hover:border-rose-500/30'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${entry.status === 'loading' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-600/10 border-rose-500/20 text-rose-500'}`}>
                      {entry.status === 'loading' ? '正在推演' : (entry.mode === 'QIMEN' ? '奇门' : entry.mode === 'YI_LOGIC' ? '易理' : '中医')}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 line-clamp-2 leading-relaxed">{entry.input}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
