'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
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
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { exportToCSV } from "@/lib/export-utils"
import { API_URL } from '@/lib/config'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/analytics/overview?months=6`, { headers })
        if (!res.ok) throw new Error("Failed to fetch analytics data")
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        console.error("Failed to load analytics", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return <div className="p-8 text-center text-red-500">Failed to load analytics data: {error}</div>
  }

  const handleExport = () => {
    exportToCSV([
      ...data.departmentDistribution,
      ...data.attendanceTrend,
      ...data.leaveDistribution,
      ...data.hiringTrend,
      ...data.performanceDistribution
    ], 'analytics-summary')
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Comprehensive reports and insights about your organization."
      >
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </PageHeader>


      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Employees by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentDistribution}>
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
                  data={data.leaveDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.leaveDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
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
              <LineChart data={data.attendanceTrend}>
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
              <BarChart data={data.hiringTrend}>
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
              <BarChart data={data.performanceDistribution} layout="vertical">
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
              <p className="text-4xl font-bold text-primary">{data.summaryStats?.totalEmployees || 0}</p>
              <p className="mt-2 text-sm text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{data.summaryStats?.avgAttendanceRate || 0}%</p>
              <p className="mt-2 text-sm text-muted-foreground">Avg. Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{data.summaryStats?.avgPerformanceScore || 0}</p>
              <p className="mt-2 text-sm text-muted-foreground">Avg. Performance Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-yellow-600">{data.summaryStats?.attritionRate || 0}%</p>
              <p className="mt-2 text-sm text-muted-foreground">Attrition Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
