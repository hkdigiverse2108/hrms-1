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
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Building2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import type { Department } from '@/lib/types'

export default function DepartmentsPage() {
  const { data, isLoading: apiLoading, refresh } = useApi()
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
        refresh()
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
        refresh()
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      }
    } catch (err) {
      console.error('Error deleting department:', err)
    }
  }

  const columns = [
    { key: 'name' as const, header: 'Department Name' },
    { key: 'employeeCount' as const, header: 'Employees' },
  ]

  const renderActions = (item: Department) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleOpenModal(item)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setItemToDelete(item)
            setDeleteDialogOpen(true)
          }}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Departments</h3>
            <p className="text-xs text-slate-500">{departments.length} active departments</p>
          </div>
        </div>
        <Button size="sm" onClick={() => handleOpenModal()} className="bg-brand-teal hover:bg-brand-teal/90 text-white shadow-md shadow-brand-teal/10">
          <Plus className="w-4 h-4 mr-2" /> Add Department
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {apiLoading && departments.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
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
