"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker, TimePicker, Popconfirm } from "antd";
import dayjs from "dayjs";
import { Plus, Loader2, Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function SchedulePage() {
  const { user, getISTNow } = useUserContext();
  const [currentDate, setCurrentDate] = useState(dayjs(getISTNow()));
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    employeeId: user?.id || user?.employeeId || "",
    employeeName: user?.name || "",
    date: dayjs(getISTNow()).format("YYYY-MM-DD"),
    startTime: "09:30",
    endTime: "10:30",
    type: "meeting"
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchSchedules(currentDate.format("YYYY-MM-DD"));
  }, [currentDate]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchSchedules = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/schedules?date=${dateStr}`);
      if (res.ok) {
        setSchedules(await res.json());
      } else {
        setSchedules([]);
      }
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
        if (newDate.isSame(currentDate, 'day')) {
          fetchSchedules(form.date);
        } else {
          setCurrentDate(newDate);
        }
        setForm(prev => ({ ...prev, title: "", description: "" }));
      } else {
        toast.error("Failed to add schedule");
      }
    } catch (err) {
      console.error("Error adding schedule:", err);
      toast.error("Error connecting to server");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const res = await fetch(`${API_URL}/schedules/${scheduleId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Schedule deleted successfully");
        fetchSchedules(currentDate.format("YYYY-MM-DD"));
      } else {
        toast.error("Failed to delete schedule");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    }
  };

  const getStatusColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'meeting': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'busy': return 'bg-red-100 text-red-700 border-red-200';
      case 'out_of_office': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'work': return 'bg-brand-teal/10 text-brand-teal border-brand-teal/20';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const format12Hour = (timeStr: string) => {
    if (!timeStr) return "";
    return dayjs(`2000-01-01 ${timeStr}`).format("h:mm A");
  };

  const timeSlots = Array.from({ length: 25 }, (_, i) => i); // 12 AM to 12 AM (24 hours)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Schedule"
        description="View and manage employee availability, meetings, and work blocks."
      >
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
                  onChange={e => setForm({...form, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                <Select value={form.employeeId} onValueChange={(v) => setForm({...form, employeeId: v})}>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <DatePicker 
                    className="w-full h-10" 
                    value={dayjs(form.date)}
                    onChange={d => setForm({...form, date: d ? d.format("YYYY-MM-DD") : ""})}
                    format="YYYY-MM-DD"
                    getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
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
                      if (!t) {
                        setForm({...form, startTime: ""});
                        return;
                      }
                      const newStart = t.format("HH:mm");
                      if (form.endTime && newStart >= form.endTime) {
                        const newEnd = t.add(1, 'hour').format("HH:mm");
                        setForm({...form, startTime: newStart, endTime: newEnd});
                      } else {
                        setForm({...form, startTime: newStart});
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
                    onChange={t => setForm({...form, endTime: t ? t.format("HH:mm") : ""})}
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
                  onChange={e => setForm({...form, description: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button className="bg-brand-teal text-white hover:bg-brand-teal/90" onClick={handleCreateSchedule}>Save Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="bg-white rounded-xl shadow-sm border border-border p-6 min-h-[600px] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-brand-teal" />
              Daily Schedule
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentDate(currentDate.subtract(1, 'day'))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="font-semibold text-lg min-w-[150px] text-center">
              {currentDate.format("MMMM D, YYYY")}
            </div>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentDate(currentDate.add(1, 'day'))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button 
              variant="secondary" 
              onClick={() => setCurrentDate(dayjs(getISTNow()))}
              className="ml-2"
            >
              Today
            </Button>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
            </div>
          ) : (
            <div className="min-w-[1800px]">
              {/* Header row for time slots */}
              <div className="flex border-b pb-2 mb-4">
                <div className="w-48 shrink-0 font-medium text-muted-foreground pl-2 sticky left-0 bg-white z-20">Employee</div>
                <div className="flex-1 flex justify-between relative text-xs font-semibold text-muted-foreground ml-2">
                  {timeSlots.map(hour => {
                    let label = "";
                    if (hour === 0 || hour === 24) label = "12 AM";
                    else if (hour === 12) label = "12 PM";
                    else if (hour > 12) label = `${hour - 12} PM`;
                    else label = `${hour} AM`;
                    
                    return (
                      <div key={hour} className="absolute text-center transform -translate-x-1/2" style={{ left: `${(hour / 24) * 100}%` }}>
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Employee Rows */}
              <div className="space-y-4">
                {employees.map(employee => {
                  const empSchedules = schedules.filter(s => s.employeeId === employee.id || s.employeeId === employee.employeeId);

                  return (
                    <div key={employee.id} className="flex items-center group relative">
                      <div className="w-48 shrink-0 flex items-center gap-3 pr-4 sticky left-0 bg-white z-20 py-2">
                        <Avatar className="w-8 h-8 border">
                          <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                            {employee.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <p className="text-sm font-semibold truncate">{employee.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{employee.department || 'Employee'}</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 relative h-12 bg-slate-50/50 rounded-lg border border-slate-100 overflow-hidden">
                        {timeSlots.map(hour => (
                          <div 
                            key={`grid-${hour}`} 
                            className="absolute top-0 bottom-0 border-l border-slate-200"
                            style={{ left: `${(hour / 24) * 100}%` }}
                          />
                        ))}

                        {/* Schedule blocks */}
                        {empSchedules.map(schedule => {
                          const startHour = parseInt(schedule.startTime.split(':')[0]) + parseInt(schedule.startTime.split(':')[1])/60;
                          const endHour = parseInt(schedule.endTime.split(':')[0]) + parseInt(schedule.endTime.split(':')[1])/60;
                          
                          // constrain to 0 - 24 view
                          const visualStart = Math.max(0, startHour);
                          const visualEnd = Math.min(24, endHour);
                          
                          if (visualEnd <= 0 || visualStart >= 24) return null;
                          
                          const leftPos = (visualStart / 24) * 100;
                          const width = ((visualEnd - visualStart) / 24) * 100;

                          const canDelete = schedule.createdBy === (user?.id || user?.employeeId);

                          return (
                            canDelete ? (
                              <Popconfirm
                                key={schedule.id}
                                title="Delete Schedule"
                                description="Are you sure you want to delete this schedule?"
                                onConfirm={() => handleDeleteSchedule(schedule.id)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <div 
                                  className={`absolute top-1 bottom-1 rounded-md border shadow-sm px-2 py-1 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-brand-teal/50 hover:z-10 group ${getStatusColor(schedule.type)}`}
                                  style={{ left: `${leftPos}%`, width: `${width}%` }}
                                  title={`${schedule.title} (${format12Hour(schedule.startTime)} - ${format12Hour(schedule.endTime)})\n${schedule.description || ''}`}
                                >
                                  <div className="flex justify-between items-start gap-1">
                                    <div className="text-[10px] font-bold truncate flex-1">{schedule.title}</div>
                                    <div className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity shrink-0 -mt-0.5" title="Delete">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                    </div>
                                  </div>
                                  <div className="text-[9px] opacity-80 truncate">{format12Hour(schedule.startTime)} - {format12Hour(schedule.endTime)}</div>
                                </div>
                              </Popconfirm>
                            ) : (
                              <div 
                                key={schedule.id}
                                className={`absolute top-1 bottom-1 rounded-md border shadow-sm px-2 py-1 overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-brand-teal/50 hover:z-10 ${getStatusColor(schedule.type)}`}
                                style={{ left: `${leftPos}%`, width: `${width}%` }}
                                title={`${schedule.title} (${format12Hour(schedule.startTime)} - ${format12Hour(schedule.endTime)})\n${schedule.description || ''}`}
                              >
                                <div className="text-[10px] font-bold truncate">{schedule.title}</div>
                                <div className="text-[9px] opacity-80 truncate">{format12Hour(schedule.startTime)} - {format12Hour(schedule.endTime)}</div>
                              </div>
                            )
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
