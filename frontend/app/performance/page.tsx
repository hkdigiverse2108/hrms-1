'use client'

import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { DataTable } from '@/components/hrms/data-table'
import { StatusBadge } from '@/components/hrms/status-badge'
import { StatsCard } from '@/components/hrms/stats-card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Target, TrendingUp, Award, Download, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import type { KPI } from '@/lib/types'

export default function PerformancePage() {
  const { data, isLoading } = useApi()
  const [kpiRecords, setKpiRecords] = useState<KPI[]>([])

  useEffect(() => {
    if (data?.kpiRecords) setKpiRecords(data.kpiRecords)
  }, [data?.kpiRecords])

  const avgScore = kpiRecords.length > 0 
    ? Math.round(kpiRecords.reduce((sum, k) => sum + k.score, 0) / kpiRecords.length)
    : 0
  const excellentCount = kpiRecords.filter((k) => k.rating === 'excellent').length

  const columns = [
    {
      key: 'employeeName' as const,
      header: 'Employee',
      render: (kpi: KPI) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {kpi.employeeName.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{kpi.employeeName}</p>
            <p className="text-sm text-muted-foreground">{kpi.employeeId}</p>
          </div>
        </div>
      ),
    },
    { key: 'period' as const, header: 'Period' },
    {
      key: 'score' as const,
      header: 'Score',
      render: (kpi: KPI) => (
        <div className="flex items-center gap-3 w-32">
          <Progress value={kpi.score} className="h-2" />
          <span className="text-sm font-medium">{kpi.score}%</span>
        </div>
      ),
    },
    {
      key: 'goals' as const,
      header: 'Goals',
      render: (kpi: KPI) => (
        <span>
          {kpi.achieved}/{kpi.goals}
        </span>
      ),
    },
    {
      key: 'rating' as const,
      header: 'Rating',
      render: (kpi: KPI) => <StatusBadge status={kpi.rating} />,
    },
  ]

  return (
    <HRMSLayout>
      <PageHeader title="KPI Tracking" description="Monitor employee performance and key metrics.">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard
          title="Average Score"
          value={`${avgScore}%`}
          icon={<Target className="h-6 w-6" />}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Excellent Performers"
          value={excellentCount}
          icon={<Award className="h-6 w-6" />}
        />
        <StatsCard
          title="Reviews Completed"
          value={kpiRecords.length}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Improvement Rate"
          value="12%"
          icon={<TrendingUp className="h-6 w-6" />}
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {isLoading && kpiRecords.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable
            data={kpiRecords}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search employees..."
          />
        </div>
      )}
    </HRMSLayout>
  )
}
