'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Loader2, Briefcase, Activity, MonitorPlay, Users, ChevronDown, Clock } from 'lucide-react'
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

const fmtMins = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const ACTIVITY_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Work:     { label: 'Work',     color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200', icon: <Briefcase   className="w-5 h-5" /> },
  Research: { label: 'Research', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: <MonitorPlay className="w-5 h-5" /> },
  Other:    { label: 'Other',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: <Activity    className="w-5 h-5" /> },
}

export default function WorkLogsPage() {
  const { user, isLoading: isUserLoading } = useUser()

  const [attendance, setAttendance] = useState<any[]>([])
  const [tasks, setTasks]           = useState<any[]>([])
  const [employees, setEmployees]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  const [dateFilterPreset, setDateFilterPreset] = useState<string>('today')
  const [selectedDate, setSelectedDate]         = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [filterEmployee, setFilterEmployee]     = useState<string>('All')

  // expanded state for single-day cards AND multi-day category sections
  const [expandedCards, setExpandedCards]       = useState<Record<string, boolean>>({})
  // expanded state inside multi-day category → which day-row is open
  const [expandedDays, setExpandedDays]         = useState<Record<string, boolean>>({})

  const toggleCard = (key: string) =>
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleDay = (key: string) =>
    setExpandedDays(prev => ({ ...prev, [key]: !prev[key] }))

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
        fetch(`${API_URL}/employees`),
      ])
      if (attRes.ok)   setAttendance(await attRes.json())
      if (tasksRes.ok) setTasks(await tasksRes.json())
      if (empRes.ok)   setEmployees(await empRes.json())
    } catch {
      toast.error('Failed to fetch work log data')
    } finally {
      setLoading(false)
    }
  }

  const employeeOptions = useMemo(() => {
    return employees
      .map(e => ({ id: e.id || e._id, name: e.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [employees])

  // ── filtered attendance rows ────────────────────────────────────────────────
  const filteredAttendance = useMemo(() => {
    if (!attendance.length || !user) return []
    const isAdmin = user.role?.toLowerCase() === 'admin'

    let rows = [...attendance]

    // date filter
    if (dateFilterPreset === 'today') {
      const d = dayjs().format('YYYY-MM-DD')
      rows = rows.filter(a => a.date === d)
    } else if (dateFilterPreset === 'yesterday') {
      const d = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
      rows = rows.filter(a => a.date === d)
    } else if (dateFilterPreset === 'last7') {
      const start = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
      rows = rows.filter(a => a.date >= start)
    } else if (dateFilterPreset === 'lastMonth') {
      const start = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD')
      const end   = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
      rows = rows.filter(a => a.date >= start && a.date <= end)
    } else if (dateFilterPreset === 'custom') {
      rows = rows.filter(a => a.date === selectedDate)
    }

    // employee filter
    if (!isAdmin) {
      rows = rows.filter(a => a.employeeId === user.id || a.employeeId === user._id)
    } else if (filterEmployee !== 'All') {
      rows = rows.filter(a => a.employeeId === filterEmployee)
    }

    return rows
  }, [attendance, user, dateFilterPreset, selectedDate, filterEmployee])

  // ── parse a single attendance row into logs ─────────────────────────────────
  const parseLogs = (att: any) => {
    const rawLogs = (att.punches || []).map((punch: any) => {
      const actType = punch.activityType || 'Work'
      let title = 'Unknown Activity'

      if (actType === 'Work') {
        const task = tasks.find(t => t.id === punch.taskId)
        title = task ? `Work: ${task.title}` : (punch.taskId ? 'Work: Unknown Task' : 'Work')
      } else if (actType === 'Research') {
        title = 'Research' + (punch.activityValue ? `: ${punch.activityValue}` : '')
      } else if (actType === 'Other') {
        title = `${punch.activitySubtype || 'Other'}: ${punch.activityValue || 'N/A'}`
      }

      const dateStr = att.date || selectedDate
      const start = punch.punchIn  ? dayjs(`${dateStr} ${punch.punchIn}`)  : dayjs()
      const end   = punch.punchOut ? dayjs(`${dateStr} ${punch.punchOut}`) : null

      let diffMins = 0
      if (start.isValid()) {
        const actualEnd = end?.isValid() ? end : dayjs()
        diffMins = Math.max(0, actualEnd.diff(start, 'minutes'))
      }

      return {
        id:            `${att.date}-${punch.punchIn}`,
        date:          att.date,
        title,
        activityGroup: actType,
        startTime:     start.isValid() ? start.format('hh:mm A') : (punch.punchIn || 'N/A'),
        endTime:       end ? (end.isValid() ? end.format('hh:mm A') : punch.punchOut) : 'Now',
        durationMins:  diffMins,
        durationStr:   end?.isValid() ? fmtMins(diffMins) : 'In Progress',
        isInProgress:  !end,
        employeeName:  att.employeeName,
        checkIn:       att.checkIn,
      }
    })

    const grouped: Record<string, any> = {}
    rawLogs.forEach((log: any) => {
      if (!grouped[log.title]) {
        grouped[log.title] = { ...log }
      } else {
        grouped[log.title].durationMins += log.durationMins
        grouped[log.title].startTime = log.startTime
        grouped[log.title].endTime = log.endTime
        grouped[log.title].isInProgress = grouped[log.title].isInProgress || log.isInProgress
        grouped[log.title].durationStr = grouped[log.title].isInProgress ? 'In Progress' : fmtMins(grouped[log.title].durationMins)
      }
    })

    return Object.values(grouped).sort((a: any, b: any) => {
      if (a.isInProgress && !b.isInProgress) return -1
      if (!a.isInProgress && b.isInProgress) return 1
      return 0
    })
  }

  // ── single-day data (today / yesterday / custom) ────────────────────────────
  const singleDayData = useMemo(() => {
    if (!['today', 'yesterday', 'custom'].includes(dateFilterPreset)) return []
    return filteredAttendance
      .map(att => {
        const logs = parseLogs(att)
        const totalMins = logs.reduce((s: number, l: any) => s + l.durationMins, 0)
        return {
          date: att.date,
          employeeName: att.employeeName,
          employeeId:   att.employeeId,
          checkIn:      att.checkIn,
          logs,
          totalDurationStr: fmtMins(totalMins),
        }
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }, [filteredAttendance, tasks, dateFilterPreset])

  // ── multi-day summary ───────────────────────────────────────────────────────
  const multiDaySummary = useMemo(() => {
    if (['today', 'yesterday', 'custom'].includes(dateFilterPreset)) return null

    const categories: Record<string, { totalMins: number; logs: any[] }> = {
      Work:     { totalMins: 0, logs: [] },
      Research: { totalMins: 0, logs: [] },
      Other:    { totalMins: 0, logs: [] },
    }

    filteredAttendance.forEach(att => {
      const logs = parseLogs(att)
      logs.forEach((log: any) => {
        const cat = categories[log.activityGroup] || categories['Other']
        cat.totalMins += log.durationMins
        cat.logs.push(log)
      })
    })

    // Sort logs by date desc inside each category
    Object.values(categories).forEach(cat =>
      cat.logs.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
    )

    return categories
  }, [filteredAttendance, tasks, dateFilterPreset])

  // ── multi-day by-date (when specific employee selected) ───────────────
  const multiDayByDate = useMemo(() => {
    if (['today', 'yesterday', 'custom'].includes(dateFilterPreset)) return []
    const byDate: Record<string, { work: number; research: number; other: number; logs: any[] }> = {}
    filteredAttendance.forEach(att => {
      const logs = parseLogs(att)
      if (!byDate[att.date]) byDate[att.date] = { work: 0, research: 0, other: 0, logs: [] }
      logs.forEach((log: any) => {
        byDate[att.date].logs.push(log)
        if (log.activityGroup === 'Work')     byDate[att.date].work     += log.durationMins
        else if (log.activityGroup === 'Research') byDate[att.date].research += log.durationMins
        else                                  byDate[att.date].other    += log.durationMins
      })
    })
    return Object.entries(byDate)
      .map(([date, d]) => ({ date, ...d, total: d.work + d.research + d.other }))
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  }, [filteredAttendance, tasks, dateFilterPreset])

  // ── single-day summary (for analytics cards) ──────────────────────────────
  const singleDaySummary = useMemo(() => {
    const categories: Record<string, { totalMins: number; logs: any[] }> = {
      Work:     { totalMins: 0, logs: [] },
      Research: { totalMins: 0, logs: [] },
      Other:    { totalMins: 0, logs: [] },
    }
    singleDayData.forEach(emp => {
      emp.logs.forEach((log: any) => {
        const cat = categories[log.activityGroup] || categories['Other']
        cat.totalMins += log.durationMins
        cat.logs.push(log)
      })
    })
    return categories
  }, [singleDayData])

  const isSingleDay = ['today', 'yesterday', 'custom'].includes(dateFilterPreset)

  if (isUserLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <PageHeader
          title="Work Logs"
          subtitle="Track and analyze employee activities with time breakdown"
        />
        <div className="flex flex-wrap items-center gap-3">
          {user?.role?.toLowerCase() === 'admin' && (
            <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
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
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-[140px]"
              />
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SINGLE-DAY VIEW (today / yesterday / custom)
      ══════════════════════════════════════════════════════════ */}
      {isSingleDay && (
        <div className="space-y-4">

          {/* Analytics summary cards */}
          {singleDayData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['Work', 'Research', 'Other'] as const).map(cat => {
                const meta = ACTIVITY_META[cat]
                const data = singleDaySummary[cat]
                const totalAllMins = (singleDaySummary['Work'].totalMins + singleDaySummary['Research'].totalMins + singleDaySummary['Other'].totalMins) || 1
                const pct = Math.round((data.totalMins / totalAllMins) * 100)
                const accentBorder: Record<string, string> = {
                  Work: 'border-l-blue-500', Research: 'border-l-purple-500', Other: 'border-l-orange-500'
                }
                const progressColor: Record<string, string> = {
                  Work: 'bg-blue-500', Research: 'bg-purple-500', Other: 'bg-orange-500'
                }
                return (
                  <div
                    key={cat}
                    className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accentBorder[cat]} shadow-sm p-5 flex flex-col gap-3`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${meta.bg} ${meta.color}`}>{meta.icon}</div>
                      <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-slate-800 tracking-tight">{fmtMins(data.totalMins)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Employee detail cards */}
          <div className="grid grid-cols-1 gap-4">
          {singleDayData.length > 0 ? singleDayData.map((emp, idx) => {
            const key = `${emp.employeeId}-${emp.date}-${idx}`
            const open = !!expandedCards[key]
            return (
              <Card key={key} className="overflow-hidden">
                <div className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleCard(key)}>
                  <CardHeader className={`pb-3 ${open ? 'border-b' : ''} bg-gray-50/50`}>
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {emp.employeeName}
                        <span className="text-sm font-normal text-gray-500">
                          ({dayjs(emp.date).format('MMM DD, YYYY')})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs font-normal">In at {emp.checkIn || 'N/A'}</Badge>
                        {!open && (
                          <span className="text-sm font-bold text-brand-teal bg-[#EAF7F6] px-3 py-1 rounded-full border border-brand-teal/20">
                            Total: {emp.totalDurationStr}
                          </span>
                        )}
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </div>
                    </CardTitle>
                  </CardHeader>
                </div>

                {open && (
                  <CardContent className="pt-4">
                    {emp.logs.length > 0 ? (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader className="bg-gray-50/50">
                            <TableRow>
                              <TableHead>Activity</TableHead>
                              <TableHead>Start</TableHead>
                              <TableHead>End</TableHead>
                              <TableHead className="text-right">Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emp.logs.map((log: any) => (
                              <TableRow key={log.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2 font-medium">
                                    <span className="truncate max-w-[220px]" title={log.title}>{log.title}</span>
                                    {log.isInProgress && <span className="flex h-2 w-2 rounded-full bg-green-500" title="In Progress" />}
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-500 whitespace-nowrap">{log.startTime}</TableCell>
                                <TableCell className="text-slate-500 whitespace-nowrap">{log.endTime}</TableCell>
                                <TableCell className="text-right font-medium text-slate-700 whitespace-nowrap">{log.durationStr}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="bg-gray-50/50 p-3 border-t flex justify-end text-sm font-semibold text-gray-700">
                          Total: {emp.totalDurationStr}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 py-6 text-center">No activities logged.</p>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          }) : (
            <div className="flex items-center justify-center text-gray-500 py-16">
              No records found for the selected period.
            </div>
          )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MULTI-DAY VIEW (last7 / lastMonth / allTime)
      ══════════════════════════════════════════════════════════ */}
      {!isSingleDay && multiDaySummary && (
        <div className="space-y-4">

          {/* ── Specific employee selected → Date-wise table ── */}
          {filterEmployee !== 'All' ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['Work', 'Research', 'Other'] as const).map(cat => {
                  const meta = ACTIVITY_META[cat]
                  const data = multiDaySummary[cat]
                  const accentBorder: Record<string, string> = {
                    Work: 'border-l-blue-500', Research: 'border-l-purple-500', Other: 'border-l-orange-500'
                  }
                  return (
                    <div
                      key={cat}
                      className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accentBorder[cat]} shadow-sm p-5 flex flex-col gap-3`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${meta.bg} ${meta.color}`}>{meta.icon}</div>
                        <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-slate-800 tracking-tight">{fmtMins(data.totalMins)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Date-wise table */}
              <Card className="overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b py-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Day-wise Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {multiDayByDate.filter(r => r.total > 0).length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">No records found for the selected period.</p>
                ) : (
                  <div>
                    {/* Header */}
                    <div className="grid grid-cols-6 gap-2 px-5 py-2.5 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-2">Date</div>
                      <div className="text-blue-600">Work</div>
                      <div className="text-purple-600">Research</div>
                      <div className="text-orange-600">Other</div>
                      <div className="text-right text-slate-600">Total</div>
                    </div>

                    {multiDayByDate.filter(r => r.total > 0).map(row => {
                      const dayKey = `bydate-${row.date}`
                      const dayOpen = !!expandedDays[dayKey]
                      return (
                        <div key={row.date} className={`border-b last:border-b-0 ${dayOpen ? 'bg-slate-50/60' : ''}`}>
                          {/* Date row — clickable */}
                          <div
                            className="grid grid-cols-6 gap-2 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors items-center group"
                            onClick={() => toggleDay(dayKey)}
                          >
                            <div className="col-span-2 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${dayOpen ? 'bg-brand-teal text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                {dayjs(row.date).format('DD')}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{dayjs(row.date).format('ddd, MMM DD')}</p>
                                <p className="text-xs text-slate-400">{dayjs(row.date).format('YYYY')}</p>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ml-1 ${dayOpen ? 'rotate-180 text-brand-teal' : ''}`} />
                            </div>
                            <div className="text-sm font-semibold text-blue-700">{row.work > 0 ? fmtMins(row.work) : <span className="text-slate-200">—</span>}</div>
                            <div className="text-sm font-semibold text-purple-700">{row.research > 0 ? fmtMins(row.research) : <span className="text-slate-200">—</span>}</div>
                            <div className="text-sm font-semibold text-orange-700">{row.other > 0 ? fmtMins(row.other) : <span className="text-slate-200">—</span>}</div>
                            <div className="text-sm font-bold text-slate-800 text-right">{fmtMins(row.total)}</div>
                          </div>

                          {/* Expanded detail */}
                          {dayOpen && (
                            <div className="px-5 pb-4 border-t border-slate-100">
                              <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader className="bg-slate-50">
                                    <TableRow>
                                      <TableHead className="font-semibold">Activity</TableHead>
                                      <TableHead className="font-semibold">Type</TableHead>
                                      <TableHead className="font-semibold">Start</TableHead>
                                      <TableHead className="font-semibold">End</TableHead>
                                      <TableHead className="text-right font-semibold">Duration</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {row.logs.map((log: any) => (
                                      <TableRow key={log.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium truncate max-w-[240px]" title={log.title}>{log.title}</span>
                                            {log.isInProgress && (
                                              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="In Progress" />
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ACTIVITY_META[log.activityGroup]?.bg} ${ACTIVITY_META[log.activityGroup]?.color} border ${ACTIVITY_META[log.activityGroup]?.border}`}>
                                            {log.activityGroup}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 whitespace-nowrap text-sm">{log.startTime}</TableCell>
                                        <TableCell className="text-slate-500 whitespace-nowrap text-sm">{log.endTime}</TableCell>
                                        <TableCell className="text-right font-semibold text-slate-700 whitespace-nowrap text-sm">{log.durationStr}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Total footer */}
                    <div className="grid grid-cols-6 gap-2 px-5 py-3.5 bg-slate-50 border-t text-sm font-bold">
                      <div className="col-span-2 text-slate-600">Grand Total</div>
                      <div className="text-blue-700">{fmtMins(multiDaySummary['Work'].totalMins)}</div>
                      <div className="text-purple-700">{fmtMins(multiDaySummary['Research'].totalMins)}</div>
                      <div className="text-orange-700">{fmtMins(multiDaySummary['Other'].totalMins)}</div>
                      <div className="text-right text-slate-800">{fmtMins(multiDaySummary['Work'].totalMins + multiDaySummary['Research'].totalMins + multiDaySummary['Other'].totalMins)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          ) : (
            /* ── All Employees → Category summary cards + auto detail ── */
            <>
              {/* Summary Cards — static, no click */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['Work', 'Research', 'Other'] as const).map(cat => {
                  const meta  = ACTIVITY_META[cat]
                  const data  = multiDaySummary[cat]
                  const accentBorder: Record<string, string> = {
                    Work: 'border-l-blue-500', Research: 'border-l-purple-500', Other: 'border-l-orange-500'
                  }
                  return (
                    <div
                      key={cat}
                      className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accentBorder[cat]} shadow-sm p-5 flex flex-col gap-3`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${meta.bg} ${meta.color}`}>{meta.icon}</div>
                        <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-slate-800 tracking-tight">{fmtMins(data.totalMins)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Auto-expanded category detail sections */}
              {(['Work', 'Research', 'Other'] as const).map(cat => {
                const meta = ACTIVITY_META[cat]
                const logs = multiDaySummary[cat].logs
                if (logs.length === 0) return null

                const byDate: Record<string, any[]> = {}
                logs.forEach((log: any) => {
                  if (!byDate[log.date]) byDate[log.date] = []
                  byDate[log.date].push(log)
                })
                const dates = Object.keys(byDate).sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf())

                return (
                  <Card key={`detail-${cat}`} className={`border ${meta.border} overflow-hidden`}>
                    <CardHeader className={`${meta.bg} border-b ${meta.border} py-3`}>
                      <CardTitle className={`text-sm font-bold flex items-center gap-2 ${meta.color}`}>
                        {meta.icon}
                        {meta.label} — Detailed Breakdown
                        <span className="ml-auto text-xs font-normal">Total: {fmtMins(multiDaySummary[cat].totalMins)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {dates.map(date => {
                        const dayLogs = byDate[date]
                        const dayMins = dayLogs.reduce((s: number, l: any) => s + l.durationMins, 0)
                        const dayKey  = `${cat}-${date}`
                        const dayOpen = !!expandedDays[dayKey]
                        return (
                          <div key={date} className="border-b last:border-b-0">
                            <div
                              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleDay(dayKey)}
                            >
                              <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-700">{dayjs(date).format('ddd, MMM DD YYYY')}</span>
                                <Badge variant="outline" className="text-xs">{dayLogs.length} session{dayLogs.length !== 1 ? 's' : ''}</Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${meta.color}`}>{fmtMins(dayMins)}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dayOpen ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                            {dayOpen && (
                              <div className="px-4 pb-3">
                                <div className="border rounded-md">
                                  <Table>
                                    <TableHeader className="bg-gray-50/50">
                                      <TableRow>
                                        <TableHead>Activity</TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Start</TableHead>
                                        <TableHead>End</TableHead>
                                        <TableHead className="text-right">Duration</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {dayLogs.map((log: any) => (
                                        <TableRow key={log.id}>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <span className="truncate max-w-[200px] text-sm font-medium" title={log.title}>{log.title}</span>
                                              {log.isInProgress && <span className="flex h-2 w-2 rounded-full bg-green-500" />}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-slate-500 text-sm">{log.employeeName}</TableCell>
                                          <TableCell className="text-slate-500 whitespace-nowrap text-sm">{log.startTime}</TableCell>
                                          <TableCell className="text-slate-500 whitespace-nowrap text-sm">{log.endTime}</TableCell>
                                          <TableCell className="text-right font-medium text-slate-700 whitespace-nowrap text-sm">{log.durationStr}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
