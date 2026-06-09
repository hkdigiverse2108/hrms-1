"use client";
 
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Users, 
  Clock, 
  UserX, 
  GraduationCap, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  Gift, 
  ArrowUpRight,
  Briefcase,
  FileCheck,
  UserPlus,
  AlertCircle,
  Loader2,
  Coffee,
  Play,
  Sun,
  Moon,
  CloudSun,
  LogOut,
  LogIn,
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
  Cake,
  X,
  Pencil,
  Trash2,
  History as HistoryIcon
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useUserContext } from "@/context/UserContext";
import { API_URL, getAvatarUrl } from "@/lib/config";
import dayjs from "dayjs";
import { TablePagination } from "@/components/common/TablePagination";
import { formatTime12h } from "@/lib/utils";
import { RequestPunchOutDialog } from "@/components/dashboard/RequestPunchOutDialog";
import { AddEventDialog } from "@/components/dashboard/AddEventDialog";
import { ViewAllEventsDialog } from "@/components/dashboard/ViewAllEventsDialog";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";
 
const formatToHhMm = (totalMinutes: number) => {
  const { confirm } = useConfirm();
  if (!totalMinutes || totalMinutes <= 0) return "0h 0m";
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

export default function DashboardPage() {
  const { user, isLoading, getISTNow, isTimeSynced } = useUserContext();
  const [attendanceStatus, setAttendanceStatus] = useState<{isPunchedIn: boolean, record: any} | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [isPunching, setIsPunching] = useState(false);
  const [workTime, setWorkTime] = useState("00:00:00");
  const [totalBreakTime, setTotalBreakTime] = useState("0h 0m");
  const [currentTime, setCurrentTime] = useState(getISTNow());
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [interns, setInterns] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  
  const punchCardRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    if (user?.id) {
      fetchStatus();
      fetchHistory();
      if (user.role === "Admin" || user.role === "HR") {
        fetchLeaveRequests();
        fetchEmployees();
        fetchInterns();
        fetchAllAttendance();
        fetchApplications();
        fetchAssets();
      }
    }
  }, [user?.id]);

  const fetchLeaveRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/leaves`);
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data);
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchInterns = async () => {
    try {
      const res = await fetch(`${API_URL}/interns`);
      if (res.ok) {
        const data = await res.json();
        setInterns(data);
      }
    } catch (err) {
      console.error("Error fetching interns:", err);
    }
  };

  const fetchAllAttendance = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance`);
      if (res.ok) {
        const data = await res.json();
        setAllAttendance(data);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_URL}/applications`);
      if (res.ok) setApplications(await res.json());
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch(`${API_URL}/assets`);
      if (res.ok) setAssets(await res.json());
    } catch (err) {
      console.error("Error fetching assets:", err);
    }
  };

 
  useEffect(() => {
    // Update immediately when getISTNow changes (e.g. after sync)
    setCurrentTime(getISTNow());
    
    const timer = setInterval(() => {
      // Show time in IST regardless of device time using synchronized offset
      setCurrentTime(getISTNow());
    }, 1000);
    return () => clearInterval(timer);
  }, [getISTNow]);
 
  useEffect(() => {
    let interval: any;
    if (attendanceStatus?.isPunchedIn && attendanceStatus.record?.checkIn) {
      const parseTimeToDate = (timeStr: string, baseDate: Date) => {
        const d = new Date(baseDate.getTime());
        const cleaned = timeStr.trim();
        let hours = 0, minutes = 0, seconds = 0;
        const ampmMatch = cleaned.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM)/i);
        if (ampmMatch) {
          hours = parseInt(ampmMatch[1]);
          minutes = parseInt(ampmMatch[2]);
          seconds = ampmMatch[3] ? parseInt(ampmMatch[3]) : 0;
          const ampm = ampmMatch[4].toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
        } else {
          const parts = cleaned.split(':');
          hours = parts[0] ? parseInt(parts[0]) : 0;
          minutes = parts[1] ? parseInt(parts[1]) : 0;
          seconds = parts[2] ? parseInt(parts[2]) : 0;
        }
        d.setHours(hours, minutes, seconds, 0);
        return d;
      };

      const runTimer = () => {
        const istNow = getISTNow();
        const lastPunchInStr = attendanceStatus.record.lastPunchIn || attendanceStatus.record.checkIn;
        if (!lastPunchInStr) return;

        const normalizeDate = (d: Date) => {
          if (d.getTime() > istNow.getTime() + 60000) {
            d.setDate(d.getDate() - 1);
          }
          return d;
        };

        const lastPunchInDate = normalizeDate(parseTimeToDate(lastPunchInStr, istNow));
        const accumulated = (attendanceStatus.record.accumulatedWorkSeconds || 0);
        let total = accumulated;
        let breakSeconds = 0;
        
        (attendanceStatus.record.breaks || []).forEach((b: any) => {
          if (b.startTime && b.endTime) {
            const bStartDate = normalizeDate(parseTimeToDate(b.startTime, istNow));
            const bEndDate = normalizeDate(parseTimeToDate(b.endTime, istNow));
            if (bEndDate.getTime() < bStartDate.getTime()) {
              bEndDate.setDate(bEndDate.getDate() + 1);
            }
            if (bStartDate.getTime() >= lastPunchInDate.getTime()) {
              breakSeconds += Math.floor((bEndDate.getTime() - bStartDate.getTime()) / 1000);
            }
          }
        });

        if (attendanceStatus.record.status === "On Break") {
          const activeBreak = (attendanceStatus.record.breaks || []).find((b: any) => !b.endTime);
          if (activeBreak && activeBreak.startTime) {
            const breakStartDate = normalizeDate(parseTimeToDate(activeBreak.startTime, istNow));
            if (breakStartDate.getTime() >= lastPunchInDate.getTime()) {
              const sessionSeconds = Math.floor((breakStartDate.getTime() - lastPunchInDate.getTime()) / 1000);
              total = accumulated + Math.max(0, sessionSeconds - breakSeconds);
            } else {
              total = accumulated;
            }
          } else {
            total = accumulated;
          }
        } else {
          const currentSessionSeconds = Math.floor((istNow.getTime() - lastPunchInDate.getTime()) / 1000);
          total = accumulated + Math.max(0, currentSessionSeconds - breakSeconds);
        }

        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = Math.floor(total % 60);
        setWorkTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      };

      // Run once immediately so there is no 1-second delay
      runTimer();
      interval = setInterval(runTimer, 1000);
    } else {
      if (recentAttendance && recentAttendance.length > 0) {
        const lastRecord = recentAttendance[0];
        const isToday = lastRecord.date === dayjs(getISTNow()).format('YYYY-MM-DD');
        if (isToday) {
          if (lastRecord.accumulatedWorkSeconds !== undefined && lastRecord.accumulatedWorkSeconds !== null) {
            const total = lastRecord.accumulatedWorkSeconds;
            const h = Math.floor(total / 3600);
            const m = Math.floor((total % 3600) / 60);
            const s = Math.floor(total % 60);
            setWorkTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          } else if (lastRecord.workHours && typeof lastRecord.workHours === 'string') {
             const match = lastRecord.workHours.match(/(\d+)\s*h\s*(\d+)\s*m/i);
             if (match) {
               setWorkTime(`${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}:00`);
             } else {
               setWorkTime("00:00:00");
             }
          } else {
            setWorkTime("00:00:00");
          }
        } else {
          setWorkTime("00:00:00");
        }
      } else {
        setWorkTime("00:00:00");
      }
    }
      if (attendanceStatus?.record?.breaks) {
        const totalMinutes = attendanceStatus.record.breaks.reduce((acc: number, b: any) => {
          if (b.duration) return acc + parseInt(b.duration);
          return acc;
        }, 0);
        const bh = Math.floor(totalMinutes / 60);
        const bm = totalMinutes % 60;
        setTotalBreakTime(`${bh}h ${bm}m`);
      }

      return () => {
        if (interval) clearInterval(interval);
      };
    }, [attendanceStatus, getISTNow, recentAttendance]);

  const [allTimeHours, setAllTimeHours] = useState("0h 0m");

  useEffect(() => {
    if (recentAttendance.length > 0) {
      let totalMinutes = 0;
      recentAttendance.forEach((record: any) => {
        if (record.checkIn && record.checkOut) {
          const start = dayjs(`${record.date} ${record.checkIn}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm']);
          const end = dayjs(`${record.date} ${record.checkOut}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm']);
          
          if (start.isValid() && end.isValid()) {
            totalMinutes += end.diff(start, 'minute');
            (record.breaks || []).forEach((b: any) => {
              if (b.duration) totalMinutes -= parseInt(b.duration);
            });
          }
        }
      });
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      setAllTimeHours(`${h}h ${m}m`);
    }
  }, [recentAttendance]);
 
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/status/${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        // If data has checkIn and no checkOut, it's an active punch-in
        if (data && data.checkIn && data.checkIn !== "--" && data.checkIn !== "--:--" && data.checkOut === null) {
          setAttendanceStatus({ isPunchedIn: true, record: data });
        } else {
          setAttendanceStatus({ isPunchedIn: false, record: data });
        }
      }
    } catch (err) {
      console.error("Error fetching status:", err);
    }
  };
 
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance`);
      if (res.ok) {
        const data = await res.json();
        const myHistory = data
          .filter((a: any) => a.employeeId === user?.id)
          .sort((a: any, b: any) => {
            if (a.date !== b.date) {
              return b.date.localeCompare(a.date);
            }
            const parseTime = (timeStr: string) => {
              if (!timeStr || timeStr === "--" || timeStr === "--:--") return 0;
              const parsed = dayjs(`2000-01-01 ${timeStr}`, [
                'YYYY-MM-DD hh:mm A',
                'YYYY-MM-DD HH:mm:ss',
                'YYYY-MM-DD HH:mm',
                'YYYY-MM-DD h:mm A'
              ]);
              return parsed.isValid() ? parsed.valueOf() : 0;
            };
            return parseTime(b.checkIn) - parseTime(a.checkIn);
          })
          .slice(0, 5);
        setRecentAttendance(myHistory);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };
 
  const handlePunch = async (type: 'punch-in' | 'punch-out' | 'break-in' | 'break-out') => {
    setIsPunching(true);
    try {
      const res = await fetch(`${API_URL}/attendance/${type}/${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (res.ok) {
        await fetchStatus();
        await fetchHistory();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(`Action failed: ${errorData.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error("Punch error:", err);
      toast.error("Failed to connect to the server. Please ensure the backend is running.");
    } finally {
      setIsPunching(false);
    }
  };
 
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-brand-teal animate-spin" />
        <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
      </div>
    );
  }
 
  const userRole = user?.role?.toLowerCase() || "employee";
  const isAdmin = userRole === "admin";
  const isHR = userRole === "hr";
  const isEmployee = userRole === "employee";
 
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Here's what's happening in your organization today."
      >
        {(!isAdmin) && (
          <Button 
            onClick={() => setIsRequestDialogOpen(true)}
            className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-9 px-4 rounded-lg shadow-sm flex items-center gap-2"
          >
             <Plus className="w-4 h-4" />
             Request Punch Out
          </Button>
        )}
      </PageHeader>
 
      {isAdmin && <AdminView user={user} leaves={leaveRequests} employees={employees} interns={interns} allAttendance={allAttendance} getISTNow={getISTNow} />}

      {isHR && <HRView user={user} leaves={leaveRequests} applications={applications} assets={assets} />}

      {(!isAdmin) && (
        <EmployeeView 
          user={user} 
          attendanceStatus={attendanceStatus} 
          handlePunch={handlePunch} 
          isPunching={isPunching}
          workTime={workTime}
          totalBreakTime={totalBreakTime}
          allTimeHours={allTimeHours}
          recentAttendance={recentAttendance}
          currentTime={currentTime}
          isTimeSynced={isTimeSynced}
          getISTNow={getISTNow}
          punchCardRef={punchCardRef}
        />
      )}
 
      <RequestPunchOutDialog 
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        isPunchedIn={attendanceStatus?.isPunchedIn || false}
        punchInTime={formatTime12h(attendanceStatus?.record?.checkIn) || "Not Started"}
        employeeId={user?.id || ""}
        employeeName={user?.name || ""}
        onGoToPunchOut={() => {
          setIsRequestDialogOpen(false);
          punchCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />
    </div>
  );
}
 
function AdminView({ user, leaves, employees, interns, allAttendance, getISTNow }: { user: any, leaves: any[], employees: any[], interns: any[], allAttendance: any[], getISTNow: () => Date }) {

  // Exclude admin employees from attendance-related calculations
  const nonAdminEmployees = employees?.filter(e => e.role?.toLowerCase() !== 'admin') || [];

  const todayStr = dayjs(getISTNow()).format('YYYY-MM-DD');
  const todayAttendance = allAttendance?.filter(a => a.date === todayStr) || [];
  
  const last7Days = Array.from({length: 7}).map((_, i) => dayjs(getISTNow()).subtract(6 - i, 'day').format('YYYY-MM-DD'));
  const chartData = last7Days.map(date => {
    const dayAttendance = allAttendance?.filter(a => a.date === date) || [];
    const present = dayAttendance.length;
    // Approximating absent as total non-admin employees minus present
    const totalEmps = nonAdminEmployees.length;
    const absent = Math.max(0, totalEmps - present);
    return {
      date: dayjs(date).format('MMM DD'),
      Present: present,
      Absent: absent,
    };
  });

  const totalEmployeesCount = nonAdminEmployees.length;
  const todayAttendanceCount = todayAttendance?.length || 0;
  const onTimeCount = todayAttendance?.filter(a => !a.isLate)?.length || 0;
  const lateCount = todayAttendance?.filter(a => a.isLate)?.length || 0;
  const absentTodayCount = Math.max(0, totalEmployeesCount - todayAttendanceCount);
  
  const onTimeRate = todayAttendanceCount > 0 ? Math.round((onTimeCount / todayAttendanceCount) * 100) : 0;
  const absenceRate = totalEmployeesCount > 0 ? Math.round((absentTodayCount / totalEmployeesCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total Employees" 
          value={totalEmployeesCount.toString()} 
          trend={`+${employees?.filter(e => dayjs(e.joinDate).isAfter(dayjs().subtract(1, 'month'))).length || 0}`} 
          trendLabel="new this month" 
          icon={<Users className="w-5 h-5 text-muted-foreground" />} 
        />
        <StatCard 
          title="On Time Today" 
          value={onTimeCount.toString()} 
          trend={`${onTimeRate}%`} 
          trendLabel="punctuality rate" 
          icon={<Clock className="w-5 h-5 text-muted-foreground" />} 
          trendUp={onTimeRate >= 80}
        />
        <StatCard 
          title="Late Today" 
          value={lateCount.toString()} 
          trend="Punctuality" 
          trendLabel="late arrivals" 
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />} 
          trendUp={lateCount === 0} 
          color="orange" 
        />
        <StatCard 
          title="Absent Today" 
          value={absentTodayCount.toString()} 
          trend={`${absenceRate}%`} 
          trendLabel="absence rate" 
          icon={<UserX className="w-5 h-5 text-muted-foreground" />} 
          trendUp={absenceRate < 15} 
        />
        <StatCard 
          title="Total Interns" 
          value={(interns?.length || 0).toString()} 
          trend={`+${interns?.filter(i => dayjs(i.joinDate).isAfter(dayjs().subtract(1, 'month'))).length || 0}`} 
          trendLabel="new this month" 
          icon={<GraduationCap className="w-5 h-5 text-muted-foreground" />} 
        />
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex justify-between items-center border-b border-border">
              <h3 className="font-bold text-lg">Organization Attendance</h3>
              <Link href="/attendance">
                <Button variant="outline" size="sm" className="text-brand-teal border-brand-teal/30 hover:bg-brand-teal hover:text-white hover:border-brand-teal transition-all font-bold rounded-lg h-8 text-[12px] px-3.5">View All</Button>
              </Link>
            </div>
            <div className="p-6 h-[300px] flex items-center justify-center text-muted-foreground w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} dx={-10} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    cursor={{ fill: '#f3f4f6' }} 
                  />
                  <Legend 
                    iconType="circle" 
                    wrapperStyle={{ paddingTop: '20px' }} 
                    formatter={(value, entry: any) => (
                      <span style={{ color: entry.color, fontWeight: 'bold', fontSize: '13px' }}>{value}</span>
                    )}
                  />
                  <Bar dataKey="Present" fill="#09A08A" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="Absent" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <DepartmentDistribution />
        </div>
        <div className="lg:col-span-1">
          <EventsSidebar user={user} />
        </div>
      </div>
    </div>
  );
}
 
function HRView({ user, leaves, applications, assets }: { user: any, leaves: any[], applications: any[], assets: any[] }) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredLeaves = activeFilter 
    ? leaves.filter(l => l.status === activeFilter) 
    : leaves;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => setActiveFilter(activeFilter === 'Pending' ? null : 'Pending')} className="cursor-pointer">
          <StatCard 
            title="Pending Leaves" 
            value={leaves.filter(l => l.status === 'Pending').length.toString().padStart(2, '0')} 
            trend="Action Required" 
            trendLabel="awaiting approval" 
            icon={<CalendarIcon className={`w-5 h-5 ${activeFilter === 'Pending' ? 'text-brand-teal' : 'text-muted-foreground'}`} />} 
            color={activeFilter === 'Pending' ? 'brand' : undefined}
          />
        </div>

        <Link href="/recruitment/hiring-board">
          <StatCard title="New Applications" value={(applications?.length || 0).toString().padStart(2, '0')} trend="+5" trendLabel="this week" icon={<FileCheck className="w-5 h-5 text-muted-foreground" />} trendUp/>
        </Link>
        <div onClick={() => setActiveFilter(activeFilter === 'Approved' ? null : 'Approved')} className="cursor-pointer">
          <StatCard 
            title="Approved Leaves" 
            value={leaves.filter(l => l.status === 'Approved').length.toString().padStart(2, '0')} 
            trend="Past & Future" 
            trendLabel="approved requests" 
            icon={<CheckCircle2 className={`w-5 h-5 ${activeFilter === 'Approved' ? 'text-brand-teal' : 'text-muted-foreground'}`} />} 
            color={activeFilter === 'Approved' ? 'brand' : undefined}
          />
        </div>
        <StatCard title="Asset Requests" value={(assets?.filter(a => a.status === 'Requested' || a.status === 'Pending')?.length || 0).toString().padStart(2, '0')} trend="Pending" trendLabel="laptop & equipment" icon={<AlertCircle className="w-5 h-5 text-muted-foreground" />} trendUp={false} />
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-xl shadow-sm">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg text-[#111827]">Recent Leave Requests</h3>
                {activeFilter && (
                  <Badge variant="outline" className="bg-brand-light text-brand-teal border-brand-teal/20 px-2 py-0">
                    {activeFilter}
                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setActiveFilter(null)} />
                  </Badge>
                )}
              </div>
              <Link href="/leave">
                <Button variant="ghost" size="sm" className="text-brand-teal">View All</Button>
              </Link>
            </div>
            <div className="p-0">
              {filteredLeaves.length > 0 ? filteredLeaves.slice(0, 5).map((leave, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b last:border-0 border-border hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-brand-light text-brand-teal font-bold">{leave.employee_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold">{leave.employee_name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{leave.type} • {leave.duration}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    leave.status === 'Approved' ? 'bg-green-50 text-green-600' : 
                    leave.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {leave.status}
                  </span>
                </div>
              )) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No {activeFilter ? activeFilter.toLowerCase() : ''} leave requests found</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[#111827]">Upcoming Interviews</h3>
              <Link href="/recruitment/hiring-board">
                <Button variant="ghost" size="sm" className="text-brand-teal">Hiring Board</Button>
              </Link>
            </div>
            <div className="space-y-4">
              {applications && applications.length > 0 ? (
                applications.slice(0, 3).map((app, i) => (
                  <div key={i} className="flex gap-4 p-3 rounded-lg border border-border hover:border-brand-teal/30 transition-colors">
                    <div className="bg-brand-light p-2 rounded-md h-fit"><Clock className="w-4 h-4 text-brand-teal" /></div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{app.candidate_name || app.name}</h4>
                      <p className="text-xs text-muted-foreground">{app.applied_for || app.role}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-brand-teal">{app.status || 'Applied'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No upcoming interviews or recent applications</div>
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <EventsSidebar user={user} />
        </div>
      </div>
    </div>
  );
}
 
function EmployeeView({ 
  user, 
  attendanceStatus, 
  handlePunch, 
  isPunching, 
  workTime,
  totalBreakTime,
  allTimeHours,
  recentAttendance,
  currentTime,
  isTimeSynced,
  getISTNow,
  punchCardRef
}: { 
  user: any, 
  attendanceStatus: any, 
  handlePunch: (type: any) => void, 
  isPunching: boolean,
  workTime: string,
  totalBreakTime: string,
  allTimeHours: string,
  recentAttendance: any[],
  currentTime: Date,
  isTimeSynced: boolean,
  getISTNow: () => Date,
  punchCardRef: React.RefObject<HTMLDivElement | null>
}) {
  const userName = user?.name || "Guest";
  const firstName = user?.firstName || userName.split(' ')[0];
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  const isPunchedIn = attendanceStatus?.isPunchedIn;
  const isOnBreak = attendanceStatus?.record?.status === "On Break";
  const punchInTimeRaw = attendanceStatus?.record?.checkIn || (recentAttendance[0]?.checkIn || "Not Started");
  const punchOutTimeRaw = attendanceStatus?.record?.checkOut || (recentAttendance[0]?.checkOut || "Active");
  const punchInTime = formatTime12h(punchInTimeRaw);
  const punchOutTime = formatTime12h(punchOutTimeRaw);

  const getFormattedWorkedTime = () => {
    if (!workTime || workTime === "00:00:00") return "Not Started";
    const parts = workTime.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return `${h}h ${m}m`;
    }
    return "Not Started";
  };
 
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div ref={punchCardRef} className="bg-white border border-border rounded-2xl p-8 shadow-sm scroll-mt-20 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-light/50 border border-brand-teal/20 rounded-full w-fit">
                   {getISTNow().getHours() < 12 ? (
                     <Sun className="w-4 h-4 text-brand-teal" />
                   ) : getISTNow().getHours() < 17 ? (
                     <CloudSun className="w-4 h-4 text-brand-teal" />
                   ) : (
                     <Moon className="w-4 h-4 text-brand-teal" />
                   )}
                   <span className="text-[11px] font-bold text-brand-teal">
                     {getISTNow().getHours() < 12 ? "Good morning" : getISTNow().getHours() < 17 ? "Good afternoon" : "Good evening"}, {firstName}
                   </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-border shadow-sm">
                      <AvatarImage src={getAvatarUrl(user?.profilePhoto, userName)} />
                      <AvatarFallback className="bg-brand-light text-brand-teal font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${isPunchedIn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-[#111827] leading-tight">{userName}</h3>
                    <p className="text-sm text-gray-500 font-medium">{user?.designation || user?.role || 'Employee'}</p>
                  </div>
                </div>
              </div>
               <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-4 min-w-[220px] flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Current Time</span>
                   </div>
                   <div className="text-2xl font-black text-[#111827] font-mono tracking-tight">
                     {!isTimeSynced ? (
                       <span className="text-brand-teal/20 animate-pulse">--:-- --</span>
                     ) : (
                       getISTNow().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                     )}
                   </div>
                   <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                     {!isTimeSynced ? (
                       <span className="text-brand-teal/20 animate-pulse italic">Synchronizing IST...</span>
                     ) : (
                       dayjs(getISTNow()).format('dddd, MMMM D, YYYY')
                     )}
                   </div>
                </div>
              </div>
            </div>
 
            <div className="bg-[#EAF7F6]/40 rounded-2xl p-10 mb-8 text-center border border-brand-teal/10">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest block mb-1">
                Live working time {isPunchedIn && !isOnBreak && <span className="ml-2 bg-brand-light text-brand-teal text-[10px] font-black px-2 py-0.5 rounded-md">Live</span>}
              </span>
              <div className="text-5xl font-black text-[#111827] tracking-tighter mb-2 min-h-[48px] flex items-center justify-center">
                {workTime}
              </div>
              <div className="text-sm text-gray-500 font-medium min-h-[20px] flex items-center justify-center gap-2">
                {isPunchedIn ? (
                  isOnBreak ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      On Break
                    </span>
                  ) : (
                    <span className="text-brand-teal font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse"></span>
                      Live Tracking Active
                    </span>
                  )
                ) : (
                  <span className="text-gray-400 font-bold">Not Started</span>
                )}
              </div>
            </div>
 
            <div className={`px-4 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 mb-8 border ${isPunchedIn ? 'border-brand-teal/10 bg-[#EAF7F6] text-brand-teal' : 'border-red-100 bg-red-50 text-red-600'}`}>
               {isPunchedIn ? <CheckCircle2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
               {isPunchedIn ? `Punched in at ${punchInTime}` : `Punched out at ${formatTime12h(recentAttendance[0]?.checkOut) || 'Not Punched In'}`}
            </div>
 
            <div className="flex items-center gap-4 mb-8">
              <Button 
                onClick={() => handlePunch(isOnBreak ? 'break-out' : 'break-in')} 
                disabled={isPunching || !isPunchedIn}
                variant="outline"
                className={`flex-1 py-7 text-base font-bold shadow-sm transition-all border-[#F3F4F6] rounded-xl bg-white hover:bg-gray-50 text-[#111827]`}
              >
                {isPunching ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><Coffee className="w-5 h-5 mr-3" /> {isOnBreak ? 'Break Out' : 'Take Break'}</>
                )}
              </Button>
              
              <Button 
                onClick={() => handlePunch(isPunchedIn ? 'punch-out' : 'punch-in')} 
                disabled={isPunching || isOnBreak}
                className={`flex-1 py-7 text-base font-bold shadow-sm transition-all rounded-xl border border-red-100 ${isPunchedIn ? 'bg-[#FEF2F2] hover:bg-red-100 text-red-600' : 'bg-brand-light hover:bg-brand-teal/10 text-brand-teal border-brand-teal/20'}`}
              >
                {isPunching ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  isPunchedIn ? <><LogOut className="w-5 h-5 mr-3" /> Punch Out</> : <><LogIn className="w-5 h-5 mr-3" /> Punch In</>
                )}
              </Button>
            </div>
 
            <div className="grid grid-cols-4 gap-0 border border-brand-teal/10 rounded-xl overflow-hidden bg-white">
               {[
                 { label: 'First In', value: punchInTime, highlight: false },
                 { label: 'Last Out', value: punchOutTime, highlight: punchOutTime === "Active" },
                 { label: 'Break In Time', value: totalBreakTime, highlight: false },
                 { label: 'Worked Time', value: isPunchedIn ? "Active" : (workTime !== "00:00:00" ? getFormattedWorkedTime() : "Not Started"), highlight: isPunchedIn },
               ].map((item, idx) => (
                 <div key={idx} className={`p-4 ${idx < 3 ? 'border-r border-brand-teal/10' : ''} bg-[#EAF7F6]/10`}>
                   <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">{item.label}</div>
                   <div className={`text-sm font-black ${item.highlight ? 'text-brand-teal' : 'text-[#111827]'}`}>{item.value}</div>
                 </div>
               ))}
            </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="Today's Hours" 
                value={isPunchedIn ? workTime.split(':').slice(0, 2).join('h ') + 'm' : (workTime !== "00:00:00" ? getFormattedWorkedTime() : '0h 0m')} 
                trend="12%" 
                trendLabel="vs yesterday" 
                icon={<Clock className="w-5 h-5 text-brand-teal" />} 
                trendUp 
                color="brand"
              />
             <StatCard 
               title="All Time Hours" 
               value={allTimeHours} 
               trend="Active" 
               trendLabel="Since joining the company" 
               icon={<HistoryIcon className="w-5 h-5 text-blue-500" />} 
               trendUp={false}
               color="blue"
               hideTrend
             />
             <StatCard 
               title="Break Time (Today)" 
               value={totalBreakTime} 
               trend="Allowed" 
               trendLabel="60m daily" 
               icon={<Coffee className="w-5 h-5 text-orange-500" />} 
               trendUp={false}
               color="orange"
               hideTrend
             />
          </div>
        </div>
 
        <div className="lg:col-span-1">
          <EventsSidebar user={user} />
        </div>
      </div>
 
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 flex justify-between items-center">
          <h3 className="font-bold text-lg text-foreground">Recent Attendance</h3>
        </div>
        <div className="overflow-x-auto pb-6">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-muted-foreground font-bold bg-gray-50/50 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Punch In</th>
                <th className="px-6 py-4">Punch Out</th>
                <th className="px-6 py-4">Break</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentAttendance.length > 0 ? recentAttendance.map((record, i) => {
                const isToday = record.date === dayjs().format("YYYY-MM-DD");
                const dateDisplay = isToday ? `Today, ${dayjs(record.date).format("MMM DD")}` : dayjs(record.date).format("ddd, MMM DD");
                const totalBreak = (record.breaks || []).reduce((acc: number, b: any) => acc + (parseInt(b.duration) || 0), 0);
                const breakStr = `${Math.floor(totalBreak / 60)}h ${totalBreak % 60}m`;
 
                return (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{dateDisplay}</td>
                    <td className="px-6 py-4 text-foreground font-medium">{formatTime12h(record.checkIn)}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{formatTime12h(record.checkOut) || '--'}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{breakStr}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{formatWorkHours(record.workHours)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-3 py-1 text-[11px] font-bold rounded-full border ${
                        record.status === 'Active' || record.status === 'On Break' 
                        ? 'bg-brand-light text-brand-teal border-brand-teal/10' 
                        : record.status === 'Leave'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : record.status === 'Absent'
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : record.isLate ? 'bg-amber-50 text-amber-600 border-amber-100' 
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {record.status === 'Active' || record.status === 'On Break' 
                          ? 'Active' 
                          : record.status === 'Leave'
                          ? 'Leave'
                          : record.status === 'Absent'
                          ? 'Absent'
                          : record.isLate 
                          ? 'Late Entry' 
                          : 'Logged'}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
 
function EventsSidebar({ user }: { user: any }) {
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const canAddEvents = user?.role === "Admin" || user?.role === "HR";
  const { confirm } = useConfirm();
 
  useEffect(() => {
    fetchEvents();
  }, []);
 
  const fetchEvents = async () => {
    try {
      const [resEvents, resEmp] = await Promise.all([
        fetch(`${API_URL}/events`),
        fetch(`${API_URL}/employees`)
      ]);
      
      let eventsData = [];
      if (resEvents.ok) {
        eventsData = await resEvents.json();
      }
      
      let empData = [];
      if (resEmp.ok) {
        empData = await resEmp.json();
      }

      const birthdayEvents = empData.filter((emp: any) => emp.dob).map((emp: any) => {
        return {
          id: `birthday-${emp.id}`,
          type: 'birthday',
          title: `${emp.firstName || emp.name?.split(' ')[0] || 'Employee'}'s Birthday`,
          description: 'Happy Birthday!!',
          date: emp.dob,
          originalDob: emp.dob
        };
      });

      const allCombined = [...eventsData, ...birthdayEvents];
      setEvents(allCombined.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };
  
  const handleAddEvent = async (newEvent: any) => {
    try {
      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (err) {
      console.error("Error adding event:", err);
    }
  };
 
  const handleDeleteEvent = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this event?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (isConfirmed) {
      try {
        const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchEvents();
        }
      } catch (err) {
        console.error("Error deleting event:", err);
      }
    }
  };
 
  const handleEditClick = (event: any) => {
    setEditingEvent(event);
    setIsAddEventOpen(true);
  };
 
  const handleUpdateEvent = async (updatedEvent: any) => {
    try {
      const res = await fetch(`${API_URL}/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent)
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (err) {
      console.error("Error updating event:", err);
    }
    setEditingEvent(null);
  };
 
  const displayedEvents = events
    .filter((e: any) => {
      const eventDate = dayjs(e.date);
      const isCurrentMonthView = currentMonth.isSame(dayjs(), 'month');
      
      if (selectedDate) {
        if (e.type === 'birthday') {
          return eventDate.month() === dayjs(selectedDate).month() && eventDate.date() === dayjs(selectedDate).date();
        }
        return eventDate.format('YYYY-MM-DD') === selectedDate;
      }

      // If viewing current month, hide past events
      if (isCurrentMonthView && eventDate.isBefore(dayjs().startOf('day'))) {
        if (e.type !== 'birthday') return false;
        // For birthdays, check if the day itself has passed in the current year
        const birthdayThisYear = dayjs(e.date).year(dayjs().year());
        if (birthdayThisYear.isBefore(dayjs().startOf('day'))) return false;
      }

      if (e.type === 'birthday') {
        return eventDate.month() === currentMonth.month();
      }
      return eventDate.month() === currentMonth.month() && eventDate.year() === currentMonth.year();
    })
    .map((e: any) => {
      if (e.type === 'birthday') {
        return { ...e, date: dayjs(e.date).year(currentMonth.year()).format('YYYY-MM-DD') };
      }
      return e;
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white border border-border rounded-2xl p-6 shadow-sm h-fit">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-bold text-lg text-[#111827]">View Events</h3>
        <Button onClick={() => setIsViewAllOpen(true)} variant="outline" size="sm" className="h-8 text-[11px] font-bold border-gray-200 px-3 rounded-lg text-gray-600">View all</Button>
      </div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[13px] text-gray-500 font-medium">This month events</p>
        {selectedDate && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-brand-teal" onClick={() => setSelectedDate(null)}>
            Clear Filter <X className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
 
      <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-6">
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 bg-white border border-gray-100 shadow-sm rounded-lg"
             onClick={() => {
               setCurrentMonth(currentMonth.subtract(1, 'month'));
               setSelectedDate(null);
             }}
           >
             <ChevronLeft className="w-4 h-4 text-gray-400" />
           </Button>
           <span className="text-[13px] font-bold text-[#111827]">{currentMonth.format("MMMM YYYY")}</span>
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 bg-white border border-gray-100 shadow-sm rounded-lg"
             onClick={() => {
               setCurrentMonth(currentMonth.add(1, 'month'));
               setSelectedDate(null);
             }}
           >
             <ChevronRight className="w-4 h-4 text-gray-400" />
           </Button>
        </div>
        
        <div className="grid grid-cols-7 text-center mb-4">
           {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`${d}-${i}`} className="text-[10px] font-bold text-gray-400 uppercase">{d}</span>)}
        </div>
        
        <div className="grid grid-cols-7 gap-y-1">
           {(() => {
             const daysInMonth = currentMonth.daysInMonth();
             const firstDayOfMonth = currentMonth.startOf('month').day();
             const days = [];
             
             for (let i = 0; i < firstDayOfMonth; i++) {
               days.push(<div key={`empty-${i}`} className="h-8"></div>);
             }
             
             for (let i = 1; i <= daysInMonth; i++) {
               const dayDate = currentMonth.date(i);
               const dateStr = dayDate.format('YYYY-MM-DD');
               const isToday = dateStr === dayjs().format('YYYY-MM-DD');
               const isSelected = selectedDate === dateStr;
               const hasEvent = events.some(e => {
                 if (e.type === 'birthday') {
                   return dayjs(e.date).month() === dayDate.month() && dayjs(e.date).date() === dayDate.date();
                 }
                 return dayjs(e.date).format('YYYY-MM-DD') === dateStr;
               });
               
               days.push(
                 <div 
                   key={i} 
                   onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                   className={`h-8 flex items-center justify-center text-[13px] font-bold rounded-lg cursor-pointer transition-all ${
                   isSelected ? 'bg-brand-teal text-white shadow-md' :
                   isToday ? 'bg-brand-light text-brand-teal border border-brand-teal shadow-sm' : 
                   hasEvent ? 'text-brand-teal bg-white border border-brand-teal/20 shadow-sm hover:border-brand-teal/50' : 'text-gray-400 hover:bg-white hover:text-gray-700'
                 }`}>
                   {i}
                 </div>
               );
             }
             return days;
           })()}
        </div>
 
        {canAddEvents && (
          <Button 
            onClick={() => {
              setEditingEvent(null);
              setIsAddEventOpen(true);
            }}
            className="w-full mt-8 bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-11 rounded-xl shadow-sm"
          >
            Add New Event
          </Button>
        )}
      </div>
 
      <div className="space-y-4">
         {displayedEvents.length > 0 ? displayedEvents.map((event, i) => (
           <div key={event.id || i} className="group p-4 rounded-xl bg-white border border-gray-100 hover:border-brand-teal/20 transition-all shadow-sm flex items-center gap-4">
             <div className={`${
               event.type === 'meeting' ? 'bg-[#F0FDF4] text-green-600' : 
               event.type === 'discussion' ? 'bg-[#EFF6FF] text-blue-600' : 
               'bg-[#FFF7ED] text-orange-600'
             } p-3 rounded-xl`}>
               {event.type === 'meeting' ? <CalendarIcon className="w-5 h-5" /> : 
                event.type === 'discussion' ? <MessageSquare className="w-5 h-5" /> : 
                event.type === 'birthday' ? <Cake className="w-5 h-5" /> : 
                <CalendarIcon className="w-5 h-5" />}
             </div>
             <div className="flex-1 min-w-0">
               <h4 className="font-bold text-[14px] text-[#111827] truncate">{event.title}</h4>
               <p className="text-[12px] text-gray-500 font-medium truncate">{event.description}</p>
             </div>
             <div className="text-right">
               <div className="text-[13px] font-bold text-[#111827]">{dayjs(event.date).format("DD MMM")}</div>
               {event.type !== 'birthday' && (
                 <div className="text-[11px] text-gray-400 font-medium">{event.time}</div>
               )}
               
               {canAddEvents && event.type !== 'birthday' && (
                 <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditClick(event)}
                      className="p-1 text-brand-teal hover:bg-brand-light rounded"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                 </div>
               )}
             </div>
           </div>
         )) : (
           <p className="text-center text-xs text-muted-foreground py-4">No events scheduled.</p>
         )}
      </div>
 
      <AddEventDialog 
        open={isAddEventOpen}
        onOpenChange={(open) => {
          setIsAddEventOpen(open);
          if(!open) setEditingEvent(null);
        }}
        onAddEvent={editingEvent ? handleUpdateEvent : handleAddEvent}
        initialData={editingEvent}
      />

      <ViewAllEventsDialog
        open={isViewAllOpen}
        onOpenChange={setIsViewAllOpen}
        events={events}
        canAddEvents={canAddEvents}
        onEditEvent={handleEditClick}
        onDeleteEvent={handleDeleteEvent}
      />
    </div>
  );
}
 
function DepartmentDistribution() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
 
  useEffect(() => {
    fetchDepartments();
  }, []);
 
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
        const total = data.reduce((acc: number, dept: any) => acc + (dept.employeeCount || 0), 0);
        setTotalEmployees(total);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };
 
  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
      <h3 className="font-bold text-lg text-foreground mb-6">Department Distribution</h3>
      <div className="space-y-6">
        {departments.length > 0 ? departments.map((dept, i) => {
          const percentage = totalEmployees > 0 ? ((dept.employeeCount || 0) / totalEmployees) * 100 : 0;
          return (
            <div key={dept.id || i}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm text-foreground">{dept.name}</span>
                <span className="text-xs text-muted-foreground">{dept.employeeCount || 0} members</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-teal rounded-full transition-all duration-500" 
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                ></div>
              </div>
            </div>
          );
        }) : (
          <p className="text-center text-xs text-muted-foreground py-4">No department data available.</p>
        )}
      </div>
    </div>
  );
}
 
function StatCard({ title, value, trend, trendLabel, icon, trendUp = true, color = "brand", hideTrend = false }: { title: string, value: string, trend: string, trendLabel: string, icon: React.ReactNode, trendUp?: boolean, color?: string, hideTrend?: boolean }) {
  const colorMap: any = {
    brand: "bg-[#EAF7F6] text-brand-teal",
    blue: "bg-[#EFF6FF] text-blue-600",
    orange: "bg-[#FFF7ED] text-orange-600",
  };
 
  return (
    <div className="p-6 bg-white border border-border rounded-2xl shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-6">
        <span className="font-bold text-[13px] text-gray-500">{title}</span>
        <div className={`p-2.5 rounded-xl ${colorMap[color] || colorMap.brand}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-black text-[#111827] mb-1">{value}</div>
        <div className="flex items-center text-xs">
          {!hideTrend && (
            <span className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] mr-2 flex items-center ${trendUp ? 'bg-[#F0FDF4] text-green-600' : 'bg-red-50 text-red-600'}`}>
               {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : null}
               {trend}
            </span>
          )}
          <span className="text-gray-400 font-medium">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}
