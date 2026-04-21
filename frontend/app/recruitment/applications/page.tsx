'use client'

import { useState, useEffect } from 'react'
import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { DataTable } from '@/components/hrms/data-table'
import { StatusBadge } from '@/components/hrms/status-badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoreHorizontal, Eye, Calendar, Mail, FileText, CheckCircle, XCircle, Download, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import type { Application } from '@/lib/types'
import { API_URL } from '@/lib/config';

export default function ApplicationsPage() {
  const { data, isLoading, refresh } = useApi()
  const [applications, setApplications] = useState<Application[]>([])

  useEffect(() => {
    if (data?.applications) setApplications(data.applications)
  }, [data?.applications])

  const handleStatusChange = async (id: string, newStatus: Application['status']) => {
    try {
      const response = await fetch(`${API_URL}/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) refresh()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const columns = [
    {
      key: 'candidateName' as const,
      header: 'Candidate',
      render: (app: Application) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {app.candidateName.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{app.candidateName}</p>
            <p className="text-sm text-muted-foreground">{app.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'position' as const, header: 'Position' },
    { key: 'phone' as const, header: 'Phone' },
    { key: 'appliedDate' as const, header: 'Applied On' },
    {
      key: 'status' as const,
      header: 'Status',
      render: (app: Application) => <StatusBadge status={app.status} />,
    },
  ]

  const renderActions = (app: Application) => (
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
          View Resume
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'screening')}>
          Move to Screening
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'interview')}>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Interview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'offered')}>
          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
          Send Offer
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange(app.id, 'rejected')}
          className="text-destructive"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const filterByStatus = (status?: Application['status']) => {
    if (!status) return applications
    return applications.filter((app) => app.status === status)
  }

  return (
    <HRMSLayout>
      <PageHeader title="Applications" description="Track and manage candidate applications.">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
          <TabsTrigger value="new">New ({filterByStatus('new').length})</TabsTrigger>
          <TabsTrigger value="screening">Screening ({filterByStatus('screening').length})</TabsTrigger>
          <TabsTrigger value="interview">Interview ({filterByStatus('interview').length})</TabsTrigger>
          <TabsTrigger value="offered">Offered ({filterByStatus('offered').length})</TabsTrigger>
          <TabsTrigger value="hired">Hired ({filterByStatus('hired').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading && applications.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-6">
              <DataTable
                data={applications}
                columns={columns}
                searchKey="candidateName"
                searchPlaceholder="Search candidates..."
                actions={renderActions}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="new">
          <DataTable
            data={filterByStatus('new')}
            columns={columns}
            searchKey="candidateName"
            searchPlaceholder="Search candidates..."
            actions={renderActions}
          />
        </TabsContent>

        <TabsContent value="screening">
          <DataTable
            data={filterByStatus('screening')}
            columns={columns}
            searchKey="candidateName"
            searchPlaceholder="Search candidates..."
            actions={renderActions}
          />
        </TabsContent>

        <TabsContent value="interview">
          <DataTable
            data={filterByStatus('interview')}
            columns={columns}
            searchKey="candidateName"
            searchPlaceholder="Search candidates..."
            actions={renderActions}
          />
        </TabsContent>

        <TabsContent value="offered">
          <DataTable
            data={filterByStatus('offered')}
            columns={columns}
            searchKey="candidateName"
            searchPlaceholder="Search candidates..."
            actions={renderActions}
          />
        </TabsContent>

        <TabsContent value="hired">
          <DataTable
            data={filterByStatus('hired')}
            columns={columns}
            searchKey="candidateName"
            searchPlaceholder="Search candidates..."
            actions={renderActions}
          />
        </TabsContent>
      </Tabs>
    </HRMSLayout>
  )
}
