import React, { createContext, useContext, useState, useCallback } from 'react';
import { getUser, logout as doLogout, AuthUser } from '../lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getUser);

  const setTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(getUser());
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
