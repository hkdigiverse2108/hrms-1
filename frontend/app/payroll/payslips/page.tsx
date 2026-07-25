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
import { MessageCircle, Download, Mail, Building2, User, Calendar, CreditCard, Loader2, Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react'
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
import { useConfirm } from "@/context/ConfirmContext";

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
    return idB.localeCompare(idA)
  })

  // Find index of current record
  const index = sorted.findIndex(p => (p.id || p._id) === (record.id || record._id))
  
  // Convert 0-based index to 1-based sequential number, pad with leading zeros to 3 digits (e.g. 001)
  const sequenceNum = index !== -1 ? index + 1 : sorted.length + 1
  const sequenceStr = String(sequenceNum).padStart(3, '0')

  const monthStr = getMonthNumber(record.month)
  return `SSHK-${yearStr}${monthStr}${sequenceStr}`
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" width="24" height="24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

function SinglePayslip({ 
  record, 
  employee, 
  numberToWords,
  isAdminOrHR,
  onMarkAsPaid,
  onUpdate,
  onDelete,
  payslipNumber,
  companyGstin
}: { 
  record: any, 
  employee: any, 
  numberToWords: (n: number) => string,
  isAdminOrHR?: boolean,
  onMarkAsPaid?: (record: any) => void,
  onUpdate?: (record: any) => void,
  onDelete?: (id: string) => void,
  payslipNumber?: string,
  companyGstin?: string
}) {
  const [salaryStructure, setSalaryStructure] = useState<any>(null)
  
  useEffect(() => {
    if (record.employeeId) {
      fetch(`${API_URL}/salary-structures/${record.employeeId}`)
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Not found')
        })
        .then(data => setSalaryStructure(data))
        .catch(err => console.error("Error fetching salary structure:", err))
    }
  }, [record.employeeId])

  const basic = salaryStructure?.basic || record.basicSalary || 0
  const hra = salaryStructure?.hra || 0
  const conveyance = salaryStructure?.conveyance || 0
  const medical = salaryStructure?.medical || 0 // CCA
  const specialAllowance = salaryStructure?.specialAllowance || 0 // Education Allowance
  
  // Calculate ad-hoc bonuses and target incentives
  const otherEarnings = Math.max(0, (record.bonus || 0) + (record.allowances || 0) - (hra + conveyance + medical + specialAllowance))
  const totalEarnings = basic + hra + conveyance + medical + specialAllowance + otherEarnings

  // Deductions details
  const pf = salaryStructure?.pf || 0
  const esi = salaryStructure?.esi || 0
  const pt = salaryStructure?.professionalTax || 0
  const tds = salaryStructure?.tds || 0
  const securityDeposit = record.securityDeposit || salaryStructure?.securityDeposit || 0
  
  // LOP / Leave deduction dynamically calculated
  const totalDeductions = record.deductions || 0
  const penalty = record.penalty || 0
  const lopDeduction = Math.max(0, totalDeductions - securityDeposit - penalty)
  
  const totalSalary = record.netSalary || 0
  const billingMonthUpper = record.month ? String(record.month).toUpperCase() : 'SEPTEMBER'
  const billingYear = record.year ? String(record.year) : '2025'

  return (
    <div className="payslip-card bg-white p-6 mb-8 last:mb-0 break-after-page max-w-4xl mx-auto border-0 shadow-none text-black select-text">
      <table className="w-full border-collapse border-2 border-black text-black">
        <tbody>
          {/* Header Rows */}
          <tr>
            <td colSpan={4} className="text-center font-extrabold border-b border-black text-[15px] py-1.5 bg-slate-50 uppercase tracking-wider">
              {(employee?.company || 'HARIKRUSHN DIGIVERSE LLP').toUpperCase()}
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="text-center font-bold border-b border-black text-[13px] py-1 bg-slate-50 uppercase">
              {employee?.companyAddress || 'SURAT, GUJARAT, INDIA'}
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="text-center font-bold border-b border-black text-[13px] py-1 bg-slate-50 uppercase">
              GSTIN: {companyGstin || employee?.gstin || '24APQPN3916P1Z4'}
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="text-center font-semibold border-b border-black text-[14px] py-1">
              Salary Slip
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="text-center font-semibold border-b border-black text-[13px] py-1">
              For {billingMonthUpper}-{billingYear}
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="text-center font-extrabold border-b border-black text-[16px] uppercase py-2 bg-slate-50 font-sans">
              <span>{record.employeeName?.toUpperCase()}</span>
            </td>
          </tr>

          {/* Employee Details Grid */}
          <tr>
            <td className="border-r border-b border-black font-semibold text-[13px] px-3 py-1.5 w-[25%] bg-slate-50">Emplyoee ID</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 w-[25%]">{employee?.employeeId || record.employeeId || '-'}</td>
            <td className="border-r border-b border-black font-semibold text-[13px] px-3 py-1.5 w-[25%] bg-slate-50">Location</td>
            <td className="border-b border-black text-[13px] px-3 py-1.5">{(employee?.company || 'SURAT').toUpperCase()}</td>
          </tr>
          <tr>
            <td className="border-r border-b border-black font-semibold text-[13px] px-3 py-1.5 bg-slate-50">Income Tax Number (PAN)</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">{employee?.panCard || 'ABCDE1234F'}</td>
            <td className="border-r border-b border-black font-semibold text-[13px] px-3 py-1.5 bg-slate-50">Bank Details</td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 font-bold">{(employee?.bankName || 'AXIS BANK').toUpperCase()}</td>
          </tr>
          <tr>
            <td className="border-r border-b border-black font-semibold text-[13px] px-3 py-1.5 bg-slate-50">Designation</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">{employee?.designation || 'Sales Executive'}</td>
            <td className="border-r border-b border-black font-semibold text-[13px] px-3 py-1.5 bg-slate-50">A/C.NO:</td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 font-semibold">{employee?.accountNumber || '87654345678'}</td>
          </tr>
          <tr>
            <td className="border-r border-b border-black font-semibold text-[13px] px-3 py-1.5 bg-slate-50">Date of Joining</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">{employee?.joinDate ? new Date(employee.joinDate).toLocaleDateString('en-GB') : '-'}</td>
            <td className="border-r border-b border-black font-semibold text-[13px] px-3 py-1.5 bg-slate-50">IFSC</td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 font-semibold">{employee?.ifscCode || 'UTIB0000123'}</td>
          </tr>

          {/* Attendance Details */}
          <tr>
            <td colSpan={3} className="border-r border-b border-black font-bold text-[13px] px-3 py-1.5 bg-slate-50">Attendance Details</td>
            <td className="border-b border-black bg-slate-50"></td>
          </tr>
          <tr>
            <td colSpan={3} className="border-r border-b border-black text-[13px] px-3 py-1.5">Present Days</td>
            <td className="border-b border-black text-center font-bold text-[14px] py-1">{record.workedDays || 0}</td>
          </tr>

          {/* Table Headers for Earnings/Deductions */}
          <tr>
            <td className="border-r border-b-2 border-black font-extrabold text-[13px] px-3 py-2 text-center bg-slate-100 uppercase w-[35%]">Earnings</td>
            <td className="border-r border-b-2 border-black font-extrabold text-[13px] px-3 py-2 text-center bg-slate-100 uppercase w-[15%]">Amount</td>
            <td className="border-r border-b-2 border-black font-extrabold text-[13px] px-3 py-2 text-center bg-slate-100 uppercase w-[35%]">Deduction</td>
            <td className="border-b-2 border-black font-extrabold text-[13px] px-3 py-2 text-center bg-slate-100 uppercase w-[15%]">Amount</td>
          </tr>

          {/* Itemized Rows */}
          <tr>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">Basic</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 text-right font-medium">{basic.toLocaleString('en-IN')}</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">Security Deposit</td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 text-right font-medium">{securityDeposit.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">H.R.A</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 text-right font-medium">{hra.toLocaleString('en-IN')}</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 text-red-600 font-medium">Penalty Deduction</td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 text-right text-red-600 font-medium">{penalty.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">Conveyance Allowance</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 text-right font-medium">{conveyance.toLocaleString('en-IN')}</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 font-medium text-red-600">Leave Deduction</td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 text-right text-red-600 font-medium">{lopDeduction.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">C.C.A</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 text-right font-medium">{medical.toLocaleString('en-IN')}</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5"></td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 text-right"></td>
          </tr>
          <tr>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5">Education Allowance</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 text-right font-medium">{specialAllowance.toLocaleString('en-IN')}</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5"></td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 text-right"></td>
          </tr>
          <tr>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 align-top">
              <div>Bonus / Incentives</div>
            </td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5 text-right font-medium align-top">{otherEarnings.toLocaleString('en-IN')}</td>
            <td className="border-r border-b border-black text-[13px] px-3 py-1.5"></td>
            <td className="border-b border-black text-[13px] px-3 py-1.5 text-right"></td>
          </tr>

          {/* Total Earnings and Deductions */}
          <tr>
            <td className="border-r border-b-2 border-black font-extrabold text-[13px] px-3 py-2 bg-slate-50">Total Earnings</td>
            <td className="border-r border-b-2 border-black font-extrabold text-[13px] px-3 py-2 text-right bg-slate-50">{totalEarnings.toLocaleString('en-IN')}</td>
            <td className="border-r border-b-2 border-black font-extrabold text-[13px] px-3 py-2 bg-slate-50">Total Deduction</td>
            <td className="border-b-2 border-black font-extrabold text-[13px] px-3 py-2 text-right bg-slate-50">{totalDeductions.toLocaleString('en-IN')}</td>
          </tr>

          {/* Net Amount Row */}
          <tr>
            <td colSpan={2} className="border-r border-b border-black"></td>
            <td className="border-r border-b border-black font-extrabold text-[14px] px-3 py-2 bg-slate-100 uppercase text-brand-teal">Net Amount</td>
            <td className="border-b border-black font-extrabold text-[15px] px-3 py-2 text-right bg-slate-100 text-brand-teal">{totalSalary.toLocaleString('en-IN')}</td>
          </tr>

          {/* Footer Area with Amount in Words, Mode, Signatures */}
          <tr>
            <td colSpan={2} className="border-r border-black p-3 align-top w-[50%]">
              <div className="text-[13px] font-bold mb-1">Amount (in words)</div>
              <div className="text-[13px] italic text-slate-800 font-medium mb-4">{numberToWords(totalSalary)}</div>
              
              {/* Payment Status & Payment Mode Table */}

              <div className="mt-2">
                <table className="w-[90%] border-collapse border border-black text-[12px] text-black">
                  <thead>
                    <tr className="bg-slate-50 font-bold">
                      <th className="border border-black px-3 py-1.5 text-left w-[40%]">Mode</th>
                      <th className="border border-black px-3 py-1.5 text-center w-[30%]">Chq.No.</th>
                      <th className="border border-black px-3 py-1.5 text-right w-[30%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-3 py-1.5 font-bold">Cheque</td>
                      <td className="border border-black px-3 py-1.5 text-center">
                        {record.paymentMode === 'Cheque' ? (record.chequeNumber || '-') : '0'}
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right font-bold">
                        {record.paymentMode === 'Cheque' ? totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-3 py-1.5 font-bold">Cash</td>
                      <td className="border border-black px-3 py-1.5 text-center">-</td>
                      <td className="border border-black px-3 py-1.5 text-right font-bold">
                        {record.paymentMode === 'Cash' || !record.paymentMode ? totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={2} className="border border-black px-3 py-1.5 text-right uppercase">Total</td>
                      <td className="border border-black px-3 py-1.5 text-right font-black">{totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
            
            <td colSpan={2} className="p-3 align-top w-[50%] pt-8 pl-6">
              <div className="font-bold text-[15px] tracking-wider text-black text-left">
                FOR {(employee?.company || 'HARIKRUSHN DIGIVERSE LLP').toUpperCase()}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PayslipContent() {
  const { confirm } = useConfirm();
  const searchParams = useSearchParams()
  const payrollId = searchParams.get('id')
  const employeeIdParam = searchParams.get('employeeId')
  const [allPayrolls, setAllPayrolls] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [activePayslipId, setActivePayslipId] = useState<string | null>(null)
  const [downloadingRecord, setDownloadingRecord] = useState<any>(null)

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
    lopDays: 0,
    paymentMode: 'Cash',
    chequeNumber: ''
  })
  const [isEditing, setIsEditing] = useState(false)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = ['2024', '2025', '2026'];

  const numberToWords = (num: number) => {
    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
      'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + numToWords(n % 100) : '');
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
      if (n < 10000000) return numToWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
      return numToWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
    };

    const roundedNum = Math.floor(num);
    const paisa = Math.round((num - roundedNum) * 100);
    
    let words = numToWords(roundedNum) + 'Rupees';
    if (paisa > 0) {
      words += ' and ' + numToWords(paisa) + 'Paisa';
    }
    words += ' Only';
    return words.replace(/\s+/g, ' ').trim();
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
          clone.style.padding = '24px'
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

  const downloadSingleRecordPDF = (targetRecord: any) => {
    toast.info("Preparing PDF download...")
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
        setDownloadingRecord(targetRecord)
        // Wait 250ms for React to mount the temp target off-screen
        await new Promise(resolve => setTimeout(resolve, 250))

        if (!(window as any).domtoimage) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js')
        }
        if (!(window as any).jspdf) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        }

        const node = document.querySelector('#temp-download-target .payslip-card') as HTMLElement
        if (!node) {
          toast.error("Failed to locate payslip card for download")
          return
        }

        const { jsPDF } = (window as any).jspdf
        const pdf = new jsPDF('p', 'mm', 'a4')

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

        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)

        const filename = `Payslip_${targetRecord.employeeName?.replace(/\s+/g, '_')}_${targetRecord.month}_${targetRecord.year}.pdf`
        pdf.save(filename)
        toast.success("Download completed successfully!")
      } catch (error) {
        console.error('PDF Generation Error:', error)
        toast.error("Error generating PDF")
      } finally {
        setDownloadingRecord(null)
      }
    }
    generate()
  }

  const handleSendWhatsApp = (record: any) => {
    const employee = employees.find(e => e.id === record.employeeId)
    const phone = employee?.phone
    if (!phone) {
      toast.error("Employee phone number not found!")
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    
    const downloadLink = `https://hrms.hkdigiverse.com/payroll/payslips?id=${record.id}`
    const message = `Hello ${record.employeeName},\n\nYour payslip for ${record.month} ${record.year} is ready.\n\nYou can download it using this link:\n${downloadLink}\n\nRegards,\nHarikrushn Digiverse`
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
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
      lopDays: 0,
      paymentMode: 'Cash',
      chequeNumber: ''
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
      paymentMode: formData.paymentMode || 'Cash',
      chequeNumber: formData.chequeNumber || '',
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
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: 'Are you sure you want to delete this payroll record?',
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return
    
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
    { 
      key: 'employeeName', 
      header: 'Employee',
      render: (record: any) => (
        <span 
          className="text-brand-teal font-bold hover:underline cursor-pointer"
          title="View Payslip"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedEmpId(record.employeeId)
            setSelectedMonth(record.month)
            setSelectedYear(String(record.year))
            setActivePayslipId(record.id)
          }}
        >
          {record.employeeName}
        </span>
      )
    },
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

  const renderActions = (record: any) => {
    if (!isAdminOrHR) return null;
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {record.status !== 'paid' ? (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleMarkAsPaid(record)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8"
            title="Mark as Paid"
          >
            <CreditCard className="h-4 w-4" />
          </Button>
        ) : (
          <div className="w-8 h-8" />
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleSendWhatsApp(record)}
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8"
          title="Send via WhatsApp"
        >
          <WhatsAppIcon className="h-4.5 w-4.5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleUpdate(record)}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
          title="Update"
        >
          <Edit className="h-4 w-4 text-blue-500" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleDelete(record.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    updateSelectedRecord()
  }, [selectedEmpId, selectedMonth, selectedYear, allPayrolls, activePayslipId])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [payrollRes, empRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/payroll`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/system-settings`)
      ])
      
      if (payrollRes.ok && empRes.ok) {
        const payrollData = await payrollRes.json()
        const empData = await empRes.json()
        setAllPayrolls(payrollData)
        setEmployees(empData)

        if (settingsRes && settingsRes.ok) {
          const settingsData = await settingsRes.json()
          setSettings(settingsData)
        }

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
              setActivePayslipId(payrollRecord.id)
            } else {
              toast.error('You are not authorized to view this payslip.')
              if (currentUserId) {
                setSelectedEmpId(currentUserId)
              }
            }
          }
        } else if (employeeIdParam) {
          if (isUserAdminOrHR || employeeIdParam === currentUserId) {
            setSelectedEmpId(employeeIdParam)
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
    const finalEmpId = isAdminOrHR ? selectedEmpId : (user?.id || user?._id)

    if (finalEmpId === 'all') {
      if (!selectedMonth || !selectedYear) return
      const matches = allPayrolls.filter(p => 
        p.month === selectedMonth && 
        String(p.year) === selectedYear
      )
      setRecords(matches)
    } else if (finalEmpId) {
      if (activePayslipId) {
        const match = allPayrolls.find(p => p.id === activePayslipId)
        setRecords(match ? [match] : [])
      } else {
        const matches = allPayrolls.filter(p => p.employeeId === finalEmpId)
        setRecords(matches)
      }
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
      <div className="no-print">
        <PageHeader title="Employee Payslip" description="Detailed monthly salary breakdown and payment proof." />
      </div>
      {/* Selection Bar - Visible only when selectedEmpId is 'all' */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="w-full sm:w-[220px]">
            <Select value={selectedEmpId} onValueChange={(val) => { setSelectedEmpId(val); setActivePayslipId(null); }} disabled={!isAdminOrHR}>
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
            <Select value={selectedMonth} onValueChange={(val) => { setSelectedMonth(val); setActivePayslipId(null); }}>
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
            <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setActivePayslipId(null); }}>
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
          {records.length === 1 && isAdminOrHR && (
            <Button 
              variant="outline" 
              onClick={() => handleSendWhatsApp(records[0])} 
              className="flex-1 md:flex-none border-emerald-300 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              size="icon"
              title="Send via WhatsApp"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </Button>
          )}
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
            actions={renderActions}
            onRowClick={(record) => {
              setSelectedEmpId(record.employeeId)
              setSelectedMonth(record.month)
              setSelectedYear(String(record.year))
              setActivePayslipId(record.id)
            }}
          />
        </div>
      ) : !activePayslipId ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable 
            data={records}
            columns={[
              { 
                key: 'monthYear', 
                header: 'Period',
                render: (record: any) => (
                  <span 
                    className="text-brand-teal font-bold hover:underline cursor-pointer"
                    title="View Payslip"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEmpId(record.employeeId)
                      setSelectedMonth(record.month)
                      setSelectedYear(String(record.year))
                      setActivePayslipId(record.id)
                    }}
                  >
                    {`${record.month} ${record.year}`}
                  </span>
                )
              },
              { 
                key: 'netSalary', 
                header: 'Net Salary',
                render: (record: any) => `₹${record.netSalary?.toLocaleString('en-IN')}`
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
            ]}
            actions={(record) => (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => downloadSingleRecordPDF(record)}
                  className="text-brand-teal hover:text-brand-teal-light hover:bg-slate-100 h-8 w-8"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {isAdminOrHR && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleSendWhatsApp(record)}
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8"
                    title="Send via WhatsApp"
                  >
                    <WhatsAppIcon className="h-4.5 w-4.5" />
                  </Button>
                )}
              </div>
            )}
            onRowClick={(record) => setActivePayslipId(record.id)}
          />
        </div>
      ) : (
        <div id="payslip-container">
          <div className="no-print mb-4 flex justify-start max-w-4xl mx-auto w-full">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedEmpId(isAdminOrHR ? 'all' : (user?.id || user?._id || ''));
                setActivePayslipId(null);
              }} 
              className="border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              ← Back to Payslips List
            </Button>
          </div>
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

      {downloadingRecord && (
        <div style={{ position: 'fixed', left: '-10000px', top: '0', zIndex: -1000, pointerEvents: 'none' }} id="temp-download-target">
          <SinglePayslip 
            record={downloadingRecord} 
            employee={employees.find(e => e.id === downloadingRecord.employeeId)}
            numberToWords={numberToWords}
            payslipNumber={getPayslipNumber(downloadingRecord, allPayrolls)}
          />
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

            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={formData.paymentMode || 'Cash'} onValueChange={(val: any) => setFormData({...formData, paymentMode: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.paymentMode === 'Cheque' && (
              <div className="space-y-2 col-span-2">
                <Label>Cheque Number</Label>
                <Input 
                  type="text" 
                  value={formData.chequeNumber || ''} 
                  onChange={(e) => setFormData({...formData, chequeNumber: e.target.value})} 
                  placeholder="Enter cheque number..." 
                />
              </div>
            )}

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
      <PayslipContent />
    </Suspense>
  )
}

