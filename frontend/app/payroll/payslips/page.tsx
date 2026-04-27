'use client'

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
    alert(`Downloading payslip for ${record.employeeName}`)
  }

  return (
    <>
      <PageHeader title="Payslips" description="Generate and download employee payslips.">
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
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download All
        </Button>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Email All
        </Button>
      </PageHeader>

      <DataTable
        data={payrollRecords}
        columns={columns}
        searchKey="employeeName"
        searchPlaceholder="Search employees..."
        actions={renderActions}
      />
    </>
  )
}
