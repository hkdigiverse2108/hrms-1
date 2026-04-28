'use client'

import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserPlus, Clock, UserMinus, FileText, Loader2, Download } from 'lucide-react'
import { exportToCSV } from "@/lib/export";

import { useApi } from '@/hooks/useApi'
import { useState, useEffect } from 'react'
import { Employee } from '@/lib/types'

export default function LifecyclePage() {
  const { data, isLoading } = useApi()
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    if (data?.employees) setEmployees(data.employees)
  }, [data?.employees])

  const probationEmployees = employees.filter((e) => e.status === 'probation')

  const recentJoins = employees
    .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
    .slice(0, 5)

  const exitRequests: any[] = [] // Placeholder for future exit request migration
  return (
    <>
      <PageHeader
        title="Employee Lifecycle"
        description="Manage employee onboarding, probation, and exit processes."
      >
        <Button variant="outline" onClick={() => exportToCSV(employees, 'employee-lifecycle')}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </PageHeader>


      <Tabs defaultValue="probation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="probation">
            <Clock className="mr-2 h-4 w-4" />
            Probation ({probationEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="onboarding">
            <UserPlus className="mr-2 h-4 w-4" />
            Recent Joins ({recentJoins.length})
          </TabsTrigger>
          <TabsTrigger value="exit">
            <UserMinus className="mr-2 h-4 w-4" />
            Exit Requests ({exitRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="probation">
          <Card>
            <CardHeader>
              <CardTitle>Employees on Probation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading && employees.length === 0 ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : probationEmployees.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No employees on probation
                  </p>
                ) : (
                  probationEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {employee.name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {employee.designation} • {employee.department}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Join Date</p>
                          <p className="font-medium">{employee.joinDate}</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                          Probation
                        </Badge>
                        <Button size="sm">Confirm</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Recent Joins (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentJoins.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {employee.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Join Date</p>
                        <p className="font-medium">{employee.joinDate}</p>
                      </div>
                      <Badge
                        className={
                          employee.status === 'active'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }
                      >
                        {employee.status === 'active' ? 'Active' : 'Probation'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Documents
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exit">
          <Card>
            <CardHeader>
              <CardTitle>Exit Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exitRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {request.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.department} • Reason: {request.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Last Working Day</p>
                        <p className="font-medium">{request.lastDay}</p>
                      </div>
                      <Badge
                        className={
                          request.status === 'approved'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }
                      >
                        {request.status === 'approved' ? 'Approved' : 'Pending'}
                      </Badge>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm">Approve</Button>
                          <Button variant="outline" size="sm">
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
