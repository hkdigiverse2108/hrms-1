'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Target, CheckCircle, Clock, Loader2, Download } from 'lucide-react'
import { exportToCSV } from "@/lib/export";

import { useApi } from '@/hooks/useApi'
import { useUser } from '@/hooks/useUser'

interface TargetItem {
  id: string
  employeeName: string
  department: string
  target: string
  deadline: string
  progress: number
  status: 'on-track' | 'at-risk' | 'completed'
}

export default function TargetsPage() {
  const { data, isLoading } = useApi()
  const { user } = useUser()
  const [targets, setTargets] = useState<TargetItem[]>([])

  useEffect(() => {
    if (data?.kpiRecords) {
      const mappedTargets: TargetItem[] = data.kpiRecords.map((kpi: any) => ({
        id: kpi.id,
        employeeName: kpi.employeeName,
        department: kpi.department || 'General',
        target: `Achieve ${kpi.goals} goals for ${kpi.period}`,
        deadline: '2024-12-31', // Placeholder or add to schema
        progress: kpi.goals > 0 ? Math.round((kpi.achieved / kpi.goals) * 100) : 0,
        status: kpi.achieved >= kpi.goals ? 'completed' : kpi.achieved > kpi.goals * 0.5 ? 'on-track' : 'at-risk'
      }))
      setTargets(mappedTargets)
    }
  }, [data])

  const onTrackCount = targets.filter((t) => t.status === 'on-track').length
  const atRiskCount = targets.filter((t) => t.status === 'at-risk').length
  const completedCount = targets.filter((t) => t.status === 'completed').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'on-track': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'at-risk': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <>
      <PageHeader title="Targets" description="Set and track employee performance targets.">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportToCSV(targets, 'performance-targets')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Assign Target
          </Button>
        </div>
      </PageHeader>


      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Targets</p>
                <p className="text-2xl font-bold">{targets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className="text-2xl font-bold text-blue-600">{onTrackCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-red-100 p-3">
                <Target className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-red-600">{atRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-100 p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Active Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {targets.map((target) => (
              <div key={target.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {target.employeeName.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{target.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{target.department}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`capitalize ${getStatusColor(target.status)}`}>
                    {target.status.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="font-medium">{target.target}</p>
                  <p className="text-sm text-muted-foreground">Deadline: {target.deadline}</p>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span className="font-medium">{target.progress}%</span>
                  </div>
                  <Progress value={target.progress} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
