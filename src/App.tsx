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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">
          AI 人才評核系統
        </h1>
        <button 
          onClick={logout} 
          className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md"
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
