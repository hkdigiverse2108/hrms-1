"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { API_URL } from "@/lib/config";
import dayjs from "dayjs";
import { Calendar as CalendarIcon, Clock, User, Mail, MessageSquare, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PublicBookingPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;

  const [employee, setEmployee] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    attendeeName: "",
    attendeeEmail: "",
    title: "",
    description: ""
  });

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState<dayjs.Dayjs>(dayjs());

  useEffect(() => {
    if (employeeId) {
      fetchDetails();
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId && selectedDate) {
      fetchSlots();
    }
  }, [employeeId, selectedDate]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch employee info
      const empRes = await fetch(`${API_URL}/employees/${employeeId}`);
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployee(empData);
      }

      // Fetch scheduling config
      const configRes = await fetch(`${API_URL}/api/appointments/config/${employeeId}`);
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }
    } catch (err) {
      console.error("Error fetching details:", err);
      toast.error("Failed to load scheduling page.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSlots = async () => {
    setIsLoadingSlots(true);
    try {
      const dateStr = selectedDate.format("YYYY-MM-DD");
      const res = await fetch(`${API_URL}/api/appointments/public/slots?employeeId=${employeeId}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!form.attendeeName || !form.attendeeEmail || !form.title) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsBooking(true);
    try {
      const payload = {
        employeeId,
        date: selectedDate.format("YYYY-MM-DD"),
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        title: form.title,
        description: form.description,
        attendeeName: form.attendeeName,
        attendeeEmail: form.attendeeEmail
      };

      const res = await fetch(`${API_URL}/api/appointments/public/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setBookingSuccess(true);
        setBookModalOpen(false);
        toast.success("Appointment booked successfully!");
        fetchSlots();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Failed to book appointment.");
      }
    } catch (err) {
      toast.error("Error connecting to server.");
    } finally {
      setIsBooking(false);
    }
  };

  // Generate calendar days for current month view
  const generateCalendarDays = () => {
    const startOfMonth = currentMonth.startOf("month");
    const endOfMonth = currentMonth.endOf("month");
    const daysInMonth = currentMonth.daysInMonth();
    
    // Day of the week startOfMonth falls on (0 = Sunday, 6 = Saturday)
    const startDayOfWeek = startOfMonth.day();
    
    const days = [];
    
    // Pad previous month's days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(startOfMonth.subtract(i + 1, "day"));
    }
    
    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(startOfMonth.date(i));
    }
    
    return days;
  };

  const format12Hour = (timeStr: string) => {
    if (!timeStr) return "";
    return dayjs(`2000-01-01 ${timeStr}`).format("h:mm A");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-brand-teal mx-auto" />
          <p className="text-slate-500 font-medium">Loading scheduler...</p>
        </div>
      </div>
    );
  }

  if (!config || !config.active || !employee) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-xl w-full space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-[28px] font-normal text-slate-900 tracking-tight">
              Appointment not found
            </h1>
            <p className="text-[14px] text-slate-600 font-normal leading-relaxed">
              The appointment may have been deleted or the link may be incorrect
            </p>
          </div>

          {/* Marketing Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-5 text-center shadow-sm">
            <h2 className="text-[18px] font-normal text-slate-800">
              Online appointment scheduling by Google Calendar
            </h2>
            <p className="text-[14px] text-slate-600 font-normal leading-relaxed max-w-md mx-auto">
              Take the pain out of scheduling appointments by integrating your own dedicated booking page with Google Calendar.
            </p>
            <div className="pt-2">
              <a 
                href="https://support.google.com/calendar/answer/10729749" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[14px] text-blue-600 hover:text-blue-800 font-medium underline transition-colors"
              >
                Learn more about Google Calendar appointment scheduling
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        
        {/* Left Info Panel */}
        <div className="md:w-2/5 bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div className="space-y-6">
            <div>
              <span className="bg-brand-teal/20 text-brand-teal text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Book Meeting
              </span>
              <h1 className="text-2xl font-bold mt-4">{employee.name}</h1>
              {employee.designation && (
                <p className="text-slate-400 text-sm mt-1">{employee.designation}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-300">
                <Clock className="w-5 h-5 text-brand-teal shrink-0" />
                <span className="text-sm font-medium">{config.duration} Minute Appointment</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <CalendarIcon className="w-5 h-5 text-brand-teal shrink-0" />
                <span className="text-sm font-medium">India Standard Time (IST)</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-4">
              Select a date and time slot from the calendar to confirm your appointment. A confirmation email and invite will be sent.
            </p>
          </div>

          <div className="mt-8 text-xs text-slate-500 border-t border-slate-800/80 pt-4">
            Powered by HRMS Scheduler
          </div>
        </div>

        {/* Right Calendar & Slot Selector */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 bg-white">
          
          {/* Calendar Picker */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-base">
                {currentMonth.format("MMMM YYYY")}
              </h2>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center select-none">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="text-xs font-semibold text-slate-400 py-1">
                  {day}
                </div>
              ))}
              
              {calendarDays.map((day, idx) => {
                const isSelected = day.isSame(selectedDate, "day");
                const isCurrentMonth = day.month() === currentMonth.month();
                const isPast = day.isBefore(dayjs().startOf("day"));
                const weekday = day.format("dddd");
                const isAvailableWeekday = (config.availability[weekday] || []).length > 0;
                const isDisabled = isPast || !isAvailableWeekday;

                return (
                  <button
                    key={idx}
                    disabled={isDisabled}
                    onClick={() => setSelectedDate(day)}
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-brand-teal text-white shadow-md shadow-brand-teal/20"
                        : isDisabled
                        ? "text-slate-300 cursor-not-allowed"
                        : isCurrentMonth
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {day.date()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots Display */}
          <div className="w-full md:w-56 flex flex-col shrink-0">
            <h3 className="font-bold text-slate-800 text-sm mb-3">
              {selectedDate.format("dddd, MMMM D")}
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[300px] md:max-h-full pr-1 space-y-2 custom-scrollbar">
              {isLoadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-teal" />
                  <span className="text-xs">Fetching slots...</span>
                </div>
              ) : bookingSuccess ? (
                <div className="text-center py-8 space-y-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800">
                  <CheckCircle className="w-10 h-10 mx-auto text-emerald-600" />
                  <h4 className="font-bold text-sm">Booking Confirmed!</h4>
                  <p className="text-xs text-emerald-600">Your appointment has been successfully scheduled.</p>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 w-full mt-2"
                    onClick={() => {
                      setBookingSuccess(false);
                      setForm({ attendeeName: "", attendeeEmail: "", title: "", description: "" });
                    }}
                  >
                    Book Another Slot
                  </Button>
                </div>
              ) : slots.length > 0 ? (
                slots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setBookModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold border border-brand-teal/20 bg-brand-teal/5 text-brand-teal rounded-lg hover:bg-brand-teal hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {format12Hour(slot.start)}
                  </button>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No slots available on this day.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Booking Form Modal */}
      {selectedSlot && (
        <Dialog open={bookModalOpen} onOpenChange={setBookModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Confirm Appointment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3 text-slate-700">
              
              {/* Meeting Info Summary */}
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Host:</span>
                  <span className="font-bold">{employee.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Date:</span>
                  <span className="font-semibold">{selectedDate.format("MMMM D, YYYY")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Time:</span>
                  <span className="font-bold text-brand-teal">
                    {format12Hour(selectedSlot.start)} - {format12Hour(selectedSlot.end)} (IST)
                  </span>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Your Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-teal"
                      value={form.attendeeName}
                      onChange={(e) => setForm({ ...form, attendeeName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Your Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-teal"
                      value={form.attendeeEmail}
                      onChange={(e) => setForm({ ...form, attendeeEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Meeting Subject *</label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="E.g., Design Review, Discussion"
                      className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-teal"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Additional Notes (Optional)</label>
                  <textarea
                    placeholder="Provide any details that will help prepare for the meeting."
                    className="w-full p-3 text-xs border rounded-lg min-h-[70px] focus:outline-none focus:ring-1 focus:ring-brand-teal"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setBookModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-brand-teal text-white hover:bg-brand-teal/90"
                size="sm"
                onClick={handleBook}
                disabled={isBooking}
              >
                {isBooking ? "Confirming..." : "Confirm Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
