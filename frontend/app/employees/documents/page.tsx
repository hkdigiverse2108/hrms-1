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
import { Plus, Loader2, Save, Trash2, FileText, Download, ExternalLink, Calendar, Search, Pencil, Eye, CheckCircle2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { useUser } from '@/hooks/useUser'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { useConfirm } from "@/context/ConfirmContext";

export default function EmployeeDocumentsPage() {
  const { confirm } = useConfirm();
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
  
  // Deposit Ledger States
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerData, setLedgerData] = useState<any>({
    employeeName: '',
    target: 10000,
    paid: 0,
    remaining: 10000,
    transactions: []
  })

  const handleViewLedger = async (record: any) => {
    setIsLedgerModalOpen(true)
    setLedgerLoading(true)
    try {
      const response = await fetch(`${API_URL}/payroll`)
      if (response.ok) {
        const allPayrolls = await response.json()
        const employeePayrolls = allPayrolls.filter((p: any) => p.employeeId === record.employeeId)
        
        // Sort by year and month
        const monthsOrder = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        employeePayrolls.sort((a: any, b: any) => {
          if (a.year !== b.year) return b.year - a.year
          return monthsOrder.indexOf(b.month) - monthsOrder.indexOf(a.month)
        })

        let totalPaid = employeePayrolls.reduce((sum: number, p: any) => sum + (p.securityDeposit || 0), 0)
        
        let target = 10000
        if (record.documentName?.includes('Intern - 2000')) {
          target = 2000
        } else if (record.documentName?.includes('Employee - 10000')) {
          target = 10000
        } else {
          // Parse target from string if custom
          const match = record.documentName?.match(/(\d+)/)
          if (match) {
            target = Number(match[0])
          }
        }

        const isAccepted = record.status === 'Accepted'
        
        const paidPayrolls = employeePayrolls.filter((p: any) => (p.securityDeposit || 0) > 0)
        const transactions = paidPayrolls.map((p: any) => ({
          month: p.month,
          year: p.year,
          amount: p.securityDeposit || 0,
          status: p.status || 'processed'
        }))

        if (isAccepted) {
          const remainder = target - totalPaid
          if (remainder > 0) {
            transactions.push({
              month: 'Manual Direct Payment',
              year: '(Accepted)',
              amount: remainder,
              status: 'paid'
            })
          }
          totalPaid = target
        }

        const remaining = Math.max(0, target - totalPaid)
        
        setLedgerData({
          employeeName: record.employeeName,
          target,
          paid: totalPaid,
          remaining,
          transactions
        })
      }
    } catch (error) {
      console.error('Error fetching ledger details:', error)
      toast.error('Failed to load deposit ledger')
    } finally {
      setLedgerLoading(false)
    }
  }

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
    status: 'Pending'
  })

  const [docTypes, setDocTypes] = useState<any[]>([])
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<any>(null)
  const [typeForm, setTypeForm] = useState({ name: '', description: '' })

  const fetchDocTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/document-types`)
      if (response.ok) {
        setDocTypes(await response.json())
      }
    } catch (error) {
      console.error('Error fetching document types:', error)
    }
  }

  const documentTypes = [...docTypes.map((t: any) => t.name), "Other"]

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
      fetchDocTypes()
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
    if (!formData.employeeId || !formData.documentName) {
      toast.error('Please fill all required fields')
      return
    }

    const selectedEmp = employees.find((e: any) => e.id === formData.employeeId)
    const finalData = {
      ...formData,
      employeeName: selectedEmp?.name || 'Unknown',
      documentName: formData.documentName,
      fileUrl: formData.fileUrl || 'N/A',
      fileName: formData.fileName || 'Payment Record',
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
        toast.success(editingId ? 'Document updated successfully' : 'Document added successfully')
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
          status: 'Pending'
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
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: 'Are you sure you want to delete this document?',
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return
    
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

  const handleSaveType = async () => {
    if (!typeForm.name) {
      toast.error('Please enter a document type name')
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingType ? `${API_URL}/document-types/${editingType.id}` : `${API_URL}/document-types`
      const method = editingType ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeForm)
      })

      if (response.ok) {
        toast.success(editingType ? 'Document type updated' : 'Document type created')
        setTypeForm({ name: '', description: '' })
        setEditingType(null)
        setIsTypeModalOpen(false)
        fetchDocTypes()
      } else {
        toast.error('Failed to save document type')
      }
    } catch (error) {
      console.error('Error saving document type:', error)
      toast.error('Error saving document type')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteType = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: 'Are you sure you want to delete this document type?',
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return

    try {
      const response = await fetch(`${API_URL}/document-types/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Document type deleted')
        fetchDocTypes()
      } else {
        toast.error('Failed to delete document type')
      }
    } catch (error) {
      console.error('Error deleting document type:', error)
      toast.error('Error deleting document type')
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
      status: record.status || 'Pending'
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
      const allowedStatuses = ['Accepted', 'Rejected', 'Returned to Employee', 'Pending to Submit', 'Pending'];
      const displayStatus = allowedStatuses.includes(record.status) ? record.status : 'Pending';
      
      const badgeClass = displayStatus === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                         displayStatus === 'Returned to Employee' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                         displayStatus === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                         displayStatus === 'Pending to Submit' ? 'bg-gray-100 text-gray-500 border-gray-300' :
                         'bg-amber-50 text-amber-700 border-amber-200';

      if (!isAdminOrHR) {
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${badgeClass}`}>
            {displayStatus}
          </span>
        );
      }

      return (
        <div onClick={(e) => e.stopPropagation()}>
          <Select 
            value={displayStatus} 
            onValueChange={(val) => handleStatusUpdate(record, val)}
          >
            <SelectTrigger className={`h-7 w-[130px] px-2 py-0 rounded text-[10px] font-black uppercase border focus:ring-0 ${badgeClass}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {record.isPendingSubmit && <SelectItem value="Pending to Submit" className="text-[10px] font-bold">Pending to Submit</SelectItem>}
              <SelectItem value="Pending" className="text-[10px] font-bold">Pending</SelectItem>
              <SelectItem value="Accepted" className="text-[10px] font-bold text-emerald-600">Accepted</SelectItem>
              <SelectItem value="Rejected" className="text-[10px] font-bold text-rose-600">Rejected</SelectItem>
              <SelectItem value="Returned to Employee" className="text-[10px] font-bold text-indigo-600">Returned to Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }},
  ]

  const handleStatusUpdate = async (record: any, newStatus: string) => {
    // Prevent updating a pending to submit to itself or doing redundant work
    if (newStatus === record.status) return;

    try {
      if (record.isPendingSubmit) {
        if (newStatus === 'Pending to Submit') return;
        
        const payload = {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          documentName: record.documentName,
          fileUrl: 'N/A',
          fileName: 'N/A',
          uploadDate: new Date().toISOString().split('T')[0],
          status: newStatus
        }
        
        const response = await fetch(`${API_URL}/employee-documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (response.ok) {
          toast.success(`Document marked as ${newStatus}`)
          refresh()
        } else {
          toast.error('Failed to update document status')
        }
      } else {
        const payload = {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          documentName: record.documentName,
          fileUrl: record.fileUrl || 'N/A',
          fileName: record.fileName || 'N/A',
          uploadDate: record.uploadDate,
          status: newStatus
        }
        
        const response = await fetch(`${API_URL}/employee-documents/${record.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (response.ok) {
          toast.success(`Document status updated to ${newStatus}`)
          refresh()
        } else {
          toast.error('Failed to update document status')
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Error occurred')
    }
  }


  const actions = (record: any) => {
    const hasEdit = isAdmin || checkPermission('employee-documents', 'canEdit')
    const hasDelete = isAdmin || checkPermission('employee-documents', 'canDelete')
    const isDeposit = record.documentName?.includes('Deposite')
    const hasFile = record.fileUrl && record.fileUrl !== 'N/A'
    const isPendingSubmit = record.isPendingSubmit

    return (
      <div className="flex items-center gap-2">
        {isDeposit && (
          <Button variant="ghost" size="icon" className="text-brand-teal" onClick={() => handleViewLedger(record)} title="View Deposit Ledger">
            <Eye className="h-4 w-4" />
          </Button>
        )}

        {hasFile && !isPendingSubmit && (
          <Button variant="ghost" size="icon" onClick={() => window.open(record.fileUrl, '_blank')} title="View Document File">
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        {hasDelete && !isPendingSubmit && (
          <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => handleDelete(record.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  const [filterType, setFilterType] = useState<string>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('all')

  const allDocumentsWithPlaceholders = () => {
    const combined: any[] = [];
    
    const relevantEmployees = (!isAdminOrHR) 
      ? employees.filter((e: any) => e.id === user?.id || e.employeeId === user?.employeeId)
      : (filterEmployee !== 'all' ? employees.filter((e: any) => e.id === filterEmployee) : employees);
      
    relevantEmployees.forEach((emp: any) => {
      const requiredDocs = emp.requiredDocuments || [];
      requiredDocs.forEach((reqDoc: string) => {
        const exists = documents.find((d: any) => d.employeeId === emp.id && d.documentName === reqDoc);
        if (exists) {
          combined.push(exists);
        } else {
          combined.push({
            id: `pending-${emp.id}-${reqDoc}`,
            employeeId: emp.id,
            employeeName: emp.name,
            documentName: reqDoc,
            uploadDate: '-',
            status: 'Pending to Submit',
            isPendingSubmit: true
          });
        }
      });
    });
    
    return combined;
  };

  const processedDocuments = allDocumentsWithPlaceholders();

  const filteredDocuments = processedDocuments.filter((doc: any) => {
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
        {activeMainTab === 'submitted' && isAdminOrHR && (
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
              isOtherSelected: false,
              status: 'Pending'
            });
            setModalOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        )}
        {activeMainTab === 'requests' && !isAdminOrHR && (
          <Button className="bg-brand-teal hover:bg-brand-teal/90 font-bold" onClick={() => setIsRequestModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request New Letter
          </Button>
        )}
        {activeMainTab === 'types' && isAdminOrHR && (
          <Button className="bg-brand-teal hover:bg-brand-teal/90 font-bold" onClick={() => {
            setEditingType(null);
            setTypeForm({ name: '', description: '' });
            setIsTypeModalOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Document Type
          </Button>
        )}
      </PageHeader>

      <Tabs value={activeMainTab} onValueChange={(val: any) => setActiveMainTab(val)} className="w-full">
        <TabsList className={`grid w-full p-1 bg-slate-100/80 rounded-xl ${isAdminOrHR ? 'grid-cols-3 max-w-[600px]' : 'grid-cols-2 max-w-[400px]'}`}>
          <TabsTrigger 
            value="submitted" 
            className="font-bold data-[state=active]:bg-brand-teal data-[state=active]:text-white transition-all duration-200"
          >
            Submitted Documents
          </TabsTrigger>
          <TabsTrigger 
            value="requests" 
            className="font-bold data-[state=active]:bg-brand-teal data-[state=active]:text-white transition-all duration-200"
          >
            Official Letters & Requests
          </TabsTrigger>
          {isAdminOrHR && (
            <TabsTrigger 
              value="types" 
              className="font-bold data-[state=active]:bg-brand-teal data-[state=active]:text-white transition-all duration-200"
            >
              Document Types
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="submitted" className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <DataTable
              data={filteredDocuments}
              columns={columns}
              actions={isAdminOrHR ? actions : undefined}
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

                  {isAdminOrHR && (
                    <div className="w-48">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-9 border-slate-200 bg-slate-50/30 text-xs font-semibold">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {documentTypes.map((t: any) => (
                            <SelectItem key={t.id || t._id || t.name} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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

        {isAdminOrHR && (
          <TabsContent value="types" className="mt-6 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <DataTable
                data={docTypes}
                columns={[
                  { key: 'name' as const, header: 'Document Type' },
                  { key: 'description' as const, header: 'Description' }
                ]}
                actions={(record: any) => (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-brand-teal" 
                      onClick={() => {
                        setEditingType(record);
                        setTypeForm({ name: record.name, description: record.description || '' });
                        setIsTypeModalOpen(true);
                      }}
                      title="Edit Document Type"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-rose-500" 
                      onClick={() => handleDeleteType(record.id)}
                      title="Delete Document Type"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                searchKey="name"
                searchPlaceholder="Search by document type..."
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Document Modal (Tab 1) */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if(!open) setEditingId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Employee Document' : 'Add Employee Document'}</DialogTitle>
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
              {isAdminOrHR && (
                <>
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <Label>Document Status</Label>
                    <Select 
                      value={formData.status || 'Pending'} 
                      onValueChange={(val) => setFormData({...formData, status: val})}
                    >
                      <SelectTrigger className="w-full bg-white border-slate-200 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending" className="text-slate-900 font-medium">Pending</SelectItem>
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
              {editingId ? 'Update Document' : 'Save'}
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
      {/* Security Deposit Ledger Modal */}
      <Dialog open={isLedgerModalOpen} onOpenChange={setIsLedgerModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-teal" /> Security Deposit Statement
            </DialogTitle>
            <p className="text-xs text-slate-500 font-semibold">
              Installment tracking ledger for <span className="text-slate-900 font-black">{ledgerData.employeeName}</span>
            </p>
          </DialogHeader>

          {ledgerLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Progress Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl shadow-sm text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Deposit</div>
                  <div className="text-lg font-black text-slate-800 mt-1">₹{ledgerData.target.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-emerald-50/40 border border-emerald-100/50 p-3 rounded-xl shadow-sm text-center">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total Paid</div>
                  <div className="text-lg font-black text-emerald-700 mt-1">₹{ledgerData.paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-rose-50/40 border border-rose-100/50 p-3 rounded-xl shadow-sm text-center">
                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Remaining Balance</div>
                  <div className="text-lg font-black text-rose-700 mt-1">₹{ledgerData.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              {/* Graphical Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Deduction Progress</span>
                  <span className="text-brand-teal">{Math.min(100, Math.round((ledgerData.paid / ledgerData.target) * 100))}% Completed</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-teal h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (ledgerData.paid / ledgerData.target) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Installment History Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Installment History</h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                        <th className="py-2.5 px-4">Period</th>
                        <th className="py-2.5 px-4">Amount Deducted</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {ledgerData.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400 italic">No deposit deductions processed yet.</td>
                        </tr>
                      ) : (
                        ledgerData.transactions.map((t: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4">{t.month} {t.year}</td>
                            <td className="py-2.5 px-4 text-slate-900 font-extrabold">₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                t.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {t.status === 'paid' ? 'Cleared' : 'Draft'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button className="bg-brand-teal hover:bg-brand-teal/90 font-bold" onClick={() => setIsLedgerModalOpen(false)}>Close Statement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Document Type Modal */}
      <Dialog open={isTypeModalOpen} onOpenChange={(open) => { setIsTypeModalOpen(open); if(!open) setEditingType(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type Name</Label>
              <Input 
                placeholder="e.g. Experience Letter, Degree Certificate..." 
                value={typeForm.name} 
                onChange={(e) => setTypeForm({...typeForm, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Brief description of the document purpose..." 
                value={typeForm.description} 
                onChange={(e) => setTypeForm({...typeForm, description: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTypeModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90 font-bold" onClick={handleSaveType} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingType ? 'Save Changes' : 'Create Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
