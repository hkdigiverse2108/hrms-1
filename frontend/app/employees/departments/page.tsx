'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
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
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Download } from 'lucide-react'
import { exportToCSV } from "@/lib/export";
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import type { Department } from '@/lib/types'

export default function DepartmentsPage() {
  const { data, isLoading: apiLoading, refresh } = useApi()
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (data?.departments) {
      setDepartments(data.departments)
    }
  }, [data?.departments])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)
  const [formData, setFormData] = useState({ name: '' })

  const handleOpenModal = (department?: Department) => {
    if (department) {
      setEditingDepartment(department)
      setFormData({
        name: department.name,
      })
    } else {
      setEditingDepartment(null)
      setFormData({ name: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    setIsLoading(true)
    try {
      if (editingDepartment) {
        const response = await fetch(`${API_URL}/departments/${editingDepartment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) {
          refresh()
          setModalOpen(false)
        }
      } else {
        const response = await fetch(`${API_URL}/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) {
          refresh()
          setModalOpen(false)
        }
      }
    } catch (error) {
      console.error('Error saving department:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (departmentToDelete) {
      try {
        const response = await fetch(`${API_URL}/departments/${departmentToDelete.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          refresh()
          setDepartmentToDelete(null)
        }
      } catch (error) {
        console.error('Error deleting department:', error)
      }
    }
    setDeleteDialogOpen(false)
  }

  const columns = [
    { key: 'name' as const, header: 'Department Name' },
    { key: 'employeeCount' as const, header: 'Employee Count' },
  ]

  const renderActions = (department: Department) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleOpenModal(department)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDeleteClick(department)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <PageHeader title="Departments" description="Manage company departments and organization units.">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportToCSV(departments, 'departments')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-brand-teal hover:bg-brand-teal-light text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
      </PageHeader>

      {(apiLoading && departments.length === 0) ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm">
          <DataTable
            data={departments}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search departments..."
            actions={renderActions}
          />
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Add New Department'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                placeholder="e.g. Sales, Marketing, HR"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-brand-teal hover:bg-brand-teal-light text-white"
              >
                {isLoading ? (editingDepartment ? 'Saving...' : 'Adding...') : (editingDepartment ? 'Save Changes' : 'Add Department')}
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
        description={`Are you sure you want to delete ${departmentToDelete?.name}? This action cannot be undone.`}
      />
    </>
  )
}
