'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, Plus, ArrowLeft, Search, ShieldCheck, ChevronRight, Users, Clock, Briefcase, IndianRupee, MonitorPlay, MessagesSquare, Settings, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ModuleBulkAssignment } from "@/components/hrms/ModuleBulkAssignment"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useConfirm } from "@/context/ConfirmContext"

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
      { moduleName: 'activity-logs', displayName: 'Activity Logs', tabUrl: '/activity-logs' },
      { moduleName: 'gallery', displayName: 'Gallery', tabUrl: '/workspace/gallery' },
      { moduleName: 'training', displayName: 'Course Library', tabUrl: '/training' },
      { moduleName: 'admin-courses', displayName: 'Manage Courses', tabUrl: '/admin/courses' },
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

export default function PermissionPresetsPage() {
  const { confirm } = useConfirm();
  const router = useRouter()
  
  const [presets, setPresets] = useState<any[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<ModulePermission[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleSearch, setModuleSearch] = useState('')

  const [isAddOpen, setIsAddOpen] = useState(false)
  
  // Form state for creating a preset
  const [newPresetType, setNewPresetType] = useState('role')
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDesc, setNewPresetDesc] = useState('')
  const [newPresetModule, setNewPresetModule] = useState('')

  useEffect(() => {
    fetchPresets()
  }, [])

  useEffect(() => {
    if (selectedPresetId) {
      const selected = presets.find(p => p.id === selectedPresetId)
      if (selected && selected.permissions) {
        const merged = DEFAULT_MODULES.map(def => {
          const existing = selected.permissions.find((p: any) => p.moduleName === def.moduleName)
          return existing || { ...def, canAdd: false, canEdit: false, canDelete: false, canView: false }
        })
        setPermissions(merged)
      } else {
        setPermissions(DEFAULT_MODULES.map(m => ({ ...m, canAdd: false, canEdit: false, canDelete: false, canView: false })))
      }
    } else {
      setPermissions(DEFAULT_MODULES.map(m => ({ ...m, canAdd: false, canEdit: false, canDelete: false, canView: false })))
    }
  }, [selectedPresetId, presets])

  const fetchPresets = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/permission-presets`)
      if (res.ok) {
        const data = await res.json()
        setPresets(data)
        if (data.length > 0 && !selectedPresetId) {
          setSelectedPresetId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching presets:', error)
      toast.error('Failed to load presets')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (moduleName: string, field: keyof ModulePermission) => {
    setPermissions(prev => prev.map(p => {
      if (p.moduleName === moduleName) {
        return { ...p, [field]: !p[field] }
      }
      return p
    }))
  }

  const handleToggleGroup = (groupName: string, field: keyof ModulePermission | 'fullAccess', checked: boolean) => {
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

  const handleToggleAll = (moduleName: string, checked: boolean) => {
    setPermissions(prev => prev.map(p => {
      if (p.moduleName === moduleName) {
        return { ...p, canAdd: checked, canEdit: checked, canDelete: checked, canView: checked }
      }
      return p
    }))
  }

  const handleSave = async () => {
    if (!selectedPresetId) return
    setSaving(true)
    try {
      const selected = presets.find(p => p.id === selectedPresetId)
      // Only Role presets actually save permissions inside the preset doc
      if (selected.presetType === 'module') {
        toast.error("Module presets are saved instantly using the Save button in the bulk tab.")
        setSaving(false)
        return
      }

      const response = await fetch(`${API_URL}/permission-presets/${selectedPresetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: selected.name,
          description: selected.description,
          presetType: selected.presetType || "role",
          targetModule: selected.targetModule || null,
          permissions 
        }),
      })
      if (response.ok) {
        toast.success('Preset updated successfully')
        fetchPresets()
      } else {
        toast.error('Failed to update preset')
      }
    } catch (error) {
      toast.error('Error saving preset')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPreset = async () => {
    const isModule = newPresetType === 'module'
    if (!isModule && !newPresetName.trim()) {
      toast.error('Name is required')
      return
    }
    if (isModule && !newPresetModule) {
      toast.error('Please select a module')
      return
    }

    setSaving(true)
    try {
      let finalName = newPresetName
      let finalDesc = newPresetDesc
      
      if (isModule) {
        const modDef = DEFAULT_MODULES.find(m => m.moduleName === newPresetModule)
        finalName = modDef ? `${modDef.displayName} Setup` : 'Module Preset'
        finalDesc = `Bulk permission configuration for ${modDef?.displayName}`
      }

      const defaultPerms = DEFAULT_MODULES.map(m => ({ ...m, canAdd: false, canEdit: false, canDelete: false, canView: false }))
      const res = await fetch(`${API_URL}/permission-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: finalName,
          description: finalDesc,
          presetType: newPresetType,
          targetModule: isModule ? newPresetModule : null,
          permissions: defaultPerms 
        })
      })
      if (res.ok) {
        const newPreset = await res.json()
        toast.success('Preset created!')
        setIsAddOpen(false)
        setNewPresetName('')
        setNewPresetDesc('')
        setNewPresetModule('')
        await fetchPresets()
        setSelectedPresetId(newPreset.id)
      }
    } catch (err) {
      toast.error('Error creating preset')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePreset = async () => {
    if (!selectedPresetId) return
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: 'Are you sure you want to delete this preset?',
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return
    
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/permission-presets/${selectedPresetId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Preset deleted')
        setSelectedPresetId(null)
        fetchPresets()
      }
    } catch (err) {
      toast.error('Error deleting preset')
    } finally {
      setSaving(false)
    }
  }

  if (loading && presets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    )
  }

  const filteredPresets = presets.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const activePreset = presets.find(p => p.id === selectedPresetId)

  return (
    <div className="flex flex-col h-full -mt-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 min-h-[calc(100vh-100px)]">
        {/* Left Side: Presets List */}
        <div className="xl:col-span-1 border-r border-slate-200 bg-white flex flex-col h-full">
          <div className="p-6 border-b border-slate-100">
            <Button variant="ghost" className="mb-4 text-slate-500 h-8 px-2 text-xs" onClick={() => router.push('/settings')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
            </Button>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-brand-teal" /> Presets</span>
              <Button size="sm" className="bg-brand-teal hover:bg-brand-teal/90" onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search presets..." 
                className="pl-9 h-11 bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-brand-teal/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  preset.id === selectedPresetId 
                    ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  preset.id === selectedPresetId ? 'bg-white/20' : 'bg-slate-100'
                }`}>
                  <ShieldCheck className={`w-5 h-5 ${preset.id === selectedPresetId ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm truncate">{preset.name}</div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider truncate ${
                    preset.id === selectedPresetId ? 'text-white/60' : 'text-slate-400'
                  }`}>{preset.presetType === 'module' ? 'Module Setup' : (preset.description || 'Custom Role')}</div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${preset.id === selectedPresetId ? 'text-white/60' : 'text-slate-300'}`} />
              </button>
            ))}
            {filteredPresets.length === 0 && (
              <div className="text-center p-8 text-sm text-slate-400 font-medium">
                No presets found. Create one!
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Permissions Form */}
        <div className="xl:col-span-3 bg-slate-50/50 flex flex-col h-full overflow-hidden">
          {selectedPresetId && activePreset ? (
            activePreset.presetType === 'module' && activePreset.targetModule ? (
              // MODULE PRESET VIEW
              <div className="h-full flex flex-col p-4 sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      Preset: {activePreset.name}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      Bulk configure permissions for this module across all employees.
                    </p>
                  </div>
                  <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDeletePreset}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden relative rounded-xl border border-gray-200">
                  <ModuleBulkAssignment defaultModules={DEFAULT_MODULES} fixedModule={activePreset.targetModule} />
                </div>
              </div>
            ) : (
              // USER/ROLE PRESET VIEW
              <>
                <div className="p-8 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      Preset: {activePreset.name}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      {activePreset.description || 'Configure the permissions for this preset.'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDeletePreset}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                    <Button 
                      className="bg-brand-orange hover:bg-brand-orange/90 text-white px-8 font-bold shadow-lg shadow-brand-orange/20" 
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Template
                    </Button>
                  </div>
                </div>

                <div className="flex-1 p-8 flex flex-col overflow-hidden">
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
                                <td className="px-6 py-3">
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
                                  />
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <Checkbox 
                                    onCheckedChange={(checked) => handleToggleGroup(group.name, 'canEdit', !!checked)}
                                    className="w-4 h-4 border-slate-300"
                                  />
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <Checkbox 
                                    onCheckedChange={(checked) => handleToggleGroup(group.name, 'canDelete', !!checked)}
                                    className="w-4 h-4 border-slate-300"
                                  />
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <Checkbox 
                                    onCheckedChange={(checked) => handleToggleGroup(group.name, 'canView', !!checked)}
                                    className="w-4 h-4 border-slate-300"
                                  />
                                </td>
                                <td className="px-6 py-3 text-center bg-slate-100/20">
                                  <Checkbox 
                                    onCheckedChange={(checked) => handleToggleGroup(group.name, 'fullAccess', !!checked)}
                                    className="w-4 h-4 border-brand-orange data-[state=checked]:bg-brand-orange"
                                  />
                                </td>
                              </tr>
                              {filteredModules.map((m) => {
                                const p = permissions.find(per => per.moduleName === m.moduleName) || { ...m, canAdd: false, canEdit: false, canDelete: false, canView: false }
                                return (
                                  <tr key={m.moduleName} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                      <div className="font-bold text-slate-900 group-hover:text-brand-teal transition-colors">{p.displayName}</div>
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
              </>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <ShieldCheck className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">No Preset Selected</h3>
              <p className="max-w-xs text-center text-sm">Select a preset from the sidebar or create a new one to start configuring permissions.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            <div className="space-y-3 pb-2 border-b border-gray-100">
              <Label className="text-gray-500">Preset Type</Label>
              <RadioGroup value={newPresetType} onValueChange={setNewPresetType} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="role" id="r-role" />
                  <Label htmlFor="r-role" className="cursor-pointer">User/Role Preset</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="module" id="r-module" />
                  <Label htmlFor="r-module" className="cursor-pointer">Module Preset</Label>
                </div>
              </RadioGroup>
            </div>

            {newPresetType === 'role' ? (
              <>
                <div className="space-y-2">
                  <Label>Preset Name</Label>
                  <Input 
                    placeholder="e.g. Finance Team" 
                    value={newPresetName} 
                    onChange={e => setNewPresetName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    placeholder="Optional description" 
                    value={newPresetDesc} 
                    onChange={e => setNewPresetDesc(e.target.value)} 
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2 pt-2">
                <Label>Select Target Module</Label>
                <Select value={newPresetModule} onValueChange={setNewPresetModule}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a Module..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_MODULES.map(m => (
                      <SelectItem key={m.moduleName} value={m.moduleName}>{m.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-2">
                  This preset will allow you to quickly assign bulk permissions to all employees for the selected module.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPreset} disabled={saving} className="bg-brand-teal text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Preset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
