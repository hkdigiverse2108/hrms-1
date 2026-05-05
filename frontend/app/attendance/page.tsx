"use client";
 
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/common/TablePagination";
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
  Coffee
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
import { exportToCSV } from "@/lib/export";
 
export default function AttendancePage() {
  const { user } = useUserContext();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [recoverModalOpen, setRecoverModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stats, setStats] = useState({
    presentDays: 0,
    avgHours: "0",
    totalWorkTime: "0H 0M",
    totalBreakTime: "0M"
  });
 
  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user]);
 
  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance`);
      if (res.ok) {
        let data = await res.json();
        
        if (user.role !== "Admin" && user.role !== "HR") {
          data = data.filter((a: any) => a.employeeId === user.id);
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
 
  const calculateStats = (data: any[]) => {
    const presentDays = data.length;
    let totalMinutes = 0;
    let totalBreakMinutes = 0;
 
    data.forEach(a => {
      if (a.workHours) {
        const parts = a.workHours.match(/(\d+)h\s+(\d+)m/);
        if (parts) {
          totalMinutes += parseInt(parts[1]) * 60 + parseInt(parts[2]);
        }
      }
      (a.breaks || []).forEach((b: any) => {
        if (b.duration) totalBreakMinutes += parseInt(b.duration);
      });
    });
 
    const avg = presentDays > 0 ? (totalMinutes / presentDays / 60).toFixed(1) : "0";
    setStats({
      presentDays,
      avgHours: avg,
      totalWorkTime: `${Math.floor(totalMinutes / 60)}H ${totalMinutes % 60}M`,
      totalBreakTime: `${totalBreakMinutes}M`
    });
  };
 
  const currentRecord = attendance.find(a => a.date === dayjs().format("YYYY-MM-DD"));
 
  const CalendarWidget = () => (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">{dayjs().format("MMMM YYYY")}</h3>
        <div className="bg-brand-light/50 text-brand-teal text-xs font-medium px-2 py-1 rounded-md">
          {stats.presentDays} present
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center text-sm mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-muted-foreground font-semibold text-xs py-2">{day}</div>
        ))}
        {Array.from({ length: 31 }).map((_, i) => {
          const dayNum = i + 1;
          const isToday = dayNum === dayjs().date();
          const hasRecord = attendance.some(a => dayjs(a.date).date() === dayNum && dayjs(a.date).month() === dayjs().month());
          
          return (
            <div 
              key={i} 
              className={`py-2 rounded-md m-0.5 text-xs ${
                isToday ? 'bg-brand-teal text-white font-bold shadow-sm' : 
                hasRecord ? 'bg-brand-light/40 text-brand-teal font-medium' : 'text-foreground bg-gray-50'
              }`}
            >
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
 
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-sm font-medium text-foreground">Recorded Break-In</label>
                    <TimePicker className="w-full h-9" format="hh:mm A" use12Hours />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-sm font-medium text-foreground">Actual Break-Out Time</label>
                    <TimePicker className="w-full h-9" format="hh:mm A" use12Hours />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2 mt-4">
                <Button variant="outline" onClick={() => setRecoverModalOpen(false)}>Cancel</Button>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setRecoverModalOpen(false)}>
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium" onClick={() => exportToCSV(attendance, 'attendance')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>
 
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarImage src={user?.profilePhoto} />
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
                  <span className="text-sm sm:text-lg font-bold text-foreground">{currentRecord?.workHours || '--'}</span>
                </div>
                <div className="flex-1 md:flex-none md:min-w-[100px] bg-gray-50 border border-border rounded-lg p-2 sm:p-3 flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-0.5 sm:mb-1">Check-in</span>
                  <span className="text-sm sm:text-lg font-bold text-foreground">{currentRecord?.checkIn || '--'}</span>
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
                <p className="text-xs text-muted-foreground">{user?.role === "Admin" || user?.role === "HR" ? "All employee records" : "Days recorded this month"}</p>

              </div>
              <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Avg Daily Hours</span>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{stats.avgHours}h</div>
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
                <div className="text-3xl font-bold text-foreground mb-2">{stats.totalWorkTime.split(' ')[0]}</div>
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
                <Select defaultValue="all">
                  <SelectTrigger className="w-[160px] h-9 bg-white border-border">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="sal">Sales</SelectItem>
                    <SelectItem value="gra">Graphics</SelectItem>
                    <SelectItem value="mar">Marketing</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px] h-9 bg-white border-border">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="late">Late Entry</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="logged">Logged</SelectItem>
                  </SelectContent>
                </Select>
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
                      const breakStr = totalBreakMinutes > 0 ? (totalBreakMinutes >= 60 ? `${Math.floor(totalBreakMinutes/60)}H ${totalBreakMinutes%60}Min` : `${totalBreakMinutes}Min`) : "-";
                      
                      const checkIn = dayjs(`${row.date} ${row.checkIn}`);
                      const checkOut = row.checkOut ? dayjs(`${row.date} ${row.checkOut}`) : null;
                      
                      // Total Working Hours
                      let totalWorkingMinutes = 0;
                      if (checkOut && checkOut.isValid() && checkIn.isValid()) {
                        totalWorkingMinutes = checkOut.diff(checkIn, 'minute');
                      }
                      const totalWorkingStr = totalWorkingMinutes > 0 ? (totalWorkingMinutes >= 60 ? `${Math.floor(totalWorkingMinutes/60)}H ${totalWorkingMinutes%60}Min` : `${totalWorkingMinutes}Min`) : "-";
                      
                      // Production Hours
                      const productionMinutes = Math.max(0, totalWorkingMinutes - totalBreakMinutes);
                      const productionStr = productionMinutes > 0 ? (productionMinutes >= 60 ? `${Math.floor(productionMinutes/60)}H ${productionMinutes%60}Min` : `${productionMinutes}Min`) : "-";
                      
                      // Late (9:30 AM start)
                      const startTime = dayjs(`${row.date} 09:30:00`);
                      const lateMinutes = checkIn.isValid() ? Math.max(0, checkIn.diff(startTime, 'minute')) : 0;
                      const lateStr = lateMinutes > 0 ? `${lateMinutes}Min` : "-";
                      
                      // Overtime (Assuming 9h shift)
                      const overtimeMinutes = Math.max(0, productionMinutes - 540);
                      const overtimeStr = overtimeMinutes > 0 ? (overtimeMinutes >= 60 ? `${Math.floor(overtimeMinutes/60)}H ${overtimeMinutes%60}Min` : `${overtimeMinutes}Min`) : "-";

                      let statusLabel = "Present";
                      let statusClass = "bg-green-50 text-green-600 border-green-100";
                      
                      const currentStatus = row.checkOut ? "punch-out" : "punch-in";
                      const day = dayjs(row.date).format("dddd");

                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors group border-b border-border">
                          <td className="px-4 py-4 font-medium text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-4 font-medium text-foreground">{row.date}</td>
                          <td className="px-4 py-4 text-muted-foreground">{day}</td>
                          <td className="px-4 py-4 text-muted-foreground">{currentStatus}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${statusClass}`}>
                              <CheckCircle2 className="w-3 h-3" /> {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-medium text-foreground">{row.checkIn || "-"}</td>
                          <td className="px-4 py-4 font-medium text-foreground">{row.checkOut || "-"}</td>
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
                          <td className="px-4 py-4 text-[11px] text-muted-foreground max-w-[200px] truncate">
                            {lateMinutes > 0 ? `Late punch-in; ${lateMinutes} minutes after expected start time (09:30 AM)` : "-"}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button 
                              onClick={() => { setSelectedRecord(row); setDetailsModalOpen(true); }}
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-brand-teal bg-brand-light/20 hover:bg-brand-light/40 rounded-full"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
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
                  <div className="font-bold text-sm">{selectedRecord.checkIn}</div>
                </div>
                <div className="border border-border rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Out</div>
                  <div className="font-bold text-sm">{selectedRecord.checkOut || '--:--'}</div>
                </div>
                <div className="border border-brand-teal/30 bg-brand-light/20 rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-brand-teal mb-1">Work</div>
                  <div className="font-bold text-sm text-brand-teal">{selectedRecord.workHours || '--'}</div>
                </div>
              </div>
 
              <div>
                <h4 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-teal" /> Activity Timeline
                </h4>
                <div className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                  <div className="space-y-6 border-l-2 border-brand-light ml-2 pl-6 relative">
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-brand-teal"></div>
                      <div className="font-semibold text-sm">Punched In</div>
                      <div className="text-xs text-muted-foreground">{selectedRecord.checkIn}</div>
                    </div>
                    
                    {(selectedRecord.breaks || []).map((b: any, i: number) => (
                      <React.Fragment key={i}>
                        <div className="relative">
                          <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                          <div className="font-semibold text-sm">Break Start</div>
                          <div className="text-xs text-muted-foreground">{b.startTime}</div>
                        </div>
                        {b.endTime && (
                          <div className="relative">
                            <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                            <div className="font-semibold text-sm">Break End</div>
                            <div className="text-xs text-muted-foreground">{b.endTime} ({b.duration}m)</div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
 
                    {selectedRecord.checkOut && (
                      <div className="relative">
                        <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                        <div className="font-semibold text-sm">Punched Out</div>
                        <div className="text-xs text-muted-foreground">{selectedRecord.checkOut}</div>
                      </div>
                    )}
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
    </div>
  );
}
