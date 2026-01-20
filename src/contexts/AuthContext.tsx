import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'ADMIN' | 'ORGANISATION' | 'PROFESSIONAL';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  registerBusiness: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user profile
      // This would typically be a separate endpoint
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await api.post('/v1/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  };

  const register = async (data: any) => {
    await api.post('/v1/auth/register', data);
  };

  const registerBusiness = async (data: any) => {
    await api.post('/v1/auth/createbusiness', data);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, registerBusiness }}>
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

