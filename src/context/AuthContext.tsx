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
  syncFromGAS: () => Promise<void>;
  lastSyncTime: Date | null;
  syncStatus: 'idle' | 'loading' | 'error';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 逾時時間：5 秒後若 Firebase 還沒回應，自動用 localStorage 資料解鎖
const FIREBASE_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [hrAccount, setHrAccount] = useState<HRAccount | null>(null);
  const [users, setUsers] = useState<User[]>(() => dataService.getUsers()); // 初始值直接從 localStorage
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const pendingSnapshotsRef = React.useRef(2);

  const syncFromGAS = React.useCallback(async () => {
    // 保留介面相容性，空實作
  }, []);

  useEffect(() => {
    pendingSnapshotsRef.current = 2;
    setSyncStatus('loading');

    // ─── Fallback Timer ───────────────────────────────────────────
    // 如果 Firebase 5 秒內沒有回應，自動用 localStorage 解鎖登入頁
    const fallbackTimer = setTimeout(() => {
      if (pendingSnapshotsRef.current > 0) {
        console.warn('Firebase timeout – using localStorage fallback');
        pendingSnapshotsRef.current = 0;
        // 確保 users 狀態有資料
        setUsers(dataService.getUsers());
        setSyncStatus('idle'); // 解鎖，讓使用者可以登入
      }
    }, FIREBASE_TIMEOUT_MS);

    // ─── Users Snapshot ───────────────────────────────────────────
    const unsubscribeUsers = onSnapshot(
      query(collection(db, 'users')),
      (snapshot) => {
        const allUsers: User[] = [];
        snapshot.forEach((doc) => {
          allUsers.push(doc.data() as User);
        });
        localStorage.setItem('hr_ai_users', JSON.stringify(allUsers));
        setUsers(allUsers);
        setLastSyncTime(new Date());

        if (pendingSnapshotsRef.current > 0) {
          pendingSnapshotsRef.current -= 1;
          if (pendingSnapshotsRef.current === 0) {
            clearTimeout(fallbackTimer);
            setSyncStatus('idle');
          }
        }
        window.dispatchEvent(new Event('hr_data_changed'));
      },
      (error) => {
        console.warn('Firebase users sync failed, using localStorage:', error);
        // 失敗時不阻擋：用本機資料繼續
        setUsers(dataService.getUsers());
        pendingSnapshotsRef.current = Math.max(0, pendingSnapshotsRef.current - 1);
        if (pendingSnapshotsRef.current === 0) {
          clearTimeout(fallbackTimer);
          setSyncStatus('idle');
        }
      }
    );

    // ─── Assessments Snapshot ─────────────────────────────────────
    const unsubscribeAssessments = onSnapshot(
      query(collection(db, 'assessments')),
      (snapshot) => {
        const allAssessments: any[] = [];
        snapshot.forEach((doc) => {
          allAssessments.push(doc.data());
        });
        localStorage.setItem('hr_ai_assessments', JSON.stringify(allAssessments));
        setLastSyncTime(new Date());

        if (pendingSnapshotsRef.current > 0) {
          pendingSnapshotsRef.current -= 1;
          if (pendingSnapshotsRef.current === 0) {
            clearTimeout(fallbackTimer);
            setSyncStatus('idle');
          }
        }
        window.dispatchEvent(new Event('hr_data_changed'));
      },
      (error) => {
        console.warn('Firebase assessments sync failed, using localStorage:', error);
        pendingSnapshotsRef.current = Math.max(0, pendingSnapshotsRef.current - 1);
        if (pendingSnapshotsRef.current === 0) {
          clearTimeout(fallbackTimer);
          setSyncStatus('idle');
        }
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribeUsers();
      unsubscribeAssessments();
    };
  }, []);

  const refreshUsers = () => {
    setUsers(dataService.getUsers());
  };

  const login = async (email: string, role: Role, password?: string): Promise<boolean> => {
    if (role === 'HR') {
      const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string) || 'admin@hr.com';
      const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string) || 'admin1234';
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
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
        return true;
      }
      return false;
    }

    // Employee / Supervisor：先從 React state 找，找不到再讀 localStorage（防止 state 還沒更新）
    const allUsers = users.length > 0 ? users : dataService.getUsers();

    if (role === 'Employee') {
      const match = allUsers.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
      if (match) {
        setCurrentUser(match);
        setCurrentRole('Employee');
        return true;
      }
      return false;
    }

    if (role === 'Supervisor') {
      const match = allUsers.find(u => u.supervisorEmail.trim().toLowerCase() === email.trim().toLowerCase());
      if (match) {
        setCurrentUser({
          email: email.trim().toLowerCase(),
          name: match.supervisorName,
          company: match.company,
          department: '',
          title: 'Supervisor',
          supervisorName: '',
          supervisorEmail: ''
        });
        setCurrentRole('Supervisor');
        return true;
      }
      return false;
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
