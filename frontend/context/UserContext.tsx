"use client";
 
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/hooks/useUser';
import { API_URL } from '@/lib/config';
 
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
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        const userId = parsedUser.id || parsedUser._id;
        if (userId) {
          const fetchUrl = `${API_URL}/employees/${userId}`;
          console.log("Syncing user data from:", fetchUrl);
          // Fetch fresh user data to get updated permissions
          fetch(fetchUrl)
            .then(res => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
              return res.json();
            })
            .then(freshUser => {
              if (freshUser && !freshUser.detail) {
                // Fetch permissions separately
                fetch(`${API_URL}/user-permissions/${userId}`)
                  .then(pRes => pRes.ok ? pRes.json() : { permissions: [] })
                  .then(pData => {
                    const updatedUser = { 
                      ...freshUser, 
                      permissions: pData?.permissions || [] 
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    setUser(updatedUser);
                  });
              }
            })
            .catch(err => console.error("Failed to sync user data:", err));
        }
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
