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
import { Plus, Loader2, Save, Trash2, FileText, Download, ExternalLink, Calendar, Search, Pencil, Eye, CheckCircle2, History, IndianRupee, ShieldCheck } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { useUser } from '@/hooks/useUser'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { useConfirm } from "@/context/ConfirmContext";
import DocumentTemplatesPage from '@/app/settings/document-templates/page'

export default function EmployeeDocumentsPage() {
  const { confirm } = useConfirm();
  const router = useRouter()
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions()
  const { user } = useUser()
  const isHR = user?.role?.toLowerCase() === 'hr';
  const isAdminOrHR = isAdmin || isHR;
  const { data, refreshItem } = useApi()
  const employees = data?.employees || []
  const documents = data?.employeeDocuments || []
  const [loading, setLoading] = useState(false)
  const [payrolls, setPayrolls] = useState<any[]>([])

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
    employeeId: '',
    employeeName: '',
    target: 10000,
    paid: 0,
    remaining: 10000,
    transactions: [],
    exempt: false,
    directPayments: []
  })

  // Partial Payment States
  const [directPaymentAmount, setDirectPaymentAmount] = useState('')
  const [directPaymentNote, setDirectPaymentNote] = useState('')
  const [isRecordingPayment, setIsRecordingPayment] = useState(false)

  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  const [selectedRecordLogs, setSelectedRecordLogs] = useState<any[]>([])

  const handleViewLedger = async (record: any) => {
    setIsLedgerModalOpen(true)
    setLedgerLoading(true)
    setDirectPaymentAmount('')
    setDirectPaymentNote('')
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

        const emp = employees.find((e: any) => e.id === record.employeeId)
        const directPayments = emp?.securityDepositDirectPayments || []
        const directPaidTotal = directPayments.reduce((sum: number, dp: any) => sum + (dp.amount || 0), 0)
        totalPaid += directPaidTotal
        
        const paidPayrolls = employeePayrolls.filter((p: any) => (p.securityDeposit || 0) > 0)
        const transactions = paidPayrolls.map((p: any) => ({
          month: p.month,
          year: p.year,
          amount: p.securityDeposit || 0,
          status: p.status || 'processed',
          type: 'payroll'
        }))

        // Add direct payments to transactions
        directPayments.forEach((dp: any) => {
          transactions.push({
            month: 'Direct Payment',
            year: dp.date || '',
            amount: dp.amount || 0,
            status: 'paid',
            type: 'direct',
            note: dp.note || ''
          })
        })

        const isExempt = emp?.securityDepositExempt || false
        const remaining = isExempt ? 0 : Math.max(0, target - totalPaid)
        const exemptedAmount = isExempt ? Math.max(0, target - totalPaid) : 0
        
        setLedgerData({
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          target,
          paid: isExempt ? totalPaid : totalPaid,
          remaining,
          exemptedAmount,
          transactions,
          exempt: isExempt,
          directPayments
        })
      }
    } catch (error) {
      console.error('Error fetching ledger details:', error)
      toast.error('Failed to load deposit ledger')
    } finally {
      setLedgerLoading(false)
    }
  }

  const handleRecordDirectPayment = async () => {
    const amount = parseFloat(directPaymentAmount)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }
    if (amount > ledgerData.remaining) {
      toast.error(`Amount cannot exceed remaining balance of ₹${ledgerData.remaining.toLocaleString('en-IN')}`)
      return
    }

    setIsRecordingPayment(true)
    try {
      const emp = employees.find((e: any) => e.id === ledgerData.employeeId)
      const existingPayments = emp?.securityDepositDirectPayments || []
      const newPayment = {
        amount,
        date: new Date().toISOString().split('T')[0],
        note: directPaymentNote || `Direct deposit payment of ₹${amount.toLocaleString('en-IN')}`,
        recordedBy: user?.name || 'Admin'
      }
      const updatedPayments = [...existingPayments, newPayment]

      const res = await fetch(`${API_URL}/employees/${ledgerData.employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityDepositDirectPayments: updatedPayments })
      })

      if (res.ok) {
        toast.success(`Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully`)
        setDirectPaymentAmount('')
        setDirectPaymentNote('')
        refreshItem('employees')
        // Refresh ledger data
        const newPaid = ledgerData.paid + amount
        const newRemaining = Math.max(0, ledgerData.target - newPaid)
        setLedgerData((prev: any) => ({
          ...prev,
          paid: newPaid,
          remaining: newRemaining,
          directPayments: updatedPayments,
          transactions: [...prev.transactions, {
            month: 'Direct Payment',
            year: newPayment.date,
            amount: newPayment.amount,
            status: 'paid',
            type: 'direct',
            note: newPayment.note
          }]
        }))
      } else {
        toast.error('Failed to record payment')
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      toast.error('Error recording direct payment')
    } finally {
      setIsRecordingPayment(false)
    }
  }

  const handleDeleteDirectPayment = async (paymentIndex: number) => {
    const isConfirmed = await confirm({
      title: "Delete Payment Entry",
      message: 'Are you sure you want to delete this direct payment entry? This action cannot be undone.',
      destructive: true,
      confirmText: "Delete"
    });
    if (!isConfirmed) return

    try {
      const emp = employees.find((e: any) => e.id === ledgerData.employeeId)
      const existingPayments = emp?.securityDepositDirectPayments || []
      const removedPayment = existingPayments[paymentIndex]
      if (!removedPayment) {
        toast.error('Payment entry not found')
        return
      }
      const updatedPayments = existingPayments.filter((_: any, i: number) => i !== paymentIndex)

      const res = await fetch(`${API_URL}/employees/${ledgerData.employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityDepositDirectPayments: updatedPayments })
      })

      if (res.ok) {
        toast.success(`Payment of ₹${removedPayment.amount.toLocaleString('en-IN')} deleted`)
        refreshItem('employees')
        const newPaid = ledgerData.paid - removedPayment.amount
        const newRemaining = ledgerData.exempt ? 0 : Math.max(0, ledgerData.target - newPaid)
        setLedgerData((prev: any) => ({
          ...prev,
          paid: newPaid,
          remaining: newRemaining,
          exemptedAmount: prev.exempt ? Math.max(0, prev.target - newPaid) : 0,
          directPayments: updatedPayments,
          transactions: prev.transactions.filter((t: any) => {
            if (t.type !== 'direct') return true
            // Match by amount, date, and note to find the right one
            if (t.amount === removedPayment.amount && t.year === removedPayment.date && t.note === (removedPayment.note || '')) return false
            return true
          })
        }))
      } else {
        toast.error('Failed to delete payment entry')
      }
    } catch (err) {
      console.error('Error deleting direct payment:', err)
      toast.error('Error deleting payment')
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
    status: 'Pending to Submit'
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
    const fetchPayrolls = async () => {
      try {
        const response = await fetch(`${API_URL}/payroll`)
        if (response.ok) {
          setPayrolls(await response.json())
        }
      } catch (err) {
        console.error(err)
      }
    }
    
    if (user) {
      fetchRequests()
      fetchDocTypes()
      fetchPayrolls()
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
        refreshItem('employeeDocuments')
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
          status: 'Pending to Submit'
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
    
    if (id.startsWith('pending-')) {
      toast.error('Cannot delete a required document placeholder directly. Remove it from the employee\'s Required Documents checklist instead.');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/employee-documents/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Document deleted')
        refreshItem('employeeDocuments')
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

  const handleDeleteRequest = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: 'Are you sure you want to delete this document request?',
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return

    try {
      const response = await fetch(`${API_URL}/document-requests/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Document request deleted')
        fetchRequests()
      } else {
        toast.error('Failed to delete document request')
      }
    } catch (error) {
      console.error('Error deleting document request:', error)
      toast.error('Failed to delete document request')
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
      status: record.status || 'Pending to Submit'
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
      const isDeposit = record.documentName?.includes('Deposite') || record.documentName?.includes('Deposit');
      if (isDeposit) {
        let target = 10000
        if (record.documentName?.includes('Intern - 2000')) target = 2000
        else if (record.documentName?.includes('Employee - 10000')) target = 10000
        else {
          const match = record.documentName?.match(/(\d+)/)
          if (match) target = Number(match[0])
        }
        
        const emp = employees.find((e: any) => e.id === record.employeeId)
        const isExempt = emp?.securityDepositExempt || false
        const directPayments = emp?.securityDepositDirectPayments || []
        const directPaid = directPayments.reduce((sum: number, dp: any) => sum + (dp.amount || 0), 0)
        
        const empPayrolls = payrolls.filter((p: any) => p.employeeId === record.employeeId)
        const payrollCollected = empPayrolls.reduce((sum: number, p: any) => sum + (p.securityDeposit || 0), 0)
        const collected = payrollCollected + directPaid
        
        if (isExempt) {
          const advanceAmount = Math.max(0, target - collected)
          return (
            <div className="flex flex-col gap-0.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase border bg-violet-50 text-violet-700 border-violet-200 inline-flex items-center gap-1 w-fit">
                <ShieldCheck className="w-3 h-3" /> Paid in Advance
              </span>
              {collected > 0 && advanceAmount > 0 && (
                <span className="text-[9px] text-slate-500 font-semibold">Payroll: ₹{collected.toLocaleString('en-IN')} · Advance: ₹{advanceAmount.toLocaleString('en-IN')}</span>
              )}
              {collected > 0 && advanceAmount === 0 && (
                <span className="text-[9px] text-slate-500 font-semibold">Fully collected via payroll + direct</span>
              )}
              {collected === 0 && (
                <span className="text-[9px] text-slate-500 font-semibold">Full ₹{target.toLocaleString('en-IN')} paid in advance</span>
              )}
            </div>
          )
        }
        
        if (collected >= target) {
          return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">Deposit Collected</span>
        } else {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase border bg-amber-50 text-amber-700 border-amber-200">Collected: ₹{collected.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}</span>
              {directPaid > 0 && <span className="text-[9px] text-slate-400 font-medium">Includes ₹{directPaid.toLocaleString('en-IN')} direct</span>}
            </div>
          )
        }
      }

      const allowedStatuses = ['Accepted', 'Rejected', 'Returned to Employee', 'Pending to Submit'];
      const displayStatus = allowedStatuses.includes(record.status) ? record.status : 'Pending to Submit';
      
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
            <SelectTrigger className={`h-7 w-[160px] px-2 py-0 rounded text-[10px] font-black uppercase border focus:ring-0 ${badgeClass}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending to Submit" className="text-[10px] font-bold">Pending to Submit</SelectItem>
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
          status: newStatus,
          userName: user?.name || 'System',
          performedBy: user?.id || user?.employeeId || 'System'
        }
        
        const response = await fetch(`${API_URL}/employee-documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (response.ok) {
          toast.success(`Document marked as ${newStatus}`)
          refreshItem('documentTypes')
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
          status: newStatus,
          userName: user?.name || 'System',
          performedBy: user?.id || user?.employeeId || 'System'
        }
        
        const response = await fetch(`${API_URL}/employee-documents/${record.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (response.ok) {
          toast.success(`Document status updated to ${newStatus}`)
          refreshItem('documentTypes')
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
        {hasDelete && (
          <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => handleDelete(record.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="text-blue-500" onClick={() => {
          if (record.isPendingSubmit) {
            toast.error("No logs for pending documents");
            return;
          }
          setSelectedRecordLogs(record.logs || []);
          setIsLogsModalOpen(true);
        }}>
          <History className="h-4 w-4" />
        </Button>
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
      let requiredDocs = emp.requiredDocuments || [];
      
      // Fix for corrupted live data where requiredDocuments might be a string or array of characters
      if (typeof requiredDocs === 'string') {
        try {
          if (requiredDocs.trim().startsWith('[')) {
            requiredDocs = JSON.parse(requiredDocs);
          } else {
            requiredDocs = requiredDocs.split(',').map(s => s.trim()).filter(Boolean);
          }
          if (!Array.isArray(requiredDocs)) requiredDocs = [];
        } catch {
          requiredDocs = [];
        }
      } else if (Array.isArray(requiredDocs) && requiredDocs.length > 0) {
        // Check if it's an array of single characters
        const isArrayOfChars = requiredDocs.every((x: any) => typeof x === 'string' && x.length === 1);
        if (isArrayOfChars && requiredDocs.length > 1) {
          const joinedStr = requiredDocs.join('');
          if (joinedStr.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(joinedStr);
              if (Array.isArray(parsed)) {
                requiredDocs = parsed;
              }
            } catch {}
          } else {
            requiredDocs = joinedStr.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }

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
        <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteRequest(record.id)} title="Delete Request">
          <Trash2 className="h-4 w-4" />
        </Button>
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
              status: 'Pending to Submit'
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
        <TabsList className={`grid w-full p-1 bg-slate-100/80 rounded-xl ${isAdminOrHR ? 'grid-cols-4 max-w-[800px]' : 'grid-cols-2 max-w-[400px]'}`}>
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
          {isAdminOrHR && (
            <TabsTrigger 
              value="templates" 
              className="font-bold data-[state=active]:bg-brand-teal data-[state=active]:text-white transition-all duration-200"
            >
              Document Templates
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="submitted" className="mt-6 space-y-6">
          {isAdminOrHR && filterType !== 'all' && (
            <div className={`grid gap-4 ${(filterType.includes('Deposit') || filterType.includes('Deposite')) ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Assigned Users</span>
                <span className="text-2xl font-black text-slate-800 mt-1">{filteredDocuments.length}</span>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center items-center">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Accepted / Submitted</span>
                <span className="text-2xl font-black text-emerald-700 mt-1">{filteredDocuments.filter((d: any) => d.status === 'Accepted' || (!d.isPendingSubmit && d.status !== 'Rejected' && d.status !== 'Returned to Employee' && d.status !== 'Pending to Submit')).length}</span>
              </div>
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-center items-center">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Left to Submit</span>
                <span className="text-2xl font-black text-rose-700 mt-1">{filteredDocuments.filter((d: any) => d.isPendingSubmit || d.status === 'Pending to Submit' || d.status === 'Rejected' || d.status === 'Returned to Employee').length}</span>
              </div>
              {(filterType.includes('Deposit') || filterType.includes('Deposite')) && (() => {
                 let totalTarget = 0;
                 let totalCollected = 0;
                 filteredDocuments.forEach((record: any) => {
                   let target = 10000;
                   if (record.documentName?.includes('Intern - 2000')) target = 2000;
                   else if (record.documentName?.includes('Employee - 10000')) target = 10000;
                   else {
                     const match = record.documentName?.match(/(\d+)/);
                     if (match) target = Number(match[0]);
                   }
                   
                   const emp = employees.find((e: any) => e.id === record.employeeId);
                   const isExempt = emp?.securityDepositExempt || false;
                   const directPayments = emp?.securityDepositDirectPayments || [];
                   const directPaid = directPayments.reduce((sum: number, dp: any) => sum + (dp.amount || 0), 0);
                   
                   const empPayrolls = payrolls.filter((p: any) => p.employeeId === record.employeeId);
                   const payrollCollected = empPayrolls.reduce((sum: number, p: any) => sum + (p.securityDeposit || 0), 0);
                   
                   const collected = payrollCollected + directPaid;
                   
                   if (isExempt) {
                     totalTarget += target;
                     totalCollected += target;
                   } else {
                     totalTarget += target;
                     totalCollected += Math.min(collected, target);
                   }
                 });
                 return (
                   <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-center items-center">
                     <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Financial Overview</span>
                     <span className="text-lg font-black text-blue-800 mt-1">₹{totalCollected.toLocaleString('en-IN')} / ₹{totalTarget.toLocaleString('en-IN')}</span>
                     <span className="text-[10px] text-blue-500 font-bold mt-1 uppercase tracking-wider">Total Collected</span>
                   </div>
                 );
              })()}
            </div>
          )}
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
                          {documentTypes.map((t: string) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
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

        {isAdminOrHR && (
          <TabsContent value="templates" className="mt-6 h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
              <DocumentTemplatesPage />
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
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-teal" /> Security Deposit Statement
                </DialogTitle>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Installment tracking ledger for <span className="text-slate-900 font-black">{ledgerData.employeeName}</span>
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-amber-50 hover:bg-amber-100 transition-colors px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm">
                <input
                  type="checkbox"
                  checked={ledgerData.exempt}
                  onChange={async (e) => {
                    const newExempt = e.target.checked
                    setLedgerData((prev: any) => {
                      const exemptedAmount = newExempt ? Math.max(0, prev.target - prev.paid) : 0
                      return {
                        ...prev,
                        exempt: newExempt,
                        remaining: newExempt ? 0 : Math.max(0, prev.target - prev.paid),
                        exemptedAmount
                      }
                    })
                    try {
                      const res = await fetch(`${API_URL}/employees/${ledgerData.employeeId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ securityDepositExempt: newExempt })
                      })
                      if (res.ok) {
                        toast.success(newExempt ? "Deposit marked as Exempt" : "Deposit exemption removed")
                        refreshItem('employees')
                      } else {
                        toast.error("Failed to update exemption status")
                      }
                    } catch (err) {
                      toast.error("Error updating exemption")
                    }
                  }}
                  className="w-4 h-4 text-brand-teal rounded border-amber-300 focus:ring-brand-teal"
                />
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Paid in Advance</span>
              </label>
            </div>
          </DialogHeader>

          {ledgerLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Progress Summary Cards */}
              <div className={`grid gap-4 ${ledgerData.exempt ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl shadow-sm text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Deposit</div>
                  <div className="text-lg font-black text-slate-800 mt-1">₹{ledgerData.target.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-emerald-50/40 border border-emerald-100/50 p-3 rounded-xl shadow-sm text-center">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total Paid</div>
                  <div className="text-lg font-black text-emerald-700 mt-1">₹{ledgerData.paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
                {ledgerData.exempt && (ledgerData.exemptedAmount > 0) && (
                  <div className="bg-violet-50/40 border border-violet-100/50 p-3 rounded-xl shadow-sm text-center">
                    <div className="text-[10px] font-bold text-violet-500 uppercase tracking-wider flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Paid in Advance</div>
                    <div className="text-lg font-black text-violet-700 mt-1">₹{ledgerData.exemptedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
                <div className={`p-3 rounded-xl shadow-sm text-center ${ledgerData.exempt ? 'bg-emerald-50/40 border border-emerald-100/50' : 'bg-rose-50/40 border border-rose-100/50'}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${ledgerData.exempt ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {ledgerData.exempt ? 'Balance' : 'Remaining Balance'}
                  </div>
                  <div className={`text-lg font-black mt-1 ${ledgerData.exempt ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ₹{ledgerData.exempt ? '0.00' : ledgerData.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Paid in Advance Banner */}
              {ledgerData.exempt && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-violet-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-violet-800">Employee opted to pay deposit in advance</p>
                    <p className="text-[10px] text-violet-600 mt-0.5">
                      {ledgerData.paid > 0 
                        ? `₹${ledgerData.paid.toLocaleString('en-IN')} was collected via payroll and ₹${ledgerData.exemptedAmount.toLocaleString('en-IN')} was paid directly in advance.`
                        : `The full deposit of ₹${ledgerData.target.toLocaleString('en-IN')} was paid in advance directly.`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Graphical Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Deduction Progress</span>
                  <span className="text-brand-teal">
                    {ledgerData.exempt 
                      ? '100% (Paid in Advance)' 
                      : `${Math.min(100, Math.round((ledgerData.paid / ledgerData.target) * 100))}% Completed`
                    }
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                  <div 
                    className="bg-brand-teal h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (ledgerData.paid / ledgerData.target) * 100)}%` }}
                  />
                  {ledgerData.exempt && ledgerData.exemptedAmount > 0 && (
                    <div 
                      className="bg-violet-400/60 h-full rounded-r-full transition-all duration-500 absolute top-0" 
                      style={{ 
                        left: `${Math.min(100, (ledgerData.paid / ledgerData.target) * 100)}%`,
                        width: `${Math.min(100 - (ledgerData.paid / ledgerData.target) * 100, (ledgerData.exemptedAmount / ledgerData.target) * 100)}%`
                      }}
                    />
                  )}
                </div>
                {ledgerData.exempt && (
                  <div className="flex items-center gap-4 text-[10px] font-bold">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-teal inline-block" /> Payroll</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-400/60 inline-block" /> Paid in Advance</span>
                  </div>
                )}
              </div>

              {/* Record Direct Payment - Only when not exempt and balance remaining */}
              {!ledgerData.exempt && ledgerData.remaining > 0 && isAdminOrHR && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Record Direct Payment
                  </h4>
                  <p className="text-[10px] text-blue-600 font-medium -mt-1">
                    Record a partial or full deposit payment made directly by the employee (cash, UPI, bank transfer, etc.)
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] font-bold text-blue-700 uppercase">Amount (₹)</Label>
                      <Input
                        type="number"
                        min="1"
                        max={ledgerData.remaining}
                        placeholder={`Max ₹${ledgerData.remaining.toLocaleString('en-IN')}`}
                        value={directPaymentAmount}
                        onChange={(e) => setDirectPaymentAmount(e.target.value)}
                        className="h-9 border-blue-200 bg-white focus:border-blue-400 text-sm font-bold"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] font-bold text-blue-700 uppercase">Note (Optional)</Label>
                      <Input
                        type="text"
                        placeholder="e.g. Cash payment, UPI transfer..."
                        value={directPaymentNote}
                        onChange={(e) => setDirectPaymentNote(e.target.value)}
                        className="h-9 border-blue-200 bg-white focus:border-blue-400 text-sm"
                      />
                    </div>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 text-xs shadow-sm"
                      onClick={handleRecordDirectPayment}
                      disabled={isRecordingPayment || !directPaymentAmount}
                    >
                      {isRecordingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <IndianRupee className="w-3.5 h-3.5 mr-1" />}
                      Record
                    </Button>
                  </div>
                </div>
              )}

              {/* Installment History Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Payment History</h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                        <th className="py-2.5 px-4">Period / Source</th>
                        <th className="py-2.5 px-4">Amount</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Status</th>
                        {isAdminOrHR && <th className="py-2.5 px-4 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {ledgerData.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={isAdminOrHR ? 5 : 4} className="py-6 text-center text-slate-400 italic">No deposit payments recorded yet.</td>
                        </tr>
                      ) : (
                        ledgerData.transactions.map((t: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4">
                              <div className="flex flex-col">
                                <span>{t.month} {t.year}</span>
                                {t.note && <span className="text-[9px] text-slate-400 font-normal">{t.note}</span>}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-900 font-extrabold">₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                t.type === 'direct' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {t.type === 'direct' ? 'Direct' : 'Payroll'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                t.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {t.status === 'paid' ? 'Cleared' : 'Draft'}
                              </span>
                            </td>
                            {isAdminOrHR && (
                              <td className="py-2.5 px-4 text-right">
                                {t.type === 'direct' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                    onClick={() => {
                                      // Find the index in directPayments array
                                      const directOnly = ledgerData.transactions.filter((tr: any) => tr.type === 'direct')
                                      const directIdx = directOnly.indexOf(t)
                                      if (directIdx !== -1) handleDeleteDirectPayment(directIdx)
                                    }}
                                    title="Delete this payment entry"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </td>
                            )}
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
      {/* Logs Modal */}
      <Dialog open={isLogsModalOpen} onOpenChange={setIsLogsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Status Change Logs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto mt-2 pr-2">
            {!selectedRecordLogs || selectedRecordLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No logs available for this document.</p>
            ) : (
              selectedRecordLogs.map((log, index) => (
                <div key={index} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{log.changedBy}</p>
                    <p className="text-xs text-gray-500 mt-1">Changed from <span className="font-medium text-gray-700">{log.oldStatus}</span> to <span className="font-medium text-gray-700">{log.newStatus}</span></p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
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
