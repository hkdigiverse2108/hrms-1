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
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, UserCircle2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import type { Designation, Department } from '@/lib/types'

export default function DesignationsPage() {
  const { data, isLoading: apiLoading, refresh } = useApi()
  const [designations, setDesignations] = useState<Designation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Designation | null>(null)
  const [desigForm, setDesigForm] = useState({ title: '', department: '' })

  useEffect(() => {
    if (data?.designations) setDesignations(data.designations)
    if (data?.departments) setDepartments(data.departments)
  }, [data?.designations, data?.departments])

  const handleOpenModal = (desig?: Designation) => {
    if (desig) {
      setEditingDesig(desig)
      setDesigForm({ title: desig.title, department: desig.department })
    } else {
      setEditingDesig(null)
      setDesigForm({ title: '', department: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!desigForm.title.trim() || !desigForm.department) return
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
        refresh()
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
        refresh()
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      }
    } catch (err) {
      console.error('Error deleting designation:', err)
    }
  }

  const columns = [
    { key: 'title' as const, header: 'Title' },
    { key: 'department' as const, header: 'Department' },
  ]

  const renderActions = (item: Designation) => (
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
            <UserCircle2 className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Designations</h3>
            <p className="text-xs text-slate-500">{designations.length} total roles</p>
          </div>
        </div>
        <Button size="sm" onClick={() => handleOpenModal()} className="bg-brand-teal hover:bg-brand-teal/90 text-white shadow-md shadow-brand-teal/10">
          <Plus className="w-4 h-4 mr-2" /> Add Designation
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {apiLoading && designations.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
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
              <Label>Department</Label>
              <Select value={desigForm.department} onValueChange={v => setDesigForm({ ...desigForm, department: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
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
