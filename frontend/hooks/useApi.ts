import { useState, useEffect, useCallback } from 'react';
import * as staticData from '@/lib/data';
import { API_URL } from '@/lib/config';

const ENDPOINTS = [
  { key: 'employees', url: '/employees' },
  { key: 'attendanceRecords', url: '/attendance' },
  { key: 'leaveRequests', url: '/leaves' },
  { key: 'announcements', url: '/announcements' },
  { key: 'dashboardStats', url: '/dashboard-stats' },
  { key: 'payrollRecords', url: '/payroll' },
  { key: 'departments', url: '/departments' },
  { key: 'designations', url: '/designations' },
  { key: 'companies', url: '/companies' },
  { key: 'roles', url: '/roles' },
  { key: 'relations', url: '/relations' },
  { key: 'jobOpenings', url: '/job-openings' },
  { key: 'applications', url: '/applications' },
  { key: 'interns', url: '/interns' },
  { key: 'assets', url: '/assets' },
  { key: 'expenseClaims', url: '/expense-claims' },
  { key: 'holidays', url: '/holidays' },
  { key: 'kpiRecords', url: '/kpi-records' },
  { key: 'employeeDocuments', url: '/employee-documents' },
  { key: 'employeeDailyReports', url: '/employee-daily-reports' },
  { key: 'documentTypes', url: '/document-types' }
];

// Module-level global store for caching, sharing loading states and deduplicating fetches
let globalData: any = { ...staticData };
let globalIsLoading = true;
let globalError: string | null = null;
let activeFetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach(listener => listener());
}

async function fetchAllData(force = false) {
  if (activeFetchPromise && !force) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    globalIsLoading = true;
    emitChange();
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const requests = ENDPOINTS.map(ep => 
        fetch(`${API_URL}${ep.url}`, { mode: 'cors', headers })
          .then(res => {
            if (res.status === 401) return [];
            if (!res.ok) {
              console.warn(`Failed to fetch ${ep.key}: Status ${res.status}`);
              return null;
            }
            return res.json();
          })
          .then(data => ({ key: ep.key, data }))
          .catch(err => {
            console.warn(`Error fetching ${ep.key}:`, err);
            return { key: ep.key, data: null };
          })
      );

      const results = await Promise.all(requests);
      results.forEach(res => {
        if (res.data !== null) {
          globalData[res.key] = res.data;
        }
      });
      globalError = null;
    } catch (err: any) {
      globalError = err.message || 'An error occurred fetching data';
    } finally {
      globalIsLoading = false;
      activeFetchPromise = null;
      emitChange();
    }
  })();

  return activeFetchPromise;
}

export function useApi() {
  const [state, setState] = useState({
    data: globalData,
    isLoading: globalIsLoading,
    error: globalError
  });

  useEffect(() => {
    const handleChange = () => {
      setState({
        data: globalData,
        isLoading: globalIsLoading,
        error: globalError
      });
    };

    listeners.add(handleChange);

    // Initial fetch if it's the first time and not currently fetching
    if (globalIsLoading && !activeFetchPromise) {
      fetchAllData();
    }

    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const refresh = useCallback(async () => {
    await fetchAllData(true);
  }, []);

  const updateData = useCallback((key: string, value: any) => {
    globalData = { ...globalData, [key]: value };
    emitChange();
  }, []);

  const refreshItem = useCallback(async (key: string) => {
    const ep = ENDPOINTS.find(e => e.key === key);
    if (!ep) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}${ep.url}`, { mode: 'cors', headers });
      if (res.ok) {
        const newData = await res.json();
        updateData(key, newData);
      }
    } catch (e) {
      console.error(`Failed to refresh ${key}:`, e);
    }
  }, [updateData]);

  return { 
    data: state.data, 
    isLoading: state.isLoading, 
    error: state.error, 
    refresh, 
    updateData, 
    refreshItem 
  };
}
