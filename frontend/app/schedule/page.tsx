"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { DatePicker, TimePicker, Popconfirm, Tooltip as AntTooltip, Select as AntSelect } from "antd";
import dayjs from "dayjs";
import { Plus, Loader2, ChevronLeft, ChevronRight, X, Search, CalendarCheck, RefreshCcw, Copy, Link, Calendar, ChevronUp, ChevronDown } from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { DayPicker } from "react-day-picker";
import { useConfirm } from "@/context/ConfirmContext";

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

const TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  const displayString = `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
  return { value: timeString, label: displayString };
});

type ViewMode = "day" | "week";

export default function SchedulePage() {
  const { user, getISTNow, updateUser } = useUserContext();
  const { checkPermission, isAdmin } = usePermissions();
  const { confirm } = useConfirm();
  const [isSyncing, setIsSyncing] = useState(false);
  const canAdd = isAdmin || checkPermission('schedule', 'canAdd');
  const canDeletePerm = isAdmin || checkPermission('schedule', 'canDelete');
  const [currentDate, setCurrentDate] = useState(dayjs(getISTNow()));
  const [calendarMonth, setCalendarMonth] = useState<Date>(dayjs(getISTNow()).toDate());
  const [schedules, setSchedules] = useState<any[]>([]);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDetailsCard, setShowDetailsCard] = useState(false);
  const [hideAvailabilityFromCalendar, setHideAvailabilityFromCalendar] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [bookingPagesExpanded, setBookingPagesExpanded] = useState(true);
  const [customDurationModalOpen, setCustomDurationModalOpen] = useState(false);
  const [customDurationValue, setCustomDurationValue] = useState(1);
  const [customDurationUnit, setCustomDurationUnit] = useState<"minutes" | "hours">("hours");
  const [appConfig, setAppConfig] = useState<any>({
    employeeId: "",
    title: "",
    duration: 60,
    availability: {
      Monday: [{ start: "09:00", end: "17:00" }],
      Tuesday: [{ start: "09:00", end: "17:00" }],
      Wednesday: [{ start: "09:00", end: "17:00" }],
      Thursday: [{ start: "09:00", end: "17:00" }],
      Friday: [{ start: "09:00", end: "17:00" }],
      Saturday: [],
      Sunday: []
    },
    timezone: "Asia/Kolkata",
    active: true
  });

  const fetchConfig = async () => {
    const empId = user?.id || user?.employeeId;
    if (!empId) return;
    try {
      const res = await fetch(`${API_URL}/api/appointments/config/${empId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.employeeId) {
          if (!data.active) {
            setAppConfig({
              ...data,
              active: false,
              title: "",
              duration: 60,
              availability: {
                Monday: [{ start: "09:00", end: "17:00" }],
                Tuesday: [{ start: "09:00", end: "17:00" }],
                Wednesday: [{ start: "09:00", end: "17:00" }],
                Thursday: [{ start: "09:00", end: "17:00" }],
                Friday: [{ start: "09:00", end: "17:00" }],
                Saturday: [],
                Sunday: []
              }
            });
          } else {
            setAppConfig(data);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching appointment config:", err);
    }
  };

  useEffect(() => {
    if ((user?.id || user?.employeeId) && !isConfiguring) {
      fetchConfig();
    }
  }, [user, isConfiguring]);

  const duplicateToAll = (sourceDay: string) => {
    const sourceSlots = appConfig.availability[sourceDay] || [];
    const newAvailability = { ...appConfig.availability };
    Object.keys(newAvailability).forEach(day => {
      if (day !== "Saturday" && day !== "Sunday") {
        newAvailability[day] = JSON.parse(JSON.stringify(sourceSlots));
      }
    });
    setAppConfig({ ...appConfig, availability: newAvailability });
    toast.success(`Copied ${sourceDay}'s schedule to Monday - Friday`);
  };

  const handleSaveConfig = async () => {
    setIsConfigSaving(true);
    try {
      const empId = user?.id || user?.employeeId;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/appointments/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...appConfig, employeeId: empId })
      });
      if (res.ok) {
        toast.success("Appointment schedule configuration saved");
        setConfigModalOpen(false);
      } else {
        toast.error("Failed to save configuration");
      }
    } catch (err) {
      toast.error("Error saving configuration");
    } finally {
      setIsConfigSaving(false);
    }
  };

  // Sync user profile from server to detect Google Calendar tokens
  const syncUserProfile = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/employees/${user.id}`);
      if (res.ok) {
        const freshUser = await res.json();
        if (freshUser && !freshUser.detail) {
          const pRes = await fetch(`${API_URL}/user-permissions/${user.id}`);
          const pData = pRes.ok ? await pRes.json() : { permissions: [] };
          if (updateUser) {
            updateUser({
              ...freshUser,
              permissions: pData?.permissions || []
            });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to sync user profile in schedule:", err);
    }
  }, [user?.id, updateUser]);

  useEffect(() => {
    syncUserProfile();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', syncUserProfile);
      return () => window.removeEventListener('focus', syncUserProfile);
    }
  }, [syncUserProfile]);
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

  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ───── free slots state ───── */
  const [freeSlots, setFreeSlots] = useState<{start: string, end: string}[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  const resetForm = () => {
    setEditingScheduleId(null);
    setForm({
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
  };

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

  /* ───── fetch free slots ───── */
  useEffect(() => {
    const fetchFreeSlots = async () => {
      if (!form.date || !form.employeeId || !createModalOpen) return;
      const attendeeIds = [form.employeeId, ...(form.attendees || [])];
      
      setIsCheckingSlots(true);
      try {
        const res = await fetch(`${API_URL}/schedules/free-slots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeIds: attendeeIds,
            date: form.date,
            durationMins: 30
          })
        });
        if (res.ok) {
          const data = await res.json();
          setFreeSlots(data.freeSlots || []);
        } else {
          setFreeSlots([]);
        }
      } catch (err) {
        console.error("Error fetching free slots:", err);
        setFreeSlots([]);
      } finally {
        setIsCheckingSlots(false);
      }
    };
    
    // Use a small debounce to avoid spamming the API while selecting attendees
    const timeoutId = setTimeout(() => {
      fetchFreeSlots();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [form.date, form.employeeId, form.attendees, createModalOpen]);

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

  const handleDisconnectGoogle = async () => {
    if (!user) return;
    try {
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
      const res = await fetch(`${API_URL}/schedules?date=${dateStr}`);
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
      const res = await fetch(`${API_URL}/schedules?date_from=${from}&date_to=${to}`);
      if (res.ok) setSchedules(await res.json());
      else setSchedules([]);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.employeeId || !form.startTime || !form.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.startTime >= form.endTime) {
      toast.error("End time must be after start time");
      return;
    }
    // Check for overlap within currently loaded schedules
    let overlapEmployee = false;
    let overlapAttendee = false;

    schedules.forEach((s) => {
      const sDate = typeof s.date === "string" ? s.date.split("T")[0] : dayjs(s.date).format("YYYY-MM-DD");
      if (form.date !== sDate) return;
      if (editingScheduleId && s.id === editingScheduleId) return;
      
      const maxStart = form.startTime > s.startTime ? form.startTime : s.startTime;
      const minEnd = form.endTime < s.endTime ? form.endTime : s.endTime;
      const overlaps = maxStart < minEnd;
      
      if (overlaps) {
        // Check if this existing schedule involves the primary employee
        if (String(s.employeeId) === String(form.employeeId) || (s.attendees || []).some((id: any) => String(id) === String(form.employeeId))) {
          overlapEmployee = true;
        }
        // Check if this existing schedule involves any of the selected attendees
        const involvesAnyAttendee = form.attendees.some(att => 
          String(s.employeeId) === String(att) || (s.attendees || []).some((id: any) => String(id) === String(att))
        );
        if (involvesAnyAttendee) {
          overlapAttendee = true;
        }
      }
    });

    if (overlapAttendee) {
      toast.error("Cannot schedule. One or more attendees have an overlapping event.");
      return;
    }

    if (overlapEmployee) {
      if (String(form.employeeId) === String(user?.id || user?.employeeId)) {
        toast.warning("Overlap detected in your schedule!");
      } else {
        toast.error("Cannot assign an overlapping schedule to someone else.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find(e => e.id === form.employeeId || e.employeeId === form.employeeId);
      const empName = selectedEmp ? selectedEmp.name : (user?.name || "Unknown");
      
      const method = editingScheduleId ? "PUT" : "POST";
      const url = editingScheduleId ? `${API_URL}/schedules/${editingScheduleId}` : `${API_URL}/schedules`;
      
      const payload: any = {
        ...form,
        employeeName: empName
      };
      
      if (!editingScheduleId) {
        payload.createdBy = user?.id || user?.employeeId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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
          if (newDate.isBefore(start) || newDate.isAfter(end)) {
            setCurrentDate(newDate);
          } else {
            fetchSchedulesRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
          }
        }
        resetForm();
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
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/schedules/${scheduleId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Schedule deleted successfully");
        setCreateModalOpen(false);
        resetForm();
        if (viewMode === "day") {
          fetchSchedules(currentDate.format("YYYY-MM-DD"));
        } else {
          const start = getWeekStart(currentDate);
          const end = start.add(6, "day");
          fetchSchedulesRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || errorData.message || "Failed to delete schedule");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (event: any) => {
    setEditingScheduleId(event.id || event._id);
    setForm({
      title: event.title || "",
      description: event.description || "",
      employeeId: event.employeeId,
      employeeName: event.employeeName || "",
      date: dayjs(event.date).format("YYYY-MM-DD"),
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type || "meeting",
      attendees: event.attendees || []
    });
    setCreateModalOpen(true);
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
    const duration = Math.max(20, Math.min(1440, endMin) - top);
    const height = Math.max(15, duration - 1.5); // Subtract 1.5px to create visual gap for back-to-back
    const color = getEmployeeColor(event.employeeId);
    
    const userId = String(user?.id || user?.employeeId);
    const isAdminUser = user?.role === "Admin" || user?.role === "HR" || isAdmin;
    const isOwner = String(event.employeeId) === userId;
    const isCreator = String(event.createdBy) === userId;
    const isAttendee = Array.isArray(event.attendees) && event.attendees.some((id: any) => String(id) === userId);
    const canSeeDetails = isAdminUser || isOwner || isCreator || isAttendee;
    
    const displayTitle = canSeeDetails ? event.title : "Busy";
    const canEditOrDelete = isOwner;
    
    const colWidth = 100 / totalColumns;
    const leftPercent = column * colWidth;
    const widthPercent = colWidth - (compact ? 2 : 1.5);

    const eventBlock = (
      <div
        onClick={(e) => {
          if (canEditOrDelete) {
            e.stopPropagation();
            handleEditClick(event);
          }
        }}
        className={`absolute rounded-md overflow-hidden transition-shadow ${canEditOrDelete ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'} group`}
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
              {displayTitle}
            </div>
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
        <div className="font-bold mb-1">{displayTitle}</div>
        {canSeeDetails && event.createdBy && (
          <div><strong>Created By:</strong> {employees.find(e => String(e.id) === String(event.createdBy) || String(e.employeeId) === String(event.createdBy))?.name || "Unknown"}</div>
        )}
        {canSeeDetails && event.attendees && event.attendees.length > 0 && (
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

    return (
      <React.Fragment key={event.id || Math.random()}>
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
          <Dialog open={createModalOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setCreateModalOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium shadow-sm" onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{editingScheduleId ? "Edit Schedule" : "New Schedule Block"}</DialogTitle>
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
                
                {/* ───── Common Free Slots ───── */}
                {form.employeeId && (form.attendees.length > 0) && form.date && (
                  <div className="mt-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Common Free Slots</label>
                    {isCheckingSlots ? (
                      <div className="text-xs text-slate-500 animate-pulse">Finding available times...</div>
                    ) : freeSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                        {freeSlots.slice(0, 10).map((slot, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              const s = slot.start.length === 5 ? slot.start + ":00" : slot.start;
                              const e = slot.end.length === 5 ? slot.end + ":00" : slot.end;
                              setForm({ ...form, startTime: s, endTime: e });
                            }}
                            className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors"
                          >
                            {format12Hour(slot.start)} - {format12Hour(slot.end)}
                          </div>
                        ))}
                        {freeSlots.length === 0 && <span className="text-xs text-slate-400">No common slots found.</span>}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded border border-amber-100">
                        No common free slots available on this date.
                      </div>
                    )}
                  </div>
                )}
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
                    <Select value={form.startTime} onValueChange={v => {
                      if (!v) { setForm({ ...form, startTime: "" }); return; }
                      if (form.endTime && v >= form.endTime) {
                        const newEnd = dayjs(`2000-01-01 ${v}`).add(1, 'hour').format("HH:mm");
                        setForm({ ...form, startTime: v, endTime: newEnd });
                      } else {
                        setForm({ ...form, startTime: v });
                      }
                    }}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Start Time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        {TIME_OPTIONS.map(opt => (
                          <SelectItem key={`start-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Time</label>
                    <Select value={form.endTime} onValueChange={v => setForm({ ...form, endTime: v })}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="End Time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        {TIME_OPTIONS.map(opt => (
                          <SelectItem key={`end-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <DialogFooter className="flex items-center">
                {editingScheduleId && (
                  <Popconfirm
                    title="Delete Schedule"
                    description="Are you sure you want to delete this schedule?"
                    onConfirm={() => handleDeleteSchedule(editingScheduleId)}
                    okText="Yes"
                    cancelText="No"
                    getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
                  >
                    <Button 
                      variant="outline" 
                      className="mr-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      disabled={isSubmitting || isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </Popconfirm>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={isSubmitting || isDeleting}>Cancel</Button>
                  <Button className="bg-brand-teal text-white hover:bg-brand-teal/90" onClick={handleSave} disabled={isSubmitting || isDeleting}>
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      editingScheduleId ? "Save Changes" : "Save Schedule"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canAdd && (
          <Button
            variant="outline"
            className="border-brand-teal text-brand-teal hover:bg-brand-teal/5 font-medium shadow-sm ml-2"
            onClick={() => {
              const empId = user?.id || user?.employeeId || "";
              if (!appConfig.active) {
                setAppConfig({
                  employeeId: empId,
                  title: "",
                  duration: 60,
                  availability: {
                    Monday: [{ start: "09:00", end: "17:00" }],
                    Tuesday: [{ start: "09:00", end: "17:00" }],
                    Wednesday: [{ start: "09:00", end: "17:00" }],
                    Thursday: [{ start: "09:00", end: "17:00" }],
                    Friday: [{ start: "09:00", end: "17:00" }],
                    Saturday: [],
                    Sunday: []
                  },
                  timezone: "Asia/Kolkata",
                  active: true
                });
              }
              setIsConfiguring(true);
              setViewMode("week");
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Appointment Setup
          </Button>
        )}
      </PageHeader>

      {/* ═══════ MAIN LAYOUT ═══════ */}
      <div className="flex gap-0 bg-white rounded-xl shadow-sm border border-border overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>

        {/* ─── LEFT SIDEBAR ─── */}
        {isConfiguring ? (
          <div className="w-[360px] shrink-0 border-r border-border flex flex-col bg-white overflow-hidden p-6 space-y-6">
            
            {/* Header: Title and Close button */}
            <div className="flex items-start justify-between shrink-0">
              <div className="flex-1 mr-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Bookable Appointment Schedule
                </div>
                <input
                  type="text"
                  value={appConfig.title || ""}
                  onChange={(e) => setAppConfig({ ...appConfig, title: e.target.value })}
                  className="w-full text-xl font-medium border-b-2 border-slate-300 focus:border-blue-600 outline-none pb-1 mt-2 transition-colors"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                onClick={() => setIsConfiguring(false)}
              >
                <X className="w-5 h-5 text-slate-600" />
              </Button>
            </div>

            {/* Content body wrapper (scrollable) */}
             <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar">
              
              {/* Active Toggle & Booking Link */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-800">Active Booking Link</div>
                    <div className="text-[10px] text-slate-500 leading-tight">Enable or disable booking appointments</div>
                  </div>
                  <input
                    type="checkbox"
                    className="w-9 h-5 bg-gray-200 checked:bg-blue-600 rounded-full cursor-pointer"
                    checked={appConfig.active}
                    onChange={(e) => setAppConfig({ ...appConfig, active: e.target.checked })}
                  />
                </div>
              </div>

              {/* 1. Appointment Duration Section */}
              <div className="flex gap-4">
                <div className="mt-1">
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 leading-tight">Appointment duration</h4>
                    <p className="text-[11px] text-slate-500 leading-tight">How long should each appointment last?</p>
                  </div>
                  
                  <Select
                    value={[15, 30, 45, 60, 90, 120].includes(appConfig.duration) ? String(appConfig.duration) : String(appConfig.duration)}
                    onValueChange={(val) => {
                      if (val === "custom") {
                        const isHours = appConfig.duration >= 60;
                        setCustomDurationValue(isHours ? Math.round(appConfig.duration / 60) : appConfig.duration);
                        setCustomDurationUnit(isHours ? "hours" : "minutes");
                        setCustomDurationModalOpen(true);
                      } else {
                        setAppConfig({ ...appConfig, duration: parseInt(val) });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-9 bg-slate-50 border-slate-200 text-slate-700 text-xs">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      {![15, 30, 45, 60, 90, 120].includes(appConfig.duration) && (
                        <SelectItem value={String(appConfig.duration)}>
                          {appConfig.duration % 60 === 0 
                            ? `${appConfig.duration / 60} ${appConfig.duration / 60 === 1 ? 'hour' : 'hours'}` 
                            : `${appConfig.duration} minutes`}
                        </SelectItem>
                      )}
                      <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* 2. General Availability Section */}
              <div className="flex gap-4">
                <div className="mt-1">
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 leading-tight">General availability</h4>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Set when you're regularly available for appointments.
                    </p>
                  </div>

                  <Select value="weekly">
                    <SelectTrigger className="w-36 h-8 bg-slate-50 border-slate-200 text-slate-700 text-xs font-medium">
                      <SelectValue placeholder="Repeat weekly" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Repeat weekly</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Availability Grid */}
                  <div className="space-y-3.5 pt-2">
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                      const slots = appConfig.availability[day] || [];
                      const isAvailable = slots.length > 0;

                      const toggleDay = (checked: boolean) => {
                        const newAvail = { ...appConfig.availability };
                        if (checked) {
                          newAvail[day] = [{ start: "09:00", end: "17:00" }];
                        } else {
                          newAvail[day] = [];
                        }
                        setAppConfig({ ...appConfig, availability: newAvail });
                      };

                      const updateTime = (index: number, field: "start" | "end", val: string) => {
                        const newAvail = { ...appConfig.availability };
                        const newSlots = [...(newAvail[day] || [])];
                        if (newSlots[index]) {
                          newSlots[index] = { ...newSlots[index], [field]: val };
                        }
                        newAvail[day] = newSlots;
                        setAppConfig({ ...appConfig, availability: newAvail });
                      };

                      return (
                        <div key={day} className="flex items-center justify-between text-xs gap-3">
                          <div className="w-10 shrink-0 font-medium text-slate-600">
                            {day.substring(0, 3)}
                          </div>

                          {isAvailable ? (
                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                              <select
                                value={slots[0]?.start || "09:00"}
                                onChange={(e) => updateTime(0, "start", e.target.value)}
                                className="bg-[#f1f3f4] text-slate-700 hover:bg-[#e8eaed] transition-colors rounded px-2 py-1.5 text-xs text-center border-none outline-none w-[90px] cursor-pointer"
                              >
                                {TIME_OPTIONS.map(opt => (
                                  <option key={`start-${opt.value}`} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-slate-400 font-light">—</span>
                              <select
                                value={slots[0]?.end || "17:00"}
                                onChange={(e) => updateTime(0, "end", e.target.value)}
                                className="bg-[#f1f3f4] text-slate-700 hover:bg-[#e8eaed] transition-colors rounded px-2 py-1.5 text-xs text-center border-none outline-none w-[90px] cursor-pointer"
                              >
                                {TIME_OPTIONS.map(opt => (
                                  <option key={`end-${opt.value}`} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              
                              {/* Make Unavailable (Block/Ban icon) */}
                              <button
                                type="button"
                                title="Make unavailable"
                                className="p-1 rounded-full hover:bg-slate-100 shrink-0 text-slate-500 transition-colors"
                                onClick={() => toggleDay(false)}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              </button>

                              {/* Add slot (Plus icon) */}
                              <button
                                type="button"
                                title="Add slot"
                                className="p-1 rounded-full hover:bg-slate-100 shrink-0 text-slate-500 transition-colors"
                                onClick={() => {
                                  toast.info("Split slots are currently configured for standard schedules.");
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>

                              {/* Copy to all (Copy icon) */}
                              <button
                                type="button"
                                title="Copy to all days"
                                className="p-1 rounded-full hover:bg-slate-100 shrink-0 text-slate-500 transition-colors"
                                onClick={() => {
                                  duplicateToAll(day);
                                  toast.success(`Copied ${day}'s schedule to all weekdays`);
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between flex-1 pl-1">
                              <span className="text-slate-400 italic">Unavailable</span>
                              <button
                                type="button"
                                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 shrink-0"
                                onClick={() => toggleDay(true)}
                              >
                                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t shrink-0">
              <Button
                variant="ghost"
                className="text-xs font-semibold hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-full"
                onClick={() => setIsConfiguring(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-full px-6 py-2 text-xs shadow-sm"
                onClick={async () => {
                  await handleSaveConfig();
                  setIsConfiguring(false);
                }}
                disabled={isConfigSaving}
              >
                {isConfigSaving ? "Saving..." : "Save"}
              </Button>
            </div>

          </div>
        ) : (
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

            {/* Booking pages */}
            {/* Booking pages Section */}
            <div className="p-3 border-b border-border bg-white shrink-0 relative flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-semibold text-slate-800 tracking-wider">
                  Booking pages
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const empId = user?.id || user?.employeeId || "";
                      if (!appConfig.active) {
                        setAppConfig({
                          employeeId: empId,
                          title: "",
                          duration: 60,
                          availability: {
                            Monday: [{ start: "09:00", end: "17:00" }],
                            Tuesday: [{ start: "09:00", end: "17:00" }],
                            Wednesday: [{ start: "09:00", end: "17:00" }],
                            Thursday: [{ start: "09:00", end: "17:00" }],
                            Friday: [{ start: "09:00", end: "17:00" }],
                            Saturday: [],
                            Sunday: []
                          },
                          timezone: "Asia/Kolkata",
                          active: true
                        });
                      }
                      setIsConfiguring(true);
                      setViewMode("week");
                    }} 
                    className="text-slate-500 hover:text-slate-800 p-0.5 rounded hover:bg-slate-100 transition-colors"
                    title="Edit Booking Page"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setBookingPagesExpanded(!bookingPagesExpanded)}
                    className="text-slate-500 hover:text-slate-800 p-0.5 rounded hover:bg-slate-100 transition-colors"
                  >
                    {bookingPagesExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Booking Page List Item */}
              {bookingPagesExpanded && appConfig.active && (
                <div 
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 cursor-pointer group transition-all relative"
                  onClick={() => setShowDetailsCard(true)}
                >
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  
                  <span className="text-xs font-medium text-slate-700 truncate flex-1">
                    {appConfig.title || "ABCD"}
                  </span>

                  {/* Actions (visible on hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = `${window.location.origin}/f/book/${user?.id || user?.employeeId}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Link copied!");
                      }}
                      title="Copy link"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSidebarMenu(!showSidebarMenu);
                      }}
                      title="Options"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Dropdown Menu (Popup) */}
                  {showSidebarMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowSidebarMenu(false); }} />
                      <div className="absolute right-2 top-8 bg-white border border-slate-200 rounded-lg shadow-xl py-1 w-44 z-50 text-left">
                        <button
                          className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSidebarMenu(false);
                            const link = `${window.location.origin}/f/book/${user?.id || user?.employeeId}`;
                            window.open(link, '_blank');
                          }}
                        >
                          Preview
                        </button>
                        <button
                          className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSidebarMenu(false);
                            setIsConfiguring(true);
                            setViewMode("week");
                          }}
                        >
                          Edit
                        </button>
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setShowSidebarMenu(false);
                            const isConfirmed = await confirm({
                              title: "Delete Booking Page",
                              message: "Are you sure you want to delete this booking page?",
                              confirmText: "Delete",
                              destructive: true,
                            });
                            if (isConfirmed) {
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`${API_URL}/api/appointments/config`, {
                                  method: "POST",
                                  headers: { 
                                    "Content-Type": "application/json",
                                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                                  },
                                  body: JSON.stringify({
                                    employeeId: user?.id || user?.employeeId || "",
                                    duration: 30,
                                    availability: { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
                                    active: false
                                  })
                                });
                                if (res.ok) {
                                  setAppConfig({ 
                                    ...appConfig, 
                                    active: false,
                                    availability: { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] } 
                                  });
                                  setShowDetailsCard(false);
                                  toast.success("Booking page deleted");
                                } else {
                                  const errText = await res.text();
                                  toast.error(`Failed to delete: ${res.status} ${errText}`);
                                }
                              } catch (err: any) {
                                console.error(err);
                                toast.error(`Error: ${err.message || err}`);
                              }
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
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
                        const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI;
                        const origin = typeof window !== 'undefined' ? window.location.origin : '';
                        const baseApi = API_URL.startsWith('http') ? API_URL : `${origin}${API_URL}`;
                        const authUrl = `${baseApi}/auth/google/url?employeeId=${user.id || user.employeeId}${isDesktop ? '&desktop=true' : ''}`;
                        if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
                          (window as any).electronAPI.openExternal(authUrl);
                        } else {
                          window.open(authUrl, '_blank');
                        }
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
        )}

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
                    {((isConfiguring) || (appConfig.active && !hideAvailabilityFromCalendar)) && (appConfig.availability[currentDate.format("dddd")] || []).flatMap((slot: any, idx: number) => {
                      const sMin = timeToMinutes(slot.start);
                      const eMin = timeToMinutes(slot.end);
                      const duration = Number(appConfig.duration) || 30;
                      const subSlots = [];
                      for (let current = sMin; current + duration <= eMin; current += duration) {
                        subSlots.push({ start: current, end: current + duration });
                      }
                      return subSlots.map((s, sIdx) => (
                        <div
                          key={`avail-day-grid-${idx}-${sIdx}`}
                          className="absolute left-[60px] right-2 bg-[#e8f0fe] border border-[#1a73e8] rounded-md pointer-events-none p-1.5 flex items-start overflow-hidden"
                          style={{
                            top: `${s.start + 2}px`,
                            height: `${duration - 4}px`,
                            zIndex: 5
                          }}
                        >
                          <div className="w-3.5 h-3.5 rounded bg-[#1a73e8] flex items-center justify-center text-white shrink-0">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z" />
                            </svg>
                          </div>
                        </div>
                      ));
                    })}
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

                          {/* Availability Highlights */}
                          {((isConfiguring) || (appConfig.active && !hideAvailabilityFromCalendar)) && (appConfig.availability[day.format("dddd")] || []).flatMap((slot: any, idx: number) => {
                            const sMin = timeToMinutes(slot.start);
                            const eMin = timeToMinutes(slot.end);
                            const duration = Number(appConfig.duration) || 30;
                            const subSlots = [];
                            for (let current = sMin; current + duration <= eMin; current += duration) {
                              subSlots.push({ start: current, end: current + duration });
                            }
                            return subSlots.map((s, sIdx) => (
                              <div
                                key={`avail-grid-${dateStr}-${idx}-${sIdx}`}
                                className="absolute left-1 right-1 bg-[#e8f0fe] border border-[#1a73e8] rounded-md pointer-events-none p-1 flex items-start overflow-hidden"
                                style={{
                                  top: `${s.start + 2}px`,
                                  height: `${duration - 4}px`,
                                  zIndex: 5
                                }}
                              >
                                <div className="w-3.5 h-3.5 rounded bg-[#1a73e8] flex items-center justify-center text-white shrink-0">
                                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z" />
                                  </svg>
                                </div>
                              </div>
                            ));
                          })}

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
      {/* Google Calendar Styled Booking Page Details Card Dialog */}
      <Dialog open={showDetailsCard} onOpenChange={setShowDetailsCard}>
        <DialogContent className="sm:max-w-[460px] p-0 border-none bg-white rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Top Actions Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              
              {/* Edit button */}
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
                onClick={() => {
                  setShowDetailsCard(false);
                  setIsConfiguring(true);
                  setViewMode("week");
                }}
                title="Edit booking page"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              {/* Delete button */}
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
                onClick={async () => {
                  const isConfirmed = await confirm({
                    title: "Delete Booking Page",
                    message: "Are you sure you want to delete this booking page?",
                    confirmText: "Delete",
                    destructive: true,
                  });
                  if (isConfirmed) {
                    try {
                      const token = localStorage.getItem('token');
                      const res = await fetch(`${API_URL}/api/appointments/config`, {
                        method: "POST",
                        headers: { 
                          "Content-Type": "application/json",
                          ...(token ? { "Authorization": `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({
                          employeeId: user?.id || user?.employeeId || "",
                          duration: 30,
                          availability: { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] },
                          active: false
                        })
                      });
                      if (res.ok) {
                        setAppConfig({ 
                          ...appConfig, 
                          active: false,
                          availability: { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] } 
                        });
                        setShowDetailsCard(false);
                        toast.success("Booking page deleted");
                      } else {
                        const errText = await res.text();
                        toast.error(`Failed to delete: ${res.status} ${errText}`);
                      }
                    } catch (err: any) {
                      console.error(err);
                      toast.error(`Error: ${err.message || err}`);
                    }
                  }
                }}
                title="Delete booking page"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* More options button (3-dots) */}
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors relative"
                onClick={() => setShowSidebarMenu(!showSidebarMenu)}
                title="Options"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

            </div>
            
            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
              onClick={() => setShowDetailsCard(false)}
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Details Body */}
          <div className="p-6 space-y-5 text-slate-700">
            
            {/* Title Section */}
            <div className="flex gap-4 items-start">
              <div className="w-3.5 h-3.5 rounded bg-blue-600 mt-2.5 shrink-0" />
              <div className="space-y-0.5">
                <DialogTitle className="text-xl font-medium text-slate-900 leading-tight">
                  {appConfig.title || "ABCD"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Booking page details
                </DialogDescription>
                <p className="text-xs text-slate-500 font-medium">
                  {appConfig.duration} min bookable appointments
                </p>
                <p className="text-xs text-slate-500">
                  Weekly on weekdays
                </p>
              </div>
            </div>

            {/* Booking Form Info */}
            <div className="flex gap-4 items-start">
              <div className="mt-1 shrink-0 text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide leading-tight">
                  Booking form
                </h4>
                <p className="text-xs text-slate-500">
                  First name · Surname · Email address
                </p>
              </div>
            </div>

            {/* Owner Info */}
            <div className="flex gap-4 items-start">
              <div className="mt-1 shrink-0 text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide leading-tight">
                  {user?.name || `${user?.firstName} ${user?.lastName}`}
                </h4>
                <p className="text-xs text-slate-500">
                  Busy times on this calendar are unavailable for booking
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
            <Button
              variant="outline"
              className="rounded-full px-5 py-2 h-9 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold gap-1.5 flex items-center"
              onClick={() => {
                const link = `${window.location.origin}/f/book/${user?.id || user?.employeeId}`;
                window.open(link, '_blank');
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Preview
            </Button>
            <Button
              className="rounded-full px-5 py-2 h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 flex items-center shadow-sm"
              onClick={() => {
                const link = `${window.location.origin}/f/book/${user?.id || user?.employeeId}`;
                navigator.clipboard.writeText(link);
                toast.success("Link copied!");
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Copy link
            </Button>
          </div>

        </DialogContent>
      </Dialog>
      {/* Custom Duration Dialog Modal */}
      <Dialog open={customDurationModalOpen} onOpenChange={setCustomDurationModalOpen}>
        <DialogContent className="sm:max-w-[320px] p-6 border-none bg-white rounded-2xl shadow-2xl">
          <DialogTitle className="text-lg font-medium text-slate-900">
            Custom duration
          </DialogTitle>
          <DialogDescription className="sr-only">
            Set custom duration for appointments
          </DialogDescription>
          
          <div className="flex items-center gap-3 py-4 justify-center">
            {/* Number Input */}
            <div className="relative flex items-center bg-slate-100 rounded-lg px-3 py-2 w-24">
              <input
                type="number"
                min="1"
                className="bg-transparent text-slate-800 text-sm font-semibold w-full outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={customDurationValue}
                onChange={(e) => setCustomDurationValue(parseInt(e.target.value) || 1)}
              />
              <div className="flex flex-col ml-1 shrink-0 text-slate-500">
                <button 
                  type="button" 
                  onClick={() => setCustomDurationValue(prev => prev + 1)}
                  className="hover:text-slate-800 transition-colors p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button 
                  type="button" 
                  onClick={() => setCustomDurationValue(prev => Math.max(1, prev - 1))}
                  className="hover:text-slate-800 transition-colors p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Unit Dropdown */}
            <Select 
              value={customDurationUnit} 
              onValueChange={(val: "minutes" | "hours") => setCustomDurationUnit(val)}
            >
              <SelectTrigger className="w-32 h-10 bg-slate-100 border-none text-slate-800 text-sm font-semibold rounded-lg focus:ring-0">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">minutes</SelectItem>
                <SelectItem value="hours">hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 transition-colors"
              onClick={() => setCustomDurationModalOpen(false)}
            >
              Cancel
            </button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full px-5 py-2 text-xs shadow-sm h-8"
              onClick={() => {
                const finalMins = customDurationUnit === "hours" ? customDurationValue * 60 : customDurationValue;
                setAppConfig({ ...appConfig, duration: finalMins });
                setCustomDurationModalOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
