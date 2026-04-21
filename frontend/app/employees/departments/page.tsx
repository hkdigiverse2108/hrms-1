'use client'

import { useState } from 'react'
import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Users, Pencil, Trash2 } from 'lucide-react'
import type { Department } from '@/lib/types'
import { DeleteConfirmDialog } from '@/components/hrms/delete-confirm-dialog'
import { useApi } from '@/hooks/useApi'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function DepartmentsPage() {
  const { data, isLoading: apiLoading } = useApi()
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
  const [formData, setFormData] = useState({ name: '', head: '' })

  const handleOpenModal = (department?: Department) => {
    if (department) {
      setEditingDepartment(department)
      setFormData({ name: department.name, head: department.head })
    } else {
      setEditingDepartment(null)
      setFormData({ name: '', head: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      if (editingDepartment) {
        const response = await fetch(`http://localhost:8000/departments/${editingDepartment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) {
          const updated = await response.json()
          setDepartments(departments.map((d) => d.id === updated.id ? updated : d))
        }
      } else {
        const response = await fetch(`http://localhost:8000/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) {
          const created = await response.json()
          setDepartments([...departments, created])
        }
      }
      setModalOpen(false)
      setFormData({ name: '', head: '' })
    } catch (error) {
      console.error('Error saving department:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (departmentToDelete) {
      try {
        const response = await fetch(`http://localhost:8000/departments/${departmentToDelete.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setDepartments(departments.filter((d) => d.id !== departmentToDelete.id))
          setDepartmentToDelete(null)
        }
      } catch (error) {
        console.error('Error deleting department:', error)
      }
    }
    setDeleteDialogOpen(false)
  }

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department)
    setDeleteDialogOpen(true)
  }


  return (
    <HRMSLayout>
      <PageHeader title="Departments" description="Manage departments in your organization.">
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </PageHeader>

      {(apiLoading && departments.length === 0) ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <Card key={department.id} className="group relative">
              <CardContent className="pt-6">
                <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenModal(department)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(department)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{department.name}</h3>
                    <p className="text-sm text-muted-foreground">Head: {department.head}</p>
                    <p className="mt-2 text-2xl font-bold">{department.employeeCount}</p>
                    <p className="text-sm text-muted-foreground">Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Add New Department'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="head">Department Head</Label>
              <Input
                id="head"
                value={formData.head}
                onChange={(e) => setFormData({ ...formData, head: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
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
    </HRMSLayout>
  )
}
