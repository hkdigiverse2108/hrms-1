'use client'

import { useState, useEffect } from 'react'
import { DataTable } from '@/components/hrms/data-table'
import { DeleteConfirmDialog } from '@/components/hrms/delete-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Network } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import type { SubDepartment } from '@/lib/types'

import { usePermissions } from '@/hooks/usePermissions'

export default function SubDepartmentsPage() {
  const { data, isLoading: apiLoading, refreshItem } = useApi()
  const { checkPermission, isAdmin } = usePermissions()
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<SubDepartment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<SubDepartment | null>(null)
  const [deptForm, setDeptForm] = useState({ name: '', department: '' })
  
  const departments = data?.departments || []

  useEffect(() => {
    if (data?.subDepartments) setSubDepartments(data.subDepartments)
  }, [data?.subDepartments])

  const handleOpenModal = (dept?: SubDepartment) => {
    if (dept) {
      setEditingDept(dept)
      setDeptForm({ name: dept.name, department: dept.department || '' })
    } else {
      setEditingDept(null)
      setDeptForm({ name: '', department: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!deptForm.name.trim()) return
    setIsLoading(true)
    try {
      const url = editingDept ? `${API_URL}/sub-departments/${editingDept.id}` : `${API_URL}/sub-departments`
      const method = editingDept ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm),
      })
      if (res.ok) {
        refreshItem('subDepartments')
        setModalOpen(false)
      }
    } catch (err) {
      console.error('Error saving sub department:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      const res = await fetch(`${API_URL}/sub-departments/${itemToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        refreshItem('subDepartments')
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      }
    } catch (err) {
      console.error('Error deleting sub department:', err)
    }
  }

  const columns = [
    { 
      key: 'name' as const, 
      header: 'Sub Department Name',
      render: (dept: SubDepartment) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-brand-teal/10 transition-colors">
            <Network className="w-4 h-4 text-slate-500 group-hover:text-brand-teal transition-colors" />
          </div>
          <span className="font-bold text-slate-700">{dept.name}</span>
        </div>
      )
    },
    {
      key: 'department' as const,
      header: 'Department',
      render: (dept: SubDepartment) => (
        <span className="text-sm font-medium text-slate-600">{dept.department || 'N/A'}</span>
      )
    }
  ]

  const renderActions = (item: SubDepartment) => {
    const hasEdit = isAdmin || checkPermission('org-structure', 'canEdit')
    const hasDelete = isAdmin || checkPermission('org-structure', 'canDelete')
    
    if (!hasEdit && !hasDelete) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hasEdit && (
            <DropdownMenuItem onClick={() => handleOpenModal(item)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
          )}
          {hasDelete && (
            <DropdownMenuItem
              onClick={() => {
                setItemToDelete(item)
                setDeleteDialogOpen(true)
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
      {/* Integrated Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center shadow-inner">
            <Network className="w-6 h-6 text-brand-teal" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Sub Department Directory</h3>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{subDepartments.length} active sub departments</p>
          </div>
        </div>
        {(isAdmin || checkPermission('org-structure', 'canAdd')) && (
          <Button 
            onClick={() => handleOpenModal()} 
            className="bg-brand-teal hover:bg-brand-teal/90 text-white shadow-lg shadow-brand-teal/20 px-6 h-11 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Sub Department
          </Button>
        )}
      </div>

      {/* Table Content */}
      <div className="p-2 flex-1">
        {apiLoading && subDepartments.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-brand-teal/50" />
              <p className="text-sm font-bold text-slate-400 animate-pulse">Syncing Directory...</p>
            </div>
          </div>
        ) : (
          <DataTable
            data={subDepartments}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search sub departments..."
            actions={renderActions}
          />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Sub Department' : 'Add New Sub Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Sub Department Name</Label>
              <Input 
                placeholder="e.g. SEO, Paid Ads" 
                value={deptForm.name} 
                onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Department</Label>
              <Select value={deptForm.department} onValueChange={(v) => setDeptForm({ ...deptForm, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Parent Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isLoading} className="bg-brand-teal text-white">
                {isLoading ? 'Saving...' : (editingDept ? 'Save Changes' : 'Add Sub Department')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Sub Department"
        description="Are you sure? This action cannot be undone."
      />
    </div>
  )
}
