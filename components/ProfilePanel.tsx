
import React from 'react';
import { PredictionHistory } from '../App';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: PredictionHistory[];
  onLoadHistory: (entry: PredictionHistory) => void;
  onClearHistory: () => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ isOpen, onClose, history, onLoadHistory, onClearHistory }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      ></div>
      
      {/* 侧边面板 */}
      <div className="relative w-full max-w-md h-full bg-slate-950 border-l border-rose-900/20 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        {/* 头部 */}
        <div className="p-8 border-b border-rose-900/20 flex items-center justify-between">
          <h2 className="text-lg font-black text-rose-500 tracking-[0.2em] flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-[10px]">因</span>
            时空因果录
          </h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 用户信息卡片 */}
        <div className="p-8">
          <div className="bg-gradient-to-br from-rose-600/10 to-emerald-600/10 border border-rose-500/10 p-6 rounded-3xl relative overflow-hidden group">
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-rose-500/30 flex items-center justify-center">
                <span className="text-rose-500 text-2xl font-black">庚</span>
              </div>
              <div>
                <p className="text-slate-200 font-black text-sm mb-1">因果观测者 (游客)</p>
                <p className="text-[10px] text-slate-500 tracking-widest font-mono">ID: {Date.now().toString().slice(-8)}</p>
              </div>
            </div>
            {/* 装饰性背景 */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full"></div>
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] text-emerald-800 font-black uppercase tracking-[0.3em]">历史推演纪要</h3>
            {history.length > 0 && (
              <button 
                onClick={onClearHistory}
                className="text-[9px] text-rose-800 hover:text-rose-500 font-black uppercase transition-colors"
              >
                清理因果
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-20 text-center opacity-30">
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 border border-slate-800 rounded-full flex items-center justify-center text-xs">?</div>
              </div>
              <p className="text-[11px] tracking-widest text-slate-500">暂无时空扰动记录</p>
            </div>
          ) : (
            <div className="space-y-4 pb-10">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onLoadHistory(entry)}
                  className="w-full text-left bg-slate-900/40 border border-slate-900 hover:border-rose-500/30 p-5 rounded-2xl transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-rose-600/10 border border-rose-500/20 text-[9px] text-rose-500 font-black uppercase tracking-widest">
                      {entry.mode === 'QIMEN' ? '奇门' : entry.mode === 'YI_LOGIC' ? '易理' : '中医'}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">
                      {new Date(entry.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 line-clamp-2 leading-relaxed tracking-wide mb-1">
                    {entry.input}
                  </p>
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-rose-500/5 translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform"></div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 底部功能栏 */}
        <div className="p-8 border-t border-rose-900/10">
          <p className="text-[10px] text-slate-700 text-center italic tracking-widest">
            “洞悉自我，积极创造现实人生。”
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
