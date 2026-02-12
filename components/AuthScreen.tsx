
import React, { useState } from 'react';

interface AuthScreenProps {
  onSuccess: (user: any) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return setError('请完善凭证信息');
    
    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/user-auth', {
        method: 'POST',
        body: JSON.stringify({
          action: isLogin ? 'LOGIN' : 'REGISTER',
          username,
          password
        })
      });
      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || '时空链路异常');

      if (isLogin) {
        onSuccess(data.user);
      } else {
        alert('注册成功，请登录');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#020617] parchment-bg overflow-hidden">
      {/* 动态光斑背景 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-logic-blue/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-400/5 rounded-full blur-[150px] animate-pulse delay-1000"></div>

      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="frosted-glass p-10 md:p-14 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-5xl qimen-font text-transparent bg-clip-text bg-gradient-to-br from-slate-400 via-white to-logic-blue">
              奇门景曜
            </h1>
            <p className="text-[10px] text-slate-500 font-black tracking-[0.5em] uppercase">
              开启全息时空决策链路
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入您的身份标识 (账号)"
                  className="w-full bg-black/60 border border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-200 focus:outline-none focus:border-logic-blue/50 transition-all placeholder:text-slate-700"
                />
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入您的通行密码"
                  className="w-full bg-black/60 border border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-200 focus:outline-none focus:border-logic-blue/50 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            {error && <div className="text-[10px] text-red-500 text-center font-black animate-bounce">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-slate-100 text-slate-950 font-black py-5 rounded-2xl text-[11px] tracking-[1em] uppercase transition-all shadow-xl active:scale-95 disabled:opacity-30"
            >
              {loading ? '同步中...' : isLogin ? '进入推演' : '建立档案'}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] text-slate-500 hover:text-logic-blue transition-colors tracking-widest uppercase font-black"
            >
              {isLogin ? '还没有档案？立即建立' : '已有身份记录？点击登录'}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-[9px] text-slate-700 font-black tracking-widest uppercase opacity-40">
          Symmetric Holographic Computation Matrix V3.8
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
