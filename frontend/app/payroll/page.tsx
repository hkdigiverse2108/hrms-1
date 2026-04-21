'use client'

import { useState } from 'react'
import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
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
import { useApi } from '@/hooks/useApi'
import { useEffect } from 'react'
import type { Payroll } from '@/lib/types'

export default function PayrollPage() {
  const { data, isLoading, refresh } = useApi()
  const [payroll, setPayroll] = useState<Payroll[]>([])

  useEffect(() => {
    if (data?.payrollRecords) setPayroll(data.payrollRecords)
  }, [data?.payrollRecords])
  const [selectedMonth, setSelectedMonth] = useState('January 2024')

  const totalPayroll = payroll.reduce((sum, p) => sum + p.netSalary, 0)
  const paidCount = payroll.filter((p) => p.status === 'paid').length
  const pendingCount = payroll.filter((p) => p.status === 'pending').length
  const processedCount = payroll.filter((p) => p.status === 'processed').length

  const handleRunPayroll = () => {
    setPayroll(
      payroll.map((p) =>
        p.status === 'pending' ? { ...p, status: 'processed' as const } : p
      )
    )
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/payroll/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      if (response.ok) refresh()
    } catch (error) {
      console.error('Error marking as paid:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const columns = [
    { key: 'employeeId' as const, header: 'Employee ID' },
    { key: 'employeeName' as const, header: 'Employee Name' },
    { key: 'month' as const, header: 'Month' },
    {
      key: 'basicSalary' as const,
      header: 'Basic Salary',
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
      header: 'Net Salary',
      render: (record: Payroll) => (
        <span className="font-semibold">{formatCurrency(record.netSalary)}</span>
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
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileText className="mr-2 h-4 w-4" />
          Generate Payslip
        </DropdownMenuItem>
        {record.status === 'processed' && (
          <DropdownMenuItem onClick={() => handleMarkPaid(record.id)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Paid
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <HRMSLayout>
      <PageHeader title="Payroll Processing" description="Manage monthly payroll for all employees.">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="January 2024">January 2024</SelectItem>
            <SelectItem value="February 2024">February 2024</SelectItem>
            <SelectItem value="March 2024">March 2024</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button onClick={handleRunPayroll} disabled={pendingCount === 0}>
          <Play className="mr-2 h-4 w-4" />
          Run Payroll
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard
          title="Total Payroll"
          value={formatCurrency(totalPayroll)}
          icon={<DollarSign className="h-6 w-6" />}
        />
        <StatsCard
          title="Employees"
          value={payroll.length}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Paid"
          value={paidCount}
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <StatsCard
          title="Pending"
          value={pendingCount + processedCount}
          icon={<Clock className="h-6 w-6" />}
        />
      </div>

      {isLoading && payroll.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable
            data={payroll}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search employees..."
            actions={renderActions}
          />
        </div>
      )}
    </HRMSLayout>
  )
}
