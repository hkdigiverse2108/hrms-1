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
    return () => window.removeEventListener('storage', refreshUser);
  }, []);
 
  return { user, isLoading, setUser, refreshUser };
}
