import React, { useState, useEffect } from 'react';
import { HRAccount } from '../types';
import { useAuth } from '../context/AuthContext';

const API = 'https://hr-project-96mr.onrender.com';

export default function HRAccountManager() {
  const { hrAccount } = useAuth();
  const [accounts, setAccounts] = useState<HRAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  // New account form
  const [form, setForm] = useState({ name: '', email: '', password: '', canImport: true, canExport: true, canManageAccounts: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', password: '', canImport: true, canExport: true, canManageAccounts: false });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/hr/accounts`);
      const data = await res.json();
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/hr/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, canImport: form.canImport ? 1 : 0, canExport: form.canExport ? 1 : 0, canManageAccounts: form.canManageAccounts ? 1 : 0 })
      });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error, 'err'); return; }
      showMsg('✅ 帳號建立成功');
      setForm({ name: '', email: '', password: '', canImport: true, canExport: true, canManageAccounts: false });
      fetchAccounts();
    } catch { showMsg('網路錯誤', 'err'); }
  };

  const startEdit = (acc: HRAccount) => {
    setEditingId(acc.id);
    setEditForm({ name: acc.name, password: '', canImport: !!acc.canImport, canExport: !!acc.canExport, canManageAccounts: !!acc.canManageAccounts });
  };

  const handleUpdate = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/hr/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, canImport: editForm.canImport ? 1 : 0, canExport: editForm.canExport ? 1 : 0, canManageAccounts: editForm.canManageAccounts ? 1 : 0 })
      });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error, 'err'); return; }
      showMsg('✅ 更新成功');
      setEditingId(null);
      fetchAccounts();
    } catch { showMsg('網路錯誤', 'err'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定刪除此帳號？')) return;
    try {
      const res = await fetch(`${API}/api/hr/accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showMsg(data.error, 'err'); return; }
      showMsg('✅ 已刪除');
      fetchAccounts();
    } catch { showMsg('網路錯誤', 'err'); }
  };

  if (!hrAccount?.canManageAccounts) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <span className="text-5xl mb-4">🔒</span>
        <p className="text-lg font-semibold">您的帳號沒有帳號管理權限</p>
        <p className="text-sm mt-2">請聯絡系統管理員開通此功能</p>
      </div>
    );
  }

  const CheckBox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <div onClick={() => onChange(!checked)} className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </div>
      {label}
    </label>
  );

  return (
    <div className="space-y-8">
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msgType === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg}
        </div>
      )}

      {/* Create new account */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-5 border-l-4 border-blue-500 pl-3">➕ 新增人資帳號</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">姓名</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                className="w-full rounded-xl bg-white/70 border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="張小明" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                className="w-full rounded-xl bg-white/70 border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="hr@company.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">密碼</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                className="w-full rounded-xl bg-white/70 border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="設定初始密碼" />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 pt-1">
            <CheckBox label="可導入員工資料" checked={form.canImport} onChange={v => setForm({ ...form, canImport: v })} />
            <CheckBox label="可匯出報表" checked={form.canExport} onChange={v => setForm({ ...form, canExport: v })} />
            <CheckBox label="可管理帳號 (管理員)" checked={form.canManageAccounts} onChange={v => setForm({ ...form, canManageAccounts: v })} />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm">建立帳號</button>
          </div>
        </form>
      </div>

      {/* Accounts table */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-5 border-l-4 border-slate-400 pl-3">👥 現有帳號清單</h3>
        {loading ? (
          <div className="text-center py-8 text-slate-400">載入中...</div>
        ) : (
          <div className="space-y-3">
            {accounts.map(acc => (
              <div key={acc.id} className={`rounded-xl border p-4 transition-all ${editingId === acc.id ? 'bg-blue-50/80 border-blue-200' : 'bg-white/60 border-white/60 hover:bg-white/80'}`}>
                {editingId === acc.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">姓名</label>
                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">新密碼 (留空=不變更)</label>
                        <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                          className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm" placeholder="留空即不變更" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-5">
                      <CheckBox label="可導入資料" checked={editForm.canImport} onChange={v => setEditForm({ ...editForm, canImport: v })} />
                      <CheckBox label="可匯出報表" checked={editForm.canExport} onChange={v => setEditForm({ ...editForm, canExport: v })} />
                      <CheckBox label="管理員" checked={editForm.canManageAccounts} onChange={v => setEditForm({ ...editForm, canManageAccounts: v })} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">取消</button>
                      <button onClick={() => handleUpdate(acc.id)} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">儲存</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800">{acc.name}</span>
                        <span className="text-xs text-slate-500">{acc.email}</span>
                        {acc.canManageAccounts ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">管理員</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">人資</span>
                        )}
                      </div>
                      <div className="flex gap-4 text-[11px] text-slate-500">
                        <span className={acc.canImport ? 'text-green-600' : 'text-slate-300'}>
                          {acc.canImport ? '✓' : '✗'} 導入資料
                        </span>
                        <span className={acc.canExport ? 'text-green-600' : 'text-slate-300'}>
                          {acc.canExport ? '✓' : '✗'} 匯出報表
                        </span>
                        <span className="text-slate-400">建立於 {acc.createdAt?.split('T')[0]}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(acc)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">編輯</button>
                      <button onClick={() => handleDelete(acc.id)} className="px-3 py-1.5 text-xs rounded-lg border border-red-100 hover:bg-red-50 text-red-600">刪除</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
