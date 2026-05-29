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
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { useUser } from '@/hooks/useUser'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

export default function EmployeeDocumentsPage() {
  const router = useRouter()
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions()
  const { user } = useUser()
  const isHR = user?.role?.toLowerCase() === 'hr';
  const isAdminOrHR = isAdmin || isHR;
  const { data, refresh } = useApi()
  const employees = data?.employees || []
  const documents = data?.employeeDocuments || []
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('employee-documents', 'canView')) {
        router.push('/')
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission])

  // Official Letter Requests State
  const [activeMainTab, setActiveMainTab] = useState<'submitted' | 'requests'>('submitted')
  const [documentRequests, setDocumentRequests] = useState<any[]>([])
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [selectedRequestForSend, setSelectedRequestForSend] = useState<any>(null)
  const [requestFormData, setRequestFormData] = useState({
    documentType: 'Internship Offer Letter',
    reason: ''
  })
  const [sendFormData, setSendFormData] = useState({
    fileName: '',
    fileUrl: ''
  })

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
    isOtherSelected: false,
    status: 'Rejected'
  })

  const documentTypes = [
    "Security Cheque",
    "Degree Certificate",
    "10th Marksheet",
    "12th Marksheet",
    "Passport Photo",
    "Security Deposite (Employee - 10000)",
    "Security Deposite (Intern - 2000)",
    "Other"
  ]

  const fetchRequests = async () => {
    try {
      const url = isAdminOrHR 
        ? `${API_URL}/document-requests` 
        : `${API_URL}/document-requests?employeeId=${user?.id || user?.employeeId || ''}`
      const response = await fetch(url)
      if (response.ok) {
        setDocumentRequests(await response.json())
      }
    } catch (error) {
      console.error('Error fetching document requests:', error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
  }, [user, isAdminOrHR])

  const handleCreateRequest = async () => {
    if (!requestFormData.reason) {
      toast.error('Please specify a reason or purpose')
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/document-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user?.id || user?.employeeId || 'Unknown',
          employeeName: user?.name || 'Unknown',
          documentType: requestFormData.documentType,
          reason: requestFormData.reason,
          status: 'Pending',
          requestDate: new Date().toISOString().split('T')[0]
        })
      })
      
      if (response.ok) {
        toast.success('Document request submitted successfully')
        setIsRequestModalOpen(false)
        setRequestFormData({ documentType: 'Internship Offer Letter', reason: '' })
        fetchRequests()
      } else {
        toast.error('Failed to submit request')
      }
    } catch (error) {
      console.error('Submit request error:', error)
      toast.error('Error submitting request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRequestStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/document-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus
        })
      })
      
      if (response.ok) {
        toast.success(`Request marked as ${newStatus}`)
        fetchRequests()
      } else {
        toast.error('Failed to update request')
      }
    } catch (error) {
      console.error('Update request error:', error)
      toast.error('Error updating request')
    }
  }

  const handleSendLetter = async () => {
    if (!selectedRequestForSend || !sendFormData.fileUrl) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/document-requests/${selectedRequestForSend.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Sent',
          fileName: sendFormData.fileName,
          fileUrl: sendFormData.fileUrl,
          sentDate: new Date().toISOString().split('T')[0]
        })
      })
      
      if (response.ok) {
        toast.success('Document sent to employee successfully')
        setIsSendModalOpen(false)
        setSendFormData({ fileName: '', fileUrl: '' })
        setSelectedRequestForSend(null)
        fetchRequests()
      } else {
        toast.error('Failed to send document')
      }
    } catch (error) {
      console.error('Send document error:', error)
      toast.error('Error sending document')
    } finally {
      setIsSubmitting(false)
    }
  }

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
      fileName: isDeposit ? 'Payment Record' : formData.fileName,
      status: formData.status
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
          isOtherSelected: false,
          status: 'Rejected'
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
      isOtherSelected: !documentTypes.includes(record.documentName?.split(' - Received:')[0] || ''),
      status: record.status || 'Rejected'
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
    { key: 'status' as const, header: 'Status', render: (record: any) => {
      const allowedStatuses = ['Accepted', 'Rejected', 'Returned to Employee'];
      const displayStatus = allowedStatuses.includes(record.status) ? record.status : 'Pending';
      return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
          displayStatus === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          displayStatus === 'Returned to Employee' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
          displayStatus === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
          'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {displayStatus}
        </span>
      );
    }},
  ]

  const actions = (record: any) => {
    const hasEdit = isAdmin || checkPermission('employee-documents', 'canEdit')
    const hasDelete = isAdmin || checkPermission('employee-documents', 'canDelete')

    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => window.open(record.fileUrl, '_blank')}>
          <ExternalLink className="h-4 w-4" />
        </Button>
        {hasEdit && (
          <Button variant="ghost" size="icon" className="text-brand-teal" onClick={() => handleEdit(record)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {hasDelete && (
          <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => handleDelete(record.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  const [filterType, setFilterType] = useState<string>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('all')

  const filteredDocuments = documents.filter((doc: any) => {
    if (!isAdminOrHR) {
      if (doc.employeeId !== user?.id && doc.employeeId !== user?.employeeId) {
        return false
      }
    }
    const matchesType = filterType === 'all' || doc.documentName?.includes(filterType)
    const matchesEmployee = filterEmployee === 'all' || doc.employeeId === filterEmployee
    return matchesType && matchesEmployee
  })

  // Official Letter Requests Columns & Render Actions
  const requestColumns = [
    { key: 'employeeName' as const, header: 'Employee' },
    { key: 'documentType' as const, header: 'Letter Type' },
    { key: 'reason' as const, header: 'Reason' },
    { key: 'requestDate' as const, header: 'Date Requested' },
    { key: 'status' as const, header: 'Status', render: (record: any) => (
      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
        record.status === 'Sent' ? 'bg-emerald-50 text-emerald-600' :
        record.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
        record.status === 'Approved' ? 'bg-indigo-50 text-indigo-600' :
        'bg-rose-50 text-rose-600'
      }`}>
        {record.status}
      </span>
    )}
  ]

  const getTemplateId = (docType: string) => {
    switch (docType) {
      case "Internship Offer Letter": return "offer-letter";
      case "Employee Offer Letter": return "employee-offer-letter";
      case "Internship Completion Certificate": return "completion-certificate";
      case "Appointment Letter": return "appointment-letter";
      case "NDA & Agreement Letter": return "agreement-letter";
      default: return "";
    }
  }

  const requestActions = (record: any) => {
    return (
      <div className="flex items-center gap-2 justify-end">
        {(record.status === 'Pending' || record.status === 'Approved') && (
          <Button 
            className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold h-8 px-3 text-xs" 
            onClick={() => router.push(`/employees/documents/generate?employeeId=${record.employeeId}&template=${getTemplateId(record.documentType)}&requestId=${record.id}`)}
          >
            Generate Document
          </Button>
        )}
        {record.status === 'Sent' && record.fileUrl && (
          <>
            <Button variant="ghost" size="icon" className="text-brand-teal" onClick={() => window.open(record.fileUrl, '_blank')} title="View Letter">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500" onClick={() => {
              const link = document.createElement('a');
              link.href = record.fileUrl;
              link.setAttribute('download', record.fileName || 'document.pdf');
              link.setAttribute('target', '_blank');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} title="Download Letter">
              <Download className="h-4 w-4" />
            </Button>
          </>
        )}
        {record.status === 'Rejected' && (
          <span className="text-xs text-rose-600 font-bold uppercase">Rejected</span>
        )}
      </div>
    )
  }

  const employeeRequestActions = (record: any) => {
    return (
      <div className="flex items-center gap-2 justify-end">
        {record.status === 'Sent' && record.fileUrl ? (
          <>
            <Button variant="ghost" size="icon" className="text-brand-teal" onClick={() => window.open(record.fileUrl, '_blank')} title="View Letter">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500" onClick={() => {
              const link = document.createElement('a');
              link.href = record.fileUrl;
              link.setAttribute('download', record.fileName || 'document.pdf');
              link.setAttribute('target', '_blank');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} title="Download Letter">
              <Download className="h-4 w-4" />
            </Button>
          </>
        ) : record.status === 'Rejected' ? (
          <span className="text-xs text-rose-600 font-bold uppercase">Rejected</span>
        ) : (
          <span className="text-xs text-slate-400 font-medium italic">Awaiting Admin Action</span>
        )}
      </div>
    )
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Documents" description="Manage submitted employee records and request official company letters.">
        {activeMainTab === 'submitted' && (isAdmin || checkPermission('employee-documents', 'canAdd')) && (
          <Button className="bg-brand-teal hover:bg-brand-teal/90" onClick={() => {
            setEditingId(null);
            setFormData({
              employeeId: !isAdminOrHR ? (user?.id || '') : '',
              employeeName: !isAdminOrHR ? (user?.name || '') : '',
              documentName: '',
              fileName: '',
              fileUrl: '',
              uploadDate: new Date().toISOString().split('T')[0],
              isReceived: 'Yes',
              isOtherSelected: false
            });
            setModalOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        )}
        {activeMainTab === 'requests' && !isAdminOrHR && (
          <Button className="bg-brand-teal hover:bg-brand-teal/90 font-bold" onClick={() => setIsRequestModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request New Letter
          </Button>
        )}
      </PageHeader>

      <Tabs value={activeMainTab} onValueChange={(val: any) => setActiveMainTab(val)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="submitted" className="font-bold">Submitted Documents</TabsTrigger>
          <TabsTrigger value="requests" className="font-bold">Official Letters & Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="submitted" className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <DataTable
              data={filteredDocuments}
              columns={columns}
              actions={actions}
              searchKey={isAdminOrHR ? "employeeName" : undefined}
              searchPlaceholder="Search by employee name..."
              extraFilters={
                <>
                  {isAdminOrHR && (
                    <div className="w-48">
                      <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                        <SelectTrigger className="h-9 border-slate-200 bg-slate-50/30 text-xs font-semibold">
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
                  )}

                  <div className="w-48">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-9 border-slate-200 bg-slate-50/30 text-xs font-semibold">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {documentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <DataTable
              data={documentRequests}
              columns={isAdminOrHR ? requestColumns : [
                { key: 'documentType' as const, header: 'Letter Type' },
                { key: 'reason' as const, header: 'Reason' },
                { key: 'requestDate' as const, header: 'Requested Date' },
                { key: 'status' as const, header: 'Status', render: (record: any) => (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    record.status === 'Sent' ? 'bg-emerald-50 text-emerald-600' :
                    record.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                    record.status === 'Approved' ? 'bg-indigo-50 text-indigo-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {record.status}
                  </span>
                )}
              ]}
              actions={isAdminOrHR ? requestActions : employeeRequestActions}
              searchKey={isAdminOrHR ? "employeeName" : undefined}
              searchPlaceholder="Search by employee name..."
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Document Modal (Tab 1) */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if(!open) setEditingId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Employee Document' : 'Upload Employee Document'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              {isAdminOrHR && (
                <div className="space-y-2">
                  <Label>Select Employee</Label>
                  <Select value={formData.employeeId} onValueChange={(val) => setFormData({...formData, employeeId: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(employees as any[])?.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                  <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
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
                        
                        if (file.size > 512 * 1024 * 1024) {
                          toast.error('File size cannot exceed 512 MB')
                          e.target.value = ''
                          return
                        }
                        
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

              {isAdminOrHR && (
                <>
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <Label>Document Status</Label>
                    <Select 
                      value={formData.status || 'Rejected'} 
                      onValueChange={(val) => setFormData({...formData, status: val})}
                    >
                      <SelectTrigger className="w-full bg-white border-slate-200 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Accepted" className="text-slate-900 font-medium">Accepted</SelectItem>
                        <SelectItem value="Rejected" className="text-slate-900 font-medium">Rejected</SelectItem>
                        <SelectItem value="Returned to Employee" className="text-slate-900 font-medium">Returned to Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
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

      {/* Request New Letter Modal (Tab 2 - Employee) */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Official Letter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 w-1/2">
              <Label>Letter Type</Label>
              <Select 
                value={requestFormData.documentType} 
                onValueChange={(val) => setRequestFormData({...requestFormData, documentType: val})}
              >
                <SelectTrigger className="w-full bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internship Offer Letter">Internship Offer Letter</SelectItem>
                  <SelectItem value="Employee Offer Letter">Employee Offer Letter</SelectItem>
                  <SelectItem value="Internship Completion Certificate">Internship Completion Certificate</SelectItem>
                  <SelectItem value="Appointment Letter">Appointment Letter</SelectItem>
                  <SelectItem value="NDA & Agreement Letter">NDA & Agreement Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason / Purpose</Label>
              <Input 
                placeholder="e.g. For bank loan, higher education, etc." 
                value={requestFormData.reason} 
                onChange={(e) => setRequestFormData({...requestFormData, reason: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90 font-bold" onClick={handleCreateRequest} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate & Send PDF Modal (Tab 2 - Admin) */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate & Send Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              You can generate this document using the built-in Document Generator, download the PDF, and then upload it here to send to the employee.
            </p>
            <div className="flex justify-start">
              <Link href="/employees/documents/generate" target="_blank" className="text-xs text-brand-teal font-extrabold hover:underline flex items-center gap-1.5 bg-brand-light/50 px-3 py-1.5 rounded-lg border border-brand-teal/10">
                <FileText className="w-3.5 h-3.5" /> Go to Document Generator
              </Link>
            </div>
            <div className="border-t border-slate-100 my-2 pt-2" />
            <div className="space-y-2">
              <Label>Upload Generated PDF Document</Label>
              <Input 
                type="file" 
                accept="application/pdf"
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
                      
                      setSendFormData({
                        fileName: file.name,
                        fileUrl: absoluteUrl
                      })
                      toast.success('Document uploaded successfully')
                    } else {
                      toast.error('Failed to upload document')
                    }
                  } catch (error) {
                    console.error('Upload error:', error)
                    toast.error('Error uploading document')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              />
              {sendFormData.fileName && (
                <p className="text-[10px] text-brand-teal font-medium">Selected: {sendFormData.fileName}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSendModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90 font-bold" onClick={handleSendLetter} disabled={isSubmitting || !sendFormData.fileUrl}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Document to Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
