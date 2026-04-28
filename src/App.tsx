import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import HRDashboard from './components/HRDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import Login from './components/Login';
import { LogOut } from 'lucide-react';

function AppContent() {
  const { currentRole, logout } = useAuth();

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
        <button 
          onClick={logout} 
          className="flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 transition-all bg-white/30 hover:bg-white/50 backdrop-blur-md border border-white/50 px-4 py-2 rounded-xl shadow-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          返回登入頁
        </button>
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
