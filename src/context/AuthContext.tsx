import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Role, HRAccount } from '../types';
import { dataService } from '../services/dataService';

const API = 'https://script.google.com/macros/s/AKfycbw6OUWRFp-kVAkPXPuDHge_-DZipaGjsCYtQ_VQpuF1KF5D7exquAjCI31lDN5K1ly0/exec';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role | null;
  hrAccount: HRAccount | null;
  login: (email: string, role: Role, password?: string) => Promise<boolean>;
  logout: () => void;
  users: User[];
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [hrAccount, setHrAccount] = useState<HRAccount | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const syncData = () => {
      dataService.initFromBackend().then(() => {
        refreshUsers();
        window.dispatchEvent(new Event('hr_data_changed'));
      });
    };

    // 初始載入
    syncData();

    // 每 15 秒自動跟 GAS 同步一次，確保能看到別人匯入或修改的資料
    const interval = setInterval(syncData, 15000);

    return () => clearInterval(interval);
  }, []);

  const refreshUsers = () => {
    setUsers(dataService.getUsers());
  };

  const login = async (email: string, role: Role, password?: string): Promise<boolean> => {
    if (role === 'HR') {
      try {
        // GAS 必須使用 POST 且因為跨域問題，通常使用 no-cors 或簡單的 fetch
        // 這裡我們直接對 GAS 發送請求，並在前端做簡易驗證以確保流暢度
        if (email === 'admin@hr.com' && password === 'admin1234') {
          const account: HRAccount = {
            id: 1,
            email: 'admin@hr.com',
            name: 'Super Admin',
            canImport: 1,
            canExport: 1,
            canManageAccounts: 1
          };
          setHrAccount(account);
          setCurrentRole('HR');
          setCurrentUser(null);
          
          // 非同步通知 GAS 有人登入（選用）
          fetch(API, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'hrLogin', email, password })
          }).catch(() => {});

          return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    const user = dataService.getUserByEmail(email);
    if (user) {
      setCurrentUser(user);
      setCurrentRole(role);
      return true;
    }
    
    const asSupervisor = dataService.getUsers().find(u => u.supervisorEmail === email);
    if (role === 'Supervisor' && asSupervisor) {
      setCurrentUser({
        email,
        name: asSupervisor.supervisorName,
        company: '', department: '', title: 'Supervisor', supervisorName: '', supervisorEmail: ''
      });
      setCurrentRole('Supervisor');
      return true;
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    setHrAccount(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentRole, hrAccount, login, logout, users, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
