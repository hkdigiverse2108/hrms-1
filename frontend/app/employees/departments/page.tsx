'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/hrms/data-table'
import { DeleteConfirmDialog } from '@/components/hrms/delete-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Download, User, Building2, UserCircle } from 'lucide-react'
import { exportToCSV } from "@/lib/export";
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import type { Department, Designation } from '@/lib/types'

export default function OrganizationPage() {
  const { data, isLoading: apiLoading, refresh } = useApi()
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])

  useEffect(() => {
    if (data?.departments) setDepartments(data.departments)
    if (data?.designations) setDesignations(data.designations)
  }, [data?.departments, data?.designations])

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Organization Structure" 
        description="Manage company departments, job designations, and roles." 
      />
      
      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="mb-4 bg-gray-100/50 p-1 border">
          <TabsTrigger value="departments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-teal px-6 py-2 rounded-md font-medium transition-all">
            <Building2 className="w-4 h-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="designations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-teal px-6 py-2 rounded-md font-medium transition-all">
            <UserCircle className="w-4 h-4 mr-2" />
            Designations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="departments" className="m-0">
          <DepartmentsTab 
            departments={departments} 
            apiLoading={apiLoading} 
            refresh={refresh} 
          />
        </TabsContent>
        
        <TabsContent value="designations" className="m-0">
          <DesignationsTab 
            designations={designations} 
            departments={departments} 
            apiLoading={apiLoading} 
            refresh={refresh} 
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DepartmentsTab({ departments, apiLoading, refresh }: { departments: Department[], apiLoading: boolean, refresh: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)
  const [formData, setFormData] = useState({ name: '', head: '' })

  const handleOpenModal = (department?: Department) => {
    if (department) {
      setEditingDepartment(department)
      setFormData({
        name: department.name,
        head: department.head || '',
      })
    } else {
      setEditingDepartment(null)
      setFormData({ name: '', head: '' })
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
    { key: 'name' as const, header: 'Department Name', render: (dept: Department) => <span className="font-semibold text-gray-800">{dept.name}</span> },
    { key: 'head' as const, header: 'Department Head', render: (dept: Department) => (
      <div className="flex items-center gap-2 text-gray-600">
        <User className="h-4 w-4 text-gray-400" />
        <span>{dept.head || <span className="text-gray-400 italic text-xs">Not Assigned</span>}</span>
      </div>
    )},
    { key: 'employeeCount' as const, header: 'Team Size', render: (dept: Department) => (
      <span className="bg-brand-light text-brand-teal px-2 py-1 rounded-md text-xs font-semibold">
        {dept.employeeCount || 0} Members
      </span>
    )},
    { key: 'status' as const, header: 'Status', render: () => (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md border bg-emerald-50 text-emerald-600 border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
        Active
      </span>
    )},
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
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">Manage organizational departments</div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportToCSV(departments, 'departments')} className="bg-white">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-brand-teal hover:bg-brand-teal-light text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

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
            <div className="space-y-2">
              <Label htmlFor="head">Department Head</Label>
              <Input
                id="head"
                placeholder="e.g. John Doe (Optional)"
                value={formData.head}
                onChange={(e) => setFormData({ ...formData, head: e.target.value })}
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

function DesignationsTab({ designations, departments, apiLoading, refresh }: { designations: Designation[], departments: Department[], apiLoading: boolean, refresh: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [designationToDelete, setDesignationToDelete] = useState<Designation | null>(null)
  const [formData, setFormData] = useState({ title: '', department: '' })

  const handleOpenModal = (designation?: Designation) => {
    if (designation) {
      setEditingDesignation(designation)
      setFormData({
        title: designation.title,
        department: designation.department,
      })
    } else {
      setEditingDesignation(null)
      setFormData({ title: '', department: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.department) return
    setIsLoading(true)
    try {
      if (editingDesignation) {
        const response = await fetch(`${API_URL}/designations/${editingDesignation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) {
          refresh()
          setModalOpen(false)
        }
      } else {
        const response = await fetch(`${API_URL}/designations`, {
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
      console.error('Error saving designation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (designation: Designation) => {
    setDesignationToDelete(designation)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (designationToDelete) {
      try {
        const response = await fetch(`${API_URL}/designations/${designationToDelete.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          refresh()
          setDesignationToDelete(null)
        }
      } catch (error) {
        console.error('Error deleting designation:', error)
      }
    }
    setDeleteDialogOpen(false)
  }

  const getLevelBadge = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('manager') || t.includes('director') || t.includes('head') || t.includes('lead') || t.includes('vp') || t.includes('president') || t.includes('chief') || t.includes('founder') || t.includes('ceo')) {
      return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200">Management</span>
    }
    if (t.includes('senior') || t.includes('sr')) {
      return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">Senior Level</span>
    }
    if (t.includes('junior') || t.includes('jr') || t.includes('intern') || t.includes('trainee') || t.includes('fresher')) {
      return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-orange-50 text-orange-700 border border-orange-200">Entry Level</span>
    }
    return <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-gray-50 text-gray-700 border border-gray-200">Professional</span>
  }

  const columns = [
    { key: 'title' as const, header: 'Designation Title', render: (des: Designation) => <span className="font-semibold text-gray-800">{des.title}</span> },
    { key: 'level' as const, header: 'Level', render: (des: Designation) => getLevelBadge(des.title) },
    { key: 'department' as const, header: 'Associated Department', render: (des: Designation) => (
      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700">
        <Building2 className="w-3 h-3 mr-1.5" />
        {des.department}
      </span>
    )},
    { key: 'status' as const, header: 'Status', render: () => (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md border bg-emerald-50 text-emerald-600 border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
        Active
      </span>
    )},
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
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">Manage job designations and roles</div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportToCSV(designations, 'designations')} className="bg-white">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-brand-teal hover:bg-brand-teal-light text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Designation
          </Button>
        </div>
      </div>

      {(apiLoading && designations.length === 0) ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm">
          <DataTable
            data={designations}
            columns={columns}
            searchKey="title"
            searchPlaceholder="Search designations..."
            actions={renderActions}
          />
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDesignation ? 'Edit Designation' : 'Add New Designation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title">Designation Title</Label>
              <Input
                id="title"
                placeholder="e.g. Senior Developer, Marketing Lead"
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
                <SelectTrigger className="w-full">
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
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-brand-teal hover:bg-brand-teal-light text-white"
              >
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
