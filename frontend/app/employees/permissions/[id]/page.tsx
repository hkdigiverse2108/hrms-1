'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, ShieldAlert, ArrowLeft, Search, User, ChevronRight, LayoutDashboard, Users, Clock, Calendar, Briefcase, DollarSign, MonitorPlay, MessagesSquare, Star, FileText, Settings, ShieldHalf } from 'lucide-react'
import { Input } from '@/components/ui/input'
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

const PERMISSION_GROUPS = [
  {
    name: 'Employees',
    icon: Users,
    modules: [
      { moduleName: 'employee-list', displayName: 'Employee List', tabUrl: '/employees' },
      { moduleName: 'org-structure', displayName: 'Org Structure', tabUrl: '/employees/organization/departments' },
      { moduleName: 'employee-attendance', displayName: 'Employee Attendance List', tabUrl: '/employees/attendance' },
      { moduleName: 'leave-requests', displayName: 'Leave Requests', tabUrl: '/employees/leave' },
      { moduleName: 'employee-documents', displayName: 'Employee Documents', tabUrl: '/employees/documents' },
      { moduleName: 'document-generator', displayName: 'Document Generator', tabUrl: '/employees/documents/generate' },
    ]
  },
  {
    name: 'Payroll',
    icon: DollarSign,
    modules: [
      { moduleName: 'salary-structure', displayName: 'Salary Structure', tabUrl: '/payroll/salary-structure' },
      { moduleName: 'payroll-processing', displayName: 'Payroll Processing', tabUrl: '/payroll' },
      { moduleName: 'payslips', displayName: 'Payslips', tabUrl: '/payroll/payslips' },
      { moduleName: 'bonuses-deductions', displayName: 'Bonuses & Deductions', tabUrl: '/payroll/bonuses' },
    ]
  },
  {
    name: 'Recruitment',
    icon: Briefcase,
    modules: [
      { moduleName: 'interviews', displayName: 'Interviews', tabUrl: '/recruitment/hiring-board' },
      { moduleName: 'hirings', displayName: 'Hirings', tabUrl: '/recruitment' },
    ]
  },
  {
    name: 'Attendance & Leave',
    icon: Clock,
    modules: [
      { moduleName: 'attendance', displayName: 'Attendance', tabUrl: '/attendance' },
      { moduleName: 'leave', displayName: 'Leave', tabUrl: '/leave' },
    ]
  },
  {
    name: 'Work Management',
    icon: Briefcase,
    modules: [
      { moduleName: 'projects', displayName: 'Projects', tabUrl: '/work-management/projects' },
      { moduleName: 'tasks', displayName: 'Tasks', tabUrl: '/work-management/tasks' },
      { moduleName: 'daily-progress', displayName: 'Daily Progress', tabUrl: '/work-management/daily-progress' },
      { moduleName: 'sales', displayName: 'Sales', tabUrl: '/work-management/sales' },
      { moduleName: 'clients', displayName: 'Clients', tabUrl: '/work-management/clients' },
      { moduleName: 'marketing', displayName: 'Marketing Reports', tabUrl: '/work-management/marketing-reports' },
    ]
  },
  {
    name: 'Workspace',
    icon: MonitorPlay,
    modules: [
      { moduleName: 'blank-canvas', displayName: 'Blank Canvas', tabUrl: '/workspace/blank-canvas' },
      { moduleName: 'seating-arrangement', displayName: 'Seating Arrangement', tabUrl: '/workspace/seating' },
      { moduleName: 'resource-management', displayName: 'Resource Management', tabUrl: '/workspace/resource' },
    ]
  },
  {
    name: 'More',
    icon: MessagesSquare,
    modules: [
      { moduleName: 'remarks', displayName: 'Remarks', tabUrl: '/remarks' },
      { moduleName: 'review', displayName: 'Review', tabUrl: '/review' },
      { moduleName: 'invoice', displayName: 'Invoice', tabUrl: '/invoice' },
      { moduleName: 'chat', displayName: 'Chat', tabUrl: '/chat' },
    ]
  },
  {
    name: 'System',
    icon: Settings,
    modules: [
      { moduleName: 'access-control', displayName: 'Access Control', tabUrl: '/settings' },
      { moduleName: 'settings', displayName: 'Settings', tabUrl: '/settings' },
    ]
  },
]

const DEFAULT_MODULES = PERMISSION_GROUPS.flatMap(g => g.modules)

export default function UserPermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const employeeId = resolvedParams.id
  const router = useRouter()
  
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  const [employee, setEmployee] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (employeeId) {
      fetchData()
    }
  }, [employeeId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch All Employees for the sidebar
      const listRes = await fetch(`${API_URL}/employees`)
      if (listRes.ok) {
        setEmployees(await listRes.json())
      }

      // Fetch Current Employee Details
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

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full -mt-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 min-h-[calc(100vh-100px)]">
        {/* Left Side: Employee List */}
        <div className="xl:col-span-1 border-r border-slate-200 bg-white flex flex-col h-full">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-teal" />
              Users
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search employees..." 
                className="pl-9 h-11 bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-brand-teal/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => router.push(`/employees/permissions/${emp.id}`)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  emp.id === employeeId 
                    ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  emp.id === employeeId ? 'bg-white/20' : 'bg-slate-100'
                }`}>
                  <User className={`w-5 h-5 ${emp.id === employeeId ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm truncate">{emp.name}</div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider ${
                    emp.id === employeeId ? 'text-white/60' : 'text-slate-400'
                  }`}>{emp.designation}</div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${emp.id === employeeId ? 'text-white/60' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Permissions Form */}
        <div className="xl:col-span-3 bg-slate-50/50 flex flex-col h-full overflow-hidden">
          <div className="p-8 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Access Control: {employee?.name}
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                {employee?.designation} • {employee?.department} • ID: {employee?.employeeId}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/employees')}>
                Cancel
              </Button>
              <Button 
                className="bg-brand-orange hover:bg-brand-orange/90 text-white px-8 font-bold shadow-lg shadow-brand-orange/20" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-bold text-slate-700">Sr. No.</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700">Module Name</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700">Add</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700">Edit</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700">Delete</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700">View</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700 bg-slate-100/50">Full Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEFAULT_MODULES.map((m, mIdx) => {
                    const p = permissions.find(per => per.moduleName === m.moduleName) || { ...m, canAdd: false, canEdit: false, canDelete: false, canView: false }
                    return (
                      <tr key={m.moduleName} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 font-medium">{(mIdx + 1).toString().padStart(2, '0')}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{p.displayName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.tabUrl}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Checkbox 
                            checked={p.canAdd} 
                            onCheckedChange={() => handleToggle(p.moduleName, 'canAdd')}
                            className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Checkbox 
                            checked={p.canEdit} 
                            onCheckedChange={() => handleToggle(p.moduleName, 'canEdit')}
                            className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Checkbox 
                            checked={p.canDelete} 
                            onCheckedChange={() => handleToggle(p.moduleName, 'canDelete')}
                            className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Checkbox 
                            checked={p.canView} 
                            onCheckedChange={() => handleToggle(p.moduleName, 'canView')}
                            className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                          />
                        </td>
                        <td className="px-6 py-4 text-center bg-slate-50/30">
                          <Checkbox 
                            checked={p.canAdd && p.canEdit && p.canDelete && p.canView} 
                            onCheckedChange={(checked) => handleToggleAll(p.moduleName, !!checked)}
                            className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
