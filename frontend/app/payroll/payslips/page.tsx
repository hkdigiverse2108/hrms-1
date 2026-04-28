'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/hrms/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Download, Loader2, Send } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import type { Payroll } from '@/lib/types'
import { exportToCSV } from "@/lib/export"

export default function PayslipsPage() {
  const { data, isLoading } = useApi()
  const [payroll, setPayroll] = useState<Payroll[]>([])

  useEffect(() => {
    if (data?.payrollRecords) setPayroll(data.payrollRecords)
  }, [data?.payrollRecords])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const handleDownload = (record: Payroll) => {
    console.log(`Downloading payslip for ${record.employeeName}...`)
    // For now, we'll just export this single record as CSV
    exportToCSV([record], `payslip-${record.employeeName}-${record.month}`)
  }

  const columns = [
    { key: 'employeeName' as const, header: 'Employee' },
    { key: 'month' as const, header: 'Month' },
    {
      key: 'basicSalary' as const,
      header: 'Basic Salary',
      render: (record: Payroll) => formatCurrency(record.basicSalary),
    },
    {
      key: 'netSalary' as const,
      header: 'Net Salary',
      render: (record: Payroll) => (
        <span className="font-bold">{formatCurrency(record.netSalary)}</span>
      ),
    },
    {
      key: 'status' as const,
      header: 'Status',
      render: (record: Payroll) => (
        <Badge variant={record.status === 'paid' ? 'default' : 'outline'} className={record.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' : ''}>
          {record.status}
        </Badge>
      ),
    },
  ]

  const renderActions = (record: Payroll) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleDownload(record)} title="Download Payslip">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" title="Email Payslip">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader title="Payslips" description="Generate and download employee payslips.">
        <div className="flex flex-wrap items-center gap-3">
          <Select defaultValue="January 2024">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="January 2024">January 2024</SelectItem>
              <SelectItem value="February 2024">February 2024</SelectItem>
              <SelectItem value="March 2024">March 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportToCSV(payroll, 'all-payslips')}>
            <Download className="mr-2 h-4 w-4" />
            Download All
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Email All
          </Button>
        </div>
      </PageHeader>

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
    </>
  )
}
