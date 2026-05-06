import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Role, HRAccount } from '../types';
import { dataService } from '../services/dataService';

import { db } from '../services/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role | null;
  hrAccount: HRAccount | null;
  login: (email: string, role: Role, password?: string) => Promise<boolean>;
  logout: () => void;
  users: User[];
  refreshUsers: () => void;
  syncFromGAS: () => Promise<void>; // 保留以相容舊程式碼介面
  lastSyncTime: Date | null;
  syncStatus: 'idle' | 'loading' | 'error';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [hrAccount, setHrAccount] = useState<HRAccount | null>(null);
   const [users, setUsers] = useState<User[]>([]);
   const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
   const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'error'>('loading'); // 預設 loading 直到兩個快照都回來
   // 用 ref 追蹤有多少快照尚未完成初始載入
   const pendingSnapshotsRef = React.useRef(2);

  // 直接從 Firebase 抓資料並監聽更新
  const syncFromGAS = React.useCallback(async () => {
    // 為了相容原本的 context 介面保留這個函式，但不做任何事
  }, []);

  useEffect(() => {
    pendingSnapshotsRef.current = 2; // reset on mount
    setSyncStatus('loading');
    
    // 監聽 users
    const unsubscribeUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const allUsers: User[] = [];
      snapshot.forEach((doc) => {
        allUsers.push(doc.data() as User);
      });
      localStorage.setItem('hr_ai_users', JSON.stringify(allUsers));
      setUsers(allUsers);
      setLastSyncTime(new Date());
      // 只在還有 pending 的情況下 decrement
      if (pendingSnapshotsRef.current > 0) {
        pendingSnapshotsRef.current -= 1;
        if (pendingSnapshotsRef.current === 0) setSyncStatus('idle');
      }
      window.dispatchEvent(new Event('hr_data_changed'));
    }, (error) => {
      console.error('Failed to sync users:', error);
      pendingSnapshotsRef.current = 0;
      setSyncStatus('error');
    });

    // 監聽 assessments
    const unsubscribeAssessments = onSnapshot(query(collection(db, 'assessments')), (snapshot) => {
      const allAssessments: any[] = [];
      snapshot.forEach((doc) => {
        allAssessments.push(doc.data());
      });
      localStorage.setItem('hr_ai_assessments', JSON.stringify(allAssessments));
      setLastSyncTime(new Date());
      // 只在還有 pending 的情況下 decrement
      if (pendingSnapshotsRef.current > 0) {
        pendingSnapshotsRef.current -= 1;
        if (pendingSnapshotsRef.current === 0) setSyncStatus('idle');
      }
      window.dispatchEvent(new Event('hr_data_changed'));
    }, (error) => {
      console.error('Failed to sync assessments:', error);
      pendingSnapshotsRef.current = 0;
      setSyncStatus('error');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeAssessments();
    };
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
          // 不需特別呼叫 GAS，Firebase 會處理狀態

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
    <AuthContext.Provider value={{ 
      currentUser, currentRole, hrAccount, login, logout, users, refreshUsers, 
      syncFromGAS, lastSyncTime, syncStatus 
    }}>
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
