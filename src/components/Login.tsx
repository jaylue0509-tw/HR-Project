import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { dataService } from '../services/dataService';

export default function Login() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Employee');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'HR') {
      login('admin@hr.com', 'HR');
    } else {
      // Prompt says: "這作為登入權限: 姓名跟EMAIL"
      const users = dataService.getUsers();
      if (role === 'Employee') {
        const match = users.find(u => u.email === email && u.name === name);
        if (!match) {
           setError('找不到此 Email 與姓名組合，請確認是否由 HR 導入。');
           return;
        }
      } else if (role === 'Supervisor') {
        const match = users.find(u => u.supervisorEmail === email && u.supervisorName === name);
        if (!match) {
           setError('找不到擔任主管的此 Email 與姓名組合。');
           return;
        }
      }

      const success = login(email, role);
      if (!success) {
        setError('系統錯誤，無法登入。');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI 人才評核系統</h1>
          <p className="text-sm text-slate-500 mt-2">請選擇您的身分並登入</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">登入身分</label>
            <div className="grid grid-cols-3 gap-3">
              {(['HR', 'Employee', 'Supervisor'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setError('');
                  }}
                  className={`py-2 px-3 text-sm font-medium rounded-md border transition-colors ${
                    role === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {r === 'Employee' ? '員工' : r === 'HR' ? '人資' : '主管'}
                </button>
              ))}
            </div>
          </div>

          {role !== 'HR' && (
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  姓名
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="請輸入您的真實姓名"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="請輸入您的工作 Email"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            登入
          </button>
        </form>

        
        {role === 'Employee' && (
          <div className="mt-6 text-xs text-slate-500 text-center">
            測試帳號: <br/> HR可先登入並使用CSV導入資料後，再用該Email登入。
          </div>
        )}
      </div>
    </div>
  );
}
