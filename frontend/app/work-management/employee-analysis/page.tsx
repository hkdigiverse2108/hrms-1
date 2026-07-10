'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Loader2, Calendar as CalendarIcon, Clock, Briefcase, Activity, MonitorPlay, Users, ChevronDown } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUser } from '@/hooks/useUser'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

dayjs.extend(duration)

export default function EmployeeAnalysisPage() {
  const router = useRouter()
  const { user, isLoading: isUserLoading } = useUser()
  
  const [attendance, setAttendance] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilterPreset, setDateFilterPreset] = useState<string>('today')
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [filterActivity, setFilterActivity] = useState<string>('All')
  const [filterEmployee, setFilterEmployee] = useState<string>('All')
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  const toggleCard = (key: string) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    if (isUserLoading || !user) return
    fetchData()
  }, [user, isUserLoading])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [attRes, tasksRes, empRes] = await Promise.all([
        fetch(`${API_URL}/attendance`),
        fetch(`${API_URL}/wm-tasks`),
        fetch(`${API_URL}/employees`)
      ])
      
      if (attRes.ok) setAttendance(await attRes.json())
      if (tasksRes.ok) setTasks(await tasksRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
    } catch (error) {
      console.error('Failed to fetch data', error)
      toast.error('Failed to fetch employee analysis data')
    } finally {
      setLoading(false)
    }
  }

  const employeeOptions = useMemo(() => {
    if (!employees || employees.length === 0) return []
    return employees.map(emp => ({ id: emp.id || emp._id, name: emp.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [employees])

  const analysisData = useMemo(() => {
    if (!attendance || attendance.length === 0 || !user) return []
    
    const isAdmin = ['admin', 'hr'].includes(user.role?.toLowerCase() || '')
    
    // Filter attendance by date preset
    let dailyAttendance = attendance
    
    if (dateFilterPreset === 'today') {
      const today = dayjs().format('YYYY-MM-DD')
      dailyAttendance = dailyAttendance.filter(a => a.date === today)
    } else if (dateFilterPreset === 'yesterday') {
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
      dailyAttendance = dailyAttendance.filter(a => a.date === yesterday)
    } else if (dateFilterPreset === 'last7') {
      const start = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
      dailyAttendance = dailyAttendance.filter(a => a.date >= start)
    } else if (dateFilterPreset === 'lastMonth') {
      const start = dayjs().subtract(1, 'month').format('YYYY-MM-DD')
      dailyAttendance = dailyAttendance.filter(a => a.date >= start)
    } else if (dateFilterPreset === 'custom') {
      dailyAttendance = dailyAttendance.filter(a => a.date === selectedDate)
    }
    // For 'allTime', do not filter by date
    
    // If not admin, only show own data
    if (!isAdmin) {
      dailyAttendance = dailyAttendance.filter(a => a.employeeId === user.id || a.employeeId === user._id)
    } else if (filterEmployee !== 'All') {
      dailyAttendance = dailyAttendance.filter(a => a.employeeId === filterEmployee)
    }
    
    // Process punch logs for each employee
    const data = dailyAttendance.map(att => {
      let logs = (att.punches || []).map((punch: any) => {
        let title = "Unknown Activity"
        let icon = <Activity className="w-4 h-4 mr-2" />
        
        const actType = punch.activityType || "Work" // Fallback for old punches
        
        if (actType === "Work") {
          const task = tasks.find(t => t.id === punch.taskId)
          title = task ? `Work: ${task.title}` : (punch.taskId ? 'Work: Unknown Task' : 'Work')
          icon = <Briefcase className="w-4 h-4 mr-2" />
        } else if (actType === "Research") {
          title = "Research" + (punch.activityValue ? `: ${punch.activityValue}` : "")
          icon = <MonitorPlay className="w-4 h-4 mr-2" />
        } else if (actType === "Other") {
          title = `${punch.activitySubtype || 'Other'}: ${punch.activityValue || 'N/A'}`
        }

        // Use selectedDate to parse time so we get accurate day diffs
        const start = punch.punchIn ? dayjs(`${selectedDate} ${punch.punchIn}`) : dayjs()
        const end = punch.punchOut ? dayjs(`${selectedDate} ${punch.punchOut}`) : null
        
        let diffMins = 0
        const actualEnd = (end && end.isValid()) ? end : dayjs()
        if (start.isValid()) {
          diffMins = Math.max(0, actualEnd.diff(start, 'minutes'))
        }

        let durationStr = "In Progress"
        if (end && start.isValid() && end.isValid()) {
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
          activityGroup: actType,
          startTime: start.isValid() ? start.format('hh:mm A') : (punch.punchIn || 'N/A'),
          endTime: end ? (end.isValid() ? end.format('hh:mm A') : punch.punchOut) : 'Now',
          duration: durationStr,
          durationMins: diffMins,
          isInProgress: !end
        }
      })

      if (filterActivity !== 'All') {
        logs = logs.filter((log: any) => log.activityGroup === filterActivity)
      }

      const totalMins = logs.reduce((acc: number, log: any) => acc + (log.durationMins || 0), 0)
      const totalHrs = Math.floor(totalMins / 60)
      const remMins = totalMins % 60
      const totalDurationStr = totalHrs > 0 ? `${totalHrs}h ${remMins}m` : `${remMins}m`

      return {
        date: att.date,
        employeeName: att.employeeName,
        employeeId: att.employeeId,
        checkIn: att.checkIn,
        logs: logs,
        totalDurationStr
      }
    })

    return data.sort((a, b) => {
      const nameComp = a.employeeName.localeCompare(b.employeeName)
      if (nameComp !== 0) return nameComp
      return dayjs(b.date).valueOf() - dayjs(a.date).valueOf() // Sort same employee by newest date
    })
  }, [attendance, tasks, selectedDate, filterActivity, filterEmployee, dateFilterPreset])

  if (isUserLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <PageHeader 
          title="Activity Log" 
          subtitle="Analyze employee activities, tasks, and meetings with time tracking" 
        />
        <div className="flex flex-wrap items-center gap-3">
          {['admin', 'hr'].includes(user?.role?.toLowerCase() || '') && (
            <div className="flex items-center gap-2 mr-2">
              <Users className="w-4 h-4 text-gray-500" />
              <select 
                value={filterEmployee} 
                onChange={e => setFilterEmployee(e.target.value)}
                className="border border-input bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]"
              >
                <option value="All">All Employees</option>
                {employeeOptions.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <select 
            value={filterActivity} 
            onChange={e => setFilterActivity(e.target.value)}
            className="border border-input bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Activities</option>
            <option value="Work">Work</option>
            <option value="Research">Research</option>
            <option value="Other">Other</option>
          </select>
          
          <div className="flex items-center gap-2 border-l pl-3 border-gray-200 ml-1">
            <select 
              value={dateFilterPreset} 
              onChange={e => setDateFilterPreset(e.target.value)}
              className="border border-input bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="lastMonth">Last Month</option>
              <option value="allTime">All Time</option>
              <option value="custom">Custom Date</option>
            </select>
            
            {dateFilterPreset === 'custom' && (
              <div className="flex items-center relative">
                <Input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {analysisData.length > 0 ? (
          analysisData.map((emp, idx) => {
            const cardKey = `${emp.employeeId}-${emp.date}-${idx}`
            const isExpanded = !!expandedCards[cardKey]
            
            return (
              <Card key={cardKey} className="flex flex-col overflow-hidden">
                <div 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCard(cardKey)}
                >
                  <CardHeader className={`pb-3 ${isExpanded ? 'border-b' : ''} bg-gray-50/50`}>
                    <CardTitle className="text-lg font-bold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {emp.employeeName}
                        <span className="text-sm font-normal text-gray-500">
                          ({dayjs(emp.date).format('MMM DD, YYYY')})
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-xs font-normal">
                          In at {emp.checkIn || 'N/A'}
                        </Badge>
                        {!isExpanded && (
                          <span className="text-sm font-bold text-brand-teal bg-[#EAF7F6] px-3 py-1 rounded-full border border-brand-teal/20">
                            Total Time: {emp.totalDurationStr}
                          </span>
                        )}
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </CardTitle>
                  </CardHeader>
                </div>
                
                {isExpanded && (
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
                        <div className="bg-gray-50/50 p-3 border-t flex justify-end items-center text-sm font-semibold text-gray-700">
                          Total Time: {emp.totalDurationStr}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-gray-400 py-8">
                        No activities logged for this date.
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })
        ) : (
          <div className="col-span-full flex items-center justify-center text-gray-500 py-12">
            No attendance records found for {dayjs(selectedDate).format('MMMM DD, YYYY')}.
          </div>
        )}
      </div>
    </div>
  )
}
