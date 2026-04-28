"use client";
 
import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
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
import { useUserContext } from "@/context/UserContext";
import { API_URL } from "@/lib/config";
import dayjs from "dayjs";
import { TablePagination } from "@/components/common/TablePagination";
import { RequestPunchOutDialog } from "@/components/dashboard/RequestPunchOutDialog";
import { AddEventDialog } from "@/components/dashboard/AddEventDialog";
import { ViewAllEventsDialog } from "@/components/dashboard/ViewAllEventsDialog";
 
export default function DashboardPage() {
  const { user, isLoading } = useUserContext();
  const [attendanceStatus, setAttendanceStatus] = useState<{isPunchedIn: boolean, record: any} | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [isPunching, setIsPunching] = useState(false);
  const [workTime, setWorkTime] = useState("00:00:00");
  const [totalBreakTime, setTotalBreakTime] = useState("0m");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  
  const punchCardRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    if (user?.id) {
      fetchStatus();
      fetchHistory();
      if (user.role === "Admin" || user.role === "HR") {
        fetchLeaveRequests();
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

 
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
 
  useEffect(() => {
    let interval: any;
    if (attendanceStatus?.isPunchedIn && attendanceStatus.record?.checkIn) {
      interval = setInterval(() => {
        const now = dayjs();
        const dateStr = dayjs().format('YYYY-MM-DD');
        // Support both 12h and 24h formats
        const checkIn = dayjs(`${dateStr} ${attendanceStatus.record.checkIn}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm']);
        
        if (!checkIn.isValid()) {
          setWorkTime("00:00:00");
          return;
        }

        const diff = now.diff(checkIn, 'second');
        
        const breakSeconds = (attendanceStatus.record.breaks || []).reduce((acc: number, b: any) => {
          if (b.duration) return acc + (parseInt(b.duration) * 60);
          if (b.startTime && !b.endTime) {
            const bStart = dayjs(`${dateStr} ${b.startTime}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm']);
            return acc + (bStart.isValid() ? now.diff(bStart, 'second') : 0);
          }
          return acc;
        }, 0);

        const totalSeconds = Math.max(0, diff - breakSeconds);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        setWorkTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      setWorkTime("00:00:00");
    }
 
    if (attendanceStatus?.record?.breaks) {
      const totalMinutes = attendanceStatus.record.breaks.reduce((acc: number, b: any) => {
        if (b.duration) return acc + parseInt(b.duration);
        return acc;
      }, 0);
      setTotalBreakTime(`${totalMinutes}m`);
    }
 
    return () => clearInterval(interval);
  }, [attendanceStatus]);

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
      const res = await fetch(`${API_URL}/attendance/status/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceStatus(data);
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
          .filter((a: any) => a.employeeId === user.id)
          .sort((a: any, b: any) => {
            const dateTimeA = new Date(`${a.date} ${a.checkIn}`).getTime();
            const dateTimeB = new Date(`${b.date} ${b.checkIn}`).getTime();
            return dateTimeB - dateTimeA;
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
      const res = await fetch(`${API_URL}/attendance/${type}/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (res.ok) {
        await fetchStatus();
        await fetchHistory();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Action failed: ${errorData.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error("Punch error:", err);
      alert("Failed to connect to the server. Please ensure the backend is running.");
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
 
  const role = user?.role || "Employee";
 
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Here's what's happening in your organization today."
      >
        {role === "Admin" && (
          <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium">
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        )}
        {role === "HR" && (
          <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        )}
        {role === "Employee" && (
          <Button 
            onClick={() => setIsRequestDialogOpen(true)}
            className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-9 px-4 rounded-lg shadow-sm flex items-center gap-2"
          >
             <Plus className="w-4 h-4" />
             Request Punch Out
          </Button>
        )}
      </PageHeader>
 
      {role === "Admin" && <AdminView user={user} leaves={leaveRequests} />}
      {role === "HR" && <HRView user={user} leaves={leaveRequests} />}

      {role === "Employee" && (
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
          punchCardRef={punchCardRef}
        />
      )}
 
      <RequestPunchOutDialog 
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        isPunchedIn={attendanceStatus?.isPunchedIn || false}
        onGoToPunchOut={() => {
          setIsRequestDialogOpen(false);
          punchCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />
    </div>
  );
}
 
function AdminView({ user, leaves }: { user: any, leaves: any[] }) {

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value="48" trend="+12" trendLabel="from last month" icon={<Users className="w-5 h-5 text-muted-foreground" />} />
        <StatCard title="On Time Today" value="16" trend="87%" trendLabel="arrived on schedule" icon={<Clock className="w-5 h-5 text-muted-foreground" />} trendUp/>
        <StatCard title="Absent Today" value={leaves.filter(l => l.status === 'Approved').length.toString()} trend="6%" trendLabel="on approved leave" icon={<UserX className="w-5 h-5 text-muted-foreground" />} trendUp={false} />

        <StatCard title="Total Interns" value="18" trend="+3" trendLabel="joined this month" icon={<GraduationCap className="w-5 h-5 text-muted-foreground" />} />
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex justify-between items-center border-b border-border">
              <h3 className="font-bold text-lg">Organization Attendance</h3>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="p-6 h-[300px] flex items-center justify-center text-muted-foreground">
              [Attendance Analytics Chart Placeholder]
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
 
function HRView({ user, leaves }: { user: any, leaves: any[] }) {

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Pending Leaves" 
          value={leaves.filter(l => l.status === 'Pending').length.toString().padStart(2, '0')} 
          trend="Action Required" 
          trendLabel="awaiting approval" 
          icon={<CalendarIcon className="w-5 h-5 text-muted-foreground" />} 
        />

        <StatCard title="New Applications" value="24" trend="+5" trendLabel="this week" icon={<FileCheck className="w-5 h-5 text-muted-foreground" />} trendUp/>
        <StatCard title="Asset Requests" value="03" trend="Pending" trendLabel="laptop & equipment" icon={<AlertCircle className="w-5 h-5 text-muted-foreground" />} trendUp={false} />
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-xl shadow-sm">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Recent Leave Requests</h3>
              <Button variant="ghost" size="sm" className="text-brand-teal">View All</Button>
            </div>
            <div className="p-0">
              {leaves.length > 0 ? leaves.slice(0, 5).map((leave, i) => (
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
                <div className="p-8 text-center text-sm text-muted-foreground">No recent leave requests</div>
              )}
            </div>

          </div>
 
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Upcoming Interviews</h3>
            <div className="space-y-4">
              {[
                { candidate: 'John Robert', role: 'Senior React Dev', time: 'Today, 2:00 PM' },
                { candidate: 'Elena Torres', role: 'UI Designer', time: 'Tomorrow, 10:30 AM' },
                { candidate: 'Jason Reed', role: 'QA Engineer', time: '28 Oct, 4:00 PM' },
              ].map((interview, i) => (
                <div key={i} className="flex gap-4 p-3 rounded-lg border border-border hover:border-brand-teal/30 transition-colors">
                  <div className="bg-brand-light p-2 rounded-md h-fit"><Clock className="w-4 h-4 text-brand-teal" /></div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{interview.candidate}</h4>
                    <p className="text-xs text-muted-foreground">{interview.role}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-brand-teal">{interview.time}</div>
                  </div>
                </div>
              ))}
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
  punchCardRef: React.RefObject<HTMLDivElement>
}) {
  const userName = user?.name || "Guest";
  const firstName = user?.firstName || userName.split(' ')[0];
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  const isPunchedIn = attendanceStatus?.isPunchedIn;
  const isOnBreak = attendanceStatus?.record?.status === "On Break";
  const punchInTime = attendanceStatus?.record?.checkIn || (recentAttendance[0]?.checkIn || "Not Started");
  const punchOutTime = attendanceStatus?.record?.checkOut || (recentAttendance[0]?.checkOut || "Active");
 
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div ref={punchCardRef} className="bg-white border border-border rounded-2xl p-8 shadow-sm scroll-mt-20 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-light/50 border border-brand-teal/20 rounded-full w-fit">
                   <Sun className="w-4 h-4 text-brand-teal" />
                   <span className="text-[11px] font-bold text-brand-teal">Good morning, {firstName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-2 border-border shadow-sm">
                      <AvatarImage src={user?.profilePhoto} />
                      <AvatarFallback className="bg-brand-light text-brand-teal font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${isPunchedIn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-[#111827] leading-tight">{userName}</h3>
                    <p className="text-sm text-gray-500 font-medium">{user?.designation || 'HR Manager'}</p>
                  </div>
                </div>
              </div>
 
              <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-4 min-w-[220px] flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isPunchedIn && !isOnBreak ? 'bg-brand-teal animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Live working time</span>
                   </div>
                   <div className="text-2xl font-black text-[#111827] font-mono tracking-tight">{workTime}</div>
                </div>
                {isPunchedIn && !isOnBreak && <span className="bg-brand-light text-brand-teal text-[10px] font-black px-2 py-1 rounded-lg">Live</span>}
              </div>
            </div>
 
            <div className="bg-[#EAF7F6]/40 rounded-2xl p-10 mb-8 text-center border border-brand-teal/10">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-widest block mb-1">Current Time</span>
              <div className="text-5xl font-black text-[#111827] tracking-tighter mb-2">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
              <div className="text-sm text-gray-500 font-medium">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
 
            <div className={`px-4 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 mb-8 border ${isPunchedIn ? 'border-brand-teal/10 bg-[#EAF7F6] text-brand-teal' : 'border-red-100 bg-red-50 text-red-600'}`}>
               {isPunchedIn ? <CheckCircle2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
               {isPunchedIn ? `Punched in at ${punchInTime}` : `Punched out at ${recentAttendance[0]?.checkOut || 'Not Punched In'}`}
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
                 { label: 'Worked Time', value: isPunchedIn ? "Active" : "Not Started", highlight: isPunchedIn },
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
               value={isPunchedIn ? workTime.split(':').slice(0, 2).join('h ') + 'm' : '0h 0m'} 
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
                const breakStr = totalBreak >= 60 ? `${Math.floor(totalBreak / 60)}h ${totalBreak % 60}m` : `${totalBreak}m`;
 
                return (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{dateDisplay}</td>
                    <td className="px-6 py-4 text-foreground font-medium">{record.checkIn}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{record.checkOut || '--'}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{breakStr}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{record.workHours || '--'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-3 py-1 text-[11px] font-bold rounded-full ${
                        record.status === 'Active' || record.status === 'On Break' 
                        ? 'bg-brand-light text-brand-teal' 
                        : record.isLate ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {record.status === 'Active' || record.status === 'On Break' ? 'Active' : (record.isLate ? 'Late Entry' : 'Logged')}
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
  const canAddEvents = user?.role === "Admin" || user?.role === "HR";
 
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
    if (confirm("Are you sure you want to delete this event?")) {
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
      if (e.type === 'birthday') {
        return dayjs(e.date).month() === currentMonth.month();
      }
      return dayjs(e.date).month() === currentMonth.month() && dayjs(e.date).year() === currentMonth.year();
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
      <p className="text-[13px] text-gray-500 mb-6 font-medium">This month events</p>
 
      <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-6">
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 bg-white border border-gray-100 shadow-sm rounded-lg"
             onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
           >
             <ChevronLeft className="w-4 h-4 text-gray-400" />
           </Button>
           <span className="text-[13px] font-bold text-[#111827]">{currentMonth.format("MMMM YYYY")}</span>
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 bg-white border border-gray-100 shadow-sm rounded-lg"
             onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
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
               const isToday = dayDate.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
               const hasEvent = events.some(e => {
                 if (e.type === 'birthday') {
                   return dayjs(e.date).month() === dayDate.month() && dayjs(e.date).date() === dayDate.date();
                 }
                 return dayjs(e.date).format('YYYY-MM-DD') === dayDate.format('YYYY-MM-DD');
               });
               
               days.push(
                 <div key={i} className={`h-8 flex items-center justify-center text-[13px] font-bold rounded-lg cursor-pointer transition-all ${
                   isToday ? 'bg-brand-teal text-white shadow-md' : 
                   hasEvent ? 'text-brand-teal bg-white border border-brand-teal/10' : 'text-gray-400 hover:bg-white'
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
                <Cake className="w-5 h-5" />}
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
