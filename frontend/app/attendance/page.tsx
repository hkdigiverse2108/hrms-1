'use client'

import { useState } from 'react'
import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { DataTable } from '@/components/hrms/data-table'
import { StatusBadge } from '@/components/hrms/status-badge'
import { StatsCard } from '@/components/hrms/stats-card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, Users, UserCheck, UserX, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useApi } from '@/hooks/useApi'
import type { Attendance } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function AttendancePage() {
  const [date, setDate] = useState<Date>(new Date())
  const { data, isLoading } = useApi()

  if (isLoading) {
    return (
      <HRMSLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </HRMSLayout>
    )
  }

  const { attendanceRecords } = data

  const presentCount = attendanceRecords.filter((r: any) => r.status === 'present').length
  const absentCount = attendanceRecords.filter((r: any) => r.status === 'absent').length
  const lateCount = attendanceRecords.filter((r: any) => r.status === 'late').length

  const columns = [
    {
      key: 'employeeName' as const,
      header: 'Employee',
      render: (record: Attendance) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {record.employeeName.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{record.employeeName}</p>
            <p className="text-sm text-muted-foreground">{record.employeeId}</p>
          </div>
        </div>
      ),
    },
    { key: 'date' as const, header: 'Date' },
    { key: 'checkIn' as const, header: 'Check In' },
    { key: 'checkOut' as const, header: 'Check Out' },
    { key: 'workHours' as const, header: 'Work Hours' },
    {
      key: 'status' as const,
      header: 'Status',
      render: (record: Attendance) => <StatusBadge status={record.status} />,
    },
  ]

  return (
    <HRMSLayout>
      <PageHeader title="Attendance" description="Track daily attendance of all employees.">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-[240px] justify-start text-left font-normal')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard
          title="Total Employees"
          value={attendanceRecords.length}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Present"
          value={presentCount}
          icon={<UserCheck className="h-6 w-6" />}
        />
        <StatsCard
          title="Absent"
          value={absentCount}
          icon={<UserX className="h-6 w-6" />}
        />
        <StatsCard
          title="Late"
          value={lateCount}
          icon={<Clock className="h-6 w-6" />}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Attendance Records - {format(date, 'MMMM d, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={attendanceRecords}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search employees..."
          />
        </CardContent>
      </Card>
    </HRMSLayout>
  )
}
