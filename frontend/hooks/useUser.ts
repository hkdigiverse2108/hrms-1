import { useState, useEffect } from 'react';
 
export interface User {
  id: string;
  employeeId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  department: string;
  profilePhoto?: string;
  role: string;
  [key: string]: any;
}

// Global patch for localStorage to broadcast local updates within the same window/tab
if (typeof window !== 'undefined' && !(window as any).__localStoragePatched) {
  (window as any).__localStoragePatched = true;
  
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key, value) {
    originalSetItem.apply(this, arguments as any);
    if (key === 'user') {
      window.dispatchEvent(new Event('local-user-updated'));
    }
  };

  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function (key) {
    originalRemoveItem.apply(this, arguments as any);
    if (key === 'user') {
      window.dispatchEvent(new Event('local-user-updated'));
    }
  };
}
 
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
 
  const refreshUser = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  };
 
  useEffect(() => {
    refreshUser();
 
    // Listen for storage changes (helpful for multi-tab or manual updates)
    window.addEventListener('storage', refreshUser);
    window.addEventListener('local-user-updated', refreshUser);
    return () => {
      window.removeEventListener('storage', refreshUser);
      window.removeEventListener('local-user-updated', refreshUser);
    };
  }, []);
 
  return { user, isLoading, setUser, refreshUser };
}

