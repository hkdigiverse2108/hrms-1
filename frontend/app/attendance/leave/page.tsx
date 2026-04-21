'use client'

import { useState } from 'react'
import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { DataTable } from '@/components/hrms/data-table'
import { StatusBadge } from '@/components/hrms/status-badge'
import { StatsCard } from '@/components/hrms/stats-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, CheckCircle, XCircle, MoreHorizontal, Check, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useEffect } from 'react'
import type { LeaveRequest } from '@/lib/types'

export default function LeaveManagementPage() {
  const { data, isLoading } = useApi()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])

  useEffect(() => {
    if (data?.leaveRequests) {
      setLeaveRequests(data.leaveRequests)
    }
  }, [data?.leaveRequests])

  if (isLoading) {
    return (
      <HRMSLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </HRMSLayout>
    )
  }
  const pendingRequests = leaveRequests.filter((r) => r.status === 'pending')
  const approvedRequests = leaveRequests.filter((r) => r.status === 'approved')
  const rejectedRequests = leaveRequests.filter((r) => r.status === 'rejected')

  const handleApprove = (id: string) => {
    setLeaveRequests(
      leaveRequests.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r))
    )
  }

  const handleReject = (id: string) => {
    setLeaveRequests(
      leaveRequests.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r))
    )
  }

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'annual':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'sick':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'casual':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'maternity':
        return 'bg-pink-100 text-pink-700 border-pink-200'
      case 'paternity':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const columns = [
    { key: 'employeeName' as const, header: 'Employee' },
    {
      key: 'leaveType' as const,
      header: 'Leave Type',
      render: (request: LeaveRequest) => (
        <Badge variant="outline" className={`capitalize ${getLeaveTypeColor(request.leaveType)}`}>
          {request.leaveType}
        </Badge>
      ),
    },
    { key: 'startDate' as const, header: 'Start Date' },
    { key: 'endDate' as const, header: 'End Date' },
    {
      key: 'days' as const,
      header: 'Days',
      render: (request: LeaveRequest) => (
        <span className="font-medium">{request.days}</span>
      ),
    },
    { key: 'reason' as const, header: 'Reason' },
    { key: 'appliedOn' as const, header: 'Applied On' },
    {
      key: 'status' as const,
      header: 'Status',
      render: (request: LeaveRequest) => <StatusBadge status={request.status} />,
    },
  ]

  const renderActions = (request: LeaveRequest) =>
    request.status === 'pending' ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleApprove(request.id)}>
            <Check className="mr-2 h-4 w-4 text-green-600" />
            Approve
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleReject(request.id)}>
            <X className="mr-2 h-4 w-4 text-red-600" />
            Reject
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  return (
    <HRMSLayout>
      <PageHeader
        title="Leave Management"
        description="Manage and approve employee leave requests."
      />

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard
          title="Total Requests"
          value={leaveRequests.length}
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatsCard
          title="Pending"
          value={pendingRequests.length}
          icon={<Clock className="h-6 w-6" />}
        />
        <StatsCard
          title="Approved"
          value={approvedRequests.length}
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <StatsCard
          title="Rejected"
          value={rejectedRequests.length}
          icon={<XCircle className="h-6 w-6" />}
        />
      </div>

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedRequests.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <DataTable
            data={leaveRequests}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search by employee name..."
            actions={renderActions}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <DataTable
            data={pendingRequests}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search by employee name..."
            actions={renderActions}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <DataTable
            data={approvedRequests}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search by employee name..."
          />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <DataTable
            data={rejectedRequests}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search by employee name..."
          />
        </TabsContent>
      </Tabs>
    </HRMSLayout>
  )
}
