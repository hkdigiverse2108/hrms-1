'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/hrms/data-table'
import { DeleteConfirmDialog } from '@/components/hrms/delete-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Download } from 'lucide-react'
import { exportToCSV } from "@/lib/export";

import type { Designation, Department } from '@/lib/types'
import { useApi } from '@/hooks/useApi'
import { useEffect } from 'react'
import { API_URL } from '@/lib/config'

export default function DesignationsPage() {
  const { data, isLoading: apiLoading } = useApi()
  const [designations, setDesignations] = useState<Designation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (data?.designations) setDesignations(data.designations)
    if (data?.departments) setDepartments(data.departments)
  }, [data?.designations, data?.departments])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [designationToDelete, setDesignationToDelete] = useState<Designation | null>(null)
  const [formData, setFormData] = useState({ title: '', department: '', level: '' })

  const handleOpenModal = (designation?: Designation) => {
    if (designation) {
      setEditingDesignation(designation)
      setFormData({
        title: designation.title,
        department: designation.department,
        level: designation.level,
      })
    } else {
      setEditingDesignation(null)
      setFormData({ title: '', department: '', level: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      if (editingDesignation) {
        const response = await fetch(`${API_URL}/designations/${editingDesignation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) {
          const updated = await response.json()
          setDesignations(designations.map((d) => d.id === updated.id ? updated : d))
        }
      } else {
        const response = await fetch(`${API_URL}/designations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) {
          const created = await response.json()
          setDesignations([...designations, created])
        }
      }
      setModalOpen(false)
      setFormData({ title: '', department: '', level: '' })
    } catch (error) {
      console.error('Error saving designation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (designationToDelete) {
      try {
        const response = await fetch(`${API_URL}/designations/${designationToDelete.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setDesignations(designations.filter((d) => d.id !== designationToDelete.id))
          setDesignationToDelete(null)
        }
      } catch (error) {
        console.error('Error deleting designation:', error)
      }
    }
    setDeleteDialogOpen(false)
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'senior':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'lead':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'manager':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'mid':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'junior':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const columns = [
    { key: 'title' as const, header: 'Designation' },
    { key: 'department' as const, header: 'Department' },
    {
      key: 'level' as const,
      header: 'Level',
      render: (designation: Designation) => (
        <Badge variant="outline" className={getLevelColor(designation.level)}>
          {designation.level}
        </Badge>
      ),
    },
  ]

  const renderActions = (designation: Designation) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleOpenModal(designation)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDeleteClick(designation)}
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
      <PageHeader title="Designations" description="Manage job designations and roles.">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportToCSV(designations, 'designations')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Designation
          </Button>
        </div>
      </PageHeader>


      {(apiLoading && designations.length === 0) ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          data={designations}
          columns={columns}
          searchKey="title"
          searchPlaceholder="Search designations..."
          actions={renderActions}
        />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDesignation ? 'Edit Designation' : 'Add New Designation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Designation Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Mid">Mid</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (editingDesignation ? 'Saving...' : 'Adding...') : (editingDesignation ? 'Save Changes' : 'Add Designation')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Designation"
        description={`Are you sure you want to delete ${designationToDelete?.title}? This action cannot be undone.`}
      />
    </>
  )
}
