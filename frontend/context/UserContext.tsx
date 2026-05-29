"use client";
 
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/hooks/useUser';
import { API_URL } from '@/lib/config';
 
interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  getISTNow: () => Date;
  timeAnchor: { real: number; mono: number };
  isTimeSynced: boolean;
}
 
const UserContext = createContext<UserContextType | undefined>(undefined);
 
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeAnchor, setTimeAnchor] = useState({ real: 0, mono: 0 });
  const [isTimeSynced, setIsTimeSynced] = useState(false);
 
  useEffect(() => {
    const syncTime = async () => {
      try {
        const start = performance.now();
        const res = await fetch(`${API_URL}/time`);
        if (res.ok) {
          const data = await res.json();
          const end = performance.now();
          const latency = (end - start) / 2;
          const realTime = new Date(data.datetime).getTime() + latency;
          setTimeAnchor({ real: realTime, mono: end });
          setIsTimeSynced(true);
        }
      } catch (err) {
        console.warn("Error syncing time:", err);
      }
    };
    syncTime();
    const interval = setInterval(syncTime, 300000);
    return () => clearInterval(interval);
  }, []);

  const getISTNow = useCallback(() => {
    if (timeAnchor.real === 0) return new Date();
    const elapsed = performance.now() - timeAnchor.mono;
    return new Date(timeAnchor.real + elapsed);
  }, [timeAnchor]);
 
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
            .catch(err => console.warn("Failed to sync user data:", err));
        }
      } catch (err) {
        console.warn("Failed to parse user", err);
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

  // Periodic check to automatically log out inactive users
  useEffect(() => {
    if (!user) return;
    const userId = user.id || user._id;
    if (!userId) return;

    const checkUserStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/employees/${userId}`);
        if (res.ok) {
          const freshUser = await res.json();
          if (freshUser && freshUser.status === 'inactive') {
            console.log("User has been deactivated by admin. Logging out...");
            logout();
          }
        }
      } catch (err) {
        console.warn("Failed to check user status:", err);
      }
    };

    // Run status check every 5 seconds
    const intervalId = setInterval(checkUserStatus, 5000);
    return () => clearInterval(intervalId);
  }, [user]);
 
  return (
    <UserContext.Provider value={{ user, isLoading, login, updateUser, logout, getISTNow, timeAnchor, isTimeSynced }}>
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
