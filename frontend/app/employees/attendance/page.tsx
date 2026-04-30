"use client";

import React, { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TablePagination } from "@/components/common/TablePagination";
import { PageHeader } from "@/components/common/PageHeader";
import dayjs from "dayjs";
import { API_URL } from "@/lib/config";
import { exportToCSV } from "@/lib/export";

export default function EmployeeAttendanceListPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  // Modals
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [attRes, empRes, deptRes] = await Promise.all([
        fetch(`${API_URL}/attendance`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/departments`)
      ]);
      
      if (attRes.ok) setAttendance(await attRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
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

  const filteredAttendance = attendance.filter(a => {
    const emp = employees.find(e => e.id === a.employeeId || e.employeeId === a.employeeId);
    const matchesSearch = a.employeeName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || a.status?.toLowerCase() === selectedStatus.toLowerCase();
    const matchesDept = selectedDept === "all" || emp?.department?.toLowerCase() === selectedDept.toLowerCase();
    return matchesSearch && matchesStatus && matchesDept;
  });

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
            const present = dayAttendance.filter(a => a.status?.toLowerCase() === 'present' || a.status?.toLowerCase() === 'active' || a.status?.toLowerCase() === 'logged').length;
            const late = dayAttendance.filter(a => a.status?.toLowerCase() === 'late' || a.status?.toLowerCase() === 'late entry').length;
            const absent = dayAttendance.filter(a => a.status?.toLowerCase() === 'absent').length;
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
                  {d.currentMonth && !isSunday && <span className="text-[9px] font-medium text-slate-400">48 Total</span>}
                </div>

                {isSunday ? (
                  <div className="mt-2 px-2 py-1 bg-sky-50 text-sky-600 text-[10px] font-bold rounded border border-sky-100 flex items-center gap-1">
                    Holiday
                  </div>
                ) : d.currentMonth && (
                  <div className="space-y-1 mt-auto">
                    <div className="flex items-center justify-between px-2 py-0.5 bg-[#ecfdf5] text-[#10b981] text-[9px] font-bold rounded border border-[#d1fae5]">
                      <span>Present</span>
                      <span>{present}</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-0.5 bg-[#fffbeb] text-[#f59e0b] text-[9px] font-bold rounded border border-[#fef3c7]">
                      <span>Late</span>
                      <span>{late}</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-0.5 bg-[#fef2f2] text-[#ef4444] text-[9px] font-bold rounded border border-[#fee2e2]">
                      <span>Absent</span>
                      <span>{absent}</span>
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

  const dailySummary = selectedDay ? {
    present: attendance.filter(a => a.date === selectedDay && (a.status?.toLowerCase() === 'present' || a.status?.toLowerCase() === 'active' || a.status?.toLowerCase() === 'logged')).length,
    late: attendance.filter(a => a.date === selectedDay && (a.status?.toLowerCase() === 'late' || a.status?.toLowerCase() === 'late entry')).length,
    absent: attendance.filter(a => a.date === selectedDay && a.status?.toLowerCase() === 'absent').length,
    records: attendance.filter(a => a.date === selectedDay)
  } : null;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employee Attendance List" 
        description="Manage your team members and their account permissions here."
      >
        <Button variant="outline" className="h-9 shadow-sm" onClick={() => exportToCSV(attendance, 'employee_attendance')}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </PageHeader>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="late entry">Late Entry</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="logged">Logged</SelectItem>
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
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Punch In</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Punch Out</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Break</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Total Hours</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">Loading attendance records...</td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">No attendance records found.</td>
                  </tr>
                ) : (
                  filteredAttendance.map((record, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setSelectedRecord(record); setIsDetailModalOpen(true); }}>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {dayjs(record.date).isSame(dayjs(), 'day') ? `Today, ${dayjs(record.date).format("MMM D")}` : dayjs(record.date).format("MMM D, YYYY")}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-mono text-[13px]">{record.checkIn || '--:--'}</td>
                      <td className="px-6 py-4 text-slate-700 font-mono text-[13px]">{record.checkOut || '--:--'}</td>
                      <td className="px-6 py-4 text-slate-500 text-center">15m</td>
                      <td className="px-6 py-4 text-slate-700 font-medium text-center">{record.workHours || '--'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(record.status)}`}>
                          {record.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination totalItems={filteredAttendance.length} itemsPerPage={10} currentPage={1} onPageChange={() => {}} />
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
                      <span className="text-[11px] font-mono text-slate-400 font-bold">{record.checkIn || '--'}</span>
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
            <Button className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold h-11 rounded-xl shadow-md transition-all active:scale-[0.98]">
              <Download className="w-4 h-4 mr-2" /> Export Daily Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          <div className="p-6 border-b border-border bg-slate-50/50 relative">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-lg">AC</AvatarFallback>
              </Avatar>
              <div>
                <DialogHeader className="p-0 space-y-0 text-left">
                  <DialogTitle className="font-bold text-slate-800 text-lg leading-tight">
                    {selectedRecord?.employeeName || 'Employee Details'}
                  </DialogTitle>
                </DialogHeader>
                <div className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                  Software Engineer <span className="w-1 h-1 rounded-full bg-slate-300"></span> 
                  <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {dayjs(selectedRecord?.date).format("MMMM D, YYYY")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Status</span>
                <span className="font-bold text-slate-800 text-sm">Punch-out</span>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" /> Present
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Check In', value: selectedRecord?.checkIn || '--:--' },
                { label: 'Check Out', value: selectedRecord?.checkOut || '--:--' },
                { label: 'Break', value: `${(selectedRecord?.breaks || []).reduce((acc: number, b: any) => acc + (parseInt(b.duration) || 0), 0)} Min` },
                { label: 'Prod. Hrs', value: selectedRecord?.workHours || '--', highlight: true }
              ].map((item, i) => (
                <div key={i} className={`border rounded-xl p-3 text-center shadow-sm ${item.highlight ? 'bg-brand-light/30 border-brand-teal/20 ring-1 ring-brand-teal/10' : 'bg-white border-slate-100'}`}>
                  <div className={`text-[9px] uppercase font-bold mb-1 ${item.highlight ? 'text-brand-teal' : 'text-slate-400'} tracking-tighter`}>{item.label}</div>
                  <div className={`font-bold text-[12px] whitespace-nowrap ${item.highlight ? 'text-brand-teal' : 'text-slate-800'}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 px-1">
                <Clock className="w-4 h-4 text-brand-teal" /> Activity Timeline
              </h4>
              <div className="space-y-6 border-l-2 border-slate-100 ml-3 pl-8 relative">
                {selectedRecord?.checkIn && (
                  <div className="relative group">
                    <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-2 ring-slate-50 transition-transform group-hover:scale-125 bg-emerald-400"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-800 text-[13px] leading-tight">Punched In</div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">Web Portal</div>
                      </div>
                      <div className="text-[12px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{selectedRecord.checkIn}</div>
                    </div>
                  </div>
                )}
                
                {(selectedRecord?.breaks || []).map((b: any, i: number) => (
                  <React.Fragment key={i}>
                    <div className="relative group">
                      <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-2 ring-slate-50 transition-transform group-hover:scale-125 bg-orange-400"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-black text-slate-800 text-[13px] leading-tight">Break Start</div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">{b.reason || 'Rest Break'}</div>
                        </div>
                        <div className="text-[12px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{b.startTime}</div>
                      </div>
                    </div>
                    {b.endTime && (
                      <div className="relative group">
                        <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-2 ring-slate-50 transition-transform group-hover:scale-125 bg-orange-400"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-black text-slate-800 text-[13px] leading-tight">Break End</div>
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Duration: {b.duration}m</div>
                          </div>
                          <div className="text-[12px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{b.endTime}</div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {selectedRecord?.checkOut && (
                  <div className="relative group">
                    <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-2 ring-slate-50 transition-transform group-hover:scale-125 bg-rose-400"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-black text-slate-800 text-[13px] leading-tight">Punched Out</div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">Web Portal</div>
                      </div>
                      <div className="text-[12px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{selectedRecord.checkOut}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-border flex justify-end gap-3">
             <Button variant="outline" className="font-bold text-xs h-10 px-6 rounded-xl border-slate-200" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
