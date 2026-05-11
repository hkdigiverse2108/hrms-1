'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, ShieldAlert, ArrowLeft } from 'lucide-react'
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

const DEFAULT_MODULES = [
  { moduleName: 'dashboard', displayName: 'Dashboard', tabUrl: '/' },
  { moduleName: 'employee-list', displayName: 'Employee List', tabUrl: '/employees' },
  { moduleName: 'departments', displayName: 'Departments', tabUrl: '/employees/departments' },
  { moduleName: 'designations', displayName: 'Designations', tabUrl: '/employees/designations' },
  { moduleName: 'employee-attendance', displayName: 'Employee Attendance', tabUrl: '/employees/attendance' },
  { moduleName: 'add-employee', displayName: 'Add Employee', tabUrl: '/employees/add' },
  { moduleName: 'leave-requests', displayName: 'Leave Requests', tabUrl: '/employees/leave' },
  { moduleName: 'employee-documents', displayName: 'Employee Documents', tabUrl: '/employees/documents' },
  { moduleName: 'salary-structure', displayName: 'Salary Structure', tabUrl: '/payroll/salary-structure' },
  { moduleName: 'payroll-processing', displayName: 'Payroll Processing', tabUrl: '/payroll' },
  { moduleName: 'payslips', displayName: 'Payslips', tabUrl: '/payroll/payslips' },
  { moduleName: 'bonuses-deductions', displayName: 'Bonuses & Deductions', tabUrl: '/payroll/bonuses' },
  { moduleName: 'attendance', displayName: 'Attendance', tabUrl: '/attendance' },
  { moduleName: 'leave', displayName: 'Leave', tabUrl: '/leave' },
  { moduleName: 'sales', displayName: 'Sales', tabUrl: '/work-management/sales' },
  { moduleName: 'clients', displayName: 'Clients', tabUrl: '/work-management/clients' },
  { moduleName: 'marketing', displayName: 'Marketing Reports', tabUrl: '/work-management/marketing-reports' },
  { moduleName: 'projects', displayName: 'Projects', tabUrl: '/work-management/projects' },
  { moduleName: 'tasks', displayName: 'Tasks', tabUrl: '/work-management/tasks' },
  { moduleName: 'daily-progress', displayName: 'Daily Progress', tabUrl: '/work-management/daily-progress' },
  { moduleName: 'remarks', displayName: 'Remarks', tabUrl: '/remarks' },
  { moduleName: 'review', displayName: 'Review', tabUrl: '/review' },
  { moduleName: 'invoice', displayName: 'Invoice', tabUrl: '/invoice' },
  { moduleName: 'chat', displayName: 'Chat', tabUrl: '/chat' },
  { moduleName: 'interviews', displayName: 'Interviews', tabUrl: '/recruitment/hiring-board' },
  { moduleName: 'hirings', displayName: 'Hirings', tabUrl: '/recruitment' },
  { moduleName: 'applications', displayName: 'Applications', tabUrl: '/recruitment/applications' },
  { moduleName: 'workspace', displayName: 'Workspace', tabUrl: '/workspace' },
  { moduleName: 'resource-management', displayName: 'Resource Management', tabUrl: '/workspace/resource' },
  { moduleName: 'access-control', displayName: 'Access Control', tabUrl: '/settings' },
  { moduleName: 'settings', displayName: 'Settings', tabUrl: '/settings' },
]

export default function UserPermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const employeeId = resolvedParams.id
  const router = useRouter()
  
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (employeeId) {
      fetchData()
    }
  }, [employeeId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Employee Details
      const empRes = await fetch(`${API_URL}/employees/${employeeId}`)
      if (empRes.ok) {
        setEmployee(await empRes.json())
      }

      // Fetch Permissions
      const response = await fetch(`${API_URL}/user-permissions/${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.permissions) {
          const merged = DEFAULT_MODULES.map(def => {
            const existing = data.permissions.find((p: any) => p.moduleName === def.moduleName)
            return existing || { ...def, canAdd: false, canEdit: false, canDelete: false, canView: false }
          })
          setPermissions(merged)
        } else {
          setPermissions(DEFAULT_MODULES.map(m => ({ ...m, canAdd: false, canEdit: false, canDelete: false, canView: false })))
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
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
      const response = await fetch(`${API_URL}/user-permissions/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })
      if (response.ok) {
        toast.success('Permissions updated successfully')
        router.push('/employees')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <PageHeader 
          title={`User Permissions: ${employee?.name || 'Loading...'}`} 
          description={`Manage module-level access and operations for ${employee?.designation} in ${employee?.department}.`}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left font-bold text-slate-700">Sr. No.</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">Module Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">Path</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">Add</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">Edit</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">Delete</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700">View</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700 bg-slate-100/50">Full Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((p, idx) => (
                <tr key={p.moduleName} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-medium">{(idx + 1).toString().padStart(2, '0')}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{p.displayName}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{p.tabUrl}</td>
                  <td className="px-6 py-4 text-center">
                    <Checkbox 
                      checked={p.canAdd} 
                      onCheckedChange={() => handleToggle(p.moduleName, 'canAdd')}
                      className="w-5 h-5 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Checkbox 
                      checked={p.canEdit} 
                      onCheckedChange={() => handleToggle(p.moduleName, 'canEdit')}
                      className="w-5 h-5 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Checkbox 
                      checked={p.canDelete} 
                      onCheckedChange={() => handleToggle(p.moduleName, 'canDelete')}
                      className="w-5 h-5 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Checkbox 
                      checked={p.canView} 
                      onCheckedChange={() => handleToggle(p.moduleName, 'canView')}
                      className="w-5 h-5 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                    />
                  </td>
                  <td className="px-6 py-4 text-center bg-slate-50/30">
                    <Checkbox 
                      checked={p.canAdd && p.canEdit && p.canDelete && p.canView} 
                      onCheckedChange={(checked) => handleToggleAll(p.moduleName, !!checked)}
                      className="w-5 h-5 data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-end items-center gap-4">
          <Button variant="outline" size="lg" onClick={() => router.push('/employees')} className="px-8">
            Cancel
          </Button>
          <Button 
            size="lg"
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-12 font-bold shadow-lg shadow-brand-orange/20" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Save Permissions
          </Button>
        </div>
      </div>
    </div>
  )
}
