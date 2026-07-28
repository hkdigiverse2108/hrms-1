'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'

interface Employee {
  id: string
  name: string
  role: string
  employeeId: string
  photo?: string
}

interface ModulePermission {
  moduleName: string
  displayName: string
  tabUrl: string
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
  canView: boolean
}

interface EmployeePermissionDoc {
  employeeId: string
  permissions: ModulePermission[]
}

export function ModuleBulkAssignment({ defaultModules, fixedModule }: { defaultModules: any[], fixedModule?: string }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [permissionsData, setPermissionsData] = useState<EmployeePermissionDoc[]>([])
  const [selectedModule, setSelectedModule] = useState<string>(fixedModule || '')
  useEffect(() => { if (fixedModule) setSelectedModule(fixedModule) }, [fixedModule])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // The local state of the table
  const [bulkUpdates, setBulkUpdates] = useState<Record<string, { canAdd: boolean; canEdit: boolean; canDelete: boolean; canView: boolean }>>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [empRes, permRes] = await Promise.all([
        fetch(`${API_URL}/employees?limit=1000&include_inactive=false`),
        fetch(`${API_URL}/user-permissions/all`)
      ])
      
      const empData = await empRes.json()
      const permData = await permRes.json()
      
      if (Array.isArray(empData.items)) {
        setEmployees(empData.items.filter((e: any) => e.role?.toLowerCase() !== 'admin' && e.role?.toLowerCase() !== 'super admin' && e.role?.toLowerCase() !== 'sub-admin'))
      } else if (Array.isArray(empData)) {
        setEmployees(empData.filter((e: any) => e.role?.toLowerCase() !== 'admin' && e.role?.toLowerCase() !== 'super admin' && e.role?.toLowerCase() !== 'sub-admin'))
      }
      
      if (Array.isArray(permData)) {
        setPermissionsData(permData)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // When module changes, rebuild the bulkUpdates state
  useEffect(() => {
    if (!selectedModule) return
    const initialUpdates: Record<string, any> = {}
    
    employees.forEach(emp => {
      const empPermDoc = permissionsData.find(p => p.employeeId === emp.id)
      const modPerm = empPermDoc?.permissions?.find(m => m.moduleName === selectedModule)
      initialUpdates[emp.id] = {
        canAdd: modPerm?.canAdd || false,
        canEdit: modPerm?.canEdit || false,
        canDelete: modPerm?.canDelete || false,
        canView: modPerm?.canView || false,
      }
    })
    
    setBulkUpdates(initialUpdates)
  }, [selectedModule, employees, permissionsData])

  const togglePermission = (empId: string, type: 'canAdd' | 'canEdit' | 'canDelete' | 'canView') => {
    setBulkUpdates(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [type]: !prev[empId][type]
      }
    }))
  }

  const toggleFullAccessRow = (empId: string, checked: boolean) => {
    setBulkUpdates(prev => ({
      ...prev,
      [empId]: {
        canAdd: checked,
        canEdit: checked,
        canDelete: checked,
        canView: checked
      }
    }))
  }

  const toggleColumn = (type: 'canAdd' | 'canEdit' | 'canDelete' | 'canView') => {
    const allChecked = filteredEmployees.every(emp => bulkUpdates[emp.id]?.[type])
    
    const newUpdates = { ...bulkUpdates }
    filteredEmployees.forEach(emp => {
      newUpdates[emp.id] = {
        ...newUpdates[emp.id],
        [type]: !allChecked
      }
    })
    setBulkUpdates(newUpdates)
  }

  const toggleFullAccessColumn = () => {
    const allChecked = filteredEmployees.every(emp => 
      bulkUpdates[emp.id]?.canView && 
      bulkUpdates[emp.id]?.canAdd && 
      bulkUpdates[emp.id]?.canEdit && 
      bulkUpdates[emp.id]?.canDelete
    )

    const newUpdates = { ...bulkUpdates }
    filteredEmployees.forEach(emp => {
      newUpdates[emp.id] = {
        canView: !allChecked,
        canAdd: !allChecked,
        canEdit: !allChecked,
        canDelete: !allChecked,
      }
    })
    setBulkUpdates(newUpdates)
  }

  const handleSave = async () => {
    if (!selectedModule) {
      toast.error('Please select a module first')
      return
    }

    setSaving(true)
    try {
      const moduleInfo = defaultModules.find(m => m.moduleName === selectedModule)
      
      const payload = {
        moduleName: selectedModule,
        displayName: moduleInfo?.displayName || selectedModule,
        tabUrl: moduleInfo?.tabUrl || '#',
        updates: Object.keys(bulkUpdates).map(empId => ({
          employeeId: empId,
          ...bulkUpdates[empId]
        }))
      }

      const res = await fetch(`${API_URL}/user-permissions/bulk-module`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to save bulk permissions')
      
      toast.success('Permissions updated successfully')
      await fetchData() // refresh
    } catch (err) {
      console.error(err)
      toast.error('Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    (emp.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
    (emp.role || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="bg-white flex flex-col h-[calc(100vh-200px)]">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white">
        <div className="flex gap-4 w-full sm:w-auto flex-1">
          {!fixedModule && (
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-[300px] bg-slate-50 border-none ring-0 focus:ring-1 focus:ring-brand-teal/20">
                <SelectValue placeholder="Select a Module to Configure..." />
              </SelectTrigger>
              <SelectContent>
                {defaultModules.map(m => (
                  <SelectItem key={m.moduleName} value={m.moduleName}>{m.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {selectedModule && (
            <div className="relative flex-1 max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search employees..." 
                className="pl-9 h-10 bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-brand-teal/20"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {selectedModule && (
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-8 font-bold shadow-lg shadow-brand-orange/20 w-full sm:w-auto"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Module Permissions
          </Button>
        )}
      </div>

      {selectedModule ? (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left font-black text-slate-700 uppercase tracking-tighter text-[11px] w-[30%]">Employee</th>
                <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px]">
                  <div className="flex flex-col items-center gap-2">
                    <span>Add</span>
                    <Checkbox 
                      className="w-4 h-4 border-slate-300"
                      checked={filteredEmployees.length > 0 && filteredEmployees.every(emp => bulkUpdates[emp.id]?.canAdd)}
                      onCheckedChange={() => toggleColumn('canAdd')}
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px]">
                  <div className="flex flex-col items-center gap-2">
                    <span>Edit</span>
                    <Checkbox 
                      className="w-4 h-4 border-slate-300"
                      checked={filteredEmployees.length > 0 && filteredEmployees.every(emp => bulkUpdates[emp.id]?.canEdit)}
                      onCheckedChange={() => toggleColumn('canEdit')}
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px]">
                  <div className="flex flex-col items-center gap-2">
                    <span>Delete</span>
                    <Checkbox 
                      className="w-4 h-4 border-slate-300"
                      checked={filteredEmployees.length > 0 && filteredEmployees.every(emp => bulkUpdates[emp.id]?.canDelete)}
                      onCheckedChange={() => toggleColumn('canDelete')}
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px]">
                  <div className="flex flex-col items-center gap-2">
                    <span>View</span>
                    <Checkbox 
                      className="w-4 h-4 border-slate-300"
                      checked={filteredEmployees.length > 0 && filteredEmployees.every(emp => bulkUpdates[emp.id]?.canView)}
                      onCheckedChange={() => toggleColumn('canView')}
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-black text-slate-700 uppercase tracking-tighter text-[11px] bg-slate-100/50">
                  <div className="flex flex-col items-center gap-2">
                    <span>Full Access</span>
                    <Checkbox 
                      className="w-4 h-4 border-brand-orange data-[state=checked]:bg-brand-orange"
                      checked={filteredEmployees.length > 0 && filteredEmployees.every(emp => 
                        bulkUpdates[emp.id]?.canView && 
                        bulkUpdates[emp.id]?.canAdd && 
                        bulkUpdates[emp.id]?.canEdit && 
                        bulkUpdates[emp.id]?.canDelete
                      )}
                      onCheckedChange={() => toggleFullAccessColumn()}
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => {
                const isFull = bulkUpdates[emp.id]?.canAdd && bulkUpdates[emp.id]?.canEdit && bulkUpdates[emp.id]?.canDelete && bulkUpdates[emp.id]?.canView
                
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-black text-sm shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-brand-teal transition-colors">{emp.name}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{emp.role} • {emp.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Checkbox 
                        checked={bulkUpdates[emp.id]?.canAdd || false}
                        onCheckedChange={() => togglePermission(emp.id, 'canAdd')}
                        className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Checkbox 
                        checked={bulkUpdates[emp.id]?.canEdit || false}
                        onCheckedChange={() => togglePermission(emp.id, 'canEdit')}
                        className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Checkbox 
                        checked={bulkUpdates[emp.id]?.canDelete || false}
                        onCheckedChange={() => togglePermission(emp.id, 'canDelete')}
                        className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Checkbox 
                        checked={bulkUpdates[emp.id]?.canView || false}
                        onCheckedChange={() => togglePermission(emp.id, 'canView')}
                        className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal"
                      />
                    </td>
                    <td className="px-6 py-4 text-center bg-slate-50/50">
                      <Checkbox 
                        checked={isFull || false}
                        onCheckedChange={(checked) => toggleFullAccessRow(emp.id, !!checked)}
                        className="w-5 h-5 border-slate-300 data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
                      />
                    </td>
                  </tr>
                )
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium text-sm">
                    No employees found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-600 mb-1">No Module Selected</h3>
          <p className="text-sm">Select a module from the dropdown above to view and assign permissions to all employees.</p>
        </div>
      )}
    </div>
  )
}
