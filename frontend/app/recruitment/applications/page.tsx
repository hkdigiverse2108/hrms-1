'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MoreHorizontal, Eye, Calendar, Mail, FileText, CheckCircle, XCircle, Download, Loader2, Trash2, Phone, User } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { Application } from '@/lib/types'
import { API_URL } from '@/lib/config';
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner"


export default function ApplicationsPage() {
  const { data, isLoading, refresh } = useApi()
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  useEffect(() => {
    if (data?.applications) setApplications(data.applications)
  }, [data?.applications])

  const handleViewDetails = (app: Application) => {
    setSelectedApp(app)
    setIsDetailsModalOpen(true)
  }

  const handleSendEmail = (app: Application) => {
    window.location.href = `mailto:${app.email}?subject=Regarding your application`
  }

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
        <DropdownMenuItem onClick={() => handleViewDetails(app)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(app.resume || '#', '_blank')}>
          <FileText className="mr-2 h-4 w-4" />
          View Resume
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSendEmail(app)}>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleDelete(app.id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Application
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application?")) return
    try {
      const response = await fetch(`${API_URL}/applications/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) refresh()
    } catch (error) {
      console.error('Error deleting application:', error)
    }
  }

  const filterByStatus = (status?: Application['status']) => {
    if (!status) return applications
    return applications.filter((app) => app.status === status)
  }

  return (
    <>
      <PageHeader title="Applications" description="Track and manage candidate applications.">
        <Button variant="outline" onClick={() => exportToCSV(applications, 'applications')}>
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

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
              <User className="w-5 h-5 text-brand-teal" /> Candidate Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedApp && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-brand-teal/10 text-brand-teal text-xl font-bold">
                    {selectedApp.candidateName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedApp.candidateName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedApp.status} />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Applied {selectedApp.appliedDate}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact Information</Label>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
                      <Mail className="w-4 h-4 text-brand-teal" /> {selectedApp.email}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
                      <Phone className="w-4 h-4 text-brand-teal" /> {selectedApp.phone}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</Label>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button 
                      variant="outline" 
                      className="justify-start text-xs font-bold"
                      onClick={() => window.open(selectedApp.resume || '#', '_blank')}
                    >
                      <FileText className="w-4 h-4 mr-2 text-brand-teal" /> View Resume
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start text-xs font-bold"
                      onClick={() => handleSendEmail(selectedApp)}
                    >
                      <Mail className="w-4 h-4 mr-2 text-brand-teal" /> Contact
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button variant="ghost" onClick={() => setIsDetailsModalOpen(false)} className="font-bold">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
