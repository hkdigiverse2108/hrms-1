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

export function useApi() {
  const [data, setData] = useState({
    ...staticData,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  const updateData = useCallback((key: string, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
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

  useEffect(() => {
    let mounted = true;

    async function fetchAllData() {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const requests = ENDPOINTS.map(ep => 
          fetch(`${API_URL}${ep.url}`, { mode: 'cors', headers })
            .then(res => {
              if (res.status === 401) {
                return [];
              }
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

        if (mounted) {
          setData(prev => {
            const newData = { ...prev };
            results.forEach(res => {
              if (res.data !== null) {
                (newData as any)[res.key] = res.data;
              }
            });
            return newData;
          });
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'An error occurred fetching data');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAllData();

    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  return { data, isLoading, error, refresh, updateData, refreshItem };
}
