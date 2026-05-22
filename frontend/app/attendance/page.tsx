"use client";
 
import React, { useState, useEffect } from "react";
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
import { formatTime12h } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
 
export default function AttendancePage() {
  const { user, getISTNow } = useUserContext();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const router = useRouter();

  const isHR = user?.role?.toLowerCase() === 'hr';
  const canManageAttendance = isAdmin || isHR;

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
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    employeeId: "",
    month: dayjs(getISTNow()).format("MMMM"),
    year: dayjs(getISTNow()).format("YYYY")
  });
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
 
  useEffect(() => {
    if (user) {
      fetchAttendance();
      fetchEmployees();
      fetchSysSettings();
      fetchRecoveryRequests();
    }
  }, [user]);

  // Update form defaults when time synchronization is complete
  useEffect(() => {
    if (getISTNow().getTime() !== new Date().getTime()) {
      const now = getISTNow();
      setBulkForm(prev => ({
        ...prev,
        month: dayjs(now).format("MMMM"),
        year: dayjs(now).format("YYYY")
      }));
      setCreateForm(prev => ({
        ...prev,
        date: dayjs(now).format("YYYY-MM-DD")
      }));
      setRecoveryForm(prev => ({
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
        setCreateForm(prev => ({
          ...prev,
          checkIn: data.officeStartTime ? `${data.officeStartTime}:00` : "09:30:00",
          checkOut: data.officeEndTime ? `${data.officeEndTime}:00` : "18:30:00"
        }));
      }
    } catch (err) {
      console.error("Error fetching system settings:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setAllEmployees(await res.json());
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
 
        data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAttendance(data);
        calculateStats(data);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setIsLoading(false);
    }
  };
 
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
    const presentDays = data.length;
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

  const handleBulkGenerate = async () => {
    if (!bulkForm.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    setIsBulkGenerating(true);
    try {
      const res = await fetch(`${API_URL}/attendance/bulk-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: bulkForm.employeeId,
          month: bulkForm.month,
          year: parseInt(bulkForm.year)
        })
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(result.message);
        setBulkModalOpen(false);
        fetchAttendance();
      } else {
        toast.error("Failed to generate attendance");
      }
    } catch (err) {
      console.error("Error bulk generating:", err);
      toast.error("Error connecting to server");
    } finally {
      setIsBulkGenerating(false);
    }
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

  const handleBulkDelete = async () => {
    if (!bulkForm.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!confirm(`Are you sure you want to delete ALL attendance for this employee in ${bulkForm.month} ${bulkForm.year}?`)) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/attendance/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: bulkForm.employeeId,
          month: bulkForm.month,
          year: parseInt(bulkForm.year)
        })
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(result.message);
        setBulkModalOpen(false);
        fetchAttendance();
      } else {
        toast.error("Failed to delete attendance");
      }
    } catch (err) {
      console.error("Error bulk deleting:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected records?`)) return;
    
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
    if (selectedIds.size === attendance.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(attendance.map(a => a.id)));
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
      const res = await fetch(`${API_URL}/time-recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: user?.id || user?.employeeId,
          employee_name: user?.name || "Unknown",
          date: recoveryForm.date,
          late_minutes: 0, // Not used in this version
          recovery_minutes: 0, // Not used in this version
          reason: recoveryForm.type === 'break' 
            ? `Break-In: ${recoveryForm.recordedBreakIn}, Actual Break-Out: ${recoveryForm.actualBreakOut}. ${recoveryForm.reason}`
            : `Forgot Punch-Out. Actual Punch-Out: ${recoveryForm.actualPunchOut}. ${recoveryForm.reason}`,
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

  const currentRecord = attendance.find(a => a.date === dayjs(getISTNow()).format("YYYY-MM-DD"));
 
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
              const hasRecord = attendance.some(a => {
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
                  <label className="text-sm font-medium text-foreground">Recovery Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={recoveryForm.type === 'break' ? 'default' : 'outline'}
                      className={recoveryForm.type === 'break' ? 'bg-brand-teal text-white' : ''}
                      onClick={() => setRecoveryForm({...recoveryForm, type: 'break'})}
                    >
                      Break Correction
                    </Button>
                    <Button 
                      variant={recoveryForm.type === 'punch-out' ? 'default' : 'outline'}
                      className={recoveryForm.type === 'punch-out' ? 'bg-brand-teal text-white' : ''}
                      onClick={() => setRecoveryForm({...recoveryForm, type: 'punch-out'})}
                    >
                      Punch-Out Fix
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium text-foreground">Date of Record</label>
                  <DatePicker 
                    className="w-full h-9 hover:border-brand-teal focus-within:border-brand-teal"
                    format="MMMM D, YYYY"
                    value={dayjs(recoveryForm.date)}
                    onChange={(date) => setRecoveryForm({...recoveryForm, date: date ? date.format("YYYY-MM-DD") : ""})}
                  />
                </div>
                {recoveryForm.type === 'break' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium text-foreground">Recorded Break-In</label>
                      <TimePicker 
                        className="w-full h-9" 
                        format="hh:mm:ss A" 
                        use12Hours 
                        showNow={false}
                        value={recoveryForm.recordedBreakIn ? dayjs(`2000-01-01 ${recoveryForm.recordedBreakIn}`, "YYYY-MM-DD HH:mm:ss") : null}
                        onChange={(time) => setRecoveryForm({...recoveryForm, recordedBreakIn: time ? time.format("HH:mm:ss") : ""})}
                      />
                    </div>
                    <div className="space-y-2 flex flex-col">
                      <label className="text-sm font-medium text-foreground">Actual Break-Out Time</label>
                      <TimePicker 
                        className="w-full h-9" 
                        format="hh:mm:ss A" 
                        use12Hours 
                        showNow={false}
                        value={recoveryForm.actualBreakOut ? dayjs(`2000-01-01 ${recoveryForm.actualBreakOut}`, "YYYY-MM-DD HH:mm:ss") : null}
                        onChange={(time) => setRecoveryForm({...recoveryForm, actualBreakOut: time ? time.format("HH:mm:ss") : ""})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col">
                    <label className="text-sm font-medium text-foreground">Actual Punch-Out Time</label>
                    <TimePicker 
                      className="w-full h-9" 
                      format="hh:mm:ss A" 
                      use12Hours 
                      showNow={false}
                      value={recoveryForm.actualPunchOut ? dayjs(`2000-01-01 ${recoveryForm.actualPunchOut}`, "YYYY-MM-DD HH:mm:ss") : null}
                      onChange={(time) => setRecoveryForm({...recoveryForm, actualPunchOut: time ? time.format("HH:mm:ss") : ""})}
                    />
                  </div>
                )}
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
          <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium" onClick={() => exportToCSV(attendance, 'attendance')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>

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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                  <Button className="bg-brand-teal text-white" onClick={handleCreateManual}>Save Entry</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canAddAttendance && (
            <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm w-full sm:w-auto">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Bulk Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Bulk Generate Attendance</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate mock attendance records for testing purposes for the whole month.
                </p>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Select Employee</label>
                  <Select value={bulkForm.employeeId} onValueChange={(val) => setBulkForm({...bulkForm, employeeId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {allEmployees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Month</label>
                    <Select value={bulkForm.month} onValueChange={(val) => setBulkForm({...bulkForm, month: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Year</label>
                    <Select value={bulkForm.year} onValueChange={(val) => setBulkForm({...bulkForm, year: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["2024", "2025", "2026"].map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="sm:flex-1" onClick={() => setBulkModalOpen(false)}>Cancel</Button>
                <Button 
                  variant="destructive" 
                  className="sm:flex-1" 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Clear Month"}
                </Button>
                <Button 
                  className="bg-orange-600 hover:bg-orange-700 text-white sm:flex-1" 
                  onClick={handleBulkGenerate}
                  disabled={isBulkGenerating}
                >
                  {isBulkGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Generate Data"}
                </Button>
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
                  <AvatarImage src={getAvatarUrl(user?.profilePhoto, user?.name)} />
                  <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xl">
                    {user?.name?.split(' ').map((n:any) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">{user?.name}</h2>
                  <p className="text-sm text-muted-foreground mb-2">{user?.role} • {user?.designation}</p>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${
                    currentRecord ? 'bg-brand-light/50 border-brand-teal/20 text-brand-teal' : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}>
                    {currentRecord ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {currentRecord ? 'Present today' : 'Not Punched In'}
                  </div>
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
                    {currentRecord?.status || 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
 
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{user?.role === "Admin" || user?.role === "HR" ? "Total Attendance" : "Present Days"}</span>
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.presentDays}</div>
                <p className="text-xs text-muted-foreground">{canManageAttendance ? "All employee records" : "Days recorded this month"}</p>

              </div>
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Avg Daily Hours</span>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.avgHours}</div>
                <p className="text-xs text-muted-foreground">Based on your activity</p>
              </div>
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Break Time</span>
                  <Coffee className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.totalBreakTime}</div>
                <p className="text-xs text-muted-foreground">Cumulative break duration</p>
              </div>
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Working Time</span>
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.totalWorkTime}</div>
                <p className="text-xs text-muted-foreground">Total hours this month</p>
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
              <div className="flex flex-wrap gap-2">
              </div>
              <div className="relative w-full md:w-[280px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search employees..." 
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
                            checked={attendance.length > 0 && selectedIds.size === attendance.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                      )}
                      <th className="px-4 py-4">Sr. No.</th>
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
                  <tbody className="divide-y divide-border">
                    {attendance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, idx) => {
                      const totalBreakMinutes = (row.breaks || []).reduce((acc: number, b: any) => acc + (parseInt(b.duration) || 0), 0);
                      const breakStr = formatToHhMm(totalBreakMinutes);
                      
                      const isToday = dayjs(row.date).isSame(dayjs(), 'day');
                      const checkIn = dayjs(`${row.date} ${row.checkIn}`);
                      const checkOut = row.checkOut 
                        ? dayjs(`${row.date} ${row.checkOut}`) 
                        : (isToday && row.checkIn && row.checkIn !== "--" ? dayjs() : null);
                      
                      // Total Working Hours
                      let totalWorkingMinutes = 0;
                      if (checkIn.isValid() && checkOut && checkOut.isValid()) {
                        totalWorkingMinutes = checkOut.diff(checkIn, 'minute');
                      }
                      const totalWorkingStr = formatToHhMm(totalWorkingMinutes);
                      
                      // Production Hours
                      const productionMinutes = Math.max(0, totalWorkingMinutes - totalBreakMinutes);
                      const productionStr = formatToHhMm(productionMinutes);
                      
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
                      
                      const lateMinutes = checkIn.isValid() ? Math.max(0, checkIn.diff(dayjs(`${row.date} ${sysSettings?.officeStartTime || "09:30"}`), 'minute')) : 0;
                      // Just show the actual minutes as requested
                      const lateStr = isLate || recoveryReq 
                        ? formatToHhMm(lateMinutes) 
                        : "-";
                      
                      // Overtime
                      const shiftDurationMinutes = (() => {
                        const officeStartTime = sysSettings?.officeStartTime || "09:30";
                        const officeEndTime = sysSettings?.officeEndTime || "18:30";
                        const [sh, sm] = officeStartTime.split(':').map(Number);
                        const [eh, em] = officeEndTime.split(':').map(Number);
                        return (eh * 60 + em) - (sh * 60 + sm);
                      })();
                      
                      const overtimeMinutes = Math.max(0, productionMinutes - shiftDurationMinutes);
                      const overtimeStr = formatToHhMm(overtimeMinutes);

                      let statusLabel = row.status === "Leave" ? "Leave" : (row.checkIn ? "Present" : "Absent");
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
                          <td className="px-4 py-4 font-medium text-muted-foreground">{idx + 1}</td>
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
                          <td className="px-4 py-4 text-[11px] text-muted-foreground max-w-[200px] truncate" title={row.remarks || (isLate ? `Late punch-in; ${lateMinutes} mins after expected start (${sysSettings?.officeStartTime || "09:30"} AM)` : undefined)}>
                            {row.remarks || (isLate ? `Late punch-in; ${lateMinutes} mins after expected start (${sysSettings?.officeStartTime || "09:30"} AM)` : "-")}
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
                totalItems={attendance.length} 
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
