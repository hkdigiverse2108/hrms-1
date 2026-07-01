"use client";
 
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/common/TablePagination";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker, TimePicker } from "antd";
import dayjs from "dayjs";
import { 
  Download, 
  Clock, 
  Calendar as CalendarIcon, 
  Briefcase, 
  CheckCircle2, 
  Eye,
  Loader2,
  AlertCircle,
  Coffee,
  Pencil,
  Trash2,
  Plus
} from "lucide-react";
import { API_URL, getAvatarUrl } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from 'sonner';
import { formatTime12h, calculateAttendanceTimes } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";
 
const TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
  const displayString = `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
  return { value: timeString, label: displayString };
});

export default function AttendancePage() {
  const { confirm } = useConfirm();
  const { user, getISTNow } = useUserContext();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const router = useRouter();

  const isHR = user?.role?.toLowerCase() === 'hr';
  const canManageAttendance = isAdmin || user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin';

  const canViewAttendance = isAdmin || checkPermission('attendance', 'canView');
  const canAddAttendance = isAdmin || checkPermission('attendance', 'canAdd');
  const canEditAttendance = isAdmin || checkPermission('attendance', 'canEdit');
  const canDeleteAttendance = isAdmin || checkPermission('attendance', 'canDelete');

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('attendance', 'canView')) {
        router.push('/');
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission]);

  const [attendance, setAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [recoverModalOpen, setRecoverModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
    date: dayjs(getISTNow()).format("YYYY-MM-DD"),
    checkIn: "09:30:00",
    checkOut: "18:30:00",
    status: "Logged"
  });
  const [recoveryForm, setRecoveryForm] = useState({
    date: dayjs(getISTNow()).format("YYYY-MM-DD"),
    type: "break", // "break" or "punch-out"
    recordedBreakIn: "13:00:00",
    actualBreakOut: "14:00:00",
    actualPunchOut: "18:30:00",
    reason: ""
  });
  const [recoveryRequests, setRecoveryRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    presentDays: 0,
    avgHours: "0h 0m",
    totalWorkTime: "0h 0m",
    totalBreakTime: "0h 0m"
  });
  const [sysSettings, setSysSettings] = useState<any>(null);

  // Store admin IDs to filter attendance records without extra API calls
  const adminIdsRef = React.useRef<Set<string>>(new Set());

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const data = await res.json();
        // Track admin IDs for filtering attendance
        adminIdsRef.current = new Set(
          data.filter((e: any) => e.role?.toLowerCase() === 'admin').map((e: any) => e.id)
        );
        // Filter out admin employees - they don't have attendance
        setAllEmployees(data.filter((e: any) => e.role?.toLowerCase() !== 'admin'));
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance`);
      if (res.ok) {
        let data = await res.json();
        
        if (!canManageAttendance) {
          data = data.filter((a: any) => a.employeeId === user?.id || a.employeeId === user?.employeeId);
        }

        // Filter out attendance records belonging to admin employees
        if (adminIdsRef.current.size > 0) {
          data = data.filter((a: any) => !adminIdsRef.current.has(a.employeeId));
        }
 
        data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAttendance(data);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => {
    if (user) {
      // Fetch employees first so adminIdsRef is populated before attendance
      fetchEmployees().then(() => fetchAttendance());
      fetchSysSettings();
      fetchRecoveryRequests();
    }
  }, [user, canManageAttendance]);

  // Update form defaults when time synchronization is complete
  useEffect(() => {
    if (getISTNow().getTime() !== new Date().getTime()) {
      const now = getISTNow();

      setCreateForm((prev: any) => ({
        ...prev,
        date: dayjs(now).format("YYYY-MM-DD")
      }));
      setRecoveryForm((prev: any) => ({
        ...prev,
        date: dayjs(now).format("YYYY-MM-DD")
      }));
    }
  }, [getISTNow]);

  const fetchRecoveryRequests = async () => {
    try {
      const url = isAdmin || isHR ? `${API_URL}/time-recovery` : `${API_URL}/time-recovery/employee/${user?.id || user?.employeeId}`;
      const res = await fetch(url);
      if (res.ok) {
        setRecoveryRequests(await res.json());
      }
    } catch (err) {
      console.error("Error fetching recovery requests:", err);
    }
  };

  const fetchSysSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/system-settings`);
      if (res.ok) {
        const data = await res.json();
        setSysSettings(data);
        // Update createForm defaults if needed
        setCreateForm((prev: any) => ({
          ...prev,
          checkIn: data.officeStartTime ? `${data.officeStartTime}:00` : "09:30:00",
          checkOut: data.officeEndTime ? `${data.officeEndTime}:00` : "18:30:00"
        }));
      }
    } catch (err) {
      console.error("Error fetching system settings:", err);
    }
  };

  const filteredAttendance = useMemo(() => {
    let result = attendance;
    if (selectedEmployeeId !== "all") {
      result = result.filter((a: any) => a.employeeId === selectedEmployeeId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a: any) => 
        a.employeeName?.toLowerCase().includes(q) || 
        a.employeeId?.toLowerCase().includes(q) ||
        a.date?.includes(q)
      );
    }
    return result;
  }, [attendance, selectedEmployeeId, searchQuery]);

  useEffect(() => {
    calculateStats(filteredAttendance);
  }, [filteredAttendance]);
 
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

  const calculateStats = (data: any[]) => {
    const presentDays = data.filter(a => a.checkIn && a.checkIn !== "--" && a.checkIn !== "--:--").length;
    let totalMinutes = 0;
    let totalBreakMinutes = 0;
 
    data.forEach(a => {
      if (a.workHours) {
        const hMatch = a.workHours.match(/(\d+)\s*h/i);
        const mMatch = a.workHours.match(/(\d+)\s*m/i);
        if (hMatch || mMatch) {
          const h = hMatch ? parseInt(hMatch[1]) : 0;
          const m = mMatch ? parseInt(mMatch[1]) : 0;
          totalMinutes += h * 60 + m;
        } else {
          const decMatch = a.workHours.match(/([\d.]+)\s*h/i);
          if (decMatch) {
            totalMinutes += Math.round(parseFloat(decMatch[1]) * 60);
          } else {
            const timeParts = a.workHours.split(':');
            if (timeParts.length >= 2) {
              const h = parseInt(timeParts[0]);
              const m = parseInt(timeParts[1]);
              if (!isNaN(h) && !isNaN(m)) {
                totalMinutes += h * 60 + m;
              }
            }
          }
        }
      }
      (a.breaks || []).forEach((b: any) => {
        if (b.duration) totalBreakMinutes += parseInt(b.duration);
      });
    });
 
    const avgMinutes = presentDays > 0 ? (totalMinutes / presentDays) : 0;
    const avgH = Math.floor(avgMinutes / 60);
    const avgM = Math.round(avgMinutes % 60);

    const workH = Math.floor(totalMinutes / 60);
    const workM = totalMinutes % 60;

    const breakH = Math.floor(totalBreakMinutes / 60);
    const breakM = totalBreakMinutes % 60;
 
    setStats({
      presentDays,
      avgHours: `${avgH}h ${avgM}m`,
      totalWorkTime: `${workH}h ${workM}m`,
      totalBreakTime: `${breakH}h ${breakM}m`
    });
  };


  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/attendance/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: editForm.checkIn,
          checkOut: editForm.checkOut,
          status: editForm.status,
          date: editForm.date
        })
      });
      if (res.ok) {
        toast.success("Attendance updated successfully");
        setEditModalOpen(false);
        fetchAttendance();
      } else {
        toast.error("Failed to update attendance");
      }
    } catch (err) {
      console.error("Error updating attendance:", err);
    } finally {
      setIsUpdating(false);
    }
  };


  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this record?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/attendance/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Attendance deleted successfully");
        fetchAttendance();
      } else {
        toast.error("Failed to delete attendance");
      }
    } catch (err) {
      console.error("Error deleting attendance:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMultiDelete = async () => {
    if (selectedIds.size === 0) return;
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: `Are you sure you want to delete ${selectedIds.size} selected records?`,
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/attendance/multi-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        toast.success(`Deleted ${selectedIds.size} records`);
        setSelectedIds(new Set());
        fetchAttendance();
      } else {
        toast.error("Failed to delete records");
      }
    } catch (err) {
      console.error("Error multi-deleting:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAttendance.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAttendance.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleCreateManual = async () => {
    if (!createForm.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    const emp = allEmployees.find(e => e.id === createForm.employeeId);
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
        toast.success("Attendance record created");
        setCreateModalOpen(false);
        fetchAttendance();
      } else {
        toast.error("Failed to create record");
      }
    } catch (err) {
      console.error("Error creating attendance:", err);
    }
  };
 
  const handleRecoverSubmit = async () => {
    if (!recoveryForm.reason) {
      toast.error("Please provide a reason for recovery");
      return;
    }
    try {
      const startObj = dayjs(`2000-01-01 ${recoveryForm.recordedBreakIn}`);
      const endObj = dayjs(`2000-01-01 ${recoveryForm.actualBreakOut}`);
      let diffMins = 0;
      if (startObj.isValid() && endObj.isValid()) {
        diffMins = endObj.diff(startObj, 'minute');
        if (diffMins < 0) diffMins = 0;
      }

      const res = await fetch(`${API_URL}/time-recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: user?.id || user?.employeeId,
          employee_name: user?.name || "Unknown",
          date: recoveryForm.date,
          late_minutes: 0,
          recovery_minutes: diffMins,
          recovery_type: "break",
          start_time: recoveryForm.recordedBreakIn,
          end_time: recoveryForm.actualBreakOut,
          reason: `Break-In: ${recoveryForm.recordedBreakIn}, Actual Break-Out: ${recoveryForm.actualBreakOut}. ${recoveryForm.reason}`,
          status: "pending"
        })
      });
      if (res.ok) {
        toast.success("Recovery request submitted successfully");
        setRecoverModalOpen(false);
        fetchRecoveryRequests();
      } else {
        toast.error("Failed to submit recovery request");
      }
    } catch (err) {
      console.error("Error submitting recovery:", err);
    }
  };

  const displayEmployee = (selectedEmployeeId === "all" || selectedEmployeeId === "") 
    ? user 
    : (allEmployees.find(e => e.id === selectedEmployeeId || e.employeeId === selectedEmployeeId) || user);

  const currentRecord = attendance.find(a => 
    a.date === dayjs(getISTNow()).format("YYYY-MM-DD") && 
    a.employeeId === (selectedEmployeeId === "all" ? (user?.id || user?.employeeId) : selectedEmployeeId)
  );
 
  const CalendarWidget = () => {
    const istNow = dayjs(getISTNow());
    const daysInMonth = istNow.daysInMonth();
    const firstDayOfMonth = istNow.startOf('month').day();

    return (
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground text-lg">{istNow.format("MMMM YYYY")}</h3>
          <div className="bg-brand-light/50 text-brand-teal text-xs font-medium px-2 py-1 rounded-md">
            {stats.presentDays} present
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-2 text-center text-sm mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-muted-foreground font-semibold text-xs py-2">{day}</div>
          ))}
          {(() => {
            const days = [];
            
            // Prepend empty slots for weekday alignment
            for (let i = 0; i < firstDayOfMonth; i++) {
              days.push(
                <div key={`empty-${i}`} className="py-2 rounded-md m-0.5 text-xs"></div>
              );
            }
            
            // Render days of the month
            for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
              const isToday = dayNum === istNow.date();
              const hasRecord = filteredAttendance.some(a => {
                const recordDate = dayjs(a.date);
                return recordDate.date() === dayNum && 
                       recordDate.month() === istNow.month() && 
                       recordDate.year() === istNow.year();
              });
              
              days.push(
                <div 
                  key={dayNum} 
                  className={`py-2 rounded-md m-0.5 text-xs ${
                    isToday ? 'bg-brand-teal text-white font-bold shadow-sm' : 
                    hasRecord ? 'bg-brand-light/40 text-brand-teal font-medium' : 'text-foreground bg-gray-50'
                  }`}
                >
                  {dayNum}
                </div>
              );
            }
            return days;
          })()}
        </div>
      </div>
    );
  };
 
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
        title="Attendance List"
        description="View and manage attendance records for the organization."
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <Dialog open={recoverModalOpen} onOpenChange={setRecoverModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium">
                <Clock className="w-4 h-4 mr-2" />
                Recover Time
              </Button>
            </DialogTrigger>
            

            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Recover Time Request</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit a request to recover your missing break-out time for your attendance record.
                </p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium text-foreground">Date of Record</label>
                  <DatePicker 
                    className="w-full h-9 hover:border-brand-teal focus-within:border-brand-teal"
                    format="MMMM D, YYYY"
                    value={dayjs(recoveryForm.date)}
                    onChange={(date) => setRecoveryForm({...recoveryForm, date: date ? date.format("YYYY-MM-DD") : ""})}
                    getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
                  />
                </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium text-foreground">Recorded Break-In</label>
                      <Select value={recoveryForm.recordedBreakIn} onValueChange={(v) => setRecoveryForm({...recoveryForm, recordedBreakIn: v})}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="Recorded Break-In" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {TIME_OPTIONS.map(opt => (
                            <SelectItem key={`breakin-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium text-foreground">Actual Break-Out Time</label>
                      <Select value={recoveryForm.actualBreakOut} onValueChange={(v) => setRecoveryForm({...recoveryForm, actualBreakOut: v})}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="Actual Break-Out Time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {TIME_OPTIONS.map(opt => (
                            <SelectItem key={`breakout-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium text-foreground">Reason / Explanation</label>
                  <textarea 
                    className="w-full p-2 border rounded-md min-h-[80px] text-sm"
                    placeholder="Provide details about the missing break-out..."
                    value={recoveryForm.reason}
                    onChange={(e) => setRecoveryForm({...recoveryForm, reason: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2 mt-4">
                <Button variant="outline" onClick={() => setRecoverModalOpen(false)}>Cancel</Button>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={handleRecoverSubmit}>
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {(user?.role === 'Admin' || user?.role === 'HR') && (
            <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium" onClick={() => exportToCSV(attendance, 'attendance')}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}

          {canDeleteAttendance && selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              className="shadow-sm w-full sm:w-auto font-medium" 
              onClick={handleMultiDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
          )}

          {canAddAttendance && (
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium shadow-sm w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Manual Entry
                </Button>
              </DialogTrigger>
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
                        {allEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
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
                      <Select value={createForm.checkIn} onValueChange={(v) => setCreateForm({...createForm, checkIn: v})}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Check In" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {TIME_OPTIONS.map(opt => (
                            <SelectItem key={`checkin-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Check Out</label>
                      <Select value={createForm.checkOut} onValueChange={(v) => setCreateForm({...createForm, checkOut: v})}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Check Out" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {TIME_OPTIONS.map(opt => (
                            <SelectItem key={`checkout-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                  <Button className="bg-brand-teal text-white" onClick={handleCreateManual}>Save Entry</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}


      </div>
    </PageHeader>
 
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarImage src={getAvatarUrl(displayEmployee?.profilePhoto, displayEmployee?.name)} />
                  <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xl">
                    {displayEmployee?.name?.split(' ').map((n:any) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {selectedEmployeeId === "all" ? `${displayEmployee?.name} (You)` : displayEmployee?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-2">{displayEmployee?.role} • {displayEmployee?.designation}</p>
                  {(() => {
                    const isPunchedInToday = currentRecord && currentRecord.checkIn && currentRecord.checkIn !== "--" && currentRecord.checkIn !== "--:--";
                    return (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${
                        isPunchedInToday ? 'bg-brand-light/50 border-brand-teal/20 text-brand-teal' : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}>
                        {isPunchedInToday ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {isPunchedInToday ? 'Present today' : 'Not Punched In'}
                      </div>
                    );
                  })()}
                </div>
              </div>
 
              <div className="flex items-stretch gap-2 sm:gap-3 w-full md:w-auto">
                <div className="flex-1 md:flex-none md:min-w-[100px] bg-gray-50 border border-border rounded-lg p-2 sm:p-3 flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-0.5 sm:mb-1">Today</span>
                  <span className="text-sm sm:text-lg font-bold text-foreground">{formatWorkHours(currentRecord?.workHours)}</span>
                </div>
                <div className="flex-1 md:flex-none md:min-w-[100px] bg-gray-50 border border-border rounded-lg p-2 sm:p-3 flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-0.5 sm:mb-1">Check-in</span>
                  <span className="text-sm sm:text-lg font-bold text-foreground">{formatTime12h(currentRecord?.checkIn) || '--'}</span>
                </div>
                <div className={`flex-1 md:flex-none md:min-w-[100px] border rounded-lg p-2 sm:p-3 flex flex-col justify-center ${
                  currentRecord?.status === "On Break" ? 'bg-amber-50 border-amber-100' : 'bg-brand-light/30 border-brand-teal/10'
                }`}>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-0.5 sm:mb-1">Status</span>
                  <span className={`text-sm sm:text-lg font-bold ${currentRecord?.status === "On Break" ? 'text-amber-600' : 'text-brand-teal'}`}>
                    {(currentRecord?.status && currentRecord.status !== "--") ? currentRecord.status : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
 
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {canManageAttendance && selectedEmployeeId === "all" ? "Total Attendance" : "Present Days"}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.presentDays}</div>
                <p className="text-xs text-muted-foreground">
                  {canManageAttendance && selectedEmployeeId === "all" ? "All employee records" : "My attendance records"}
                </p>
              </div>
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Avg Daily Hours</span>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.avgHours}</div>
                <p className="text-xs text-muted-foreground">
                  {canManageAttendance && selectedEmployeeId === "all" ? "Across all active days" : "Based on active logs"}
                </p>
              </div>
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Break Time</span>
                  <Coffee className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.totalBreakTime}</div>
                <p className="text-xs text-muted-foreground">
                  {canManageAttendance && selectedEmployeeId === "all" ? "Total organizational breaks" : "Cumulative break duration"}
                </p>
              </div>
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Working Time</span>
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.totalWorkTime}</div>
                <p className="text-xs text-muted-foreground">
                  {canManageAttendance && selectedEmployeeId === "all" ? "Total across organization" : "Total hours this month"}
                </p>
              </div>
            </div>
          </div>
          <div className="hidden xl:block w-full xl:w-[320px] shrink-0">
            <CalendarWidget />
          </div>
        </div>
 
        <div className="w-full">
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Table Filters */}

            <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/30">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {canManageAttendance && (
                  <div className="w-full md:w-[240px]">
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger className="w-full bg-white h-9 border-border focus:ring-brand-teal focus:border-brand-teal">
                        <SelectValue placeholder="Filter by Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {allEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="relative w-full md:w-[280px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search attendance logs..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 h-9 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
                  <p className="text-muted-foreground font-medium">Loading records...</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[11px] text-muted-foreground font-bold bg-white border-b border-border uppercase tracking-wider">
                    <tr>
                      {canDeleteAttendance && (
                        <th className="px-4 py-4">
                          <Checkbox 
                            checked={filteredAttendance.length > 0 && selectedIds.size === filteredAttendance.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                      )}
                      <th className="px-4 py-4">Sr. No.</th>
                      {canManageAttendance && selectedEmployeeId === "all" && (
                        <th className="px-4 py-4">Employee</th>
                      )}
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Day</th>
                      <th className="px-4 py-4">Current Status</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Check In</th>
                      <th className="px-4 py-4">Check Out</th>
                      <th className="px-4 py-4">Break</th>
                      <th className="px-4 py-4">Late</th>
                      <th className="px-4 py-4">Overtime</th>
                      <th className="px-4 py-4">Production Hours</th>
                      <th className="px-4 py-4">Total Working Hours</th>
                      <th className="px-4 py-4">Remarks</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">{filteredAttendance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, idx) => {
                      const { productionMinutes, totalWorkingMinutes, breakMinutes } = calculateAttendanceTimes(row, getISTNow());
                      const breakStr = formatToHhMm(breakMinutes);
                      const totalWorkingStr = formatToHhMm(totalWorkingMinutes);
                      const productionStr = formatToHhMm(productionMinutes);

                      const dateStr = row.date ? (typeof row.date === 'string' ? row.date.split('T')[0].split(' ')[0] : dayjs(row.date).format('YYYY-MM-DD')) : '';
                      const checkIn = dayjs(`${dateStr} ${row.checkIn}`);

                      // Late
                      // Check for approved recovery request
                      const recoveryReq = recoveryRequests.find(req => 
                        req.date === row.date && 
                        (req.employee_id === row.employeeId || req.employee_id === row.employeeId) && 
                        req.status === 'approved'
                      );
 
                      const isLate = (() => {
                        if (recoveryReq) return false; // Recovery approved, no longer late
                        if (!row.checkIn || row.checkIn === "--") return false;
                        const officeStartTime = sysSettings?.officeStartTime || "09:30";
                        const bufferMins = sysSettings?.lateBufferMins || 10;
                        
                        const [h, m] = row.checkIn.split(':').map(Number);
                        const [sh, sm] = officeStartTime.split(':').map(Number);
                        
                        const punchMins = h * 60 + m;
                        const limitMins = sh * 60 + sm + bufferMins;
                        
                        return punchMins > limitMins;
                      })();
                      
                      const lateMinutes = checkIn.isValid() ? Math.max(0, checkIn.diff(dayjs(`${dateStr} ${sysSettings?.officeStartTime || "09:30"}`), 'minute')) : 0;
                      // Just show the actual minutes as requested
                      const lateStr = isLate || recoveryReq 
                        ? formatToHhMm(lateMinutes) 
                        : "-";
                      
                      const shiftDurationMinutes = (() => {
                        const emp = allEmployees.find(e => e.id === row.employeeId || e.employeeId === row.employeeId);
                        const officeStartTime = emp?.startTime || sysSettings?.officeStartTime || "09:30";
                        const officeEndTime = emp?.endTime || sysSettings?.officeEndTime || "18:30";
                        
                        const parseTimeToMinutes = (timeStr: string): number => {
                          if (!timeStr) return 0;
                          const cleaned = timeStr.trim().toUpperCase();
                          let hours = 0;
                          let minutes = 0;
                          const ampmMatch = cleaned.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)/);
                          if (ampmMatch) {
                            hours = parseInt(ampmMatch[1], 10);
                            minutes = parseInt(ampmMatch[2], 10);
                            const ampm = ampmMatch[3];
                            if (ampm === "PM" && hours < 12) hours += 12;
                            if (ampm === "AM" && hours === 12) hours = 0;
                          } else {
                            const parts = cleaned.split(':');
                            hours = parseInt(parts[0] || '0', 10);
                            minutes = parseInt(parts[1] || '0', 10);
                            if (hours >= 1 && hours <= 8) {
                              hours += 12;
                            }
                          }
                          return hours * 60 + minutes;
                        };

                        const startMinutes = parseTimeToMinutes(officeStartTime);
                        const endMinutes = parseTimeToMinutes(officeEndTime);
                        let diff = endMinutes - startMinutes;
                        if (diff < 0) {
                          diff += 24 * 60;
                        }
                        return diff;
                      })();
                      
                      const overtimeMinutes = productionMinutes > 0 ? Math.max(0, productionMinutes - shiftDurationMinutes) : 0;
                      const overtimeStr = formatToHhMm(overtimeMinutes);
 
                      let statusLabel = row.status === "Leave" ? "Leave" : (row.checkIn && row.checkIn !== "--" && row.checkIn !== "--:--" ? "Present" : "Absent");
                      let statusClass = statusLabel === "Present" 
                        ? "bg-green-50 text-green-600 border-green-100" 
                        : (statusLabel === "Leave" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-600 border-red-100");
                      
                      const lastBreak = row.breaks && row.breaks.length > 0 ? row.breaks[row.breaks.length - 1] : null;
                      const isOnBreak = lastBreak && !lastBreak.endTime;
                      const currentStatus = row.checkOut 
                        ? "punch-out" 
                        : (isOnBreak 
                            ? "break-in" 
                            : (lastBreak?.endTime ? "break-out" : "punch-in"));
                      const day = dayjs(row.date).format("dddd");
 
                      return (
                        <tr key={idx} className={`hover:bg-muted/30 transition-colors group border-b border-border ${selectedIds.has(row.id) ? 'bg-brand-light/20' : ''}`}>
                          {canDeleteAttendance && (
                            <td className="px-4 py-4">
                              <Checkbox 
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={() => toggleSelect(row.id)}
                              />
                            </td>
                          )}
                          <td className="px-4 py-4 font-medium text-muted-foreground">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                          {canManageAttendance && selectedEmployeeId === "all" && (
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 border border-border">
                                  {(() => {
                                    const emp = allEmployees.find(e => e.id === row.employeeId || e.employeeId === row.employeeId);
                                    return (
                                      <>
                                        <AvatarImage src={getAvatarUrl(emp?.profilePhoto, row.employeeName)} />
                                        <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs">
                                          {row.employeeName?.split(' ').map((n:any) => n[0]).join('')}
                                        </AvatarFallback>
                                      </>
                                    );
                                  })()}
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-foreground">{row.employeeName}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {allEmployees.find(e => e.id === row.employeeId || e.employeeId === row.employeeId)?.designation || "Employee"}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-4 font-medium text-foreground">{row.date}</td>
                          <td className="px-4 py-4 text-muted-foreground">{day}</td>
                          <td className="px-4 py-4 text-muted-foreground">{currentStatus}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${statusClass}`}>
                              {isLate ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />} {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-medium text-foreground">{formatTime12h(row.checkIn) || "-"}</td>
                          <td className="px-4 py-4 font-medium text-foreground">{formatTime12h(row.checkOut) || "-"}</td>
                          <td className="px-4 py-4 text-muted-foreground">{breakStr}</td>
                          <td className="px-4 py-4 text-muted-foreground">{lateStr}</td>
                          <td className="px-4 py-4 text-muted-foreground">{overtimeStr}</td>
                          <td className="px-4 py-4">
                            {productionMinutes > 0 ? (
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                productionMinutes >= 480 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-green-50 text-green-600 border border-green-100'
                              }`}>
                                {productionStr}
                              </span>
                            ) : "-"}
                          </td>
                           <td className="px-4 py-4 font-medium text-foreground">{totalWorkingStr}</td>
                          <td className="px-4 py-4 text-[11px] text-muted-foreground max-w-[200px] truncate" title={(!row.remarks || row.remarks === "-") ? (isLate ? `Late punch-in; ${lateMinutes} mins after expected start (${formatTime12h(sysSettings?.officeStartTime || "09:30")})` : undefined) : row.remarks}>
                            {(!row.remarks || row.remarks === "-") ? (isLate ? `Late punch-in; ${lateMinutes} mins after expected start (${formatTime12h(sysSettings?.officeStartTime || "09:30")})` : "-") : row.remarks}
                          </td>
                          <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  onClick={() => { setSelectedRecord(row); setDetailsModalOpen(true); }}
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-brand-teal bg-brand-light/20 hover:bg-brand-light/40 rounded-full"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canEditAttendance && (
                                  <Button 
                                    onClick={() => { 
                                      setEditForm({
                                        id: row.id,
                                        date: row.date,
                                        checkIn: row.checkIn,
                                        checkOut: row.checkOut || "",
                                        status: row.status || "Logged"
                                      }); 
                                      setEditModalOpen(true); 
                                    }}
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDeleteAttendance && (
                                  <Button 
                                    onClick={() => handleDelete(row.id)}
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 rounded-full"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>


            {!isLoading && (
              <TablePagination 
                totalItems={filteredAttendance.length} 
                itemsPerPage={itemsPerPage} 
                currentPage={currentPage} 
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
                itemName="entries" 
              />
            )}
          </div>
        </div>
      </div>
 
      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
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
                  <div className="font-bold text-sm">{formatTime12h(selectedRecord.checkIn)}</div>
                </div>
                <div className="border border-border rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Out</div>
                  <div className="font-bold text-sm">{formatTime12h(selectedRecord.checkOut) || '--:--'}</div>
                </div>
                <div className="border border-brand-teal/30 bg-brand-light/20 rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-brand-teal mb-1">Work</div>
                  <div className="font-bold text-sm text-brand-teal">{formatWorkHours(selectedRecord.workHours)}</div>
                </div>
              </div>
 
              <div>
                <h4 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-teal" /> Activity Timeline
                </h4>
                <div className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                  <div className="space-y-6 border-l-2 border-brand-light ml-2 pl-6 relative">
                    {/* Combine and Sort All Events Chronologically */}
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
                              label: `Break End (${b.duration.replace('m', '')}m)`,
                              color: 'bg-amber-400/60',
                              iconColor: 'bg-amber-400/60'
                            });
                          }
                          return items;
                        })
                      ].sort((a, b) => a.time.localeCompare(b.time));

                      if (events.length === 0 && selectedRecord.checkIn) {
                         // Fallback for very old records
                         return (
                            <>
                              <div className="relative">
                                <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-brand-teal"></div>
                                <div className="font-semibold text-sm">Punched In</div>
                                <div className="text-xs text-muted-foreground">{formatTime12h(selectedRecord.checkIn)}</div>
                              </div>
                              {selectedRecord.checkOut && (
                                <div className="relative">
                                  <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                                  <div className="font-semibold text-sm">Punched Out</div>
                                  <div className="text-xs text-muted-foreground">{formatTime12h(selectedRecord.checkOut)}</div>
                                </div>
                              )}
                            </>
                         )
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
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Attendance Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded-md" 
                value={editForm.date}
                onChange={(e) => setEditForm({...editForm, date: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Check In</label>
                <Select value={editForm.checkIn} onValueChange={(v) => setEditForm({...editForm, checkIn: v})}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Check In" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {TIME_OPTIONS.map(opt => (
                      <SelectItem key={`edit-checkin-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Check Out</label>
                <Select value={editForm.checkOut} onValueChange={(v) => setEditForm({...editForm, checkOut: v})}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Check Out" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {TIME_OPTIONS.map(opt => (
                      <SelectItem key={`edit-checkout-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Logged">Logged</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Break">On Break</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-brand-teal text-white" 
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
