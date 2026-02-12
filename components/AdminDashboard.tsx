
import React, { useEffect, useState } from 'react';

interface UserRecord {
  uid: string;
  created_at: string;
  last_active: string;
  last_mode: string;
}

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/user-tracking', {
        method: 'POST',
        body: JSON.stringify({ action: 'GET_STATS' })
      })
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-logic-blue tracking-widest uppercase">全息控制后台</h2>
            <p className="text-[10px] text-slate-500 tracking-tighter mt-1">SYMMETRIC SYSTEM MONITORING PORTAL</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex justify-center py-20 animate-pulse text-slate-500">正在同步 Supabase 核心数据...</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-2 font-bold tracking-widest uppercase">累计识别主体</span>
                  <span className="text-3xl font-black text-white">{users.length}</span>
                </div>
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-2 font-bold tracking-widest uppercase">今日活跃因子</span>
                  <span className="text-3xl font-black text-logic-blue">
                    {users.filter(u => new Date(u.last_active).toDateString() === new Date().toDateString()).length}
                  </span>
                </div>
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-2 font-bold tracking-widest uppercase">系统完整性</span>
                  <span className="text-3xl font-black text-emerald-500">100%</span>
                </div>
              </div>

              <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-950/30">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-800/50 text-slate-400 font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">主体标识 (UID)</th>
                      <th className="px-6 py-4">最近活跃时间</th>
                      <th className="px-6 py-4">活跃频次</th>
                      <th className="px-6 py-4">最近逻辑模式</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map(u => (
                      <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-300">{u.uid}</td>
                        <td className="px-6 py-4 text-slate-400">{new Date(u.last_active).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 bg-logic-blue/10 text-logic-blue rounded border border-logic-blue/20">LOGGED</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-200 font-black tracking-widest">{u.last_mode}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
