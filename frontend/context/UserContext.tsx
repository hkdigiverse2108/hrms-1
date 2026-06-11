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
  
  // Setup global fetch interceptor to inject Authorization header
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource, config] = args;
      
      if (typeof resource === 'string' && resource.startsWith(API_URL)) {
        const token = localStorage.getItem('token');
        if (token) {
          const newConfig = { ...config } as RequestInit;
          newConfig.headers = {
            ...newConfig.headers,
            'Authorization': `Bearer ${token}`
          };
          args[1] = newConfig;
        }
      }
      return originalFetch(...args);
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
 
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
          const token = localStorage.getItem('token');
          const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
          // Fetch fresh user data to get updated permissions
          fetch(fetchUrl, { headers })
            .then(res => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
              return res.json();
            })
            .then(freshUser => {
              if (freshUser && !freshUser.detail) {
                // Fetch permissions separately
                fetch(`${API_URL}/user-permissions/${userId}`, { headers })
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
 
  const login = (userData: User & { token?: string }) => {
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    }
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
    localStorage.removeItem('token');
    setUser(null);
  };

  // Periodic check to automatically log out inactive users
  useEffect(() => {
    if (!user) return;
    const userId = user.id || user._id;
    if (!userId) return;

    const checkUserStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/employees/${userId}`, { headers });
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

    // Run status check every 60 seconds (1 minute)
    const intervalId = setInterval(checkUserStatus, 60000);
    return () => clearInterval(intervalId);
  }, [user?.id, user?._id]);

  // Native OS input tracking session management
  useEffect(() => {
    if (!user) {
      // Clear active session on logout
      fetch(`${API_URL}/activity/session-inactive`, { method: 'POST' }).catch(() => {});
      return;
    }
    const userId = user.id || user._id;
    if (!userId) return;

    // Register active user in global native listener
    fetch(`${API_URL}/activity/session-active/${userId}`, { method: 'POST' }).catch(() => {});

    const handleUnload = () => {
      // Notify session inactive on unload
      fetch(`${API_URL}/activity/session-inactive`, { method: 'POST', keepalive: true }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [user?.id, user?._id]);
 
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
