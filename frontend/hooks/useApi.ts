import { useState, useEffect } from 'react';
import * as staticData from '@/lib/data';

const API_URL = 'http://localhost:8000';

export function useApi() {
  const [data, setData] = useState({
    ...staticData,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAllData() {
      try {
        const endpoints = [
          { key: 'employees', url: '/employees' },
          { key: 'attendanceRecords', url: '/attendance' },
          { key: 'leaveRequests', url: '/leave-requests' },
          { key: 'announcements', url: '/announcements' },
          { key: 'dashboardStats', url: '/dashboard-stats' },
          { key: 'payrollRecords', url: '/payroll' },
          { key: 'departments', url: '/departments' },
          { key: 'designations', url: '/designations' },
          { key: 'companies', url: '/companies' },
          { key: 'roles', url: '/roles' },
          { key: 'relations', url: '/relations' },
          { key: 'positions', url: '/positions' },
          { key: 'jobOpenings', url: '/job-openings' },
          { key: 'applications', url: '/applications' },
          { key: 'interns', url: '/interns' },
          { key: 'assets', url: '/assets' },
          { key: 'expenseClaims', url: '/expense-claims' },
          { key: 'holidays', url: '/holidays' },
          { key: 'kpiRecords', url: '/kpi-records' }
        ];

        const requests = endpoints.map(ep => 
          fetch(`${API_URL}${ep.url}`, { mode: 'cors' })
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch ${ep.key}`);
              return res.json();
            })
            .then(data => ({ key: ep.key, data }))
            .catch(err => {
              console.error(err);
              return { key: ep.key, data: null };
            })
        );

        const results = await Promise.all(requests);

        if (mounted) {
          setData(prev => {
            const newData = { ...prev };
            results.forEach(res => {
              if (res.data) {
                // Ignore empty arrays from API if you want to keep static data (optional)
                // But generally we should overwrite with API data
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
  }, []);

  return { data, isLoading, error };
}
