'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DepartmentsPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/employees/organization/departments')
  }, [router])

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
    </div>
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
            Export PDF
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
