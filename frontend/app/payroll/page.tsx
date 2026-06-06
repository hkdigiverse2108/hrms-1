'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/hrms/data-table'
import { StatusBadge } from '@/components/hrms/status-badge'
import { StatsCard } from '@/components/hrms/stats-card'
import { Button } from '@/components/ui/button'
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
import { IndianRupee, Users, CheckCircle, Clock, MoreHorizontal, Eye, FileText, Download, Play, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { exportToCSV } from "@/lib/export-utils";
import { toast } from 'sonner'
import type { Payroll } from '@/lib/types'
import { Input } from '@/components/ui/input'

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<Payroll[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('May')
  const [selectedYear, setSelectedYear] = useState('2026')

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const years = ['2024', '2025', '2026']

  useEffect(() => {
    fetchPayroll()
  }, [])

  const fetchPayroll = async () => {
    setIsLoading(true)
    try {
      const [payRes, docRes, empRes] = await Promise.all([
        fetch(`${API_URL}/payroll`),
        fetch(`${API_URL}/employee-documents`),
        fetch(`${API_URL}/employees`)
      ])
      if (payRes.ok) setPayroll(await payRes.json())
      if (docRes.ok) setDocuments(await docRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
    } catch (error) {
      console.error('Error fetching payroll data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPayroll = payroll.filter(p => p.month === selectedMonth && String(p.year) === selectedYear)

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const user = userStr ? JSON.parse(userStr) : null
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR'

  const finalPayroll = isAdminOrHR 
    ? filteredPayroll 
    : filteredPayroll.filter(p => p.employeeName === user?.name)

  const totalPayroll = finalPayroll.reduce((sum, p) => sum + p.netSalary, 0)
  const paidCount = finalPayroll.filter((p) => p.status === 'paid').length
  const pendingCount = finalPayroll.filter((p) => p.status === 'processed').length

  const handleRunPayroll = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`${API_URL}/payroll/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: Number(selectedYear)
        })
      })

      if (response.ok) {
        toast.success('Payroll processed successfully')
        fetchPayroll()
      } else {
        toast.error('Failed to process payroll. Ensure salary structures are set.')
      }
    } catch (error) {
      console.error('Error processing payroll:', error)
      toast.error('Error processing payroll')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/payroll/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      if (response.ok) {
        toast.success('Marked as paid')
        fetchPayroll()
      }
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error('Failed to mark as paid')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const columns = [
    { key: 'employeeName' as const, header: 'Employee' },
    { key: 'totalWorkingDays' as const, header: 'Working Days' },
    { key: 'workedDays' as const, header: 'Worked' },
    { key: 'leaveDays' as const, header: 'Total Leaves' },
    { key: 'monthlyLeaveDays' as const, header: 'Monthly Leave' },
    {
      key: 'basicSalary' as const,
      header: 'Basic',
      render: (record: Payroll) => formatCurrency(record.basicSalary),
    },
    {
      key: 'bonus' as const,
      header: 'Bonus / Incentives',
      render: (record: Payroll) => (
        <span className="text-green-600">+{formatCurrency((record.bonus || 0) + (record.allowances || 0))}</span>
      ),
    },
    {
      key: 'deductions' as const,
      header: 'Deductions',
      render: (record: Payroll) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-red-600 font-medium">-{formatCurrency(record.deductions)}</span>
          {record.deductionRemarks && (
            <span 
              className="text-[10px] text-slate-400 max-w-[180px] truncate cursor-help hover:text-slate-600 transition-colors"
              title={record.deductionRemarks.split('; ').join('\n')}
            >
              {record.deductionRemarks}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'netSalary' as const,
      header: 'Net Payable',
      render: (record: Payroll) => (
        <span className="font-bold text-slate-900">{formatCurrency(record.netSalary)}</span>
      ),
    },
    {
      key: 'depositInfo' as const,
      header: 'Deposit Info',
      render: (record: Payroll) => {
        if (!isAdminOrHR) {
          return (
            <div className="flex flex-col text-xs">
              {record.securityDeposit ? <span className="text-rose-500">Deducted: {formatCurrency(record.securityDeposit)}</span> : null}
              {record.returnedDeposit ? <span className="text-emerald-500">Returned: {formatCurrency(record.returnedDeposit)}</span> : null}
              {!record.securityDeposit && !record.returnedDeposit && <span className="text-slate-400">-</span>}
            </div>
          )
        }

        const emp = employees.find(e => e.id === record.employeeId || e.employeeId === record.employeeId)
        let depositReqStr = ""
        if (emp && emp.requiredDocuments) {
           const fullStr = JSON.stringify(emp.requiredDocuments)
           const match = fullStr.match(/[^"\\]*(?:Deposit|Deposite)[^"\\]*/i)
           if (match) depositReqStr = match[0]
        }

        const empDocs = documents.filter(d => d.employeeId === record.employeeId && (d.documentName?.includes('Deposite') || d.documentName?.includes('Deposit')))
        if (empDocs.length === 0 && !depositReqStr) return <span className="text-xs text-slate-400">N/A</span>
        
        let target = 10000
        const targetDocName = empDocs.length > 0 ? empDocs[0].documentName : depositReqStr
        
        if (targetDocName?.includes('Intern - 2000')) target = 2000
        else if (targetDocName?.includes('Employee - 10000')) target = 10000
        else {
          const match = targetDocName?.match(/(\d+)/)
          if (match) target = Number(match[0])
        }

        const empPayrolls = payroll.filter(p => p.employeeId === record.employeeId && p.id !== record.id)
        const previouslyCollected = empPayrolls.reduce((sum, p) => sum + (p.securityDeposit || 0), 0)
        const previouslyReturned = empPayrolls.reduce((sum, p) => sum + (p.returnedDeposit || 0), 0)
        
        const remainingToCollect = Math.max(0, target - previouslyCollected)
        const isReturned = record.returnedDeposit ? record.returnedDeposit > 0 : false

        return (
          <div className="flex flex-col gap-1.5 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500">Target: {target}</span>
              <span className="text-slate-500">Coll: {previouslyCollected + (record.securityDeposit || 0)}</span>
            </div>
            <Input
              type="number"
              placeholder="Deduct Amt"
              defaultValue={record.securityDeposit || ''}
              className="h-7 text-[11px] px-2 py-1 bg-white border-slate-200 focus-visible:ring-brand-teal"
              disabled={isReturned || remainingToCollect === 0}
              onBlur={async (e) => {
                let val = Number(e.target.value)
                if (val > remainingToCollect) {
                  toast.error(`Cannot exceed target. Max remaining: ${remainingToCollect}`)
                  val = remainingToCollect
                  e.target.value = String(val)
                }
                if (val !== (record.securityDeposit || 0)) {
                  try {
                    const response = await fetch(`${API_URL}/payroll/${record.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ securityDeposit: val }),
                    })
                    if (response.ok) {
                      toast.success(`Deposit deduction updated`)
                      // Recalculate net salary by re-running process or doing a generic backend recalculation endpoint
                      // But since our backend currently doesn't recalculate on PUT, we can just trigger process for this month again
                      await fetch(`${API_URL}/payroll/process`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ month: selectedMonth, year: Number(selectedYear) })
                      })
                      fetchPayroll()
                    }
                  } catch (error) {
                    toast.error('Failed to update deduction')
                  }
                }
              }}
            />
            <label className="flex items-center gap-1 text-[10px] text-slate-600 mt-1 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isReturned}
                onChange={async (e) => {
                  const returned = e.target.checked
                  const returnAmount = returned ? previouslyCollected + (record.securityDeposit || 0) : 0
                  
                  try {
                    const response = await fetch(`${API_URL}/payroll/${record.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ returnedDeposit: returnAmount }),
                    })
                    if (response.ok) {
                      toast.success(returned ? `Returning ${returnAmount}` : `Cancelled return`)
                      await fetch(`${API_URL}/payroll/process`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ month: selectedMonth, year: Number(selectedYear) })
                      })
                      fetchPayroll()
                    }
                  } catch (error) {
                    toast.error('Failed to update return deposit')
                  }
                }}
              />
              Return Deposit
            </label>
          </div>
        )
      }
    },
    {
      key: 'paymentMode' as const,
      header: 'Payment Mode',
      render: (record: Payroll) => {
        if (!isAdminOrHR) {
          return (
            <span className="text-sm font-medium text-slate-700">
              {record.paymentMode || 'Cash'}
              {record.paymentMode === 'Cheque' && record.chequeNumber && ` (${record.chequeNumber})`}
            </span>
          )
        }
        return (
          <div className="flex flex-col gap-1.5 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
            <Select 
              value={record.paymentMode || 'Cash'} 
              onValueChange={async (val) => {
                try {
                  const response = await fetch(`${API_URL}/payroll/${record.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentMode: val }),
                  })
                  if (response.ok) {
                    toast.success(`Payment mode updated to ${val}`)
                    fetchPayroll()
                  }
                } catch (error) {
                  console.error('Error updating payment mode:', error)
                  toast.error('Failed to update payment mode')
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>

            {record.paymentMode === 'Cheque' && (
              <Input
                type="text"
                placeholder="Enter Chq. No."
                defaultValue={record.chequeNumber || ''}
                className="h-7 text-[11px] px-2 py-1 bg-white border-slate-200 focus-visible:ring-brand-teal"
                onBlur={async (e) => {
                  const val = e.target.value;
                  try {
                    const response = await fetch(`${API_URL}/payroll/${record.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chequeNumber: val }),
                    })
                    if (response.ok) {
                      toast.success(`Cheque number updated to ${val}`)
                      fetchPayroll()
                    }
                  } catch (error) {
                    console.error('Error updating cheque number:', error)
                    toast.error('Failed to update cheque number')
                  }
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    try {
                      const response = await fetch(`${API_URL}/payroll/${record.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chequeNumber: val }),
                      })
                      if (response.ok) {
                        toast.success(`Cheque number updated to ${val}`)
                        ;(e.target as HTMLInputElement).blur()
                        fetchPayroll()
                      }
                    } catch (error) {
                      console.error('Error updating cheque number:', error)
                      toast.error('Failed to update cheque number')
                    }
                  }
                }}
              />
            )}
          </div>
        )
      }
    },
    {
      key: 'status' as const,
      header: 'Status',
      render: (record: Payroll) => <StatusBadge status={record.status} />,
    },
  ]

  const renderActions = (record: Payroll) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.location.href=`/payroll/payslips?id=${record.id}`}>
          <FileText className="mr-2 h-4 w-4" />
          View Payslip
        </DropdownMenuItem>
        {record.status === 'processed' && (
          <DropdownMenuItem onClick={() => handleMarkPaid(record.id)}>
            <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
            Mark as Paid
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <PageHeader title="Payroll Processing" description="Calculate and manage monthly salaries.">
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isAdminOrHR && (
          <Button variant="outline" onClick={() => exportToCSV(finalPayroll, `payroll_${selectedMonth}_${selectedYear}`)}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        )}
        <Button 
          className="bg-brand-teal hover:bg-brand-teal/90" 
          onClick={handleRunPayroll} 
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Run Processing
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard
          title="Total Payout"
          value={formatCurrency(totalPayroll)}
          icon={<IndianRupee className="h-6 w-6" />}
        />
        <StatsCard
          title="Total Employees"
          value={finalPayroll.length}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Paid"
          value={paidCount}
          icon={<CheckCircle className="h-6 w-6 text-emerald-500" />}
        />
        <StatsCard
          title="To Process"
          value={pendingCount}
          icon={<Clock className="h-6 w-6 text-amber-500" />}
        />
      </div>
      <div className="mt-6">
        <DataTable
          data={finalPayroll}
          columns={columns}
          isLoading={isLoading}
          searchKey="employeeName"
          searchPlaceholder="Search by name..."
          actions={renderActions}
          onRowClick={(record) => {
            window.location.href = `/payroll/payslips?id=${record.id}`
          }}
        />
      </div>
    </>
  )
}
