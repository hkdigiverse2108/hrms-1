'use client'

import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'

const departmentData = [
  { name: 'Engineering', employees: 25 },
  { name: 'Marketing', employees: 12 },
  { name: 'Sales', employees: 18 },
  { name: 'HR', employees: 8 },
  { name: 'Finance', employees: 10 },
  { name: 'Operations', employees: 15 },
]

const attendanceTrend = [
  { month: 'Jan', present: 85, absent: 10, late: 5 },
  { month: 'Feb', present: 88, absent: 8, late: 4 },
  { month: 'Mar', present: 82, absent: 12, late: 6 },
  { month: 'Apr', present: 90, absent: 6, late: 4 },
  { month: 'May', present: 87, absent: 9, late: 4 },
  { month: 'Jun', present: 91, absent: 5, late: 4 },
]

const leaveDistribution = [
  { name: 'Annual', value: 45, color: '#3b82f6' },
  { name: 'Sick', value: 25, color: '#ef4444' },
  { name: 'Casual', value: 20, color: '#f59e0b' },
  { name: 'Other', value: 10, color: '#6b7280' },
]

const hiringTrend = [
  { month: 'Jan', hires: 3, exits: 1 },
  { month: 'Feb', hires: 5, exits: 2 },
  { month: 'Mar', hires: 4, exits: 1 },
  { month: 'Apr', hires: 6, exits: 3 },
  { month: 'May', hires: 4, exits: 2 },
  { month: 'Jun', hires: 5, exits: 1 },
]

const performanceDistribution = [
  { rating: 'Excellent', count: 25 },
  { rating: 'Good', count: 35 },
  { rating: 'Average', count: 20 },
  { rating: 'Poor', count: 8 },
]

export default function AnalyticsPage() {
  return (
    <HRMSLayout>
      <PageHeader
        title="Analytics"
        description="Comprehensive reports and insights about your organization."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Employees by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="employees" fill="oklch(0.55 0.2 250)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leave Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leaveDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leaveDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hiring vs Exits Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Hiring vs Exits Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hiringTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hires" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="exits" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="rating" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(0.55 0.2 250)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">88</p>
              <p className="mt-2 text-sm text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">92%</p>
              <p className="mt-2 text-sm text-muted-foreground">Avg. Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">4.2</p>
              <p className="mt-2 text-sm text-muted-foreground">Avg. Performance Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-yellow-600">8%</p>
              <p className="mt-2 text-sm text-muted-foreground">Attrition Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </HRMSLayout>
  )
}
