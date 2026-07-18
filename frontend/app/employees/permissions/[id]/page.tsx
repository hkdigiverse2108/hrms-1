'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, ShieldAlert, ArrowLeft, Search, User, ChevronRight, LayoutDashboard, Users, Clock, Calendar, Briefcase, IndianRupee, MonitorPlay, MessagesSquare, Star, FileText, Settings, ShieldHalf } from 'lucide-react'
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
    icon: IndianRupee,
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
      { moduleName: 'schedule', displayName: 'Schedule', tabUrl: '/schedule' },
    ]
  },
  {
    name: 'Work Management',
    icon: Briefcase,
    modules: [
      { moduleName: 'projects', displayName: 'Projects', tabUrl: '/work-management/projects' },
      { moduleName: 'tasks', displayName: 'Development', tabUrl: '/work-management/development' },
      { moduleName: 'personal-tasks', displayName: 'Tasks', tabUrl: '/tasks' },
      { moduleName: 'daily-progress', displayName: 'Daily Progress', tabUrl: '/work-management/daily-progress' },
      { moduleName: 'work-logs', displayName: 'Work Logs', tabUrl: '/work-management/work-logs' },
      { moduleName: 'sales', displayName: 'Sales', tabUrl: '/work-management/sales' },
      { moduleName: 'clients', displayName: 'Clients', tabUrl: '/work-management/clients' },
      { moduleName: 'marketing', displayName: 'Digital Marketing', tabUrl: '/work-management/digital-marketing' },
      { moduleName: 'creative', displayName: 'Social Media Management', tabUrl: '/work-management/smm' },
      { moduleName: 'research', displayName: 'Research', tabUrl: '/work-management/research' },
    ]
  },
  {
    name: 'Workspace',
    icon: MonitorPlay,
    modules: [
      { moduleName: 'seating-arrangement', displayName: 'Seating Arrangement', tabUrl: '/workspace/seating' },
      { moduleName: 'resource-management', displayName: 'Resource Management', tabUrl: '/workspace/resource' },
      { moduleName: 'gallery', displayName: 'Gallery', tabUrl: '/workspace/gallery' },
    ]
  },
  {
    name: 'More',
    icon: MessagesSquare,
    modules: [
      { moduleName: 'remarks', displayName: 'Penalty', tabUrl: '/penalty' },
      { moduleName: 'review', displayName: 'Remarks', tabUrl: '/remarks' },
      { moduleName: 'invoice', displayName: 'Invoice', tabUrl: '/invoice' },
      { moduleName: 'chat', displayName: 'Chat', tabUrl: '/chat' },
      { moduleName: 'activity-tracker', displayName: 'Activity Tracker', tabUrl: '/activity-tracker' },
      { moduleName: 'activity-logs', displayName: 'Activity Logs', tabUrl: '/activity-logs' },
      { moduleName: 'training', displayName: 'Course Library', tabUrl: '/training' },
      { moduleName: 'course-progress', displayName: 'Progress & Access', tabUrl: '/training/progress' },
      { moduleName: 'admin-courses', displayName: 'Manage Courses', tabUrl: '/admin/courses' },
    ]
  },
  {
    name: 'System',
    icon: Settings,
    modules: [
      { moduleName: 'access-control', displayName: 'Access Control', tabUrl: '/employees/permissions' },
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
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleSearch, setModuleSearch] = useState('')

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

      // Fetch Presets
      const presetsRes = await fetch(`${API_URL}/permission-presets`)
      if (presetsRes.ok) {
        setPresets(await presetsRes.json())
      }

      // Fetch Current Employee Details
      const empRes = await fetch(`${API_URL}/employees/${employeeId}`)
      if (empRes.ok) {
        const empData = await empRes.json()
        if (empData.role?.toLowerCase() === 'admin') {
          toast.info("Admin users already have all permissions.")
          router.push('/employees')
          return
        }
        setEmployee(empData)
      }

      // Fetch Permissions
      const response = await fetch(`${API_URL}/user-permissions/${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.permissions) {
          const merged = DEFAULT_MODULES.map(def => {
            const existing = data.permissions.find((p: any) => p.moduleName === def.moduleName)
            return existing ? { ...existing, displayName: def.displayName, tabUrl: def.tabUrl } : { ...def, canAdd: false, canEdit: false, canDelete: false, canView: false }
          })
          setPermissions(merged)
          setActivePresetId(data.presetId || null)
        } else {
          setPermissions(DEFAULT_MODULES.map(m => ({ ...m, canAdd: false, canEdit: false, canDelete: false, canView: false })))
          setActivePresetId(null)
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
    setActivePresetId(null)
    setPermissions(prev => prev.map(p => {
      if (p.moduleName === moduleName) {
        const newVal = !p[field]
        return { ...p, [field]: newVal }
      }
      return p
    }))
  }

  const handleToggleAll = (moduleName: string, checked: boolean) => {
    setActivePresetId(null)
    setPermissions(prev => prev.map(p => {
      if (p.moduleName === moduleName) {
        return { ...p, canAdd: checked, canEdit: checked, canDelete: checked, canView: checked }
      }
      return p
    }))
  }

  const handleToggleGroup = (groupName: string, field: keyof ModulePermission | 'fullAccess', checked: boolean) => {
    setActivePresetId(null)
    const group = PERMISSION_GROUPS.find(g => g.name === groupName)
    if (!group) return
    const moduleNames = group.modules.map(m => m.moduleName)
    
    setPermissions(prev => prev.map(p => {
      if (moduleNames.includes(p.moduleName)) {
        if (field === 'fullAccess') {
          return { ...p, canAdd: checked, canEdit: checked, canDelete: checked, canView: checked }
        }
        return { ...p, [field]: checked }
      }
      return p
    }))
  }

  const applyPreset = (presetId: string | 'none' | 'full') => {
    let newPerms = DEFAULT_MODULES.map(m => ({ ...m, canAdd: false, canEdit: false, canDelete: false, canView: false }));
    
    if (presetId === 'full') {
      newPerms = newPerms.map(p => ({ ...p, canView: true, canAdd: true, canEdit: true, canDelete: true }));
      toast.success(`Full Access preset applied! (Don't forget to save)`);
      setActivePresetId(null);
    } else if (presetId === 'none') {
      toast.success(`Cleared all permissions! (Don't forget to save)`);
      setActivePresetId(null);
    } else {
      const preset = presets.find(p => p.id === presetId);
      if (preset && preset.permissions) {
        newPerms = newPerms.map(p => {
          const presetPerm = preset.permissions.find((pp: any) => pp.moduleName === p.moduleName);
          if (presetPerm) {
            return { ...p, canView: presetPerm.canView, canAdd: presetPerm.canAdd, canEdit: presetPerm.canEdit, canDelete: presetPerm.canDelete };
          }
          return p;
        });
        toast.success(`${preset.name} preset applied! (Don't forget to save)`);
        setActivePresetId(presetId);
      }
    }
    
    setPermissions(newPerms);
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
        body: JSON.stringify({ permissions, presetId: activePresetId }),
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
    (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    emp.role?.toLowerCase() !== 'admin' &&
    emp.status?.toLowerCase() !== 'inactive'
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

          <div className="flex-1 p-8 flex flex-col overflow-hidden">
            <div className="mb-4 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mr-2 shrink-0">Quick Presets:</span>
               {presets.map(preset => (
                 <Button 
                   key={preset.id} 
                   variant={activePresetId === preset.id ? "default" : "outline"} 
                   size="sm" 
                   className={`h-8 text-xs shrink-0 ${
                     activePresetId === preset.id 
                       ? 'bg-brand-teal hover:bg-brand-teal/90 text-white font-bold border-brand-teal' 
                       : ''
                   }`} 
                   onClick={() => applyPreset(preset.id)}
                 >
                   {preset.name}
                 </Button>
               ))}
               <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 bg-brand-orange/10 text-brand-orange border-brand-orange/20 hover:bg-brand-orange/20" onClick={() => applyPreset('full')}>Full Access</Button>
               <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => applyPreset('none')}>Clear All</Button>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search modules (e.g. Attendance, Payroll)..." 
                  className="pl-9 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-brand-teal"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-teal" /> Group Category
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-orange" /> Full Access
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-left font-black text-slate-700 uppercase tracking-tighter text-[11px]">Module</th>
                    <th className="px-6 py-4 text-left font-black text-slate-700 uppercase tracking-tighter text-[11px]">Link</th>
                    <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px]">Add</th>
                    <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px]">Edit</th>
                    <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px]">Delete</th>
                    <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px]">View</th>
                    <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px] bg-slate-100/50">Full</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_GROUPS.map((group) => {
                    const filteredModules = group.modules.filter(m => 
                      m.displayName.toLowerCase().includes(moduleSearch.toLowerCase()) ||
                      m.moduleName.toLowerCase().includes(moduleSearch.toLowerCase())
                    )
                    
                    if (filteredModules.length === 0) return null

                    return (
                      <React.Fragment key={group.name}>
                        <tr className="bg-slate-50/50 border-y border-slate-100">
                          <td colSpan={2} className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center">
                                <group.icon className="w-4 h-4 text-brand-teal" />
                              </div>
                              <span className="font-black text-slate-800 uppercase tracking-wider text-[11px]">{group.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <Checkbox 
                              onCheckedChange={(checked) => handleToggleGroup(group.name, 'canAdd', !!checked)}
                              className="w-4 h-4 border-slate-300"
                              title={`Toggle all Add in ${group.name}`}
                            />
                          </td>
                          <td className="px-6 py-3 text-center">
                            <Checkbox 
                              onCheckedChange={(checked) => handleToggleGroup(group.name, 'canEdit', !!checked)}
                              className="w-4 h-4 border-slate-300"
                              title={`Toggle all Edit in ${group.name}`}
                            />
                          </td>
                          <td className="px-6 py-3 text-center">
                            <Checkbox 
                              onCheckedChange={(checked) => handleToggleGroup(group.name, 'canDelete', !!checked)}
                              className="w-4 h-4 border-slate-300"
                              title={`Toggle all Delete in ${group.name}`}
                            />
                          </td>
                          <td className="px-6 py-3 text-center">
                            <Checkbox 
                              onCheckedChange={(checked) => handleToggleGroup(group.name, 'canView', !!checked)}
                              className="w-4 h-4 border-slate-300"
                              title={`Toggle all View in ${group.name}`}
                            />
                          </td>
                          <td className="px-6 py-3 text-center bg-slate-100/20">
                            <Checkbox 
                              onCheckedChange={(checked) => handleToggleGroup(group.name, 'fullAccess', !!checked)}
                              className="w-4 h-4 border-brand-orange data-[state=checked]:bg-brand-orange"
                              title={`Toggle Full Access for ${group.name}`}
                            />
                          </td>
                        </tr>
                        {filteredModules.map((m) => {
                          const p = permissions.find(per => per.moduleName === m.moduleName) || { ...m, canAdd: false, canEdit: false, canDelete: false, canView: false }
                          return (
                            <tr key={m.moduleName} className="hover:bg-slate-50/30 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900 group-hover:text-brand-teal transition-colors">{m.displayName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded inline-block">{m.tabUrl}</div>
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
                              <td className="px-6 py-4 text-center bg-slate-50/50">
                                <Checkbox 
                                  checked={p.canAdd && p.canEdit && p.canDelete && p.canView} 
                                  onCheckedChange={(checked) => handleToggleAll(p.moduleName, !!checked)}
                                  className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
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
