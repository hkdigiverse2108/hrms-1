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
import { DollarSign, Users, CheckCircle, Clock, MoreHorizontal, Eye, FileText, Download, Play, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { exportToCSV } from "@/lib/export";
import { toast } from 'sonner'
import type { Payroll } from '@/lib/types'

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<Payroll[]>([])
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
      const response = await fetch(`${API_URL}/payroll`)
      if (response.ok) {
        setPayroll(await response.json())
      }
    } catch (error) {
      console.error('Error fetching payroll:', error)
    } finally {
      setIsLoading(false)
    }
    // Wait, I should probably filter by selected month/year or let the backend do it
    // For now, I'll fetch all and filter client-side for UX
    setIsLoading(false)
  }

  const filteredPayroll = payroll.filter(p => p.month === selectedMonth && String(p.year) === selectedYear)

  const totalPayroll = filteredPayroll.reduce((sum, p) => sum + p.netSalary, 0)
  const paidCount = filteredPayroll.filter((p) => p.status === 'paid').length
  const pendingCount = filteredPayroll.filter((p) => p.status === 'processed').length

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
    { key: 'leaveDays' as const, header: 'Leaves' },
    {
      key: 'basicSalary' as const,
      header: 'Basic',
      render: (record: Payroll) => formatCurrency(record.basicSalary),
    },
    {
      key: 'allowances' as const,
      header: 'Allowances',
      render: (record: Payroll) => (
        <span className="text-green-600">+{formatCurrency(record.allowances)}</span>
      ),
    },
    {
      key: 'deductions' as const,
      header: 'Deductions',
      render: (record: Payroll) => (
        <span className="text-red-600">-{formatCurrency(record.deductions)}</span>
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
        <Button variant="outline" onClick={() => exportToCSV(filteredPayroll, `payroll_${selectedMonth}_${selectedYear}`)}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
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
          icon={<DollarSign className="h-6 w-6" />}
        />
        <StatsCard
          title="Total Employees"
          value={filteredPayroll.length}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Paid"
          value={paidCount}
          icon={<CheckCircle className="h-6 w-6 text-emerald-500" />}
        />
        <StatsCard
          title="To Process"
          value={filteredPayroll.length - (paidCount + pendingCount)}
          icon={<Clock className="h-6 w-6 text-amber-500" />}
        />
      </div>

      <div className="mt-6">
        <DataTable
          data={filteredPayroll}
          columns={columns}
          isLoading={isLoading}
          searchKey="employeeName"
          searchPlaceholder="Search by name..."
          actions={renderActions}
        />
      </div>
    </>
  )
}
