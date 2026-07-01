'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '@/lib/config'
import { useUser } from './useUser'

// Module-level global cache for permissions to prevent duplicate concurrent queries and flashing Access Denied states
let cachedUserId: string | null = null;
let cachedPermissions: any[] | null = null;
let globalLoading = false;
let activeFetchPromise: Promise<any[] | null> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach(l => l());
}

export function usePermissions(moduleName?: string) {
  const { user, isLoading: userLoading } = useUser()
  const [permissions, setPermissions] = useState<any[] | null>(cachedPermissions)
  const [loading, setLoading] = useState(cachedPermissions === null ? true : globalLoading)

  const fetchPermissions = useCallback(async (userId: string) => {
    if (activeFetchPromise) return activeFetchPromise;

    globalLoading = true;
    emitChange();

    activeFetchPromise = (async () => {
      try {
        const token = localStorage.getItem('token')
        const headers: HeadersInit = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const response = await fetch(`${API_URL}/user-permissions/${userId}`, { headers })
        if (response.ok) {
          const data = await response.json()
          cachedPermissions = data?.permissions || []
          cachedUserId = userId
          return cachedPermissions;
        }
        return null;
      } catch (error) {
        console.error('Error fetching user permissions:', error)
        return null;
      } finally {
        globalLoading = false;
        activeFetchPromise = null;
        emitChange();
      }
    })();

    return activeFetchPromise;
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setPermissions(cachedPermissions)
      setLoading(globalLoading)
    }

    listeners.add(handleChange)

    if (!userLoading && user?.id) {
      if (cachedUserId !== user.id) {
        cachedPermissions = null;
        cachedUserId = user.id;
      }
      
      if (cachedPermissions === null && !globalLoading) {
        fetchPermissions(user.id)
      } else {
        // Sync local state if already loaded/loading
        setPermissions(cachedPermissions)
        setLoading(globalLoading)
      }
    } else if (!userLoading && !user) {
      cachedPermissions = null;
      cachedUserId = null;
      setLoading(false)
    }

    return () => {
      listeners.delete(handleChange)
    }
  }, [user?.id, userLoading, fetchPermissions])

  const checkPermission = (module: string, action: 'canAdd' | 'canEdit' | 'canDelete' | 'canView') => {
    // Admin override
    if (user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin') return true
    
    if (!permissions) return false
    
    const modulePerm = permissions.find((p: any) => p.moduleName === module)
    return modulePerm ? modulePerm[action] : false
  }

  const currentModulePermission = moduleName ? {
    canAdd: checkPermission(moduleName, 'canAdd'),
    canEdit: checkPermission(moduleName, 'canEdit'),
    canDelete: checkPermission(moduleName, 'canDelete'),
    canView: checkPermission(moduleName, 'canView'),
  } : null

  return {
    permissions,
    loading,
    checkPermission,
    ...currentModulePermission,
    isAdmin: user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin'
  }
}
