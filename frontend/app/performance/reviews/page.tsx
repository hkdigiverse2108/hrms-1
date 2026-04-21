'use client'

import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar, Clock, CheckCircle } from 'lucide-react'

interface Review {
  id: string
  employeeName: string
  department: string
  reviewType: 'quarterly' | 'annual' | 'probation'
  dueDate: string
  reviewer: string
  status: 'pending' | 'in-progress' | 'completed'
}

const reviews: Review[] = [
  { id: '1', employeeName: 'Alex Turner', department: 'Engineering', reviewType: 'quarterly', dueDate: '2024-01-31', reviewer: 'Lisa Anderson', status: 'pending' },
  { id: '2', employeeName: 'Maria Garcia', department: 'Marketing', reviewType: 'annual', dueDate: '2024-01-25', reviewer: 'Admin User', status: 'in-progress' },
  { id: '3', employeeName: 'James Lee', department: 'HR', reviewType: 'probation', dueDate: '2024-02-10', reviewer: 'Admin User', status: 'pending' },
  { id: '4', employeeName: 'Emma Watson', department: 'Finance', reviewType: 'quarterly', dueDate: '2024-01-20', reviewer: 'James Miller', status: 'completed' },
]


export default function ReviewsPage() {
  const pendingReviews = reviews.filter((r) => r.status === 'pending')
  const inProgressReviews = reviews.filter((r) => r.status === 'in-progress')
  const completedReviews = reviews.filter((r) => r.status === 'completed')

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'annual': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'quarterly': return 'bg-green-100 text-green-700 border-green-200'
      case 'probation': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const ReviewCard = ({ review }: { review: Review }) => (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {review.employeeName.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{review.employeeName}</p>
            <p className="text-sm text-muted-foreground">{review.department}</p>
          </div>
        </div>
        <Badge variant="outline" className={`capitalize ${getTypeColor(review.reviewType)}`}>
          {review.reviewType}
        </Badge>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Due: {review.dueDate}
        </div>
        <span className="text-muted-foreground">Reviewer: {review.reviewer}</span>
      </div>
      {review.status !== 'completed' && (
        <Button className="mt-4 w-full" size="sm">
          {review.status === 'pending' ? 'Start Review' : 'Continue Review'}
        </Button>
      )}
    </div>
  )

  return (
    <HRMSLayout>
      <PageHeader title="Performance Reviews" description="Schedule and conduct employee reviews.">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Review
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-yellow-100 p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingReviews.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressReviews.length}</p>
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
                <p className="text-2xl font-bold">{completedReviews.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="mt-6">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingReviews.length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgressReviews.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedReviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-progress">
          <Card>
            <CardHeader>
              <CardTitle>Reviews In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgressReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </HRMSLayout>
  )
}
