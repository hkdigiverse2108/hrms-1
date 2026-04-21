'use client'

import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { StatsCard } from '@/components/hrms/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserCheck,
  UserMinus,
  UserPlus,
  Clock,
  Briefcase,
  Cake,
  Award,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { StatusBadge } from '@/components/hrms/status-badge'

export default function DashboardPage() {
  const { data, isLoading } = useApi()
  
  if (isLoading) {
    return (
      <HRMSLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </HRMSLayout>
    )
  }

  const { dashboardStats, employees, leaveRequests, announcements, attendanceRecords } = data

  const pendingLeaves = leaveRequests.filter((l: any) => l.status === 'pending')
  const todayAttendance = attendanceRecords.slice(0, 5)
  const recentAnnouncements = announcements.slice(0, 3)

  return (
    <HRMSLayout>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here&apos;s an overview of your organization."
      />

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Employees"
          value={dashboardStats.totalEmployees}
          icon={<Users className="h-6 w-6" />}
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatsCard
          title="Present Today"
          value={dashboardStats.presentToday}
          icon={<UserCheck className="h-6 w-6" />}
          trend={{ value: 2.1, isPositive: true }}
        />
        <StatsCard
          title="On Leave"
          value={dashboardStats.onLeave}
          icon={<UserMinus className="h-6 w-6" />}
        />
        <StatsCard
          title="New Joinees (This Month)"
          value={dashboardStats.newJoinees}
          icon={<UserPlus className="h-6 w-6" />}
          trend={{ value: 12, isPositive: true }}
        />
      </div>

      {/* Second Row Stats */}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pending Leave Requests"
          value={dashboardStats.pendingLeaves}
          icon={<Clock className="h-6 w-6" />}
        />
        <StatsCard
          title="Open Positions"
          value={dashboardStats.openPositions}
          icon={<Briefcase className="h-6 w-6" />}
        />
        <StatsCard
          title="Upcoming Birthdays"
          value={dashboardStats.upcomingBirthdays}
          icon={<Cake className="h-6 w-6" />}
        />
        <StatsCard
          title="Work Anniversaries"
          value={dashboardStats.upcomingAnniversaries}
          icon={<Award className="h-6 w-6" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Today's Attendance */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Today&apos;s Attendance</CardTitle>
            <Badge variant="outline" className="font-normal">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {record.employeeName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{record.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{record.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Check In</p>
                      <p className="font-medium">{record.checkIn}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Check Out</p>
                      <p className="font-medium">{record.checkOut}</p>
                    </div>
                    <StatusBadge status={record.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingLeaves.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No pending leave requests
                </p>
              ) : (
                pendingLeaves.map((leave) => (
                  <div key={leave.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{leave.employeeName}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {leave.leaveType} Leave
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {leave.days} {leave.days === 1 ? 'day' : 'days'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {leave.startDate} - {leave.endDate}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements & Quick Stats */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent Announcements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 rounded-full p-2 ${
                          announcement.priority === 'high'
                            ? 'bg-red-100 text-red-600'
                            : announcement.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {announcement.priority === 'high' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{announcement.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {announcement.content}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {announcement.author} • {announcement.date}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={announcement.priority} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employee of the Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employee of the Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  LA
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-xl font-semibold">Lisa Anderson</h3>
              <p className="text-muted-foreground">Tech Lead</p>
              <p className="text-sm text-muted-foreground">Engineering</p>
              <div className="mt-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium">Outstanding Performance</span>
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Recognized for exceptional leadership and delivering the Q4 project ahead of schedule.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Employee Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Recent Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {employees.slice(0, 4).map((employee) => (
              <div key={employee.id} className="flex items-center gap-4 rounded-lg border p-4">
                <Avatar>
                  {employee.profilePhoto && (
                    <AvatarImage 
                      src={`http://localhost:8000/uploads/${employee.profilePhoto}`} 
                      alt={employee.name} 
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {employee.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{employee.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{employee.designation}</p>
                  <p className="text-xs text-muted-foreground">{employee.department}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </HRMSLayout>
  )
}
