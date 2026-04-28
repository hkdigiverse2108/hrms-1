'use client'

import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Clock, DollarSign, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportToCSV } from "@/lib/export";


const lateEmployees = [
  { id: '1', name: 'Alex Turner', department: 'Marketing', lateCount: 5, penaltyAmount: 50, status: 'warning' },
  { id: '2', name: 'Maria Garcia', department: 'Engineering', lateCount: 3, penaltyAmount: 30, status: 'caution' },
  { id: '3', name: 'James Lee', department: 'Engineering', lateCount: 2, penaltyAmount: 0, status: 'normal' },
  { id: '4', name: 'Jennifer Taylor', department: 'HR', lateCount: 1, penaltyAmount: 0, status: 'normal' },
]


const penaltyRules = [
  { lateCount: '1-2', deduction: '$0', action: 'Verbal warning' },
  { lateCount: '3-4', deduction: '$10/late', action: 'Written warning' },
  { lateCount: '5+', deduction: '$20/late', action: 'HR review' },
]

export default function LatePenaltyPage() {
  return (
    <>
      <PageHeader
        title="Late & Penalty"
        description="Track late arrivals and apply penalties as per company policy."
      >
        <Button variant="outline" onClick={() => exportToCSV(lateEmployees, 'late-penalty-report')}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </PageHeader>


      <div className="grid gap-6 lg:grid-cols-3">
        {/* Penalty Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Penalty Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {penaltyRules.map((rule, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{rule.lateCount} late arrivals</p>
                    <p className="text-sm text-muted-foreground">{rule.action}</p>
                  </div>
                  <Badge variant="outline">{rule.deduction}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              * 3 late arrivals = 1 leave deduction
            </p>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>This Month Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <Clock className="mx-auto h-8 w-8 text-yellow-500" />
                <p className="mt-2 text-3xl font-bold">11</p>
                <p className="text-sm text-muted-foreground">Total Late Arrivals</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-orange-500" />
                <p className="mt-2 text-3xl font-bold">2</p>
                <p className="text-sm text-muted-foreground">Employees with Warnings</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <DollarSign className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-2 text-3xl font-bold">$80</p>
                <p className="text-sm text-muted-foreground">Total Penalties</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Late Employees List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Employees with Late Arrivals (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lateEmployees.map((employee) => (
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

                <div className="flex items-center gap-8">
                  <div className="w-32">
                    <div className="flex items-center justify-between text-sm">
                      <span>Late count</span>
                      <span className="font-medium">{employee.lateCount}/5</span>
                    </div>
                    <Progress
                      value={(employee.lateCount / 5) * 100}
                      className="mt-2 h-2"
                    />
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Penalty</p>
                    <p className="font-medium">
                      {employee.penaltyAmount > 0 ? `$${employee.penaltyAmount}` : '-'}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      employee.status === 'warning'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : employee.status === 'caution'
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                        : 'bg-green-100 text-green-700 border-green-200'
                    }
                  >
                    {employee.status === 'warning'
                      ? 'Warning'
                      : employee.status === 'caution'
                      ? 'Caution'
                      : 'Normal'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
