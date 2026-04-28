'use client'

import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, Video, MapPin, User, Plus, CheckCircle, XCircle, Download } from 'lucide-react'
import { exportToCSV } from "@/lib/export";


interface Interview {
  id: string
  candidateName: string
  role: string
  date: string
  time: string
  type: 'video' | 'in-person' | 'phone'
  interviewer: string
  status: 'scheduled' | 'completed' | 'cancelled'
  round: number
}

const interviews: Interview[] = [
  {
    id: '1',
    candidateName: 'Alex Turner',
    role: 'Senior React Developer',
    date: '2024-01-20',
    time: '10:00 AM',
    type: 'video',
    interviewer: 'Lisa Anderson',
    status: 'scheduled',
    round: 2,
  },
  {
    id: '2',
    candidateName: 'Maria Garcia',
    role: 'Marketing Specialist',
    date: '2024-01-20',
    time: '2:00 PM',
    type: 'in-person',
    interviewer: 'David Wilson',
    status: 'scheduled',
    round: 1,
  },
  {
    id: '3',
    candidateName: 'James Lee',
    role: 'Senior React Developer',
    date: '2024-01-19',
    time: '11:00 AM',
    type: 'phone',
    interviewer: 'Michael Brown',
    status: 'completed',
    round: 1,
  },
  {
    id: '4',
    candidateName: 'Emma Watson',
    role: 'HR Coordinator',
    date: '2024-01-18',
    time: '3:00 PM',
    type: 'video',
    interviewer: 'Emily Davis',
    status: 'completed',
    round: 2,
  },
]


export default function InterviewsPage() {
  const scheduledInterviews = interviews.filter((i) => i.status === 'scheduled')
  const completedInterviews = interviews.filter((i) => i.status === 'completed')

  const getTypeIcon = (type: Interview['type']) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'in-person':
        return <MapPin className="h-4 w-4" />
      case 'phone':
        return <User className="h-4 w-4" />
    }
  }

  const InterviewCard = ({ interview }: { interview: Interview }) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {interview.candidateName.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{interview.candidateName}</p>
            <p className="text-sm text-muted-foreground">{interview.role}</p>
          </div>
        </div>
        <Badge variant="outline">Round {interview.round}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {interview.date}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          {interview.time}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {getTypeIcon(interview.type)}
          <span className="capitalize">{interview.type}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          {interview.interviewer}
        </div>
      </div>

      {interview.status === 'scheduled' && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" className="flex-1">
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            Reschedule
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      {interview.status === 'completed' && (
        <div className="mt-4">
          <Button size="sm" variant="outline" className="w-full">
            View Feedback
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <PageHeader title="Interviews" description="Schedule and manage candidate interviews.">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportToCSV(interviews, 'interviews')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Interview
          </Button>
        </div>
      </PageHeader>


      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{scheduledInterviews.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Upcoming Interviews</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{completedInterviews.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Completed This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">85%</p>
              <p className="mt-2 text-sm text-muted-foreground">Show Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="mt-6">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({scheduledInterviews.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedInterviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {scheduledInterviews.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {completedInterviews.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
