import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Role } from '../types';
import { dataService } from '../services/dataService';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role | null;
  login: (email: string, role: Role) => boolean;
  logout: () => void;
  users: User[];
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    dataService.initFromBackend().then(() => {
      refreshUsers();
    });
  }, []);

  const refreshUsers = () => {
    setUsers(dataService.getUsers());
  };

  const login = (email: string, role: Role) => {
    if (role === 'HR') {
      setCurrentRole('HR');
      setCurrentUser(null);
      return true;
    }

    const user = dataService.getUserByEmail(email);
    if (user) {
      setCurrentUser(user);
      setCurrentRole(role);
      return true;
    }
    
    // For supervisor, maybe they are just recognized by user records
    // where they are listed as supervisor. If email doesn't strictly match a user but they want to login as supervisor,
    // we can mock a user or just query if any user has them as supervisor
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
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentRole, login, logout, users, refreshUsers }}>
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
