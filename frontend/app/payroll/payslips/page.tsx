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
import type { Payroll } from '@/lib/types'

function SinglePayslip({ record, employee, numberToWords }: { record: any, employee: any, numberToWords: (n: number) => string }) {
  return (
    <div className="payslip-card bg-white p-16 rounded-lg shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 font-sans mb-8 last:mb-0 break-after-page">
      {/* Header - Brand Section */}
      <div className="flex justify-between items-start pb-10 border-b border-slate-100">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#1F2937] rounded flex items-center justify-center">
             <span className="text-white font-black text-2xl">HK</span>
           </div>
           <div className="flex flex-col leading-tight">
             <span className="text-[20px] font-black text-slate-900 tracking-tight">HK DigiVerse</span>
             <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">& IT Consultancy</span>
           </div>
        </div>
        <div className="text-right text-[12px] text-slate-600 space-y-0.5 font-medium">
          <p>Email: <span className="text-slate-900 font-bold">hrmangukiya3494@gmail.com</span></p>
          <p>Contact No: <span className="text-slate-900 font-bold">8866005029</span></p>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="grid grid-cols-4 gap-8 py-10">
        <div className="space-y-1">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Invoice No.</p>
          <p className="text-[14px] font-black text-slate-900 uppercase">INV-{record.year}{record.month.slice(0,3).toUpperCase()}-{record.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Date</p>
          <p className="text-[14px] font-black text-slate-900">{new Date().toLocaleDateString('en-GB')}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Payment Status</p>
          <p className="text-[14px] font-black text-slate-900 uppercase tracking-tighter">{record.status || 'Draft'}</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Total Amount</p>
          <p className="text-[18px] font-black text-slate-900">₹{record.netSalary?.toLocaleString()}</p>
        </div>
      </div>

      {/* Employee Info Section */}
      <div className="grid grid-cols-2 gap-x-24 gap-y-5 py-10">
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-400 font-bold">Name :</span>
          <span className="font-black text-slate-900 text-right">{record.employeeName}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-400 font-bold">Department :</span>
          <span className="font-black text-slate-900 text-right">{employee?.department}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-400 font-bold">Designation :</span>
          <span className="font-black text-slate-900 text-right">{employee?.designation}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-400 font-bold">Position :</span>
          <span className="font-black text-slate-900 text-right">{employee?.role || 'Employee'}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-400 font-bold">Email :</span>
          <span className="font-black text-slate-900 text-right">{employee?.email}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-slate-400 font-bold">Phone :</span>
          <span className="font-black text-slate-900 text-right">{employee?.phone}</span>
        </div>
      </div>

      {/* Salary Details Section */}
      <div className="mt-8">
        <div className="bg-[#111827] text-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.2em] border-b-[32px] border-[#111827] relative">
          <span className="absolute inset-0 flex items-center px-5">Salary Details</span>
        </div>
        <div className="px-5 py-6 space-y-4">
          <div className="flex justify-between text-[13px]">
            <span className="text-slate-400 font-bold">Base Salary</span>
            <span className="font-black text-slate-900">{record.basicSalary?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-slate-400 font-bold">Bonus / Incentives</span>
            <span className="font-black text-slate-900">{( (record.bonus || 0) + (record.allowances || 0) ).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Deductions Section */}
      <div className="mt-4">
        <div className="bg-[#111827] text-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.2em] border-b-[32px] border-[#111827] relative">
          <span className="absolute inset-0 flex items-center px-5">Deductions</span>
        </div>
        <div className="px-5 py-6 space-y-4 border-b border-slate-100">
          <div className="flex justify-between text-[13px]">
            <span className="text-slate-400 font-bold">Loss of Pay (LOP)</span>
            <span className="font-black text-rose-600">-{ (record.deductions - (record.penalty || 0)).toLocaleString() }</span>
          </div>
          {record.penalty > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-400 font-bold">Performance Penalties</span>
              <span className="font-black text-rose-600">-{record.penalty?.toLocaleString()}</span>
            </div>
          )}
          
        </div>
      </div>

      {/* Final Summary Section */}
      <div className="mt-16 flex justify-end px-5">
         <div className="flex items-center gap-12">
           <span className="text-[14px] font-black text-slate-300 uppercase tracking-[0.2em]">Total Salary</span>
           <span className="text-[28px] font-black text-slate-900 tracking-tighter">₹{record.netSalary?.toLocaleString()}</span>
         </div>
      </div>

      {/* Footer Area */}
      <div className="mt-20 grid grid-cols-2 gap-24 items-end px-5">
        <div className="space-y-2">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Amount in words</p>
          <p className="text-[13px] font-black text-slate-700 capitalize italic leading-tight">Rupees {numberToWords(Math.round(record.netSalary))}</p>
        </div>
        <div className="text-center">
          <div className="w-full border-t border-slate-800 pt-4">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Authorized Signatory</p>
          </div>
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

  const [selectedEmpId, setSelectedEmpId] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('May')
  const [selectedYear, setSelectedYear] = useState<string>('2026')

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

    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
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
          const dataUrl = await (window as any).domtoimage.toPng(node, {
            bgcolor: '#ffffff',
            style: { margin: '0', transform: 'scale(1)', borderRadius: '0' }
          })
          
          const imgProps = pdf.getImageProperties(dataUrl)
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
          
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
      render: (record: any) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          record.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {record.status}
        </span>
      )
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
        <DropdownMenuItem onClick={() => {
          setSelectedEmpId(record.employeeId)
          setSelectedMonth(record.month)
          setSelectedYear(String(record.year))
        }}>
          <Eye className="mr-2 h-4 w-4" />
          View Detailed
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleUpdate(record)}>
          <Edit className="mr-2 h-4 w-4 text-blue-500" />
          Update
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
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

        if (payrollId) {
          const payrollRecord = payrollData.find((p: any) => p.id === payrollId)
          if (payrollRecord) {
            setSelectedEmpId(payrollRecord.employeeId)
            setSelectedMonth(payrollRecord.month)
            setSelectedYear(String(payrollRecord.year))
          }
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

    if (selectedEmpId === 'all') {
      const matches = allPayrolls.filter(p => 
        p.month === selectedMonth && 
        String(p.year) === selectedYear
      )
      setRecords(matches)
    } else if (selectedEmpId) {
      const match = allPayrolls.find(p => 
        p.employeeId === selectedEmpId && 
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-3 flex-1 w-full md:w-auto">
          <div className="min-w-[200px] flex-1">
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger className="bg-slate-50 border-slate-200">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[140px]">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="bg-slate-50 border-slate-200">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[100px]">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-slate-50 border-slate-200">
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

        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={handleManualGenerate} className="flex-1 md:flex-none border-slate-300">
            <PlusCircle className="mr-2 h-4 w-4" />
            Manual Generate
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="flex-1 md:flex-none border-slate-300">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isDownloading || records.length === 0}
            className="flex-1 md:flex-none bg-brand-teal hover:bg-brand-teal/90 shadow-md min-w-[140px]"
          >
            {isDownloading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Download PDF</>
            )}
          </Button>
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
            />
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
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
                  <SelectItem value="processed">Processed</SelectItem>
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

