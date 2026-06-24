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
  FileText,
  Pencil,
  Trash2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TablePagination } from "@/components/common/TablePagination";
import { PageHeader } from "@/components/common/PageHeader";
import dayjs from "dayjs";
import { API_URL, getAvatarUrl } from "@/lib/config";
import { exportToCSV } from "@/lib/export-utils";
import { formatTime12h, calculateAttendanceTimes } from "@/lib/utils";
import { toast } from "sonner";
import { useUserContext } from "@/context/UserContext";

import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useConfirm } from "@/context/ConfirmContext";

export default function EmployeeAttendanceListPage() {
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const { confirm } = useConfirm();
  const { getISTNow } = useUserContext();
  const formatToHhMm = (totalMinutes: number) => {
    if (!totalMinutes || totalMinutes <= 0) return "-";
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  const formatWorkHours = (workHours: string) => {
    if (!workHours || workHours === "--" || workHours === "-") return "--";
    const hMatch = workHours.match(/(\d+)\s*h/i);
    const mMatch = workHours.match(/(\d+)\s*m/i);
    if (hMatch || mMatch) {
      const h = hMatch ? parseInt(hMatch[1]) : 0;
      const m = mMatch ? parseInt(mMatch[1]) : 0;
      return `${h}h ${m}m`;
    }
    const decMatch = workHours.match(/([\d.]+)\s*h/i);
    if (decMatch) {
      const totalMinutes = Math.round(parseFloat(decMatch[1]) * 60);
      return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    }
    const timeParts = workHours.split(':');
    if (timeParts.length >= 2) {
      const h = parseInt(timeParts[0]);
      const m = parseInt(timeParts[1]);
      if (!isNaN(h) && !isNaN(m)) {
        return `${h}h ${m}m`;
      }
    }
    return workHours;
  };
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
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  // CRUD Modals and state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editForm, setEditForm] = useState<any>({
    id: "",
    date: "",
    checkIn: "",
    checkOut: "",
    status: "Logged"
  });
  
  const [createForm, setCreateForm] = useState<any>({
    employeeId: "",
    employeeName: "",
    date: dayjs().format("YYYY-MM-DD"),
    checkIn: "09:30:00",
    checkOut: "18:30:00",
    status: "Logged"
  });

  const canAdd = isAdmin || checkPermission('employee-attendance', 'canAdd');
  const canEdit = isAdmin || checkPermission('employee-attendance', 'canEdit');
  const canDelete = isAdmin || checkPermission('employee-attendance', 'canDelete');

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('employee-attendance', 'canView')) {
        router.push('/');
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [attRes, empRes, deptRes, sysRes, recRes, leaveRes] = await Promise.all([
        fetch(`${API_URL}/attendance`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/departments`),
        fetch(`${API_URL}/system-settings`),
        fetch(`${API_URL}/time-recovery`),
        fetch(`${API_URL}/leaves`)
      ]);
      
      if (attRes.ok) setAttendance(await attRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (sysRes.ok) setSysSettings(await sysRes.json());
      if (recRes.ok) setRecoveryRequests(await recRes.json());
      if (leaveRes.ok) setLeaveRequests(await leaveRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreateManual = async () => {
    if (!createForm.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    const emp = employees.find(e => e.id === createForm.employeeId || e.employeeId === createForm.employeeId);
    try {
      const res = await fetch(`${API_URL}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          employeeName: emp?.name || ""
        })
      });
      if (res.ok) {
        toast.success("Attendance record created successfully");
        setCreateModalOpen(false);
        fetchData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to create record");
      }
    } catch (err) {
      console.error("Error creating attendance:", err);
      toast.error("An error occurred while creating the record");
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      let res;
      if (editForm.id?.toString().startsWith("synthesized-")) {
        const emp = employees.find(e => e.id === editForm.employeeId || e.employeeId === editForm.employeeId);
        res = await fetch(`${API_URL}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: editForm.employeeId,
            employeeName: emp?.name || "",
            date: editForm.date,
            checkIn: editForm.checkIn || "09:30:00",
            checkOut: editForm.checkOut || "18:30:00",
            status: editForm.status || "Logged"
          })
        });
      } else {
        res = await fetch(`${API_URL}/attendance/${editForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkIn: editForm.checkIn,
            checkOut: editForm.checkOut,
            status: editForm.status,
            date: editForm.date
          })
        });
      }
      if (res.ok) {
        toast.success("Attendance updated successfully");
        setEditModalOpen(false);
        fetchData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to update attendance");
      }
    } catch (err) {
      console.error("Error updating attendance:", err);
      toast.error("An error occurred while updating the record");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Delete Record",
      message: "Are you sure you want to delete this record? This action cannot be undone.",
      destructive: true,
      confirmText: "Delete"
    });
    if (!isConfirmed) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/attendance/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Attendance deleted successfully");
        fetchData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to delete attendance");
      }
    } catch (err) {
      console.error("Error deleting attendance:", err);
      toast.error("An error occurred while deleting the record");
    } finally {
      setIsDeleting(false);
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
    } else if (dateFilter === "all") {
      let earliestDateStr = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      if (attendance.length > 0) {
        attendance.forEach(a => {
          const aDateStr = a.date?.split('T')[0]?.split(' ')[0];
          if (aDateStr && aDateStr < earliestDateStr) {
            earliestDateStr = aDateStr;
          }
        });
      }
      
      const maxDays = 90;
      const ninetyDaysAgoStr = dayjs().subtract(maxDays, 'day').format('YYYY-MM-DD');
      if (earliestDateStr < ninetyDaysAgoStr) {
        earliestDateStr = ninetyDaysAgoStr;
      }
      
      const diffDays = Math.min(maxDays, dayjs().diff(dayjs(earliestDateStr), 'day'));
      for (let i = 0; i <= diffDays; i++) {
        const d = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
        datesToSynthesize.push(d);
      }
    }

    // Synthesize missing records for each employee and each date in the range
    datesToSynthesize.forEach(dateStr => {
      employees.forEach(emp => {
        // We use employeeId for the check because some records might use emp.id or emp.employeeId
        const existing = baseRecords.find(a => {
          const aDateStr = a.date?.split('T')[0]?.split(' ')[0];
          return (a.employeeId === emp.id || a.employeeId === emp.employeeId) && aDateStr === dateStr;
        });

        // Check if employee is on leave on this dateStr
        const isEmployeeOnLeave = leaveRequests.some(l => {
          if (l.status !== "Approved") return false;
          // Check employee match
          const empMatch = l.employee_id === emp.id || l.employee_id === emp.employeeId || l.employeeId === emp.id || l.employeeId === emp.employeeId;
          if (!empMatch) return false;

          // Parse start and end date
          const parseDate = (dVal: any) => {
            if (!dVal) return null;
            const strVal = String(dVal).split('T')[0].split(' ')[0];
            if (strVal.includes('-')) {
              const parts = strVal.split('-');
              if (parts[0].length === 4) {
                // YYYY-MM-DD
                return dayjs(strVal);
              } else {
                // DD-MM-YYYY
                return dayjs(`${parts[2]}-${parts[1]}-${parts[0]}`);
              }
            }
            return dayjs(strVal);
          };

          const start = parseDate(l.start_date);
          const end = parseDate(l.end_date);
          const current = dayjs(dateStr);

          if (start && end && current.isValid() && start.isValid() && end.isValid()) {
            return (current.isSame(start, 'day') || current.isAfter(start, 'day')) &&
                   (current.isSame(end, 'day') || current.isBefore(end, 'day'));
          }
          return false;
        });

        if (!existing) {
          baseRecords.push({
            id: `synthesized-${emp.id}-${dateStr}`,
            employeeId: emp.id,
            employeeName: emp.name,
            date: dateStr,
            checkIn: isEmployeeOnLeave ? "--" : "--:--",
            checkOut: isEmployeeOnLeave ? "--" : "--:--",
            workHours: "--",
            status: isEmployeeOnLeave ? "Leave" : "Absent",
            punches: [],
            breaks: []
          });
        }
      });
    });

    return baseRecords.filter(a => {
      const emp = employees.find(e => e.id === a.employeeId || e.employeeId === a.employeeId);
      const matchesSearch = !searchQuery || a.employeeId === searchQuery || (emp && emp.id === searchQuery) || a.employeeName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const calcStatus = getCalculatedStatus(a);
      const matchesStatus = selectedStatus === "all" || calcStatus.toLowerCase() === selectedStatus.toLowerCase();
      
      const matchesDept = selectedDept === "all" || emp?.department?.toLowerCase() === selectedDept.toLowerCase();
      
      let matchesDate = true;
      const aDateStr = a.date?.split('T')[0]?.split(' ')[0];
      const recordDate = dayjs(aDateStr);
      const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      
      if (specificDate) {
        matchesDate = aDateStr === dayjs(specificDate).format('YYYY-MM-DD');
      } else if (dateFilter === "today") {
        matchesDate = aDateStr === todayStr;
      } else if (dateFilter === "yesterday") {
        matchesDate = aDateStr === yesterdayStr;
      } else if (dateFilter === "last_7_days") {
        matchesDate = recordDate.valueOf() >= dayjs().subtract(7, 'day').startOf('day').valueOf();
      } else if (dateFilter === "this_month") {
        matchesDate = recordDate.month() === dayjs().month() && recordDate.year() === dayjs().year();
      } else if (dateFilter === "all") {
        const earliestDateLimit = dayjs().subtract(90, 'day').startOf('day');
        matchesDate = recordDate.valueOf() >= earliestDateLimit.valueOf();
      }

      return matchesSearch && matchesStatus && matchesDept && matchesDate;
    }).sort((a, b) => {
      const aDateStr = a.date?.split('T')[0]?.split(' ')[0];
      const bDateStr = b.date?.split('T')[0]?.split(' ')[0];
      return dayjs(bDateStr).valueOf() - dayjs(aDateStr).valueOf() || a.employeeName?.localeCompare(b.employeeName);
    });
  }, [attendance, employees, leaveRequests, dateFilter, specificDate, selectedStatus, selectedDept, searchQuery]);

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
                  
                  const isLate = record.isLate && !recoveryReq;
                  
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
                  {d.currentMonth && <span className="text-[9px] font-medium text-slate-400">{employees.length} Total</span>}
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
        return a.isLate;
      }).length,
      absent: dayEmployees.filter(a => a.status === "Absent").length,
      records: filteredRecords
    };
  }, [selectedDay, attendance, employees, modalSearchQuery, recoveryRequests, sysSettings]);

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employee Attendance List" 
        description="Manage your team members and their account permissions here."
      >
        <div className="flex items-center gap-3">
          {(isAdmin || checkPermission('employee-attendance', 'canView')) && (
            <Link href="/attendance/recovery-requests">
              <Button variant="outline" className="h-9 shadow-sm font-medium border-brand-teal text-brand-teal hover:bg-brand-light/20">
                <Eye className="w-4 h-4 mr-2" />
                View Requests
              </Button>
            </Link>
          )}
          {(isAdmin || checkPermission('employee-attendance', 'canView')) && (
            <Button variant="outline" className="h-9 shadow-sm" onClick={() => exportToCSV(filteredAttendance, 'employee_attendance')}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
          {canAdd && (
            <Button 
              onClick={() => {
                setCreateForm({
                  employeeId: "",
                  employeeName: "",
                  date: dayjs().format("YYYY-MM-DD"),
                  checkIn: sysSettings?.officeStartTime ? `${sysSettings.officeStartTime}:00` : "09:30:00",
                  checkOut: sysSettings?.officeEndTime ? `${sysSettings.officeEndTime}:00` : "18:30:00",
                  status: "Logged"
                });
                setCreateModalOpen(true);
              }}
              className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Manual Entry
            </Button>
          )}
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

          <Select value={searchQuery || "all"} onValueChange={(v) => setSearchQuery(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full md:w-[240px] h-9 bg-white border-border shadow-sm text-xs">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} {emp.employeeId ? `(${emp.employeeId})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Status</th>
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
                    const { productionMinutes, totalWorkingMinutes, breakMinutes } = calculateAttendanceTimes(record, getISTNow());
                    const breakStr = formatToHhMm(breakMinutes);
                    const totalWorkingStr = formatToHhMm(totalWorkingMinutes);
                    const productionStr = formatToHhMm(productionMinutes);

                    const dateStr = record.date ? (typeof record.date === 'string' ? record.date.split('T')[0].split(' ')[0] : dayjs(record.date).format('YYYY-MM-DD')) : '';
                    const checkIn = dayjs(`${dateStr} ${record.checkIn}`);

                    const recoveryReq = recoveryRequests.find(req => 
                      req.date === record.date && 
                      (req.employee_id === record.employeeId || req.employeeId === record.employeeId) && 
                      req.status === 'approved'
                    );

                    const isLate = record.isLate && !recoveryReq;
                    
                    const lateMinutes = (() => {
                      if (!isLate || !checkIn.isValid()) return 0;
                      const emp = employees.find(e => e.id === record.employeeId || e.employeeId === record.employeeId);
                      const officeStartTime = emp?.startTime || sysSettings?.officeStartTime || "09:30";
                      return Math.max(0, checkIn.diff(dayjs(`${dateStr} ${officeStartTime}`), 'minute'));
                    })();
                    
                    const lateStr = isLate || recoveryReq ? formatToHhMm(lateMinutes) : "-";
                    
                    const shiftDurationMinutes = (() => {
                      const emp = employees.find(e => e.id === record.employeeId || e.employeeId === record.employeeId);
                      const officeStartTime = emp?.startTime || sysSettings?.officeStartTime || "09:30";
                      const officeEndTime = emp?.endTime || sysSettings?.officeEndTime || "18:30";
                      let [sh, sm] = officeStartTime.split(':').map(Number);
                      let [eh, em] = officeEndTime.split(':').map(Number);
                      if (sh >= 8 && sh <= 16 && eh >= 1 && eh <= 8) {
                        eh += 12;
                      }
                      let diff = (eh * 60 + em) - (sh * 60 + sm);
                      if (diff < 0) {
                        diff += 24 * 60;
                      }
                      return diff;
                    })();
                    
                    const overtimeMinutes = Math.max(0, productionMinutes - shiftDurationMinutes);
                    const overtimeStr = formatToHhMm(overtimeMinutes);

                    const day = dayjs(record.date).format("dddd");
                    const statusLabel = getCalculatedStatus(record);
                    const statusClass = statusLabel === "Present" 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : (statusLabel === "Leave" ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-rose-50 text-rose-600 border-rose-100");

                    const lastBreak = record.breaks && record.breaks.length > 0 ? record.breaks[record.breaks.length - 1] : null;
                    const isOnBreak = lastBreak && !lastBreak.endTime;
                    const currentStatus = record.checkOut 
                      ? "punch-out" 
                      : (isOnBreak 
                          ? "break-in" 
                          : (lastBreak?.endTime ? "break-out" : (record.checkIn && record.checkIn !== "--" && record.checkIn !== "--:--" ? "punch-in" : "absent")));

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
                        <td className="px-4 py-4 text-slate-500 font-medium">{currentStatus}</td>
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
                        <td className="px-4 py-4 text-[11px] text-muted-foreground max-w-[200px] truncate" title={(!record.remarks || record.remarks === "-") ? (isLate ? `Late punch-in; ${lateMinutes} mins after expected start (${officeStartTime} AM)` : undefined) : record.remarks}>
                          {(!record.remarks || record.remarks === "-") ? (isLate ? `Late punch-in; ${lateMinutes} mins after expected start (${officeStartTime} AM)` : "-") : record.remarks}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); setIsDetailModalOpen(true); }}
                              className="inline-flex items-center justify-center h-8 w-8 text-brand-teal bg-brand-light/20 hover:bg-brand-light/40 rounded-full transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {record.id?.toString().startsWith('synthesized-') ? (
                              <>
                                {canEdit && (
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setEditForm({
                                        id: record.id,
                                        employeeId: record.employeeId,
                                        date: record.date?.split('T')[0]?.split(' ')[0],
                                        checkIn: sysSettings?.officeStartTime ? `${sysSettings.officeStartTime}:00` : "09:30:00",
                                        checkOut: sysSettings?.officeEndTime ? `${sysSettings.officeEndTime}:00` : "18:30:00",
                                        status: "Logged"
                                      }); 
                                      setEditModalOpen(true); 
                                    }}
                                    className="inline-flex items-center justify-center h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors"
                                    title="Update Attendance Entry"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                {canEdit && (
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setEditForm({
                                        id: record.id,
                                        employeeId: record.employeeId,
                                        date: record.date?.split('T')[0]?.split(' ')[0],
                                        checkIn: record.checkIn,
                                        checkOut: record.checkOut || "",
                                        status: record.status || "Logged"
                                      }); 
                                      setEditModalOpen(true); 
                                    }}
                                    className="inline-flex items-center justify-center h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors"
                                    title="Edit Attendance Entry"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                                    className="inline-flex items-center justify-center h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                                    title="Delete Attendance Entry"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
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
                        <AvatarImage src={getAvatarUrl(emp?.profilePhoto, record.employeeName)} />
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
              <Download className="w-4 h-4 mr-2" /> Export PDF Daily Report
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
                  <div className="font-bold text-xl text-brand-teal">{formatWorkHours(selectedRecord.workHours)}</div>
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
                        ...([...(selectedRecord.punches || [])].sort((a: any, b: any) => (a.punchIn || '').localeCompare(b.punchIn || ''))).flatMap((p: any, i: number) => {
                          const isMeeting = p.type === 'meeting';
                          const items = [{
                            time: p.punchIn,
                            label: isMeeting ? 'Meeting Start' : `Punched In (Session ${i+1})`,
                            color: isMeeting ? 'bg-indigo-500' : 'bg-brand-teal',
                            iconColor: isMeeting ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-brand-teal'
                          }];
                          if (p.punchOut) {
                            items.push({
                              time: p.punchOut,
                              label: isMeeting ? 'Meeting End' : `Punched Out (Session ${i+1})`,
                              color: isMeeting ? 'bg-indigo-400' : 'bg-gray-400',
                              iconColor: isMeeting ? 'bg-indigo-400' : 'bg-gray-400'
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

      {/* Create Manual Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Manual Attendance Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select value={createForm.employeeId} onValueChange={(v) => setCreateForm({...createForm, employeeId: v})}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded-md" 
                value={createForm.date}
                onChange={(e) => setCreateForm({...createForm, date: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Check In</label>
                <input 
                  type="time" 
                  step="1"
                  className="w-full p-2 border rounded-md" 
                  value={createForm.checkIn}
                  onChange={(e) => setCreateForm({...createForm, checkIn: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Check Out</label>
                <input 
                  type="time" 
                  step="1"
                  className="w-full p-2 border rounded-md" 
                  value={createForm.checkOut}
                  onChange={(e) => setCreateForm({...createForm, checkOut: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={createForm.status} onValueChange={(v) => setCreateForm({...createForm, status: v})}>
                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Logged">Present (Logged)</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal text-white" onClick={handleCreateManual}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Manual Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Attendance Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded-md bg-gray-50 cursor-not-allowed" 
                value={editForm.date}
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Check In</label>
                <input 
                  type="time" 
                  step="1"
                  className="w-full p-2 border rounded-md" 
                  value={editForm.checkIn}
                  onChange={(e) => setEditForm({...editForm, checkIn: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Check Out</label>
                <input 
                  type="time" 
                  step="1"
                  className="w-full p-2 border rounded-md" 
                  value={editForm.checkOut}
                  onChange={(e) => setEditForm({...editForm, checkOut: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Logged">Present (Logged)</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal text-white" onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
