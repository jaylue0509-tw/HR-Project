import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { dataService } from '../services/dataService';

export default function Login() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Employee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim();
    const cleanName = name.trim();
    const cleanPassword = password.trim();

    try {
      if (role === 'HR') {
        const success = await login(cleanEmail, 'HR', cleanPassword);
        if (!success) {
          setError('帳號或密碼錯誤，請確認後重試。');
        }
      } else {
        const users = dataService.getUsers();
        if (role === 'Employee') {
          const match = users.find(u => 
            u.email.trim().toLowerCase() === cleanEmail.toLowerCase() && 
            u.name.trim() === cleanName && 
            (!company || u.company === company)
          );
          if (!match) {
            setError('找不到此 Email 與姓名組合，或公司別不符，請確認是否由 HR 導入。');
            setLoading(false);
            return;
          }
        } else if (role === 'Supervisor') {
          const match = users.find(u => 
            u.supervisorEmail.trim().toLowerCase() === cleanEmail.toLowerCase() && 
            u.supervisorName.trim() === cleanName && 
            (!company || u.company === company)
          );
          if (!match) {
            setError('找不到擔任主管的此 Email 與姓名組合，或公司別不符。');
            setLoading(false);
            return;
          }
        }
        const success = await login(cleanEmail, role);
        if (!success) setError('系統錯誤，無法登入。');
      }
    } finally {
      setLoading(false);
    }
  };


  const roleLabels: Record<Role, string> = {
    HR: '人資 / 管理員',
    Employee: '員工',
    Supervisor: '主管',
  };
  const roleIcons: Record<Role, string> = {
    HR: '🏢',
    Employee: '👤',
    Supervisor: '👑',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/40 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.10)] border border-white/60 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-white/50">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-900">AI 人才評核系統</h1>
          <p className="text-sm text-slate-500 mt-2">請選擇您的身分並登入 <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-1">Update: 2026-04-30</span></p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Role selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">登入身分</label>
            <div className="grid grid-cols-3 gap-2">
              {(['HR', 'Employee', 'Supervisor'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); setError(''); setPassword(''); setCompany(''); }}
                  className={`py-2.5 px-2 text-xs font-semibold rounded-xl border transition-all flex flex-col items-center gap-1 ${
                    role === r
                      ? 'bg-blue-600/90 text-white border-blue-500 shadow-md'
                      : 'bg-white/40 text-slate-600 border-white/50 hover:bg-white/60'
                  }`}
                >
                  <span className="text-lg">{roleIcons[r]}</span>
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Company Selection - Now for ALL roles */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">公司別</label>
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full rounded-xl bg-white/50 border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-slate-700"
            >
              <option value="" disabled>請選擇公司別</option>
              <option value="東森新媒體(含民調雲)">東森新媒體(含民調雲)</option>
              <option value="東森購物(含新零售)">東森購物(含新零售)</option>
              <option value="東森寵物雲">東森寵物雲</option>
              <option value="東森全球">東森全球</option>
              <option value="東森自然美">東森自然美</option>
              <option value="東森房屋(台東森京塚)">東森房屋(台東森京塚)</option>
              <option value="東森保代">東森保代</option>
              <option value="東森健康生技">東森健康生技</option>
              <option value="東森國際(含東森)">東森國際(含東森)</option>
              <option value="香港草莓網">香港草莓網</option>
              <option value="慈愛生物科技">慈愛生物科技</option>
              <option value="大陸自然美">大陸自然美</option>
              <option value="分眾傳媒">分眾傳媒</option>
            </select>
          </div>

          {/* Employee / Supervisor: name + email */}
          {role !== 'HR' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="請輸入您的真實姓名"
                  className="w-full rounded-xl bg-white/50 border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="請輸入您的工作 Email"
                  className="w-full rounded-xl bg-white/50 border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">人資 Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@hr.com"
                  className="w-full rounded-xl bg-white/50 border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  className="w-full rounded-xl bg-white/50 border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-xl">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-800/90 backdrop-blur-md px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 border border-slate-700/50 disabled:opacity-50"
          >
            {loading ? '驗證中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}
