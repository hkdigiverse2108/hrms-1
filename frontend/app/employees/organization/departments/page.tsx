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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Building2, UserCircle2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import type { Department } from '@/lib/types'

import { usePermissions } from '@/hooks/usePermissions'

export default function DepartmentsPage() {
  const { data, isLoading: apiLoading, refreshItem } = useApi()
  const { checkPermission, isAdmin } = usePermissions()
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Department | null>(null)
  const [deptForm, setDeptForm] = useState({ name: '' })

  useEffect(() => {
    if (data?.departments) setDepartments(data.departments)
  }, [data?.departments])

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept)
      setDeptForm({ name: dept.name })
    } else {
      setEditingDept(null)
      setDeptForm({ name: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!deptForm.name.trim()) return
    setIsLoading(true)
    try {
      const url = editingDept ? `${API_URL}/departments/${editingDept.id}` : `${API_URL}/departments`
      const method = editingDept ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm),
      })
      if (res.ok) {
        refreshItem('departments')
        setModalOpen(false)
      }
    } catch (err) {
      console.error('Error saving department:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      const res = await fetch(`${API_URL}/departments/${itemToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        refreshItem('departments')
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      }
    } catch (err) {
      console.error('Error deleting department:', err)
    }
  }

  const columns = [
    { 
      key: 'name' as const, 
      header: 'Department Name',
      render: (dept: Department) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-brand-teal/10 transition-colors">
            <Building2 className="w-4 h-4 text-slate-500 group-hover:text-brand-teal transition-colors" />
          </div>
          <span className="font-bold text-slate-700">{dept.name}</span>
        </div>
      )
    },
    { 
      key: 'employeeCount' as const, 
      header: 'Employees',
      render: (dept: Department) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-teal/10 text-brand-teal border border-brand-teal/20">
            {dept.employeeCount || 0}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Active</span>
        </div>
      )
    },
  ]

  const renderActions = (item: Department) => {
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
            <Building2 className="w-6 h-6 text-brand-teal" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Department Directory</h3>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{departments.length} active departments</p>
          </div>
        </div>
        {(isAdmin || checkPermission('org-structure', 'canAdd')) && (
          <Button 
            onClick={() => handleOpenModal()} 
            className="bg-brand-teal hover:bg-brand-teal/90 text-white shadow-lg shadow-brand-teal/20 px-6 h-11 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Department
          </Button>
        )}
      </div>

      {/* Table Content */}
      <div className="p-2 flex-1">
        {apiLoading && departments.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-brand-teal/50" />
              <p className="text-sm font-bold text-slate-400 animate-pulse">Syncing Directory...</p>
            </div>
          </div>
        ) : (
          <DataTable
            data={departments}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search departments..."
            actions={renderActions}
          />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input 
                placeholder="e.g. Sales, Marketing" 
                value={deptForm.name} 
                onChange={e => setDeptForm({ name: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isLoading} className="bg-brand-teal text-white">
                {isLoading ? 'Saving...' : (editingDept ? 'Save Changes' : 'Add Department')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Department"
        description="Are you sure? This action cannot be undone."
      />
    </div>
  )
}
