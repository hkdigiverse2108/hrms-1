'use client'

import { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/hrms/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, User, Users, Briefcase, CheckCircle2, XCircle, Clock, Search, Filter } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useUser } from '@/hooks/useUser'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, eachDayOfInterval } from "date-fns"
import { DateRange } from "react-day-picker"
import { usePermissions } from '@/hooks/usePermissions'
import { Loader2, MessageSquare, History } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ActivityLogDialog } from '@/components/common/ActivityLogDialog'

interface DailyProgressViewProps {
  defaultDepartment?: string;
}

export function DailyProgressView({ defaultDepartment }: DailyProgressViewProps) {
  const { data, refreshItem } = useApi()
  const { user } = useUser()
  const router = useRouter()
  const { checkPermission, isAdmin: isUserAdmin, loading: permissionsLoading } = usePermissions()

  const isHRRoleOrDept = user?.role === 'HR' || user?.department?.toLowerCase() === 'hr'
  const canViewDailyProgress = isUserAdmin || isHRRoleOrDept || checkPermission('daily-progress', 'canView') || ['Employee', 'Team Leader', 'Manager', 'Social Media Manager'].includes(user?.role)
  const canEditDailyProgress = isUserAdmin || isHRRoleOrDept || checkPermission('daily-progress', 'canEdit')

  const employees = data?.employees || []
  const allReports = (data as any)?.employeeDailyReports || []
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [noteRecord, setNoteRecord] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [logsOpen, setLogsOpen] = useState(false)
  const [reportLogs, setReportLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logFilter, setLogFilter] = useState<{reportId?: string, employeeName?: string}>({})
  const [activeDeptTab, setActiveDeptTab] = useState<string>(defaultDepartment || '')
  const [activeRoleTab, setActiveRoleTab] = useState<'Team Leaders' | 'Employees'>('Team Leaders')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')
  const [tlViewMode, setTlViewMode] = useState<'my' | 'team'>('team')

  const availableDepartments = useMemo(() => {
    if (!employees || employees.length === 0) return []
    const depts = new Set(employees.map((e: any) => e.department).filter(Boolean))
    return Array.from(depts).sort() as string[]
  }, [employees])

  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isTeamLeader = user?.role === 'Team Leader'
  const isHRUser = user?.role === 'HR' || user?.department?.toLowerCase() === 'hr'

  useEffect(() => {
    if (isTeamLeader && user?.department && !activeDeptTab) {
      setActiveDeptTab(user.department)
    }
  }, [isTeamLeader, user, activeDeptTab])

  // Combine employees with their report status for the selected date
  const displayData = useMemo(() => {
    let filteredEmployees = [...employees]
    
    if (!isAdmin && !isTeamLeader && !isHRUser) {
       filteredEmployees = filteredEmployees.filter(e => e.id === user?.id)
    } else {
       const deptToFilter = isTeamLeader ? user?.department : activeDeptTab
       if (deptToFilter) {
         filteredEmployees = filteredEmployees.filter(e => e.department?.toLowerCase() === deptToFilter.toLowerCase())
       }

        if (isAdmin || isHRUser) {
          if (activeRoleTab === 'Team Leaders') {
            filteredEmployees = filteredEmployees.filter(e => e.role === 'Team Leader' || e.department?.toLowerCase() === 'hr')
          } else {
            filteredEmployees = filteredEmployees.filter(e => e.role !== 'Team Leader' && e.department?.toLowerCase() !== 'hr' && e.role?.toLowerCase() !== 'admin')
          }
        } else if (isTeamLeader) {
         filteredEmployees = filteredEmployees.filter(e => e.id === user?.id || (e.role !== 'Team Leader' && e.role?.toLowerCase() !== 'admin'))
       }
    }

    let datesToMap: Date[] = []
    if (dateRange?.from) {
      if (dateRange.to) {
        datesToMap = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
      } else {
        datesToMap = [dateRange.from]
      }
    }

    const mapped = datesToMap.flatMap(dateObj => {
      const dateStr = format(dateObj, "yyyy-MM-dd")
      return filteredEmployees.map(emp => {
        const report = allReports.find((r: any) => r.employeeId === emp.id && r.date === dateStr)
        let responsiblePerson = ''
        if (emp.role === 'Team Leader' || emp.role?.toLowerCase() === 'admin') {
           responsiblePerson = 'HR / Admin'
        } else {
           const tls = employees.filter(e => e.department?.toLowerCase() === emp.department?.toLowerCase() && e.role === 'Team Leader')
           if (tls.length > 0) {
             responsiblePerson = tls.map(t => t.name || `${t.firstName} ${t.lastName}`).join(', ')
           } else {
             responsiblePerson = 'Admin'
           }
        }

        return {
          id: `${emp.id}-${dateStr}`,
          employeeId: emp.id,
          employeeName: emp.name || `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          role: emp.role,
          date: dateStr,
          status: report?.status || 'Pending Verification',
          reportId: report?.id,
          note: report?.note || '',
          verifiedBy: report?.userName || '',
          responsiblePerson
        }
      })
    })

    if (selectedStatusFilter !== 'all') {
      return mapped.filter(item => item.status?.toLowerCase() === selectedStatusFilter.toLowerCase())
    }

    return mapped
  }, [employees, allReports, dateRange, user, isAdmin, isTeamLeader, activeDeptTab, activeRoleTab, selectedStatusFilter])

  const handleStatusUpdate = async (emp: any, newStatus: string) => {
    setIsSubmitting(true)
    try {
      const method = emp.reportId ? 'PUT' : 'POST'
      const url = emp.reportId 
        ? `${API_URL}/employee-daily-reports/${emp.reportId}` 
        : `${API_URL}/employee-daily-reports`

      const payload = emp.reportId 
        ? { 
            status: newStatus,
            performedBy: user?.id,
            userName: user?.name || `${user?.firstName} ${user?.lastName}`
          }
        : {
            employeeId: emp.employeeId,
            employeeName: emp.employeeName,
            department: emp.department,
            date: emp.date,
            status: newStatus,
            tasksCompleted: ["Work verified by TL"],
            tasksInProgress: [],
            hoursWorked: 8.0,
            performedBy: user?.id,
            userName: user?.name || `${user?.firstName} ${user?.lastName}`
          }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(`Work ${newStatus.toLowerCase()} successfully`)
        refreshItem('employeeDailyReports')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveNote = async () => {
    if (!noteRecord) return
    setIsSubmitting(true)
    try {
      const method = noteRecord.reportId ? 'PUT' : 'POST'
      const url = noteRecord.reportId 
        ? `${API_URL}/employee-daily-reports/${noteRecord.reportId}` 
        : `${API_URL}/employee-daily-reports`

      const payload = noteRecord.reportId 
        ? { 
            note: noteText,
            performedBy: user?.id,
            userName: user?.name || `${user?.firstName} ${user?.lastName}`
          }
        : {
            employeeId: noteRecord.employeeId,
            employeeName: noteRecord.employeeName,
            department: noteRecord.department,
            date: noteRecord.date,
            status: noteRecord.status,
            tasksCompleted: ["Work verified by TL"],
            tasksInProgress: [],
            hoursWorked: 8.0,
            note: noteText,
            performedBy: user?.id,
            userName: user?.name || `${user?.firstName} ${user?.lastName}`
          }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('Note saved successfully')
        setNoteRecord(null)
        setNoteText('')
        refreshItem('employeeDailyReports')
      } else {
        toast.error('Failed to save note')
      }
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('Failed to save note')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchLogs = async (reportId?: string, employeeName?: string) => {
    setLogsOpen(true)
    setLogFilter({ reportId, employeeName })
    if (!reportId) {
      setReportLogs([])
      return
    }
    setIsLoadingLogs(true)
    try {
      const url = `${API_URL}/task-logs?dailyReportId=${reportId}`
      const res = await fetch(url)
      if (res.ok) {
        setReportLogs(await res.json())
      }
    } catch (err) {
      console.error("Error fetching logs:", err)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const columns = [
    { key: 'employeeName' as const, header: 'Employee', render: (record: any) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
          {record.employeeName?.charAt(0)}
        </div>
        <span className="font-medium text-slate-700">{record.employeeName}</span>
      </div>
    )},
    { key: 'department' as const, header: 'Department', render: (record: any) => (
      <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded text-[10px] font-bold uppercase tracking-wider">
        {record.department}
      </span>
    )},
    { key: 'date' as const, header: 'Date', render: (record: any) => (
      <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
        <Clock className="w-3 h-3" /> {record.date}
      </div>
    )},
    { key: 'status' as const, header: 'Work Status', render: (record: any) => (
      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight ${
        record.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
        record.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
        'bg-amber-50 text-amber-600 border border-amber-100'
      }`}>
        {record.status}
      </span>
    )},
    { key: 'note' as const, header: 'Verification Note', render: (record: any) => (
      record.note ? (
        <span className="text-[11px] text-slate-600 font-medium italic break-words max-w-[200px] block" title={record.note}>
          "{record.note}"
        </span>
      ) : (
        <span className="text-[10px] text-slate-400 italic">No note added</span>
      )
    )},
    { key: 'verifiedBy' as const, header: 'Verified By / Responsible', render: (record: any) => (
      record.status === 'Pending Verification' ? (
        <span className="text-[11px] text-slate-600 font-semibold">{record.responsiblePerson}</span>
      ) : record.verifiedBy ? (
        <span className="text-[11px] font-bold text-brand-teal">
          {record.verifiedBy}
        </span>
      ) : (
        <span className="text-[11px] text-slate-600 font-semibold">{record.responsiblePerson}</span>
      )
    )},
  ]

  const actions = (record: any) => {
    const isSelf = user?.id === record.employeeId
    const canManage = (canEditDailyProgress || (isTeamLeader && user?.department === record.department) || (isHRUser && record.role === 'Team Leader')) && !isSelf
    
    if (!canManage) {
        return <span className="text-[10px] text-slate-400 italic font-medium tracking-tighter">
          View Only
        </span>
    }

    return (
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline"
          className="h-7 px-3 text-[10px] font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          onClick={() => handleStatusUpdate(record, 'Approved')}
          disabled={isSubmitting || record.status === 'Approved'}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="h-7 px-3 text-[10px] font-bold border-rose-200 text-rose-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          onClick={() => handleStatusUpdate(record, 'Rejected')}
          disabled={isSubmitting || record.status === 'Rejected'}
        >
          <XCircle className="w-3 h-3 mr-1" /> Reject
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="h-7 px-3 text-[10px] font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => {
            setNoteRecord(record)
            setNoteText(record.note || '')
          }}
        >
          <MessageSquare className="w-3 h-3 mr-1" /> Note
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-50 border-slate-200 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            fetchLogs(record.reportId, record.employeeName)
          }}
          title="View History"
        >
          <History className="w-3.5 h-3.5" />
        </Button>
      </div>
    )
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (!canViewDailyProgress) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        You do not have permission to view daily progress.
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-200">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">Target Date(s)</Label>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 text-xs font-bold text-brand-teal hover:bg-slate-100 p-0 shadow-none border-none">
                <Calendar className="w-3.5 h-3.5 mr-2" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  "Select Date Range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Department and Role Tabs */}
        {(isAdmin || isTeamLeader || isHRUser) && (
          <div className="flex items-center gap-4">
            {isTeamLeader && !isAdmin && (
              <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl shadow-inner border border-slate-200/60">
                <button
                  onClick={() => setTlViewMode('my')}
                  className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 ${
                    tlViewMode === 'my' 
                      ? 'bg-white text-brand-teal shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  <User className="w-4 h-4" /> My Progress
                </button>
                <button
                  onClick={() => setTlViewMode('team')}
                  className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 ${
                    tlViewMode === 'team' 
                      ? 'bg-white text-brand-teal shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  <Users className="w-4 h-4" /> Team Progress
                </button>
              </div>
            )}
            {!defaultDepartment && !isAdmin && !isHRUser && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                <button className="px-4 py-2 rounded-lg text-[13px] font-bold flex items-center transition-all whitespace-nowrap bg-brand-teal text-white shadow-sm cursor-default">
                  {user?.department}
                </button>
              </div>
            )}

            {(isAdmin || isHRUser) && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                <button
                  onClick={() => setActiveRoleTab('Team Leaders')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all whitespace-nowrap ${
                    activeRoleTab === 'Team Leaders'
                      ? "bg-brand-teal text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Team Leaders & HR
                </button>
                <button
                  onClick={() => setActiveRoleTab('Employees')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all whitespace-nowrap ${
                    activeRoleTab === 'Employees'
                      ? "bg-brand-teal text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Employees
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          data={isTeamLeader && !isAdmin ? displayData.filter(d => tlViewMode === 'my' ? String(d.employeeId) === String(user?.id) : String(d.employeeId) !== String(user?.id)) : displayData}
          columns={columns}
          actions={actions}
          searchKey="employeeName"
          searchPlaceholder={tlViewMode === 'my' ? "Filter dates..." : "Filter employees..."}
          extraFilters={
            <div className="flex items-center gap-2">
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs font-semibold bg-white border border-slate-200">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      <Dialog open={!!noteRecord} onOpenChange={(open) => !open && setNoteRecord(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-teal" />
              <span>Verification Note</span>
            </DialogTitle>
            <div className="text-[11px] text-slate-400 font-medium tracking-tight mt-1">
              Add verification remarks for <span className="font-bold text-slate-600">{noteRecord?.employeeName}</span> on <span className="font-bold text-slate-600">{noteRecord?.date}</span>.
            </div>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter details, feedback, or verification remarks..."
              className="min-h-[120px] text-xs resize-none border-slate-200 focus:border-brand-teal focus:ring-brand-teal rounded-xl p-3"
            />
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 border-t border-slate-50 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteRecord(null)}
              className="h-8 text-xs font-bold border-slate-200 text-slate-500 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={isSubmitting}
              className="h-8 text-xs font-bold bg-brand-teal hover:bg-brand-teal-light text-white rounded-lg shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActivityLogDialog 
        open={logsOpen}
        onOpenChange={setLogsOpen}
        title="Verification History"
        subtitle={logFilter.employeeName ? `Activity logs for ${logFilter.employeeName}` : undefined}
        logs={reportLogs}
        isLoading={isLoadingLogs}
      />
    </div>
  )
}
