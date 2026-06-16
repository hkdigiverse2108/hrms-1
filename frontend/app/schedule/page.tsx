"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { DatePicker, TimePicker, Popconfirm, Tooltip as AntTooltip, Select as AntSelect } from "antd";
import dayjs from "dayjs";
import { Plus, Loader2, ChevronLeft, ChevronRight, X, Search, CalendarCheck, RefreshCcw } from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { DayPicker } from "react-day-picker";

/* ───── color palette for employees ───── */
const EMPLOYEE_COLORS = [
  { bg: "#1a73e8", bgLight: "rgba(26,115,232,0.18)", border: "#1a73e8", text: "#1a73e8" },
  { bg: "#0b8043", bgLight: "rgba(11,128,67,0.18)", border: "#0b8043", text: "#0b8043" },
  { bg: "#8e24aa", bgLight: "rgba(142,36,170,0.18)", border: "#8e24aa", text: "#8e24aa" },
  { bg: "#e67c73", bgLight: "rgba(230,124,115,0.18)", border: "#e67c73", text: "#e67c73" },
  { bg: "#f4511e", bgLight: "rgba(244,81,30,0.18)", border: "#f4511e", text: "#f4511e" },
  { bg: "#039be5", bgLight: "rgba(3,155,229,0.18)", border: "#039be5", text: "#039be5" },
  { bg: "#7986cb", bgLight: "rgba(121,134,203,0.18)", border: "#7986cb", text: "#7986cb" },
  { bg: "#616161", bgLight: "rgba(97,97,97,0.18)", border: "#616161", text: "#616161" },
  { bg: "#ad1457", bgLight: "rgba(173,20,87,0.18)", border: "#ad1457", text: "#ad1457" },
  { bg: "#e4c441", bgLight: "rgba(228,196,65,0.18)", border: "#e4c441", text: "#b89e00" },
];

type ViewMode = "day" | "week";

export default function SchedulePage() {
  const { user, getISTNow } = useUserContext();
  const { checkPermission, isAdmin } = usePermissions();
  const canAdd = isAdmin || checkPermission('schedule', 'canAdd');
  const canDeletePerm = isAdmin || checkPermission('schedule', 'canDelete');
  const [currentDate, setCurrentDate] = useState(dayjs(getISTNow()));
  const [calendarMonth, setCalendarMonth] = useState<Date>(dayjs(getISTNow()).toDate());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const getNowExact = () => {
    const now = dayjs(getISTNow());
    return { start: now.format("HH:mm"), end: now.add(1, "hour").format("HH:mm") };
  };
  const defaultTimes = getNowExact();
  const [form, setForm] = useState({
    title: "",
    description: "",
    employeeId: user?.id || user?.employeeId || "",
    employeeName: user?.name || "",
    date: dayjs(getISTNow()).format("YYYY-MM-DD"),
    startTime: defaultTimes.start,
    endTime: defaultTimes.end,
    type: "meeting",
    attendees: [] as string[]
  });

  const timelineRef = useRef<HTMLDivElement>(null);

  /* ───── week helpers ───── */
  const getWeekStart = (d: dayjs.Dayjs) => d.startOf("week"); // Sunday
  const getWeekDays = (d: dayjs.Dayjs) => {
    const start = getWeekStart(d);
    return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
  };

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate.format("YYYY-MM-DD")]);

  /* ───── data fetching ───── */
  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    if (viewMode === "day") {
      fetchSchedules(currentDate.format("YYYY-MM-DD"));
    } else {
      const start = getWeekStart(currentDate);
      const end = start.add(6, "day");
      fetchSchedulesRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    if (employees.length > 0 && selectedEmployeeIds.length === 0) {
      if (user) {
        const userId = String(user.id || user.employeeId);
        const matched = employees.find(e => String(e.id) === userId || String(e.employeeId) === userId);
        if (matched) {
          setSelectedEmployeeIds([String(matched.id)]);
        } else {
          setSelectedEmployeeIds([String(employees[0].id)]);
        }
      } else {
        setSelectedEmployeeIds([String(employees[0].id)]);
      }
    }
  }, [user, employees, selectedEmployeeIds.length]);

  /* scroll to current time on mount */
  useEffect(() => {
    if (!isLoading && timelineRef.current) {
      const now = dayjs(getISTNow());
      const currentMinutes = now.hour() * 60 + now.minute();
      const containerHeight = timelineRef.current.clientHeight;
      timelineRef.current.scrollTop = Math.max(0, currentMinutes - containerHeight / 3);
    }
  }, [isLoading, viewMode]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) setEmployees(await res.json());
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleDisconnectGoogle = async () => {
    if (!user) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/auth/google/disconnect?employeeId=${user.id || user.employeeId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      
      toast.success("Google Calendar disconnected.");
      window.location.href = "/schedule";
    } catch (error) {
      toast.error("Failed to disconnect Google Calendar.");
    }
  };

  const handleManualSync = async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    try {
      const dateFrom = viewMode === "day"
        ? currentDate.subtract(1, "day").format("YYYY-MM-DD")
        : getWeekStart(currentDate).format("YYYY-MM-DD");
      const dateTo = viewMode === "day"
        ? currentDate.add(1, "day").format("YYYY-MM-DD")
        : getWeekStart(currentDate).add(6, "day").format("YYYY-MM-DD");

      const res = await fetch(`${API_URL}/schedules/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: user.id || user.employeeId,
          dateFrom,
          dateTo
        })
      });
      if (res.ok) {
        toast.success("Google Calendar synced successfully");
        // Re-fetch schedules to show updated data
        if (viewMode === "day") {
          fetchSchedules(currentDate.format("YYYY-MM-DD"));
        } else {
          const start = getWeekStart(currentDate);
          const end = start.add(6, "day");
          fetchSchedulesRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
        }
      } else {
        toast.error("Failed to sync Google Calendar");
      }
    } catch (err) {
      toast.error("Error syncing with Google Calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchSchedules = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const userId = user?.id || user?.employeeId || "";
      const empParam = userId ? `&employeeId=${userId}` : "";
      const res = await fetch(`${API_URL}/schedules?date=${dateStr}${empParam}`);
      if (res.ok) setSchedules(await res.json());
      else setSchedules([]);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchedulesRange = async (from: string, to: string) => {
    setIsLoading(true);
    try {
      const userId = user?.id || user?.employeeId || "";
      const empParam = userId ? `&employeeId=${userId}` : "";
      const res = await fetch(`${API_URL}/schedules?date_from=${from}&date_to=${to}${empParam}`);
      if (res.ok) setSchedules(await res.json());
      else setSchedules([]);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!form.title || !form.employeeId || !form.startTime || !form.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.startTime >= form.endTime) {
      toast.error("End time must be after start time");
      return;
    }
    // Check for overlap within current schedules if creating for the current date
    if (form.date === currentDate.format("YYYY-MM-DD")) {
      const isOverlap = schedules.some((s) => {
        if (s.employeeId !== form.employeeId) return false;
        // Overlap condition: max(start1, start2) < min(end1, end2)
        const maxStart = form.startTime > s.startTime ? form.startTime : s.startTime;
        const minEnd = form.endTime < s.endTime ? form.endTime : s.endTime;
        return maxStart < minEnd;
      });

      if (isOverlap) {
        toast.error("This schedule overlaps with an existing schedule for this employee.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find(e => e.id === form.employeeId || e.employeeId === form.employeeId);
      const empName = selectedEmp ? selectedEmp.name : (user?.name || "Unknown");
      const res = await fetch(`${API_URL}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          employeeName: empName,
          createdBy: user?.id || user?.employeeId
        })
      });
      if (res.ok) {
        toast.success("Schedule added successfully");
        setCreateModalOpen(false);
        const newDate = dayjs(form.date);
        if (viewMode === "day") {
          if (newDate.isSame(currentDate, 'day')) {
            fetchSchedules(form.date);
          } else {
            setCurrentDate(newDate);
          }
        } else {
          const start = getWeekStart(currentDate);
          const end = start.add(6, "day");
          fetchSchedulesRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
        }
        setForm(prev => ({ ...prev, title: "", description: "", attendees: [] }));
      } else {
        try {
          const errorData = await res.json();
          toast.error(errorData.detail || errorData.message || "Failed to add schedule");
        } catch {
          toast.error("Failed to add schedule");
        }
      }
    } catch (err) {
      console.error("Error adding schedule:", err);
      toast.error(err instanceof Error ? err.message : "Error connecting to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const res = await fetch(`${API_URL}/schedules/${scheduleId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Schedule deleted successfully");
        if (viewMode === "day") {
          fetchSchedules(currentDate.format("YYYY-MM-DD"));
        } else {
          const start = getWeekStart(currentDate);
          const end = start.add(6, "day");
          fetchSchedulesRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
        }
      } else {
        toast.error("Failed to delete schedule");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    }
  };

  /* ───── helpers ───── */
  const [bulkSelectKey, setBulkSelectKey] = useState(0);

  const handleBulkAdd = (combinedValue: string) => {
    if (!combinedValue) return;
    const [type, ...rest] = combinedValue.split(":");
    const value = rest.join(":");
    const matchingEmpIds = employees
      .filter(e => e[type as "department" | "designation" | "role"] === value && e.id !== form.employeeId && e.employeeId !== form.employeeId)
      .map(e => String(e.id));
    
    const newAttendees = Array.from(new Set([...form.attendees, ...matchingEmpIds]));
    setForm({ ...form, attendees: newAttendees });
    setBulkSelectKey(prev => prev + 1);
  };

  const getEmployeeColor = (empId: string) => {
    const index = employees.findIndex(e => String(e.id) === String(empId) || String(e.employeeId) === String(empId));
    if (index === -1) return EMPLOYEE_COLORS[0];
    return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
  };

  const format12Hour = (timeStr: string) => {
    if (!timeStr) return "";
    return dayjs(`2000-01-01 ${timeStr}`).format("h:mm A");
  };

  const todayDayjs = dayjs(getISTNow());
  const isToday = currentDate.isSame(todayDayjs, 'day');

  const getCurrentTimePosition = () => {
    const now = dayjs(getISTNow());
    return now.hour() * 60 + now.minute();
  };

  const handleDayClick = (date: Date | undefined) => {
    if (date) {
      const newDate = dayjs(date);
      setCurrentDate(newDate);
    }
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  /* ───── filtered schedules ───── */
  /* ───── filtered schedules ───── */
  const filterByEmployee = (items: any[]) =>
    items.filter(s => {
      if (selectedEmployeeIds.includes(String(s.employeeId))) return true;
      if (selectedEmployeeIds.some(id => {
        const emp = employees.find(e => String(e.id) === id);
        return emp && (String(emp.employeeId) === String(s.employeeId));
      })) return true;

      if (s.attendees && Array.isArray(s.attendees)) {
        if (s.attendees.some((attId: string) => 
          selectedEmployeeIds.includes(String(attId)) ||
          selectedEmployeeIds.some(id => {
             const emp = employees.find(e => String(e.id) === id);
             return emp && (String(emp.employeeId) === String(attId));
          })
        )) return true;
      }
      return false;
    });

  const timeToMinutes = (timeStr: string) => {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  /* group overlapping events for side-by-side layout */
  const layoutEvents = (events: any[]) => {
    if (events.length === 0) return [];
    const sorted = [...events].sort((a, b) => {
      const aStart = timeToMinutes(a.startTime);
      const bStart = timeToMinutes(b.startTime);
      return aStart - bStart || timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
    });
    const columns: any[][] = [];
    const eventLayouts: { event: any; column: number; totalColumns: number }[] = [];
    sorted.forEach(event => {
      const eStart = timeToMinutes(event.startTime);
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (timeToMinutes(lastInCol.endTime) <= eStart) {
          columns[i].push(event);
          eventLayouts.push({ event, column: i, totalColumns: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
        eventLayouts.push({ event, column: columns.length - 1, totalColumns: 0 });
      }
    });
    eventLayouts.forEach(layout => {
      const eStart = timeToMinutes(layout.event.startTime);
      const eEnd = timeToMinutes(layout.event.endTime);
      let maxCol = layout.column;
      eventLayouts.forEach(other => {
        const oStart = timeToMinutes(other.event.startTime);
        const oEnd = timeToMinutes(other.event.endTime);
        if (eStart < oEnd && eEnd > oStart) {
          maxCol = Math.max(maxCol, other.column);
        }
      });
      layout.totalColumns = maxCol + 1;
    });
    return eventLayouts;
  };

  /* navigation */
  const navigatePrev = () => {
    if (viewMode === "day") setCurrentDate(currentDate.subtract(1, "day"));
    else setCurrentDate(currentDate.subtract(7, "day"));
  };
  const navigateNext = () => {
    if (viewMode === "day") setCurrentDate(currentDate.add(1, "day"));
    else setCurrentDate(currentDate.add(7, "day"));
  };
  const goToday = () => {
    const today = dayjs(getISTNow());
    setCurrentDate(today);
    setCalendarMonth(today.toDate());
  };

  /* header title */
  const headerTitle = viewMode === "day"
    ? currentDate.format("MMMM D, YYYY")
    : `${weekDays[0].format("MMM D")} – ${weekDays[6].format("MMM D, YYYY")}`;

  /* 24 hour labels */
  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return "12 AM";
    if (i === 12) return "12 PM";
    if (i > 12) return `${i - 12} PM`;
    return `${i} AM`;
  });

  /* ═══ get schedules for a specific date ═══ */
  const getSchedulesForDate = (dateStr: string) => {
    return schedules.filter(s => {
      const sDate = typeof s.date === "string" ? s.date.split("T")[0] : dayjs(s.date).format("YYYY-MM-DD");
      return sDate === dateStr;
    });
  };

  /* ═══════════════════════════════════════════
     EVENT BLOCK RENDERER (shared by day/week)
     ═══════════════════════════════════════════ */
  const renderEventBlock = (event: any, column: number, totalColumns: number, compact = false) => {
    const startMin = timeToMinutes(event.startTime);
    const endMin = timeToMinutes(event.endTime);
    const top = Math.max(0, startMin);
    const height = Math.max(20, Math.min(1440, endMin) - top);
    const color = getEmployeeColor(event.employeeId);
    const canDelete = String(event.createdBy) === String(user?.id || user?.employeeId);
    const colWidth = 100 / totalColumns;
    const leftPercent = column * colWidth;
    const widthPercent = colWidth - (compact ? 2 : 1.5);

    const eventBlock = (
      <div
        className="absolute rounded-md overflow-hidden cursor-pointer transition-shadow hover:shadow-lg group"
        style={{
          top: `${top}px`,
          height: `${height}px`,
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          backgroundColor: color.bg,
          borderLeft: `3px solid ${color.bg}`,
          zIndex: 10,
        }}
      >
        <div className={`${compact ? "p-0.5 px-1" : "p-1.5"} h-full flex flex-col relative`}>
          <div className="flex items-start justify-between gap-0.5">
            <div className={`${compact ? "text-[10px]" : "text-xs"} font-bold text-white truncate flex-1 leading-tight`}>
              {event.title}
            </div>
            {canDelete && !compact && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-px">
                <X className="w-3 h-3 text-white/80 hover:text-white" />
              </div>
            )}
          </div>
          {height > 30 && (
            <div className={`${compact ? "text-[9px]" : "text-[10px]"} text-white/80 mt-0.5 truncate`}>
              {format12Hour(event.startTime)}
            </div>
          )}
          {!compact && height > 50 && event.employeeName && (
            <div className="text-[10px] text-white/70 truncate mt-auto">
              {event.employeeName}
            </div>
          )}
        </div>
      </div>
    );

    const tooltipContent = (
      <div className="text-xs max-w-[200px]">
        <div className="font-bold mb-1">{event.title}</div>
        {event.createdBy && (
          <div><strong>Created By:</strong> {employees.find(e => String(e.id) === String(event.createdBy) || String(e.employeeId) === String(event.createdBy))?.name || "Unknown"}</div>
        )}
        {event.attendees && event.attendees.length > 0 && (
          <div className="mt-1">
            <strong>With:</strong> {
              event.attendees.map((id: string) => {
                const emp = employees.find(e => String(e.id) === String(id) || String(e.employeeId) === String(id));
                return emp ? emp.name : "Unknown";
              }).join(", ")
            }
          </div>
        )}
      </div>
    );

    const wrappedEventBlock = (
      <AntTooltip title={tooltipContent} placement="top" mouseEnterDelay={0.3}>
        {eventBlock}
      </AntTooltip>
    );

    return canDelete ? (
      <Popconfirm
        key={event.id}
        title="Delete Schedule"
        description="Are you sure you want to delete this schedule?"
        onConfirm={() => handleDeleteSchedule(event.id)}
        okText="Yes"
        cancelText="No"
      >
        {wrappedEventBlock}
      </Popconfirm>
    ) : (
      <React.Fragment key={event.id}>
        {wrappedEventBlock}
      </React.Fragment>
    );
  };

  /* ═══ HOUR GRID (shared) ═══ */
  const renderHourGrid = () => (
    <>
      {hourLabels.map((label, hour) => (
        <div key={hour} className="absolute w-full" style={{ top: `${hour * 60}px` }}>
          <div className="flex items-start">
            <div className="w-14 shrink-0 text-right pr-2 -mt-2">
              <span className="text-[11px] text-muted-foreground font-medium">
                {hour === 0 ? "" : label}
              </span>
            </div>
            <div className="flex-1 border-t border-gray-200" />
          </div>
          <div className="flex items-start" style={{ marginTop: "30px" }}>
            <div className="w-14 shrink-0" />
            <div className="flex-1 border-t border-gray-100" />
          </div>
        </div>
      ))}
    </>
  );

  /* ═══ CURRENT TIME INDICATOR ═══ */
  const renderCurrentTimeLine = (offsetLeft: string = "56px") => {
    const todayCheck = viewMode === "day" ? isToday : true; // in week view, checked per-column
    if (!todayCheck && viewMode === "day") return null;
    return (
      <div
        className="absolute left-0 right-0 z-30 pointer-events-none"
        style={{ top: `${getCurrentTimePosition()}px` }}
      >
        <div className="flex items-center">
          <div className="shrink-0" style={{ width: offsetLeft }} />
          <div className="relative flex-1">
            <div
              className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full"
              style={{ backgroundColor: "#ea4335" }}
            />
            <div className="w-full h-[2px]" style={{ backgroundColor: "#ea4335" }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Schedule"
        description="View and manage employee schedules."
      >
        {canAdd && (
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">New Schedule Block</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md focus:border-brand-teal outline-none"
                    placeholder="E.g., Client Meeting, Focused Work"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee</label>
                  <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v, attendees: form.attendees.filter(id => id !== v) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Colleagues (Attendees)</label>
                <AntSelect
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  className="w-full"
                  placeholder="Select colleagues"
                  value={form.attendees}
                  onChange={(v) => setForm({...form, attendees: v})}
                  options={employees.filter(e => e.id !== form.employeeId && e.employeeId !== form.employeeId).map(emp => ({ label: emp.name, value: emp.id }))}
                  getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
                />
                <div className="flex mt-2">
                  <Select key={`bulk-${bulkSelectKey}`} value={undefined} onValueChange={handleBulkAdd}>
                    <SelectTrigger className="flex-1 text-xs h-8"><SelectValue placeholder="Bulk Add (by Team, Position, Role)" /></SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(employees.map(e => e.department).filter(Boolean))).length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Teams</SelectLabel>
                          {Array.from(new Set(employees.map(e => e.department).filter(Boolean))).map(dep => (
                            <SelectItem key={`dept-${dep}`} value={`department:${dep}`}>{String(dep)}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {Array.from(new Set(employees.map(e => e.designation).filter(Boolean))).length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Positions</SelectLabel>
                          {Array.from(new Set(employees.map(e => e.designation).filter(Boolean))).map(des => (
                            <SelectItem key={`desig-${des}`} value={`designation:${des}`}>{String(des)}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {Array.from(new Set(employees.map(e => e.role).filter(Boolean))).length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Roles</SelectLabel>
                          {Array.from(new Set(employees.map(e => e.role).filter(Boolean))).map(role => (
                            <SelectItem key={`role-${role}`} value={`role:${role}`}>{String(role)}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <DatePicker
                      className="w-full h-10"
                      value={dayjs(form.date)}
                      onChange={d => setForm({ ...form, date: d ? d.format("YYYY-MM-DD") : "" })}
                      format="YYYY-MM-DD"
                      getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="work">Work Block</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="out_of_office">Out of Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <TimePicker
                      className="w-full h-10"
                      format="h:mm a"
                      use12Hours
                      value={dayjs(`2000-01-01 ${form.startTime}`)}
                      onChange={t => {
                        if (!t) { setForm({ ...form, startTime: "" }); return; }
                        const newStart = t.format("HH:mm");
                        if (form.endTime && newStart >= form.endTime) {
                          const newEnd = t.add(1, 'hour').format("HH:mm");
                          setForm({ ...form, startTime: newStart, endTime: newEnd });
                        } else {
                          setForm({ ...form, startTime: newStart });
                        }
                      }}
                      minuteStep={15}
                      getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <TimePicker
                      className="w-full h-10"
                      format="h:mm a"
                      use12Hours
                      value={dayjs(`2000-01-01 ${form.endTime}`)}
                      onChange={t => setForm({ ...form, endTime: t ? t.format("HH:mm") : "" })}
                      minuteStep={15}
                      getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <textarea
                    className="w-full p-2 border rounded-md min-h-[80px]"
                    placeholder="Additional details..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                <Button className="bg-brand-teal text-white hover:bg-brand-teal/90" onClick={handleCreateSchedule}>Save Schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* ═══════ MAIN LAYOUT ═══════ */}
      <div className="flex gap-0 bg-white rounded-xl shadow-sm border border-border overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>

        {/* ─── LEFT SIDEBAR ─── */}
        <div className="w-[260px] shrink-0 border-r border-border flex flex-col bg-gray-50/50">

          {/* Mini Calendar */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm font-semibold text-foreground">
                {dayjs(calendarMonth).format("MMMM YYYY")}
              </h2>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setCalendarMonth(dayjs(calendarMonth).subtract(1, 'month').toDate())}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCalendarMonth(dayjs(calendarMonth).add(1, 'month').toDate())}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-muted-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <DayPicker
              mode="single"
              selected={currentDate.toDate()}
              onSelect={handleDayClick}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              showOutsideDays
              classNames={{
                root: "w-full [--cell-size:28px]",
                months: "w-full",
                month: "w-full",
                month_caption: "hidden",
                nav: "hidden",
                table: "w-full border-collapse",
                weekdays: "flex w-full",
                weekday: "flex-1 text-center text-[10px] font-medium text-muted-foreground uppercase py-1 select-none",
                week: "flex w-full mt-0.5",
                day: "flex-1 flex items-center justify-center p-0 text-xs [&_button]:w-7 [&_button]:h-7 [&_button]:rounded-full [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:cursor-pointer [&_button]:hover:bg-gray-200 [&_button]:transition-colors [&_button]:font-medium [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-foreground",
                selected: "[&_button]:!bg-brand-teal [&_button]:!text-white [&_button]:hover:!bg-brand-teal",
                today: "[&_button]:bg-brand-teal/10 [&_button]:text-brand-teal [&_button]:font-bold",
                outside: "[&_button]:text-muted-foreground/40",
              }}
            />
          </div>

          {/* Employee List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-4 pb-2 border-b border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Employees</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {employees.filter(emp => emp.name.toLowerCase().includes(employeeSearch.toLowerCase())).map((emp, idx) => {
                const color = EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length];
                const isChecked = selectedEmployeeIds.includes(String(emp.id));
                const isCurrentUser = user && (String(emp.id) === String(user.id || user.employeeId) || String(emp.employeeId) === String(user.id || user.employeeId));

                return (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 transition-colors group"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleEmployee(String(emp.id))}
                        className="sr-only"
                      />
                      <div
                        className="w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: isChecked ? color.bg : "transparent",
                          borderColor: isChecked ? color.bg : "#d1d5db",
                        }}
                      >
                        {isChecked && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-foreground truncate flex-1">
                      {emp.name}
                      {isCurrentUser && <span className="text-muted-foreground text-xs ml-1">(You)</span>}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Google Calendar Integration */}
            <div className="p-4 border-t border-border bg-gray-50/80 shrink-0">
              {user?.googleCalendarTokens ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-2">
                    <CalendarCheck className="h-4 w-4" />
                    Google Calendar Connected
                  </div>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="w-full text-brand-teal border-brand-teal/30 hover:bg-brand-teal/5 hover:text-brand-teal h-8 text-xs font-medium"
                  >
                    <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleDisconnectGoogle}
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 text-xs font-medium"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button 
                  type="button"
                  onClick={() => {
                    if (user) {
                      window.location.href = `${API_URL}/auth/google/url?employeeId=${user.id || user.employeeId}`;
                    }
                  }}
                  className="w-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-brand-teal font-semibold text-xs shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.36,22 12.22,22C17.74,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"
                    />
                  </svg>
                  Connect Google Calendar
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={navigatePrev}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={navigateNext}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-muted-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {headerTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday} className="text-sm font-medium">
                Today
              </Button>
              {/* View Mode Toggle */}
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("day")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "day"
                      ? "bg-brand-teal text-white"
                      : "bg-white text-foreground hover:bg-gray-50"
                    }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${viewMode === "week"
                      ? "bg-brand-teal text-white"
                      : "bg-white text-foreground hover:bg-gray-50"
                    }`}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* ══════ DAY VIEW ══════ */}
          {viewMode === "day" && (
            <>
              {/* Day Column Header */}
              <div className="flex items-end px-4 pt-3 pb-2 border-b border-border bg-white">
                <div className="w-14 shrink-0" />
                <div className="flex flex-col items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {currentDate.format("ddd")}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium mt-0.5 transition-colors ${isToday ? "bg-brand-teal text-white" : "text-foreground hover:bg-gray-100"
                      }`}
                  >
                    {currentDate.format("D")}
                  </div>
                </div>
              </div>

              {/* Day Timeline */}
              <div ref={timelineRef} className="flex-1 overflow-y-auto overflow-x-hidden relative bg-white">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                  </div>
                ) : (
                  <div className="relative" style={{ height: "1440px" }}>
                    {renderHourGrid()}
                    {isToday && renderCurrentTimeLine("56px")}
                    <div className="absolute top-0 bottom-0 right-0" style={{ left: "56px" }}>
                      {layoutEvents(filterByEmployee(schedules)).map(({ event, column, totalColumns }) =>
                        renderEventBlock(event, column, totalColumns)
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════ WEEK VIEW ══════ */}
          {viewMode === "week" && (
            <>
              {/* Week Day Headers */}
              <div className="flex border-b border-border bg-white">
                <div className="w-14 shrink-0" />
                {weekDays.map(day => {
                  const isDayToday = day.isSame(todayDayjs, "day");
                  return (
                    <div
                      key={day.format("YYYY-MM-DD")}
                      className="flex-1 flex flex-col items-center pt-2 pb-1.5 cursor-pointer hover:bg-gray-50 transition-colors border-l border-border first:border-l-0"
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode("day");
                      }}
                    >
                      <span className={`text-[11px] font-medium uppercase ${isDayToday ? "text-brand-teal" : "text-muted-foreground"}`}>
                        {day.format("ddd")}
                      </span>
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-medium mt-0.5 transition-colors ${isDayToday
                            ? "bg-brand-teal text-white"
                            : "text-foreground"
                          }`}
                      >
                        {day.format("D")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Week Timeline Grid */}
              <div ref={timelineRef} className="flex-1 overflow-y-auto overflow-x-hidden relative bg-white">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                  </div>
                ) : (
                  <div className="relative flex" style={{ height: "1440px" }}>
                    {/* Time labels column */}
                    <div className="w-14 shrink-0 relative">
                      {hourLabels.map((label, hour) => (
                        <div key={hour} className="absolute w-full text-right pr-2 -mt-2" style={{ top: `${hour * 60}px` }}>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {hour === 0 ? "" : label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map(day => {
                      const dateStr = day.format("YYYY-MM-DD");
                      const daySchedules = filterByEmployee(getSchedulesForDate(dateStr));
                      const dayLayouts = layoutEvents(daySchedules);
                      const isDayToday = day.isSame(todayDayjs, "day");

                      return (
                        <div
                          key={dateStr}
                          className="flex-1 relative border-l border-border"
                        >
                          {/* Hour grid lines */}
                          {Array.from({ length: 24 }, (_, hour) => (
                            <React.Fragment key={hour}>
                              <div className="absolute w-full border-t border-gray-200" style={{ top: `${hour * 60}px` }} />
                              <div className="absolute w-full border-t border-gray-100" style={{ top: `${hour * 60 + 30}px` }} />
                            </React.Fragment>
                          ))}

                          {/* Current time line for today's column */}
                          {isDayToday && (
                            <div
                              className="absolute left-0 right-0 z-30 pointer-events-none"
                              style={{ top: `${getCurrentTimePosition()}px` }}
                            >
                              <div className="relative">
                                <div
                                  className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full"
                                  style={{ backgroundColor: "#ea4335" }}
                                />
                                <div className="w-full h-[2px]" style={{ backgroundColor: "#ea4335" }} />
                              </div>
                            </div>
                          )}

                          {/* Events */}
                          <div className="absolute inset-0">
                            {dayLayouts.map(({ event, column, totalColumns }) =>
                              renderEventBlock(event, column, totalColumns, true)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
