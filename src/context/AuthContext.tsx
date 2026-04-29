import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Role, HRAccount } from '../types';
import { dataService } from '../services/dataService';

const API = '';

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
    dataService.initFromBackend().then(() => {
      refreshUsers();
    });
  }, []);

  const refreshUsers = () => {
    setUsers(dataService.getUsers());
  };

  const login = async (email: string, role: Role, password?: string): Promise<boolean> => {
    if (role === 'HR') {
      try {
        const res = await fetch(`${API}/api/hr/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) return false;
        const account: HRAccount = await res.json();
        setHrAccount(account);
        setCurrentRole('HR');
        setCurrentUser(null);
        return true;
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
