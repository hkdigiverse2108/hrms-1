'use client'

import { useState, useEffect } from 'react'
import { API_URL } from '@/lib/config'
import { useUser } from './useUser'

export function usePermissions(moduleName?: string) {
  const { user, isLoading: userLoading } = useUser()
  const [permissions, setPermissions] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) {
      setLoading(true)
      return
    }

    if (user?.id) {
      fetchPermissions()
    } else {
      setLoading(false)
    }
  }, [user?.id, userLoading])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/user-permissions/${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setPermissions(data?.permissions || [])
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkPermission = (module: string, action: 'canAdd' | 'canEdit' | 'canDelete' | 'canView') => {
    if (!permissions) return false
    // Admin override
    if (user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin') return true
    
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
