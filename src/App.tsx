import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import HRDashboard from './components/HRDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import Login from './components/Login';
import { LogOut } from 'lucide-react';

function AppContent() {
  const { currentRole, logout, syncFromGAS, lastSyncTime, syncStatus } = useAuth();

  if (!currentRole) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-teal-100 text-slate-900 font-sans relative">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 pointer-events-none"></div>
      <header className="bg-white/40 backdrop-blur-xl border-b border-white/60 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">
          AI 人才評核系統
        </h1>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'loading' ? 'bg-blue-400 animate-pulse' : syncStatus === 'error' ? 'bg-red-400' : 'bg-green-400'}`}></span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {syncStatus === 'loading' ? '同步中...' : syncStatus === 'error' ? '同步失敗' : '系統已連線'}
              </span>
            </div>
            {lastSyncTime && (
              <span className="text-[10px] text-slate-400">
                最後更新: {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button 
            onClick={() => syncFromGAS()}
            disabled={syncStatus === 'loading'}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            title="手動同步資料"
          >
            <svg className={`w-4 h-4 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button 
            onClick={logout} 
            className="flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 transition-all bg-white/30 hover:bg-white/50 backdrop-blur-md border border-white/50 px-4 py-2 rounded-xl shadow-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">返回登入頁</span>
          </button>
        </div>
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        {currentRole === 'HR' && <HRDashboard />}
        {currentRole === 'Employee' && <EmployeeDashboard />}
        {currentRole === 'Supervisor' && <SupervisorDashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
