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

export default function DailyProgressPage() {
  const { data, refresh } = useApi()
  const { user } = useUser()
  const employees = data?.employees || []
  const allReports = data?.employeeDailyReports || []
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        reportId: report?.id
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
        ? { status: newStatus }
        : {
            employeeId: emp.employeeId,
            employeeName: emp.employeeName,
            department: emp.department,
            date: emp.date,
            status: newStatus,
            tasksCompleted: ["Work verified by TL"],
            tasksInProgress: [],
            hoursWorked: 8.0
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
  ]

  const actions = (record: any) => {
    const canManage = isAdmin || (isTeamLeader && user?.department === record.department)
    
    if (!canManage) {
        return <span className="text-[10px] text-slate-400 italic font-medium tracking-tighter">View Only</span>
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
          className="h-7 px-3 text-[10px] font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
          onClick={() => handleStatusUpdate(record, 'Rejected')}
          disabled={isSubmitting || record.status === 'Rejected'}
        >
          <XCircle className="w-3 h-3 mr-1" /> Reject
        </Button>
      </div>
    )
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
    </div>
  )
}
