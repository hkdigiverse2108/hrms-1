'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/hrms/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, User, Briefcase, CheckCircle2, XCircle, Clock, Search, Filter } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useUser } from '@/hooks/useUser'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { Loader2, MessageSquare, History } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ActivityLogDialog } from '@/components/common/ActivityLogDialog'

export default function DailyProgressPage() {
  const { data, refresh } = useApi()
  const { user } = useUser()
  const router = useRouter()
  const { checkPermission, isAdmin: isUserAdmin, loading: permissionsLoading } = usePermissions()

  const canViewDailyProgress = isUserAdmin || checkPermission('daily-progress', 'canView')
  const canEditDailyProgress = isUserAdmin || checkPermission('daily-progress', 'canEdit')

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewDailyProgress) {
      router.push("/");
    }
  }, [router, permissionsLoading, canViewDailyProgress]);

  const employees = data?.employees || []
  const allReports = (data as any)?.employeeDailyReports || []
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [noteRecord, setNoteRecord] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [logsOpen, setLogsOpen] = useState(false)
  const [reportLogs, setReportLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logFilter, setLogFilter] = useState<{reportId?: string, employeeName?: string}>({})

  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isTeamLeader = user?.role === 'Team Leader'

  // Combine employees with their report status for the selected date
  const displayData = useMemo(() => {
    let filteredEmployees = [...employees]
    
    // Role-based filtering of employees
    if (isTeamLeader) {
      filteredEmployees = filteredEmployees.filter(e => e.department === user?.department)
    } else if (!isAdmin) {
      filteredEmployees = filteredEmployees.filter(e => e.id === user?.id)
    }

    return filteredEmployees.map(emp => {
      const report = allReports.find((r: any) => r.employeeId === emp.id && r.date === selectedDate)
      return {
        id: emp.id,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        date: selectedDate,
        status: report?.status || 'Pending Verification',
        reportId: report?.id,
        note: report?.note || ''
      }
    })
  }, [employees, allReports, selectedDate, user, isAdmin, isTeamLeader])

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
        refresh()
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
        refresh()
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
  ]

  const actions = (record: any) => {
    const isSelf = user?.id === record.employeeId
    const canManage = (canEditDailyProgress || (isTeamLeader && user?.department === record.department)) && !isSelf
    
    if (!canManage) {
        return <span className="text-[10px] text-slate-400 italic font-medium tracking-tighter">
          {isSelf ? "Self Verification Hidden" : "View Only"}
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

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Daily Work Verification" 
        description="Daily progress monitoring. Team Leaders can verify and approve work for their respective departments."
      >
        <div className="flex items-center gap-3 bg-white p-1.5 px-3 rounded-xl border border-slate-200 shadow-sm">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">Target Date</Label>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-bold bg-transparent outline-none border-none p-0 cursor-pointer text-brand-teal"
          />
        </div>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          data={displayData}
          columns={columns}
          actions={actions}
          searchKey="employeeName"
          searchPlaceholder="Filter employees..."
        />
      </div>

      {!isAdmin && !isTeamLeader && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
            <Filter className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
                <h4 className="text-sm font-bold text-blue-900">Your Daily Status</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                    Your daily work is automatically listed here for verification by your Team Leader. 
                    You can check your approval status for any date by using the date picker above.
                </p>
            </div>
        </div>
      )}

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
