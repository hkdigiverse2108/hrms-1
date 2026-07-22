'use client'

import { useUser } from './useUser'

export function usePermissions(moduleName?: string) {
  const { user, isLoading: userLoading } = useUser()

  // Read permissions directly from the user object (already fetched & kept fresh by UserContext)
  const permissions = user?.permissions || null
  const loading = userLoading

  const isRoleAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super admin' || user?.role?.toLowerCase() === 'sub-admin' || user?.role?.toLowerCase() === 'hr' || user?.designation?.toLowerCase() === 'hr' || user?.department?.toLowerCase() === 'hr' || user?.name === 'Admin Admin'

  const checkPermission = (module: string, action: 'canAdd' | 'canEdit' | 'canDelete' | 'canView') => {
    // Admin override
    if (isRoleAdmin) return true
    
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
    isAdmin: isRoleAdmin
  }
}
