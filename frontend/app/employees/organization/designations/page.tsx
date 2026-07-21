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
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, UserCircle2, Briefcase } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import type { Designation, Department, SubDepartment } from '@/lib/types'

import { usePermissions } from '@/hooks/usePermissions'

export default function DesignationsPage() {
  const { data, isLoading: apiLoading, refreshItem } = useApi()
  const { checkPermission, isAdmin } = usePermissions()
  const [designations, setDesignations] = useState<Designation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Designation | null>(null)
  const [desigForm, setDesigForm] = useState({ title: '', department: '', sub_department: '' })
  
  const subDepartments = (data as any)?.subDepartments || []

  useEffect(() => {
    if (data?.designations) setDesignations(data.designations)
    if (data?.departments) setDepartments(data.departments)
  }, [data?.designations, data?.departments])

  const handleOpenModal = (desig?: Designation) => {
    if (desig) {
      setEditingDesig(desig)
      setDesigForm({ title: desig.title, department: desig.department, sub_department: desig.sub_department || '' })
    } else {
      setEditingDesig(null)
      setDesigForm({ title: '', department: '', sub_department: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!desigForm.title.trim() || !desigForm.department || !desigForm.sub_department) return
    setIsLoading(true)
    try {
      const url = editingDesig ? `${API_URL}/designations/${editingDesig.id}` : `${API_URL}/designations`
      const method = editingDesig ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(desigForm),
      })
      if (res.ok) {
        refreshItem('designations')
        setModalOpen(false)
      }
    } catch (err) {
      console.error('Error saving designation:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    try {
      const res = await fetch(`${API_URL}/designations/${itemToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        refreshItem('designations')
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      }
    } catch (err) {
      console.error('Error deleting designation:', err)
    }
  }

  const columns = [
    { 
      key: 'title' as const, 
      header: 'Designation Title',
      render: (desig: Designation) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-brand-teal/10 transition-colors">
            <Briefcase className="w-4 h-4 text-slate-500 group-hover:text-brand-teal transition-colors" />
          </div>
          <span className="font-bold text-slate-700">{desig.title}</span>
        </div>
      )
    },
    { 
      key: 'department' as const, 
      header: 'Department',
      render: (desig: Designation) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
          {desig.department}
        </span>
      )
    },
    { 
      key: 'sub_department' as const, 
      header: 'Sub Department',
      render: (desig: Designation) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
          {desig.sub_department || 'N/A'}
        </span>
      )
    },
  ]

  const renderActions = (item: Designation) => {
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
            <UserCircle2 className="w-6 h-6 text-brand-teal" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Job Designations</h3>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{designations.length} defined roles</p>
          </div>
        </div>
        {(isAdmin || checkPermission('org-structure', 'canAdd')) && (
          <Button 
            onClick={() => handleOpenModal()} 
            className="bg-brand-teal hover:bg-brand-teal/90 text-white shadow-lg shadow-brand-teal/20 px-6 h-11 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Designation
          </Button>
        )}
      </div>

      {/* Table Content */}
      <div className="p-2 flex-1">
        {apiLoading && designations.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-brand-teal/50" />
              <p className="text-sm font-bold text-slate-400 animate-pulse">Loading Roles...</p>
            </div>
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
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDesig ? 'Edit Designation' : 'Add New Designation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Designation Title</Label>
              <Input 
                placeholder="e.g. Senior Manager" 
                value={desigForm.title} 
                onChange={e => setDesigForm({ ...desigForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sub Department</Label>
              <Select 
                value={desigForm.sub_department} 
                onValueChange={v => {
                  const selectedSd = subDepartments.find((sd: any) => sd.name === v);
                  setDesigForm({ ...desigForm, sub_department: v, department: selectedSd?.department || '' });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select sub department" /></SelectTrigger>
                <SelectContent>
                  {subDepartments.map((sd: any) => (
                    <SelectItem key={sd.id} value={sd.name}>{sd.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isLoading} className="bg-brand-teal text-white">
                {isLoading ? 'Saving...' : (editingDesig ? 'Save Changes' : 'Add Designation')}
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
        description="Are you sure? This action cannot be undone."
      />
    </div>
  )
}
