'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Loader2, Calendar as CalendarIcon, Clock, Briefcase, Activity, MonitorPlay } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUser } from '@/hooks/useUser'
import { Badge } from '@/components/ui/badge'

dayjs.extend(duration)

export default function EmployeeAnalysisPage() {
  const router = useRouter()
  const { user, isLoading: isUserLoading } = useUser()
  
  const [attendance, setAttendance] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'))

  useEffect(() => {
    if (isUserLoading || !user) return
    fetchData()
  }, [user, isUserLoading])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [attRes, tasksRes] = await Promise.all([
        fetch(`${API_URL}/attendance`),
        fetch(`${API_URL}/wm-tasks`)
      ])
      
      if (attRes.ok) setAttendance(await attRes.json())
      if (tasksRes.ok) setTasks(await tasksRes.json())
    } catch (error) {
      console.error('Failed to fetch data', error)
      toast.error('Failed to fetch employee analysis data')
    } finally {
      setLoading(false)
    }
  }

  const analysisData = useMemo(() => {
    if (!attendance || attendance.length === 0 || !user) return []
    
    const isAdmin = user.role?.toLowerCase() === 'admin'
    
    // Filter attendance by selected date
    let dailyAttendance = attendance.filter(a => a.date === selectedDate)
    
    // If not admin, only show own data
    if (!isAdmin) {
      dailyAttendance = dailyAttendance.filter(a => a.employeeId === user.id || a.employeeId === user._id)
    }
    
    // Process punch logs for each employee
    const data = dailyAttendance.map(att => {
      const logs = (att.punches || []).map((punch: any) => {
        let title = "Unknown Activity"
        let icon = <Activity className="w-4 h-4 mr-2" />
        
        if (punch.activityType === "Work") {
          const task = tasks.find(t => t.id === punch.taskId)
          title = task ? `Task: ${task.title}` : 'Work (Unknown Task)'
          icon = <Briefcase className="w-4 h-4 mr-2" />
        } else if (punch.activityType === "Research") {
          title = "Research"
          icon = <MonitorPlay className="w-4 h-4 mr-2" />
        } else if (punch.activityType === "Other") {
          title = `${punch.activitySubtype || 'Other'}: ${punch.activityValue || 'N/A'}`
        }

        // punch.punchIn is a time string like "11:09:28" or "11:09"
        const start = punch.punchIn ? dayjs(`2000-01-01 ${punch.punchIn}`) : dayjs()
        const end = punch.punchOut ? dayjs(`2000-01-01 ${punch.punchOut}`) : null
        
        let durationStr = "In Progress"
        if (end && start.isValid() && end.isValid()) {
          const diffMins = end.diff(start, 'minutes')
          const hrs = Math.floor(diffMins / 60)
          const mins = diffMins % 60
          if (hrs > 0) {
            durationStr = `${hrs}h ${mins}m`
          } else {
            durationStr = `${mins}m`
          }
        }

        return {
          id: punch.punchIn,
          title,
          icon,
          activityType: punch.activityType,
          startTime: start.isValid() ? start.format('hh:mm A') : (punch.punchIn || 'N/A'),
          endTime: end ? (end.isValid() ? end.format('hh:mm A') : punch.punchOut) : 'Now',
          duration: durationStr,
          isInProgress: !end
        }
      })

      return {
        employeeName: att.employeeName,
        employeeId: att.employeeId,
        checkIn: att.checkIn,
        logs: logs
      }
    })

    return data.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }, [attendance, tasks, selectedDate])

  if (isUserLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Employee Analysis" 
          subtitle="Analyze employee activities, tasks, and meetings with time tracking" 
        />
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          <Input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {analysisData.length > 0 ? (
          analysisData.map((emp) => (
            <Card key={emp.employeeId} className="flex flex-col">
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  {emp.employeeName}
                  <Badge variant="outline" className="text-xs font-normal">
                    In at {emp.checkIn || 'N/A'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {emp.logs.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emp.logs.map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center font-medium">
                                {log.icon}
                                <span className="truncate max-w-[200px]" title={log.title}>{log.title}</span>
                                {log.isInProgress && (
                                  <span className="ml-2 flex h-2 w-2 rounded-full bg-green-500" title="In Progress"></span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-500 whitespace-nowrap">{log.startTime}</TableCell>
                            <TableCell className="text-slate-500 whitespace-nowrap">{log.endTime}</TableCell>
                            <TableCell className="text-right font-medium text-slate-700 whitespace-nowrap">{log.duration}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400 py-8">
                    No activities logged for this date.
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex items-center justify-center text-gray-500 py-12">
            No attendance records found for {dayjs(selectedDate).format('MMMM DD, YYYY')}.
          </div>
        )}
      </div>
    </div>
  )
}
