"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Download, 
  Clock, 
  Calendar as CalendarIcon, 
  Search,
  Filter,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TablePagination } from "@/components/common/TablePagination";
import { PageHeader } from "@/components/common/PageHeader";
import dayjs from "dayjs";
import { API_URL } from "@/lib/config";
import { exportToCSV } from "@/lib/export-utils";
import { formatTime12h } from "@/lib/utils";

export default function EmployeeAttendanceListPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [specificDate, setSpecificDate] = useState("");
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  // Modals
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sysSettings, setSysSettings] = useState<any>(null);
  const [recoveryRequests, setRecoveryRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [attRes, empRes, deptRes, sysRes, recRes] = await Promise.all([
        fetch(`${API_URL}/attendance`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/departments`),
        fetch(`${API_URL}/system-settings`),
        fetch(`${API_URL}/time-recovery`)
      ]);
      
      if (attRes.ok) setAttendance(await attRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (sysRes.ok) setSysSettings(await sysRes.json());
      if (recRes.ok) setRecoveryRequests(await recRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present':
      case 'active':
        return 'bg-[#ecfdf5] text-[#10b981] border-[#d1fae5]';
      case 'late':
      case 'late entry':
        return 'bg-[#fffbeb] text-[#f59e0b] border-[#fef3c7]';
      case 'absent':
        return 'bg-[#fef2f2] text-[#ef4444] border-[#fee2e2]';
      case 'logged':
        return 'bg-slate-50 text-slate-600 border-slate-100';
      case 'holiday':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getCalculatedStatus = (record: any) => {
    return record.status === "Leave" ? "Leave" : (record.checkIn && record.checkIn !== "--:--" && record.checkIn !== "--" ? "Present" : "Absent");
  };

  const filteredAttendance = useMemo(() => {
    let baseRecords = [...attendance];
    const todayStr = dayjs().format('YYYY-MM-DD');
    
    // Determine the range of dates to synthesize based on filter
    let datesToSynthesize: string[] = [];
    if (specificDate) {
      datesToSynthesize = [dayjs(specificDate).format('YYYY-MM-DD')];
    } else if (dateFilter === "today") {
      datesToSynthesize = [todayStr];
    } else if (dateFilter === "yesterday") {
      datesToSynthesize = [dayjs().subtract(1, 'day').format('YYYY-MM-DD')];
    } else if (dateFilter === "last_7_days") {
      for (let i = 0; i < 7; i++) {
        datesToSynthesize.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
      }
    } else if (dateFilter === "this_month") {
      const daysInMonth = dayjs().daysInMonth();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = dayjs().date(i).format('YYYY-MM-DD');
        if (dayjs(d).isAfter(dayjs())) break; // Don't synthesize future dates
        datesToSynthesize.push(d);
      }
    }

    // Synthesize missing records for each employee and each date in the range
    datesToSynthesize.forEach(dateStr => {
      employees.forEach(emp => {
        // We use employeeId for the check because some records might use emp.id or emp.employeeId
        const existing = baseRecords.find(a => (a.employeeId === emp.id || a.employeeId === emp.employeeId) && a.date === dateStr);
        if (!existing) {
          baseRecords.push({
            id: `synthesized-${emp.id}-${dateStr}`,
            employeeId: emp.id,
            employeeName: emp.name,
            date: dateStr,
            checkIn: "--:--",
            checkOut: "--:--",
            workHours: "--",
            status: "Absent",
            punches: [],
            breaks: []
          });
        }
      });
    });

    return baseRecords.filter(a => {
      const emp = employees.find(e => e.id === a.employeeId || e.employeeId === a.employeeId);
      const matchesSearch = a.employeeName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const calcStatus = getCalculatedStatus(a);
      const matchesStatus = selectedStatus === "all" || calcStatus.toLowerCase() === selectedStatus.toLowerCase();
      
      const matchesDept = selectedDept === "all" || emp?.department?.toLowerCase() === selectedDept.toLowerCase();
      
      let matchesDate = true;
      const recordDate = dayjs(a.date);
      const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      
      if (specificDate) {
        matchesDate = a.date === dayjs(specificDate).format('YYYY-MM-DD');
      } else if (dateFilter === "today") {
        matchesDate = a.date === todayStr;
      } else if (dateFilter === "yesterday") {
        matchesDate = a.date === yesterdayStr;
      } else if (dateFilter === "last_7_days") {
        matchesDate = recordDate.valueOf() >= dayjs().subtract(7, 'day').startOf('day').valueOf();
      } else if (dateFilter === "this_month") {
        matchesDate = recordDate.month() === dayjs().month() && recordDate.year() === dayjs().year();
      }

      return matchesSearch && matchesStatus && matchesDept && matchesDate;
    }).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf() || a.employeeName?.localeCompare(b.employeeName));
  }, [attendance, employees, dateFilter, specificDate, selectedStatus, selectedDept, searchQuery]);

  const paginatedAttendance = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAttendance.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAttendance, currentPage, itemsPerPage]);

  const CalendarView = () => {
    const daysInMonth = currentMonth.daysInMonth();
    const firstDayOfMonth = currentMonth.startOf('month').day();
    const prevMonthDays = currentMonth.subtract(1, 'month').daysInMonth();
    
    const calendarDays = [];
    
    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      calendarDays.push({ 
        day: prevMonthDays - i, 
        currentMonth: false,
        date: currentMonth.subtract(1, 'month').date(prevMonthDays - i).format('YYYY-MM-DD')
      });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({ 
        day: i, 
        currentMonth: true,
        date: currentMonth.date(i).format('YYYY-MM-DD')
      });
    }

    return (
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">{currentMonth.format("MMMM YYYY")}</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 border-b border-border">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-white">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((d, i) => {
            const dayAttendance = attendance.filter(a => a.date === d.date);
            
            const dayStats = (() => {
              let p = 0, l = 0, lv = 0;
              dayAttendance.forEach(record => {
                const status = getCalculatedStatus(record);
                if (status === "Leave") {
                  lv++;
                } else if (status === "Present") {
                  // Check if late
                  const recoveryReq = recoveryRequests.find(req => 
                    req.date === record.date && 
                    (req.employee_id === record.employeeId || req.employee_id === record.employeeId) && 
                    req.status === 'approved'
                  );
                  
                  const isLate = (() => {
                    if (recoveryReq) return false;
                    if (!record.checkIn || record.checkIn === "--") return false;
                    const officeStartTime = sysSettings?.officeStartTime || "09:30";
                    const bufferMins = sysSettings?.lateBufferMins || 10;
                    const [h, m] = record.checkIn.split(':').map(Number);
                    const [sh, sm] = officeStartTime.split(':').map(Number);
                    return (h * 60 + m) > (sh * 60 + sm + bufferMins);
                  })();
                  
                  if (isLate) l++;
                  else p++;
                }
              });
              
              const totalLogged = p + l + lv;
              const a = Math.max(0, employees.length - totalLogged);
              
              return { present: p, late: l, absent: a, leave: lv };
            })();

            const isSunday = dayjs(d.date).day() === 0;

            return (
              <div 
                key={i} 
                className={`min-h-[100px] border-b border-r border-border p-2 transition-colors hover:bg-slate-50 cursor-pointer flex flex-col gap-1 ${!d.currentMonth ? 'bg-slate-50/50' : 'bg-white'}`}
                onClick={() => {
                  setSelectedDay(d.date);
                  setIsDailyModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold ${!d.currentMonth ? 'text-slate-300' : 'text-slate-600'}`}>{d.day}</span>
                  {d.currentMonth && !isSunday && <span className="text-[9px] font-medium text-slate-400">{employees.length} Total</span>}
                </div>

                {isSunday ? (
                  <div className="mt-2 px-2 py-1 bg-sky-50 text-sky-600 text-[10px] font-bold rounded border border-sky-100 flex items-center gap-1">
                    Holiday
                  </div>
                ) : d.currentMonth && (
                  <div className="space-y-1 mt-auto">
                    <div className="flex items-center justify-between px-2 py-0.5 bg-[#ecfdf5] text-[#10b981] text-[9px] font-bold rounded border border-[#d1fae5]">
                      <span>Present</span>
                      <span>{dayStats.present}</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-0.5 bg-[#fffbeb] text-[#f59e0b] text-[9px] font-bold rounded border border-[#fef3c7]">
                      <span>Late</span>
                      <span>{dayStats.late}</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-0.5 bg-[#fef2f2] text-[#ef4444] text-[9px] font-bold rounded border border-[#fee2e2]">
                      <span>Absent</span>
                      <span>{dayStats.absent}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const dailySummary = useMemo(() => {
    if (!selectedDay) return null;
    
    const dayAttendance = attendance.filter(a => a.date === selectedDay);
    const dayEmployees = employees.map(emp => {
      const existing = dayAttendance.find(a => a.employeeId === emp.id || a.employeeId === emp.employeeId);
      if (existing) return existing;
      
      return {
        id: `synthesized-${emp.id}-${selectedDay}`,
        employeeId: emp.id,
        employeeName: emp.name,
        date: selectedDay,
        checkIn: "--:--",
        checkOut: "--:--",
        status: "Absent"
      };
    });

    const filteredRecords = dayEmployees.filter(r => 
      r.employeeName?.toLowerCase().includes(modalSearchQuery.toLowerCase())
    );

    return {
      present: dayAttendance.filter(a => getCalculatedStatus(a) === "Present").length,
      late: dayAttendance.filter(a => {
        if (getCalculatedStatus(a) !== "Present") return false;
        const recoveryReq = recoveryRequests.find(req => 
          req.date === a.date && (req.employee_id === a.employeeId || req.employee_id === a.employeeId) && req.status === 'approved'
        );
        if (recoveryReq) return false;
        const officeStartTime = sysSettings?.officeStartTime || "09:30";
        const bufferMins = sysSettings?.lateBufferMins || 10;
        const [h, m] = (a.checkIn || "00:00").split(':').map(Number);
        const [sh, sm] = officeStartTime.split(':').map(Number);
        return (h * 60 + m) > (sh * 60 + sm + bufferMins);
      }).length,
      absent: dayEmployees.filter(a => a.status === "Absent").length,
      records: filteredRecords
    };
  }, [selectedDay, attendance, employees, modalSearchQuery, recoveryRequests, sysSettings]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employee Attendance List" 
        description="Manage your team members and their account permissions here."
      >
        <div className="flex items-center gap-3">
          <Link href="/attendance/recovery-requests">
            <Button variant="outline" className="h-9 shadow-sm font-medium border-brand-teal text-brand-teal hover:bg-brand-light/20">
              <Eye className="w-4 h-4 mr-2" />
              View Requests
            </Button>
          </Link>
          <Button variant="outline" className="h-9 shadow-sm" onClick={() => exportToCSV(filteredAttendance, 'employee_attendance')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              value={specificDate} 
              onChange={(e) => {
                setSpecificDate(e.target.value);
                if (e.target.value) setDateFilter("all");
              }}
              className="w-[150px] h-9 bg-white border-border shadow-sm text-xs"
            />
          </div>

          <Select value={dateFilter} onValueChange={(v) => {
            setDateFilter(v);
            setSpecificDate("");
          }}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center">
            <button 
              onClick={() => setView("list")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button 
              onClick={() => setView("calendar")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'calendar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>

          <div className="relative flex-1 md:w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employees..." 
              className="w-full pl-9 pr-4 py-2 h-9 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50/50 border-b border-border">
                <tr>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Day</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Check In</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Check Out</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Break</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Late</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overtime</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Prod. Hrs</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Hrs</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-20 text-center text-slate-400 italic">Loading attendance records...</td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-20 text-center text-slate-400 italic">No attendance records found.</td>
                  </tr>
                ) : (
                  paginatedAttendance.map((record, idx) => {
                    const totalBreakMinutes = (record.breaks || []).reduce((acc: number, b: any) => acc + (parseInt(b.duration) || 0), 0);
                    const breakStr = totalBreakMinutes > 0 ? (totalBreakMinutes >= 60 ? `${Math.floor(totalBreakMinutes/60)}H ${totalBreakMinutes%60}Min` : `${totalBreakMinutes}Min`) : "-";
                    
                    const isToday = dayjs(record.date).isSame(dayjs(), 'day');
                    const checkIn = dayjs(`${record.date} ${record.checkIn}`);
                    const checkOut = record.checkOut 
                      ? dayjs(`${record.date} ${record.checkOut}`) 
                      : (isToday && record.checkIn && record.checkIn !== "--" ? dayjs() : null);
                    
                    let totalWorkingMinutes = 0;
                    if (checkIn.isValid() && checkOut && checkOut.isValid()) {
                      totalWorkingMinutes = checkOut.diff(checkIn, 'minute');
                    }
                    const totalWorkingStr = totalWorkingMinutes > 0 ? (totalWorkingMinutes >= 60 ? `${Math.floor(totalWorkingMinutes/60)}H ${totalWorkingMinutes%60}Min` : `${totalWorkingMinutes}Min`) : "-";
                    
                    const productionMinutes = Math.max(0, totalWorkingMinutes - totalBreakMinutes);
                    const productionStr = productionMinutes > 0 ? (productionMinutes >= 60 ? `${Math.floor(productionMinutes/60)}H ${productionMinutes%60}Min` : `${productionMinutes}Min`) : "-";
                    
                    const recoveryReq = recoveryRequests.find(req => 
                      req.date === record.date && 
                      (req.employee_id === record.employeeId || req.employee_id === record.employeeId) && 
                      req.status === 'approved'
                    );

                    const isLate = (() => {
                      if (recoveryReq) return false;
                      if (!record.checkIn || record.checkIn === "--") return false;
                      const officeStartTime = sysSettings?.officeStartTime || "09:30";
                      const bufferMins = sysSettings?.lateBufferMins || 10;
                      
                      const [h, m] = record.checkIn.split(':').map(Number);
                      const [sh, sm] = officeStartTime.split(':').map(Number);
                      
                      const punchMins = h * 60 + m;
                      const limitMins = sh * 60 + sm + bufferMins;
                      
                      return punchMins > limitMins;
                    })();
                    
                    const lateMinutes = checkIn.isValid() ? Math.max(0, checkIn.diff(dayjs(`${record.date} ${sysSettings?.officeStartTime || "09:30"}`), 'minute')) : 0;
                    const lateStr = isLate || recoveryReq ? `${lateMinutes}Min` : "-";
                    
                    const shiftDurationMinutes = (() => {
                      const officeStartTime = sysSettings?.officeStartTime || "09:30";
                      const officeEndTime = sysSettings?.officeEndTime || "18:30";
                      const [sh, sm] = officeStartTime.split(':').map(Number);
                      const [eh, em] = officeEndTime.split(':').map(Number);
                      return (eh * 60 + em) - (sh * 60 + sm);
                    })();
                    
                    const overtimeMinutes = Math.max(0, productionMinutes - shiftDurationMinutes);
                    const overtimeStr = overtimeMinutes > 0 ? (overtimeMinutes >= 60 ? `${Math.floor(overtimeMinutes/60)}H ${overtimeMinutes%60}Min` : `${overtimeMinutes}Min`) : "-";

                    const day = dayjs(record.date).format("dddd");
                    const statusLabel = getCalculatedStatus(record);
                    const statusClass = statusLabel === "Present" 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : (statusLabel === "Leave" ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-rose-50 text-rose-600 border-rose-100");

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border border-border shadow-sm">
                              <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs uppercase">
                                {record.employeeName?.split(' ').map((n:any) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-slate-800 leading-tight">{record.employeeName}</div>
                              <div className="text-[11px] text-slate-400">
                                {employees.find(e => e.id === record.employeeId || e.employeeId === record.employeeId)?.department || 'Staff'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600 font-medium whitespace-nowrap">
                          {isToday ? `Today, ${dayjs(record.date).format("MMM D")}` : dayjs(record.date).format("MMM D, YYYY")}
                        </td>
                        <td className="px-4 py-4 text-slate-600 font-medium">{day}</td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${statusClass} whitespace-nowrap uppercase tracking-wider`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700 font-mono text-[13px]">{formatTime12h(record.checkIn) || '--:--'}</td>
                        <td className="px-4 py-4 text-slate-700 font-mono text-[13px]">{formatTime12h(record.checkOut) || '--:--'}</td>
                        <td className="px-4 py-4 text-slate-500 text-center font-medium whitespace-nowrap">{breakStr}</td>
                        <td className="px-4 py-4 text-slate-700 font-medium whitespace-nowrap">{lateStr}</td>
                        <td className="px-4 py-4 text-slate-700 font-medium whitespace-nowrap">{overtimeStr}</td>
                        <td className="px-4 py-4">
                            {productionMinutes > 0 ? (
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                productionMinutes >= 480 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-green-50 text-green-600 border border-green-100'
                              }`}>
                                {productionStr}
                              </span>
                            ) : "-"}
                        </td>
                        <td className="px-4 py-4 text-slate-700 font-medium whitespace-nowrap">{totalWorkingStr}</td>
                        <td className="px-4 py-4 text-[11px] text-muted-foreground max-w-[200px] truncate">
                          {isLate ? `Late punch-in; ${lateMinutes} mins after expected start (${sysSettings?.officeStartTime || "09:30"} AM)` : "-"}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); setIsDetailModalOpen(true); }}
                            className="inline-flex items-center justify-center h-8 w-8 text-brand-teal bg-brand-light/20 hover:bg-brand-light/40 rounded-full transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <TablePagination 
            totalItems={filteredAttendance.length} 
            itemsPerPage={itemsPerPage} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
            itemName="records"
          />
        </div>
      ) : (
        <CalendarView />
      )}

      {/* Daily Attendance Modal */}
      <Dialog open={isDailyModalOpen} onOpenChange={setIsDailyModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <div className="flex justify-between items-start mb-6">
              <div>
                <DialogHeader className="p-0 space-y-0 text-left">
                  <DialogTitle className="text-xl font-bold text-slate-800">
                    {dayjs(selectedDay).format("MMMM D, YYYY")}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">Daily Attendance Report</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-[#d1fae5] rounded-xl p-3 shadow-sm text-center">
                <div className="text-2xl font-bold text-[#10b981] mb-0.5">{dailySummary?.present || 0}</div>
                <div className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">Present</div>
              </div>
              <div className="bg-white border border-[#fef3c7] rounded-xl p-3 shadow-sm text-center">
                <div className="text-2xl font-bold text-[#f59e0b] mb-0.5">{dailySummary?.late || 0}</div>
                <div className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest">Late</div>
              </div>
              <div className="bg-white border border-[#fee2e2] rounded-xl p-3 shadow-sm text-center">
                <div className="text-2xl font-bold text-[#ef4444] mb-0.5">{dailySummary?.absent || 0}</div>
                <div className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest">Absent</div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              {dailySummary?.records.map((record, i) => {
                const emp = employees.find(e => e.id === record.employeeId || e.employeeId === record.employeeId);
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-brand-teal/30 transition-all cursor-pointer group shadow-sm" onClick={() => { setSelectedRecord(record); setIsDetailModalOpen(true); }}>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border group-hover:scale-105 transition-transform">
                        <AvatarImage src={emp?.profilePhoto} />
                        <AvatarFallback className="bg-brand-light text-brand-teal font-bold uppercase">{record.employeeName?.split(' ').map((n:any) => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{record.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{emp?.designation || 'Staff'}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getStatusStyle(record.status)}`}>
                        {record.status || 'Present'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 font-bold">{formatTime12h(record.checkIn) || '--'}</span>
                    </div>
                  </div>
                );
              })}
              {dailySummary?.records.length === 0 && (
                <div className="text-center py-10 text-slate-400 italic">No records for this day.</div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-border">
            <Button 
              className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold h-11 rounded-xl shadow-md transition-all active:scale-[0.98]"
              onClick={() => exportToCSV(dailySummary?.records || [], `attendance_report_${selectedDay}`)}
            >
              <Download className="w-4 h-4 mr-2" /> Export Daily Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold">Attendance Details</DialogTitle>
            {selectedRecord && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4" />
                  {dayjs(selectedRecord.date).format("MMMM D, YYYY")}
                </div>
              </div>
            )}
          </DialogHeader>
          {selectedRecord && (
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-border rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">In</div>
                  <div className="font-bold text-xl">{formatTime12h(selectedRecord.checkIn)}</div>
                </div>
                <div className="border border-border rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Out</div>
                  <div className="font-bold text-xl">{formatTime12h(selectedRecord.checkOut) || '--:--'}</div>
                </div>
                <div className="border border-brand-teal/30 bg-brand-light/20 rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-brand-teal mb-1">Work</div>
                  <div className="font-bold text-xl text-brand-teal">{selectedRecord.workHours || '--'}</div>
                </div>
              </div>
 
              <div>
                <h4 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-teal" /> Activity Timeline
                </h4>
                <div className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                  <div className="space-y-6 border-l-2 border-brand-light ml-2 pl-6 relative">
                    {(() => {
                      const events = [
                        ...(selectedRecord.punches || []).flatMap((p: any, i: number) => {
                          const items = [{
                            time: p.punchIn,
                            label: `Punched In (Session ${i+1})`,
                            color: 'bg-brand-teal',
                            iconColor: 'bg-brand-teal'
                          }];
                          if (p.punchOut) {
                            items.push({
                              time: p.punchOut,
                              label: `Punched Out (Session ${i+1})`,
                              color: 'bg-gray-400',
                              iconColor: 'bg-gray-400'
                            });
                          }
                          return items;
                        }),
                        ...(selectedRecord.breaks || []).flatMap((b: any, i: number) => {
                          const items = [{
                            time: b.startTime,
                            label: 'Break Start',
                            color: 'bg-amber-400',
                            iconColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          }];
                          if (b.endTime) {
                            items.push({
                              time: b.endTime,
                              label: `Break End (${b.duration?.replace('m', '') || '0'}m)`,
                              color: 'bg-amber-400/60',
                              iconColor: 'bg-amber-400/60'
                            });
                          }
                          return items;
                        })
                      ].sort((a, b) => a.time.localeCompare(b.time));

                      if (events.length === 0) {
                         const statusLabel = getCalculatedStatus(selectedRecord);
                         
                         if (statusLabel === "Leave") {
                           return (
                              <div className="relative group">
                                <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-sky-400"></div>
                                <div className="font-semibold text-sm">On Leave</div>
                                <div className="text-xs text-muted-foreground">Approved Leave Request</div>
                              </div>
                           );
                         } else if (statusLabel === "Absent") {
                           return (
                              <div className="relative group">
                                <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                                <div className="font-semibold text-sm">Absent</div>
                                <div className="text-xs text-muted-foreground">No attendance logged</div>
                              </div>
                           );
                         } else if (selectedRecord?.checkIn && selectedRecord.checkIn !== "--") {
                           return (
                              <>
                                <div className="relative">
                                  <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-brand-teal"></div>
                                  <div className="font-semibold text-sm">Punched In</div>
                                  <div className="text-xs text-muted-foreground">{formatTime12h(selectedRecord.checkIn)}</div>
                                </div>
                                {selectedRecord?.checkOut && (
                                  <div className="relative mt-6">
                                    <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                                    <div className="font-semibold text-sm">Punched Out</div>
                                    <div className="text-xs text-muted-foreground">{formatTime12h(selectedRecord.checkOut)}</div>
                                  </div>
                                )}
                              </>
                           );
                         }
                      }

                      return events.map((event, idx) => (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full ${event.iconColor}`}></div>
                          <div className="font-semibold text-sm">{event.label}</div>
                          <div className="text-xs text-muted-foreground">{formatTime12h(event.time)}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
