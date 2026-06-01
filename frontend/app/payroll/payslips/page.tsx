'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Printer, Download, Mail, Building2, User, Calendar, CreditCard, Loader2, Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { DataTable } from '@/components/hrms/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PlusCircle } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import type { Payroll } from '@/lib/types'

const monthMap: Record<string, string> = {
  'January': '01',
  'February': '02',
  'March': '03',
  'April': '04',
  'May': '05',
  'June': '06',
  'July': '07',
  'August': '08',
  'September': '09',
  'October': '10',
  'November': '11',
  'December': '12'
}

const getMonthNumber = (monthName: string): string => {
  if (!monthName) return '01'
  const trimmed = monthName.trim()
  const name = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  return monthMap[name] || '01'
}

const getPayslipNumber = (record: any, allPayrolls: any[]): string => {
  const yearStr = record.year ? String(record.year).trim() : '2026'
  const recordMonthTrimmed = record.month ? String(record.month).trim().toLowerCase() : ''

  // Filter all records matching this month and year (case-insensitive and trimmed)
  const filtered = allPayrolls.filter(p => {
    const pMonthTrimmed = p.month ? String(p.month).trim().toLowerCase() : ''
    const pYearStr = p.year ? String(p.year).trim() : ''
    return pMonthTrimmed === recordMonthTrimmed && pYearStr === yearStr
  })

  // Sort them stable by id / _id
  const sorted = [...filtered].sort((a, b) => {
    const idA = a.id || a._id || ''
    const idB = b.id || b._id || ''
    return idA.localeCompare(idB)
  })

  // Find index of current record
  const index = sorted.findIndex(p => (p.id || p._id) === (record.id || record._id))
  
  // Convert 0-based index to 1-based sequential number, pad with leading zeros to 3 digits (e.g. 001)
  const sequenceNum = index !== -1 ? index + 1 : sorted.length + 1
  const sequenceStr = String(sequenceNum).padStart(3, '0')

  const monthStr = getMonthNumber(record.month)
  return `SSHK-${yearStr}${monthStr}${sequenceStr}`
}

function SinglePayslip({ 
  record, 
  employee, 
  numberToWords,
  isAdminOrHR,
  onMarkAsPaid,
  onUpdate,
  onDelete,
  payslipNumber
}: { 
  record: any, 
  employee: any, 
  numberToWords: (n: number) => string,
  isAdminOrHR?: boolean,
  onMarkAsPaid?: (record: any) => void,
  onUpdate?: (record: any) => void,
  onDelete?: (id: string) => void,
  payslipNumber?: string
}) {
  const totalSalary = record.netSalary || 0;
  return (
    <div 
      className="payslip-card bg-white p-12 mb-8 last:mb-0 break-after-page max-w-4xl mx-auto relative border-0 shadow-none"
      style={{ fontFamily: "'Poppins', sans-serif", WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
    >
      {/* Header - Brand Section */}
      <div className="flex justify-between items-center pb-4 border-b-3 border-gray-300">
        <div className="flex items-center">
          <img 
            src="/logo.png" 
            alt="HK DigiVerse Logo" 
            width={220}
            height={107}
            className="w-[220px] h-auto object-contain"
            style={{ imageRendering: 'auto' }}
          />
        </div>
        <div className="text-left text-[15px] text-slate-700 space-y-1.5 font-normal">
          <p>Email: hrmangukiya3494@gmail.com</p>
          <p>Contact No: 8866005029</p>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr] gap-4 py-8">
        <div className="space-y-1">
          <p className="text-[15px] text-slate-700 font-normal">Payslip No.</p>
          <p className="text-[17px] font-bold text-slate-900 text-black whitespace-nowrap">
            {payslipNumber || `INV-${record.year}${record.month.toLowerCase()}-${record.id?.slice(-12).toUpperCase()}`}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[15px] text-slate-700 font-normal">Date :</p>
          <p className="text-[17px] font-bold text-slate-900 text-black">
            {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[15px] text-slate-700 font-normal">Payment Status :</p>
          <p className="text-[17px] font-bold text-slate-900 text-black lowercase">
            {record.status === 'processed' ? 'draft' : (record.status || 'draft')}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[15px] text-slate-700 font-normal">Total Amount :</p>
          <p className="text-[17px] font-bold text-slate-900 text-black">
            ₹{totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Employee Info Section */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-2">
        <div className="flex justify-between items-center py-1">
          <span className="text-[16px] text-slate-700 font-medium">Name :</span>
          <span className="text-[17px] font-medium text-slate-900 text-right">{record.employeeName}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[16px] text-slate-700 font-medium">Department :</span>
          <span className="text-[17px] font-medium text-slate-900 text-right">{employee?.department || 'Development'}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[16px] text-slate-700 font-medium">Designation :</span>
          <span className="text-[17px] font-medium text-slate-900 text-right">{employee?.designation || 'Software Engineer'}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[16px] text-slate-700 font-medium">Position :</span>
          <span className="text-[17px] font-medium text-slate-900 text-right">{employee?.role || 'Intern'}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[16px] text-slate-700 font-medium">Email :</span>
          <span className="text-[17px] font-medium text-slate-900 text-right">{employee?.email || 'janvivasani13@gmil.com'}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-[16px] text-slate-700 font-medium">Phone :</span>
          <span className="text-[17px] font-medium text-slate-900 text-right">{employee?.phone || '8200548988'}</span>
        </div>
      </div>

      {/* Salary Details Section */}
      <div className="mt-6">
        <div className="bg-[#2b5f60] text-white px-6 py-2 text-[21px] font-bold">
          Salary Details
        </div>
        <div className="bg-[#f5f6f9] px-6 py-4 space-y-4">
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-[16px] text-slate-700 font-medium">Base Salary</span>
            <span className="text-[16px] font-medium text-slate-900 tabular-nums text-right">{record.basicSalary?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-[16px] text-slate-700 font-medium">Bonus</span>
            <span className="text-[16px] font-medium text-slate-900 tabular-nums text-right">{((record.bonus || 0) + (record.allowances || 0)).toLocaleString()}</span>
          </div>
          {record.deductions && record.deductions > 0 ? (
            <div className="flex justify-between items-center text-slate-700">
              <span className="text-[16px] text-slate-700 font-medium">Deductions</span>
              <span className="text-[16px] font-medium text-slate-900 tabular-nums text-right">-{record.deductions?.toLocaleString()}</span>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end items-center gap-20 py-6">
          <span className="text-[16px] font-medium text-slate-700">Total Salary</span>
          <span className="text-[17px] font-bold text-slate-900 text-black">₹{totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  )
}

function PayslipContent() {
  const searchParams = useSearchParams()
  const payrollId = searchParams.get('id')
  const [allPayrolls, setAllPayrolls] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  // Auth roles logic - fallback to localStorage synchronously to prevent flicker/race condition
  const { user } = useUser()
  const isAdminOrHR = (() => {
    if (user) {
      return user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'hr' || user.name === 'Admin Admin'
    }
    if (typeof window !== 'undefined') {
      const uStr = localStorage.getItem('user')
      if (uStr) {
        const u = JSON.parse(uStr)
        return u.role?.toLowerCase() === 'admin' || u.role?.toLowerCase() === 'hr' || u.name === 'Admin Admin'
      }
    }
    return false
  })()

  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const uStr = localStorage.getItem('user')
      if (uStr) {
        const u = JSON.parse(uStr)
        const isAdm = u.role?.toLowerCase() === 'admin' || u.role?.toLowerCase() === 'hr' || u.name === 'Admin Admin'
        if (!isAdm) return u.id || u._id || 'all'
      }
    }
    return 'all'
  })
  const [selectedMonth, setSelectedMonth] = useState<string>('May')
  const [selectedYear, setSelectedYear] = useState<string>('2026')

  // Keep selectedEmpId synchronized with logged-in user if role is employee
  useEffect(() => {
    if (user && !isAdminOrHR) {
      setSelectedEmpId(user.id || user._id || '')
    }
  }, [user, isAdminOrHR])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Payroll>>({
    month: 'May',
    year: 2026,
    status: 'processed',
    basicSalary: 0,
    allowances: 0,
    bonus: 0,
    deductions: 0,
    penalty: 0,
    netSalary: 0,
    totalWorkingDays: 26,
    workedDays: 26,
    leaveDays: 0,
    lopDays: 0
  })
  const [isEditing, setIsEditing] = useState(false)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = ['2024', '2025', '2026'];

  const numberToWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/) as any;
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : '';
    return str;
  }

  const handleDownloadPDF = () => {
    setIsDownloading(true)
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.onload = resolve
        script.onerror = reject
        document.body.appendChild(script)
      })
    }

    const generate = async () => {
      try {
        if (!(window as any).domtoimage) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js')
        }
        if (!(window as any).jspdf) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        }
        
        const nodes = document.querySelectorAll('.payslip-card')
        if (nodes.length === 0) return

        const { jsPDF } = (window as any).jspdf
        const pdf = new jsPDF('p', 'mm', 'a4')

        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i] as HTMLElement
          
          const rect = node.getBoundingClientRect()
          const nodeWidth = rect.width || node.clientWidth || 800
          const nodeHeight = rect.height || node.clientHeight || 1131
          
          const clone = node.cloneNode(true) as HTMLElement
          
          const container = document.createElement('div')
          container.style.position = 'fixed'
          container.style.left = '-10000px'
          container.style.top = '0'
          container.style.width = `${nodeWidth}px`
          container.style.height = `${nodeHeight}px`
          container.style.overflow = 'hidden'
          container.style.background = 'white'
          container.appendChild(clone)
          document.body.appendChild(container)

          clone.style.width = `${nodeWidth}px`
          clone.style.height = `${nodeHeight}px`
          clone.style.margin = '0'
          clone.style.padding = '48px'
          clone.style.position = 'relative'
          clone.style.transform = 'none'
          clone.style.boxShadow = 'none'
          clone.style.border = 'none'

          const scale = 2
          const dataUrl = await (window as any).domtoimage.toPng(clone, {
            bgcolor: '#ffffff',
            width: nodeWidth * scale,
            height: nodeHeight * scale,
            cacheBust: true,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${nodeWidth}px`,
              height: `${nodeHeight}px`,
            }
          })
          
          document.body.removeChild(container)
          
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = (nodeHeight * pdfWidth) / nodeWidth
          
          if (i > 0) pdf.addPage()
          pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
        }

        const filename = selectedEmpId === 'all' 
          ? `All_Payslips_${selectedMonth}_${selectedYear}.pdf`
          : `Payslip_${records[0]?.employeeName?.replace(/\s+/g, '_')}_${selectedMonth}.pdf`
          
        pdf.save(filename)
      } catch (error) {
        console.error('PDF Generation Error:', error)
        window.print()
      } finally {
        setIsDownloading(false)
      }
    }
    generate()
  }

  const handleWhatsAppShare = () => {
    if (records.length !== 1) return
    const record = records[0]
    const employee = employees.find(e => e.id === record.employeeId)
    const phone = employee?.phone || ""
    const cleanedPhone = phone.replace(/[^0-9]/g, "")
    const formattedPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone

    const totalSalary = record.netSalary || 0
    const text = `Dear *${record.employeeName}*,\n\nYour payslip for *${record.month} ${record.year}* has been successfully generated.\n*\n\nPlease check the HR portal to download it.\n\nBest regards,\n*HR Department*`

    const encodedText = encodeURIComponent(text)
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`
    window.open(whatsappUrl, "_blank")
  }

  const handleUpdate = (record: any) => {
    setFormData(record)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleManualGenerate = () => {
    setFormData({
      month: selectedMonth,
      year: Number(selectedYear),
      status: 'processed',
      basicSalary: 0,
      allowances: 0,
      bonus: 0,
      deductions: 0,
      penalty: 0,
      netSalary: 0,
      totalWorkingDays: 26,
      workedDays: 26,
      leaveDays: 0,
      lopDays: 0
    })
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.employeeId || !formData.month || !formData.year) {
      toast.error('Please fill in required fields')
      return
    }

    // Auto calculate net salary if not done
    const net = (Number(formData.basicSalary) || 0) + 
                (Number(formData.allowances) || 0) + 
                (Number(formData.bonus) || 0) - 
                (Number(formData.deductions) || 0)

    const payload = {
      ...formData,
      netSalary: net,
      employeeName: employees.find(e => e.id === formData.employeeId)?.name || formData.employeeName
    }

    try {
      const url = isEditing ? `${API_URL}/payroll/${formData.id}` : `${API_URL}/payroll`
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(isEditing ? 'Payroll updated' : 'Payroll generated')
        setIsDialogOpen(false)
        fetchInitialData()
      } else {
        const err = await response.text()
        toast.error(`Failed: ${err}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error saving payroll')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return
    
    try {
      const response = await fetch(`${API_URL}/payroll/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Payroll record deleted')
        fetchInitialData() // Refresh
      } else {
        toast.error('Failed to delete record')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Error deleting record')
    }
  }

  const handleMarkAsPaid = async (record: any) => {
    try {
      const response = await fetch(`${API_URL}/payroll/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          status: 'paid'
        })
      })

      if (response.ok) {
        toast.success('Payroll marked as paid')
        fetchInitialData() // Refresh
      } else {
        const err = await response.text()
        toast.error(`Failed to mark as paid: ${err}`)
      }
    } catch (error) {
      console.error('Mark as paid error:', error)
      toast.error('Error marking as paid')
    }
  }

  const columns = [
    { key: 'employeeName', header: 'Employee' },
    { key: 'month', header: 'Month' },
    { key: 'year', header: 'Year' },
    { 
      key: 'netSalary', 
      header: 'Net Salary',
      render: (record: any) => `₹${record.netSalary?.toLocaleString()}`
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (record: any) => {
        const displayStatus = record.status === 'processed' ? 'draft' : record.status;
        return (
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
            record.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {displayStatus}
          </span>
        )
      }
    },
  ]

  const renderActions = (record: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isAdminOrHR && (
          <>
            {record.status !== 'paid' && (
              <DropdownMenuItem onClick={() => handleMarkAsPaid(record)} className="text-green-600 font-medium">
                <CreditCard className="mr-2 h-4 w-4" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleUpdate(record)}>
              <Edit className="mr-2 h-4 w-4 text-blue-500" />
              Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    updateSelectedRecord()
  }, [selectedEmpId, selectedMonth, selectedYear, allPayrolls])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [payrollRes, empRes] = await Promise.all([
        fetch(`${API_URL}/payroll`),
        fetch(`${API_URL}/employees`)
      ])
      
      if (payrollRes.ok && empRes.ok) {
        const payrollData = await payrollRes.json()
        const empData = await empRes.json()
        setAllPayrolls(payrollData)
        setEmployees(empData)

        // Read user details for initial authentication check
        const currentUser = user || (typeof window !== 'undefined' && localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null)
        const isUserAdminOrHR = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'hr' || currentUser?.name === 'Admin Admin'
        const currentUserId = currentUser?.id || currentUser?._id

        if (payrollId) {
          const payrollRecord = payrollData.find((p: any) => p.id === payrollId)
          if (payrollRecord) {
            if (isUserAdminOrHR || payrollRecord.employeeId === currentUserId) {
              setSelectedEmpId(payrollRecord.employeeId)
              setSelectedMonth(payrollRecord.month)
              setSelectedYear(String(payrollRecord.year))
            } else {
              toast.error('You are not authorized to view this payslip.')
              if (currentUserId) {
                setSelectedEmpId(currentUserId)
              }
            }
          }
        } else if (!isUserAdminOrHR && currentUserId) {
          setSelectedEmpId(currentUserId)
        }
      }
    } catch (error) {
      console.error('Error fetching payslip details:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSelectedRecord = async () => {
    if (!selectedMonth || !selectedYear) return

    const finalEmpId = isAdminOrHR ? selectedEmpId : (user?.id || user?._id)

    if (finalEmpId === 'all') {
      const matches = allPayrolls.filter(p => 
        p.month === selectedMonth && 
        String(p.year) === selectedYear
      )
      setRecords(matches)
    } else if (finalEmpId) {
      const match = allPayrolls.find(p => 
        p.employeeId === finalEmpId && 
        p.month === selectedMonth && 
        String(p.year) === selectedYear
      )
      setRecords(match ? [match] : [])
    } else {
      setRecords([])
    }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Selection Bar - Always Visible */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="w-full sm:w-[220px]">
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId} disabled={!isAdminOrHR}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-10 font-medium">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {isAdminOrHR && <SelectItem value="all">All Employees</SelectItem>}
                {employees
                  .filter(emp => isAdminOrHR || emp.id === (user?.id || user?._id))
                  .map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[130px]">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-10 font-medium">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[100px]">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-10 font-medium">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap gap-2 w-full xl:w-auto">
          {isAdminOrHR && (
            <Button variant="outline" onClick={handleManualGenerate} className="flex-1 md:flex-none border-slate-300">
              <PlusCircle className="mr-2 h-4 w-4" />
              Manual Generate
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()} className="flex-1 md:flex-none border-slate-300" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline"
            onClick={handleDownloadPDF} 
            disabled={isDownloading || records.length === 0}
            className="flex-1 md:flex-none border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            size="icon"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          {records.length === 1 && (
            <Button 
              variant="outline" 
              onClick={handleWhatsAppShare} 
              className="flex-1 md:flex-none border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-semibold"
              size="icon"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.982L2 22l5.202-1.362a9.923 9.923 0 004.804 1.233h.004c5.505 0 9.99-4.478 9.99-9.984A9.97 9.97 0 0012.012 2zm5.787 14.417c-.319.896-1.6 1.637-2.207 1.762-.562.115-1.3.208-3.791-.823-3.187-1.316-5.215-4.57-5.374-4.781-.159-.21-1.29-1.718-1.29-3.278 0-1.56.815-2.327 1.106-2.627.291-.3.636-.375.848-.375.213 0 .425.002.61.011.196.009.46-.073.72.553.273.66.936 2.278 1.018 2.443.082.165.137.357.027.576-.11.22-.248.481-.375.626-.129.145-.262.303-.11.564.152.261.677 1.115 1.453 1.808.998.892 1.839 1.168 2.103 1.3.264.132.417.11.573-.072.155-.183.67-.783.848-1.05.178-.266.357-.22.61-.128.252.091 1.602.755 1.875.892.272.137.454.206.522.32.068.115.068.665-.251 1.561z"/>
              </svg>
            </Button>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="max-w-4xl mx-auto py-20 text-center bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <Calendar className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">No payroll records found for the selection.</p>
          <p className="text-slate-400 text-xs mt-1 italic">Ensure payroll has been processed for the selected period.</p>
        </div>
      ) : selectedEmpId === 'all' ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable 
            data={records}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search employee..."
            actions={renderActions}
            onRowClick={(record) => {
              setSelectedEmpId(record.employeeId)
              setSelectedMonth(record.month)
              setSelectedYear(String(record.year))
            }}
          />
        </div>
      ) : (
        <div id="payslip-container">
          {records.map((record) => (
            <SinglePayslip 
              key={record.id} 
              record={record} 
              employee={employees.find(e => e.id === record.employeeId)}
              numberToWords={numberToWords}
              isAdminOrHR={isAdminOrHR}
              onMarkAsPaid={handleMarkAsPaid}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              payslipNumber={getPayslipNumber(record, allPayrolls)}
            />
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        .payslip-card, .payslip-card * {
          font-family: 'Poppins', sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #payslip-container, #payslip-container * { visibility: visible !important; }
          #payslip-container { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
          }
          .payslip-card {
            margin: 0 !important;
            padding: 20mm !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 297mm;
            width: 210mm;
          }
          .no-print { display: none !important; }
        }
      `}} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Update Payslip' : 'Generate Manual Payslip'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Employee</Label>
              <Select 
                value={formData.employeeId} 
                onValueChange={(val) => setFormData({...formData, employeeId: val})}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Month</Label>
              <Select 
                value={formData.month} 
                onValueChange={(val) => setFormData({...formData, month: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select 
                value={String(formData.year)} 
                onValueChange={(val) => setFormData({...formData, year: Number(val)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Basic Salary</Label>
              <Input type="number" value={formData.basicSalary} onChange={(e) => setFormData({...formData, basicSalary: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Bonus</Label>
              <Input type="number" value={formData.bonus} onChange={(e) => setFormData({...formData, bonus: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Allowances</Label>
              <Input type="number" value={formData.allowances} onChange={(e) => setFormData({...formData, allowances: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Deductions</Label>
              <Input type="number" value={formData.deductions} onChange={(e) => setFormData({...formData, deductions: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Penalty</Label>
              <Input type="number" value={formData.penalty} onChange={(e) => setFormData({...formData, penalty: Number(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val: any) => setFormData({...formData, status: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="processed">Draft</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Deduction Remarks</Label>
              <Textarea value={formData.deductionRemarks} onChange={(e) => setFormData({...formData, deductionRemarks: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-brand-teal hover:bg-brand-teal/90">
              {isEditing ? 'Save Changes' : 'Generate Payslip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PayslipsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-teal" /></div>}>
      <PageHeader title="Employee Payslip" description="Detailed monthly salary breakdown and payment proof." />
      <PayslipContent />
    </Suspense>
  )
}

