"use client";

import React, { useState, useEffect } from "react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Users,
  Briefcase,
  X,
  Loader2,
  Trash2
} from "lucide-react";
import { useUserContext } from "@/context/UserContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Employee {
  id: string;
  name: string;
  department?: string;
  profilePhoto?: string;
}

interface Schedule {
  id: string;
  title: string;
  description?: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  attendees?: string[];
}

export default function SchedulePage() {
  const { user } = useUserContext();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Meeting");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const [empRes, schedRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/schedules?date=${dateStr}`),
        fetch(`${API_URL}/events`)
      ]);
      
      let empData = [];
      let schedData = [];
      let dateEvents: any[] = [];
      
      if (empRes.ok) {
        empData = await empRes.json();
      }
      
      if (schedRes.ok) {
        schedData = await schedRes.json();
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        dateEvents = eventsData.filter((e: any) => e.date === dateStr && e.type !== 'birthday');
      }

      const companyEvents = dateEvents.map((e: any) => {
        let startTime = "09:00";
        let endTime = "10:00";
        if (e.time) {
          const parts = e.time.split('-');
          if (parts.length === 2) {
            const parseTime = (t: string) => {
              const match = t.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (match) {
                let h = parseInt(match[1]);
                let m = parseInt(match[2]);
                let ampm = match[3].toUpperCase();
                if (ampm === "PM" && h < 12) h += 12;
                if (ampm === "AM" && h === 12) h = 0;
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              }
              return t.trim();
            };
            startTime = parseTime(parts[0]);
            endTime = parseTime(parts[1]);
          }
        }
        
        return {
          id: `event-${e.id}`,
          employeeId: 'company-events-row',
          title: e.title,
          description: e.description,
          date: e.date,
          startTime,
          endTime,
          type: e.type === 'meeting' ? 'Meeting' : 'Work'
        };
      });

      setSchedules([...schedData, ...companyEvents]);

      const activeEmployees = empData.filter((e: any) => e.status !== 'inactive');
      if (companyEvents.length > 0) {
        setEmployees([
          { id: 'company-events-row', name: 'Company Events', department: 'Organization' },
          ...activeEmployees
        ]);
      } else {
        setEmployees(activeEmployees);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const newSchedule = {
        title,
        description,
        employeeId: user.id || user._id,
        employeeName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Employee',
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime,
        endTime,
        type,
        attendees: []
      };

      const res = await fetch(`${API_URL}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchedule)
      });

      if (res.ok) {
        const createdSchedule = await res.json();
        setSchedules((prev: any[]) => [...prev, createdSchedule]);
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
      } else {
        const data = await res.json();
        alert(`Failed to add schedule: ${data.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error saving schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule block?")) return;
    
    try {
      setSchedules((prev: any[]) => prev.filter(s => s.id !== id));
      const res = await fetch(`${API_URL}/schedules/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        fetchData(); // revert on failure
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Meeting": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Work": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Out of Office": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Timeline hours
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

  const getLeftAndWidth = (start: string, end: string) => {
    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h + m / 60;
    };
    
    const s = parseTime(start);
    const e = parseTime(end);
    
    // Timeline starts at 8
    const leftPercent = Math.max(0, ((s - 8) / 11) * 100);
    const widthPercent = Math.min(100 - leftPercent, ((e - s) / 11) * 100);
    
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Team Schedule & Availability
          </h1>
          <p className="text-gray-500 mt-1">Check when your colleagues are available for meetings.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="h-5 w-5" />
          Add Schedule
        </button>
      </div>

      {/* Date Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 min-w-[200px] text-center">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h2>
          <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Today
          </button>
          <div className="relative">
            <input 
              type="date" 
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(parseISO(e.target.value));
              }}
              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Meeting</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-200"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Focused Work</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Out of Office</span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading schedule data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Timeline */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="w-64 flex-shrink-0 p-4 border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300">
                  Employee
                </div>
                <div className="flex-1 relative flex">
                  {hours.map((h, i) => (
                    <div key={h} className="flex-1 relative border-l border-gray-200 dark:border-gray-700 h-12 flex items-center px-2 text-xs font-medium text-gray-500">
                      {h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              {employees.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No employees found.</div>
              ) : (
                employees.map((emp) => {
                  const empSchedules = schedules.filter(s => s.employeeId === emp.id);
                  return (
                    <div key={emp.id} className="flex border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/80 transition-colors group">
                      <div className="w-64 flex-shrink-0 p-4 border-r border-gray-100 dark:border-gray-700 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold overflow-hidden border border-primary/20">
                          {emp.profilePhoto ? (
                            <img src={emp.profilePhoto} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            emp.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{emp.name}</p>
                          <p className="text-xs text-gray-500 truncate">{emp.department || 'Employee'}</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 relative bg-white dark:bg-gray-800/20">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {hours.map(h => (
                            <div key={h} className="flex-1 border-l border-gray-100 dark:border-gray-700/30"></div>
                          ))}
                        </div>
                        
                        {/* Schedule Blocks */}
                        <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-[70%]">
                          {empSchedules.map(sched => {
                            // Only show if between 8 AM and 7 PM (19:00)
                            const [sH] = sched.startTime.split(':').map(Number);
                            const [eH] = sched.endTime.split(':').map(Number);
                            if (eH <= 8 || sH >= 19) return null;
                            
                            const pos = getLeftAndWidth(sched.startTime, sched.endTime);
                            const isCurrentUser = user && (user.id === sched.employeeId || user._id === sched.employeeId);
                            
                            return (
                              <div 
                                key={sched.id}
                                className={`absolute top-0 bottom-0 rounded-md border text-xs px-2 py-1 overflow-hidden transition-all hover:z-10 hover:shadow-md cursor-pointer group/block ${getTypeColor(sched.type)}`}
                                style={{ left: pos.left, width: pos.width }}
                                title={`${sched.title} (${sched.startTime} - ${sched.endTime})`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold truncate">{sched.title}</span>
                                  {isCurrentUser && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDelete(sched.id); }}
                                      className="opacity-0 group-hover/block:opacity-100 p-0.5 rounded text-red-500 hover:bg-white/50 transition-opacity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] opacity-80 truncate">{sched.startTime} - {sched.endTime}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

    {/* Add Schedule Modal */}
    {isModalOpen && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Schedule</h3>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddSchedule} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sync with Design Team"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select 
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Work">Focused Work</option>
                  <option value="Out of Office">Out of Office</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input 
                  type="date" 
                  disabled
                  value={format(selectedDate, "yyyy-MM-dd")}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Change main view date</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="time" 
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="time" 
                    required
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Additional details..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
            
            <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Schedule"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
}
