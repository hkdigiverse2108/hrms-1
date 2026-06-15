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
    const initializeUser = async () => {
      let storedUser = localStorage.getItem('user');
      let storedToken = localStorage.getItem('token');
      
      // Fallback: check Electron native session file
      if (!storedUser && typeof window !== 'undefined' && (window as any).electronAPI?.getSession) {
        try {
          const session = await (window as any).electronAPI.getSession();
          if (session && session.user && session.token) {
            console.log("Restoring user session from Electron session.json");
            localStorage.setItem('user', JSON.stringify(session.user));
            localStorage.setItem('token', session.token);
            storedUser = JSON.stringify(session.user);
            storedToken = session.token;
          }
        } catch (err) {
          console.warn("Failed to get session from Electron:", err);
        }
      }

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoading(false); // Disable loading spinner immediately for instant UI boot
          
          const userId = parsedUser.id || parsedUser._id;
          if (userId) {
            const fetchUrl = `${API_URL}/employees/${userId}`;
            console.log("Syncing user data from:", fetchUrl);
            const token = storedToken || localStorage.getItem('token');
            const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            // Sync permissions and profile data in the background
            (async () => {
              try {
                const res = await fetch(fetchUrl, { headers });
                if (res.ok) {
                  const freshUser = await res.json();
                  if (freshUser && !freshUser.detail) {
                    const pRes = await fetch(`${API_URL}/user-permissions/${userId}`, { headers });
                    const pData = pRes.ok ? await pRes.json() : { permissions: [] };
                    const updatedUser = { 
                      ...freshUser, 
                      permissions: pData?.permissions || [] 
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    setUser(updatedUser);
                    
                    // Keep Electron session file in sync
                    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveSession) {
                      (window as any).electronAPI.saveSession({ user: updatedUser, token });
                    }
                  }
                }
              } catch (bgErr) {
                console.warn("Background user sync failed:", bgErr);
              }
            })();
          }
        } catch (err) {
          console.warn("Failed to parse user:", err);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          if (typeof window !== 'undefined' && (window as any).electronAPI?.clearSession) {
            (window as any).electronAPI.clearSession();
          }
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);
  
  const login = (userData: User & { token?: string }) => {
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    }
    setUser(userData);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveSession) {
      (window as any).electronAPI.saveSession({ user: userData, token: userData.token });
    }
  };
 
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      if (typeof window !== 'undefined' && (window as any).electronAPI?.saveSession) {
        const token = localStorage.getItem('token');
        (window as any).electronAPI.saveSession({ user: updatedUser, token });
      }
    }
  };
 
  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.clearSession) {
      (window as any).electronAPI.clearSession();
    }
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
