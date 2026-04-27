"use client";
 
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/hooks/useUser';
 
interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}
 
const UserContext = createContext<UserContextType | undefined>(undefined);
 
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
 
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Failed to parse user", err);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);
 
  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };
 
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };
 
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };
 
  return (
    <UserContext.Provider value={{ user, isLoading, login, updateUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}
 
export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
