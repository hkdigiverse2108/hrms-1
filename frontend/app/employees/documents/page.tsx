'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/hrms/data-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2, Save, Trash2, FileText, Download, ExternalLink, Calendar, Search } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'

export default function EmployeeDocumentsPage() {
  const { data, refresh } = useApi()
  const employees = data?.employees || []
  const documents = data?.employeeDocuments || []
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    documentName: '',
    category: 'Identification',
    fileName: '',
    fileUrl: '',
    uploadDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    remarks: ''
  })

  const categories = ['Identification', 'Education', 'Experience', 'Legal', 'Other']

  const handleSave = async () => {
    if (!formData.employeeId || !formData.documentName || !formData.fileUrl) {
      toast.error('Please fill all required fields')
      return
    }

    const selectedEmp = employees.find((e: any) => e.id === formData.employeeId)
    const finalData = {
      ...formData,
      employeeName: selectedEmp?.name || 'Unknown'
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/employee-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      })

      if (response.ok) {
        toast.success('Document uploaded successfully')
        refresh()
        setModalOpen(false)
        setFormData({
          employeeId: '',
          employeeName: '',
          documentName: '',
          category: 'Identification',
          fileName: '',
          fileUrl: '',
          uploadDate: new Date().toISOString().split('T')[0],
          expiryDate: '',
          remarks: ''
        })
      }
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Failed to save document')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      const response = await fetch(`${API_URL}/employee-documents/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Document deleted')
        refresh()
      }
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  const columns = [
    { key: 'employeeName' as const, header: 'Employee' },
    { key: 'documentName' as const, header: 'Document Name' },
    { key: 'category' as const, header: 'Category', render: (record: any) => (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
        {record.category}
      </span>
    )},
    { key: 'uploadDate' as const, header: 'Uploaded', render: (record: any) => (
      <span className="flex items-center gap-1 text-slate-500">
        <Calendar className="w-3 h-3" /> {record.uploadDate}
      </span>
    )},
    { key: 'status' as const, header: 'Status', render: (record: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
        record.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
      }`}>
        {record.status}
      </span>
    )},
  ]

  const actions = (record: any) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={() => window.open(record.fileUrl, '_blank')}>
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => handleDelete(record.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Documents" description="Manage and track official documents, certifications, and identification for all employees.">
        <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          data={documents}
          columns={columns}
          actions={actions}
          searchKey="employeeName"
          searchPlaceholder="Search by employee name..."
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Employee Document</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Employee</Label>
                <Select value={formData.employeeId} onValueChange={(val) => setFormData({...formData, employeeId: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees as any[])?.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input placeholder="e.g. Aadhar Card, Degree Certificate" value={formData.documentName} onChange={(e) => setFormData({...formData, documentName: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document URL</Label>
                <Input placeholder="https://..." value={formData.fileUrl} onChange={(e) => setFormData({...formData, fileUrl: e.target.value, fileName: e.target.value.split('/').pop() || ''})} />
                <p className="text-[10px] text-slate-400">Enter the link to the stored document (Google Drive, S3, etc.)</p>
              </div>

              <div className="space-y-2">
                <Label>Expiry Date (Optional)</Label>
                <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input placeholder="Any additional notes..." value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Upload & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
