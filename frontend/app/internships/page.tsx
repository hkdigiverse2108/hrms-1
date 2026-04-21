'use client'

import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { DataTable } from '@/components/hrms/data-table'
import { StatusBadge } from '@/components/hrms/status-badge'
import { StatsCard } from '@/components/hrms/stats-card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, GraduationCap, Users, CheckCircle, MoreHorizontal, Eye, Pencil, Award, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import type { Intern } from '@/lib/types'

export default function InternshipsPage() {
  const { data, isLoading } = useApi()
  const [interns, setInterns] = useState<Intern[]>([])

  useEffect(() => {
    if (data?.interns) setInterns(data.interns)
  }, [data?.interns])

  const activeInterns = interns.filter((i) => i.status === 'active').length
  const completedInterns = interns.filter((i) => i.status === 'completed').length

  const columns = [
    {
      key: 'name' as const,
      header: 'Intern',
      render: (intern: Intern) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {intern.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{intern.name}</p>
            <p className="text-sm text-muted-foreground">{intern.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'department' as const, header: 'Department' },
    { key: 'mentor' as const, header: 'Mentor' },
    { key: 'startDate' as const, header: 'Start Date' },
    { key: 'endDate' as const, header: 'End Date' },
    {
      key: 'status' as const,
      header: 'Status',
      render: (intern: Intern) => <StatusBadge status={intern.status} />,
    },
  ]

  const renderActions = (intern: Intern) => (
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
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {intern.status === 'active' && (
          <DropdownMenuItem>
            <Award className="mr-2 h-4 w-4" />
            Generate Certificate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <HRMSLayout>
      <PageHeader title="Intern List" description="Manage interns and their internship programs.">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Intern
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard
          title="Total Interns"
          value={interns.length}
          icon={<GraduationCap className="h-6 w-6" />}
        />
        <StatsCard
          title="Active"
          value={activeInterns}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Completed"
          value={completedInterns}
          icon={<CheckCircle className="h-6 w-6" />}
        />
      </div>

      {isLoading && interns.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable
            data={interns}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search interns..."
            actions={renderActions}
          />
        </div>
      )}
    </HRMSLayout>
  )
}
