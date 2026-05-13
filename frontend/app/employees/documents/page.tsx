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
import { Plus, Loader2, Save, Trash2, FileText, Download, ExternalLink, Calendar, Search, Pencil } from 'lucide-react'
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
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    documentName: '',
    fileName: '',
    fileUrl: '',
    uploadDate: new Date().toISOString().split('T')[0],
    isReceived: 'Yes',
    isOtherSelected: false
  })

  const documentTypes = [
    "Security Cheque",
    "Degree Certificate",
    "10th Marksheet",
    "12th Marksheet",
    "Profile Photo",
    "Security Deposite (Employee - 10000)",
    "Security Deposite (Intern - 2000)",
    "Other"
  ]

  const handleSave = async () => {
    const isDeposit = formData.documentName?.includes('Deposite')
    if (!formData.employeeId || !formData.documentName || (!isDeposit && !formData.fileUrl)) {
      toast.error('Please fill all required fields')
      return
    }

    const selectedEmp = employees.find((e: any) => e.id === formData.employeeId)
    const finalData = {
      ...formData,
      employeeName: selectedEmp?.name || 'Unknown',
      documentName: isDeposit ? `${formData.documentName} - Received: ${formData.isReceived}` : formData.documentName,
      fileUrl: isDeposit ? 'N/A' : formData.fileUrl,
      fileName: isDeposit ? 'Payment Record' : formData.fileName
    }

    setIsSubmitting(true)
    try {
      const url = editingId ? `${API_URL}/employee-documents/${editingId}` : `${API_URL}/employee-documents`
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      })

      if (response.ok) {
        toast.success(editingId ? 'Document updated successfully' : 'Document uploaded successfully')
        refresh()
        setModalOpen(false)
        setEditingId(null)
        setFormData({
          employeeId: '',
          employeeName: '',
          documentName: '',
          fileName: '',
          fileUrl: '',
          uploadDate: new Date().toISOString().split('T')[0],
          isReceived: 'Yes',
          isOtherSelected: false
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

  const handleEdit = (record: any) => {
    setEditingId(record.id)
    setFormData({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      documentName: record.documentName?.split(' - Received:')[0],
      fileName: record.fileName,
      fileUrl: record.fileUrl,
      uploadDate: record.uploadDate,
      isReceived: record.documentName?.includes('Received: Yes') ? 'Yes' : 'No',
      isOtherSelected: !documentTypes.includes(record.documentName?.split(' - Received:')[0] || '')
    })
    setModalOpen(true)
  }

  const columns = [
    { key: 'employeeName' as const, header: 'Employee' },
    { key: 'documentName' as const, header: 'Document Name' },
    { key: 'uploadDate' as const, header: 'Date', render: (record: any) => (
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
      <Button variant="ghost" size="icon" className="text-brand-teal" onClick={() => handleEdit(record)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => handleDelete(record.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  const [filterType, setFilterType] = useState<string>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('all')

  const filteredDocuments = documents.filter((doc: any) => {
    const matchesType = filterType === 'all' || doc.documentName?.includes(filterType)
    const matchesEmployee = filterEmployee === 'all' || doc.employeeId === filterEmployee
    return matchesType && matchesEmployee
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Documents" description="Manage and track official documents, certifications, and identification for all employees.">
        <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={() => { setEditingId(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </PageHeader>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Employee</Label>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
              <SelectValue placeholder="All Document Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {documentTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          data={filteredDocuments}
          columns={columns}
          actions={actions}
          searchKey="employeeName"
          searchPlaceholder="Search by employee name..."
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if(!open) setEditingId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Employee Document' : 'Upload Employee Document'}</DialogTitle>
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
                <Label>Document Type</Label>
                <Select 
                  value={formData.isOtherSelected ? "Other" : formData.documentName} 
                  onValueChange={(val) => {
                    if (val === "Other") {
                      setFormData({...formData, isOtherSelected: true, documentName: ''})
                    } else {
                      setFormData({...formData, isOtherSelected: false, documentName: val})
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.isOtherSelected && (
                  <Input 
                    placeholder="Enter custom document name..." 
                    className="mt-2 animate-in slide-in-from-top-1 duration-200"
                    value={formData.documentName}
                    onChange={(e) => setFormData({...formData, documentName: e.target.value})} 
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={formData.uploadDate} onChange={(e) => setFormData({...formData, uploadDate: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              {formData.documentName?.includes('Deposite') ? (
                <div className="space-y-2">
                  <Label>Deposit Received?</Label>
                  <Select 
                    value={formData.isReceived} 
                    onValueChange={(val) => setFormData({...formData, isReceived: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes, Received</SelectItem>
                      <SelectItem value="No">No, Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Document</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      className="flex-1"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        setIsSubmitting(true)
                        const formDataUpload = new FormData()
                        formDataUpload.append('file', file)
                        
                        try {
                          const response = await fetch(`${API_URL}/upload`, {
                            method: 'POST',
                            body: formDataUpload,
                          })
                          
                          if (response.ok) {
                            const data = await response.json()
                            const absoluteUrl = data.url.startsWith('http') 
                              ? data.url 
                              : `${API_URL}${data.url}`
                            
                            setFormData({
                              ...formData, 
                              fileUrl: absoluteUrl, 
                              fileName: file.name
                            })
                            toast.success('File uploaded successfully')
                          } else {
                            toast.error('Failed to upload file')
                          }
                        } catch (error) {
                          console.error('Upload error:', error)
                          toast.error('Error uploading file')
                        } finally {
                          setIsSubmitting(false)
                        }
                      }}
                    />
                  </div>
                  {formData.fileName && (
                    <p className="text-[10px] text-brand-teal font-medium">Selected: {formData.fileName}</p>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium tracking-tight">Upload official documents, certificates, or IDs.</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingId ? 'Update Document' : 'Upload & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
