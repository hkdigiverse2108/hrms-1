'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, ShieldAlert } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'

interface ModulePermission {
  moduleName: string
  displayName: string
  tabUrl: string
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
  canView: boolean
}

interface UserPermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  employeeId: string
  employeeName: string
}

const DEFAULT_MODULES = [
  { moduleName: 'dashboard', displayName: 'Dashboard', tabUrl: '/' },
  { moduleName: 'employees', displayName: 'Employee List', tabUrl: '/employees' },
  { moduleName: 'payroll', displayName: 'Payroll', tabUrl: '/payroll' },
  { moduleName: 'attendance', displayName: 'Attendance', tabUrl: '/attendance' },
  { moduleName: 'leave', displayName: 'Leave', tabUrl: '/leave' },
  { moduleName: 'projects', displayName: 'Projects', tabUrl: '/work-management/projects' },
  { moduleName: 'tasks', displayName: 'Development', tabUrl: '/work-management/development' },
  { moduleName: 'personal-tasks', displayName: 'Tasks', tabUrl: '/tasks' },
  { moduleName: 'daily-progress', displayName: 'Daily Progress', tabUrl: '/work-management/daily-progress' },
  { moduleName: 'work-logs', displayName: 'Work Logs', tabUrl: '/work-management/work-logs' },
  { moduleName: 'marketing', displayName: 'Digital Marketing', tabUrl: '/work-management/digital-marketing' },
  { moduleName: 'creative', displayName: 'Social Media Management', tabUrl: '/work-management/smm' },
  { moduleName: 'remarks', displayName: 'Penalty', tabUrl: '/penalty' },
  { moduleName: 'review', displayName: 'Remarks', tabUrl: '/remarks' },
  { moduleName: 'invoice', displayName: 'Invoice', tabUrl: '/invoice' },
  { moduleName: 'chat', displayName: 'Chat', tabUrl: '/chat' },
  { moduleName: 'settings', displayName: 'Settings', tabUrl: '/settings' },
  { moduleName: 'activity-logs', displayName: 'Activity Logs', tabUrl: '/activity-logs' },
  { moduleName: 'gallery', displayName: 'Gallery', tabUrl: '/workspace/gallery' },
  { moduleName: 'training', displayName: 'Course Library', tabUrl: '/training' },
  { moduleName: 'admin-courses', displayName: 'Manage Courses', tabUrl: '/admin/courses' },
]

export function UserPermissionsModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: UserPermissionsModalProps) {
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchPermissions()
    }
  }, [isOpen, employeeId])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/user-permissions/${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.permissions) {
          // Merge existing permissions with default modules to handle new modules
          const merged = DEFAULT_MODULES.map(def => {
            const existing = data.permissions.find((p: any) => p.moduleName === def.moduleName)
            return existing ? { ...existing, displayName: def.displayName, tabUrl: def.tabUrl } : { ...def, canAdd: false, canEdit: false, canDelete: false, canView: false }
          })
          setPermissions(merged)
        } else {
          setPermissions(DEFAULT_MODULES.map(m => ({ ...m, canAdd: false, canEdit: false, canDelete: false, canView: false })))
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (moduleName: string, field: keyof ModulePermission) => {
    setPermissions(prev => prev.map(p => {
      if (p.moduleName === moduleName) {
        const newVal = !p[field]
        return { ...p, [field]: newVal }
      }
      return p
    }))
  }

  const handleToggleAll = (moduleName: string, checked: boolean) => {
    setPermissions(prev => prev.map(p => {
      if (p.moduleName === moduleName) {
        return { ...p, canAdd: checked, canEdit: checked, canDelete: checked, canView: checked }
      }
      return p
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch(`${API_URL}/user-permissions/${employeeId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ permissions }),
      })
      if (response.ok) {
        toast.success('Permissions updated successfully')
        onClose()
      } else {
        toast.error('Failed to update permissions')
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
      toast.error('Error saving permissions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-teal" />
            Manage Permissions: {employeeName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-1 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Sr. No.</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Display Name</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-700">Tab Url</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-700">Add</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-700">Edit</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-700">Delete</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-700">View</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-700">All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.map((p, idx) => (
                  <tr key={p.moduleName} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{(idx + 1).toString().padStart(2, '0')}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.displayName}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{p.tabUrl}</td>
                    <td className="px-4 py-3 text-center">
                      <Checkbox 
                        checked={p.canAdd} 
                        onCheckedChange={() => handleToggle(p.moduleName, 'canAdd')}
                        className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Checkbox 
                        checked={p.canEdit} 
                        onCheckedChange={() => handleToggle(p.moduleName, 'canEdit')}
                        className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Checkbox 
                        checked={p.canDelete} 
                        onCheckedChange={() => handleToggle(p.moduleName, 'canDelete')}
                        className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Checkbox 
                        checked={p.canView} 
                        onCheckedChange={() => handleToggle(p.moduleName, 'canView')}
                        className="data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Checkbox 
                        checked={p.canAdd && p.canEdit && p.canDelete && p.canView} 
                        onCheckedChange={(checked) => handleToggleAll(p.moduleName, !!checked)}
                        className="data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="border-t border-slate-100 pt-4 gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            className="bg-brand-orange hover:bg-brand-orange/90 text-white min-w-[120px]" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
