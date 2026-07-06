"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { API_URL } from "@/lib/config";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function PublicBookingPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;

  const [employee, setEmployee] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [currentWeekStart, setCurrentWeekStart] = useState<dayjs.Dayjs>(dayjs().startOf("week").add(1, "day")); // Start on Monday
  const [weekSlots, setWeekSlots] = useState<{ [key: string]: any[] }>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedSlotDate, setSelectedSlotDate] = useState<dayjs.Dayjs | null>(null);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    attendeeEmail: ""
  });

  // Calendar month state for the mini calendar
  const [currentMonth, setCurrentMonth] = useState<dayjs.Dayjs>(dayjs());

  // Generate the 7 days of the week to display
  const weekDays = Array.from({ length: 7 }, (_, i) => currentWeekStart.add(i, "day"));

  useEffect(() => {
    if (employeeId) {
      fetchDetails();
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      fetchWeekSlots();
    }
  }, [employeeId, currentWeekStart]);

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

  const fetchWeekSlots = async () => {
    setIsLoadingSlots(true);
    try {
      const promises = weekDays.map(async (day) => {
        const dateStr = day.format("YYYY-MM-DD");
        const res = await fetch(`${API_URL}/api/appointments/public/slots?employeeId=${employeeId}&date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          return { date: dateStr, slots: data.slots || [] };
        }
        return { date: dateStr, slots: [] };
      });
      const results = await Promise.all(promises);
      const slotMap: { [key: string]: any[] } = {};
      results.forEach(r => {
        slotMap[r.date] = r.slots;
      });
      setWeekSlots(slotMap);
    } catch (err) {
      console.error("Error fetching slots:", err);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!form.firstName || !form.lastName || !form.attendeeEmail) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!selectedSlot || !selectedSlotDate) return;

    setIsBooking(true);
    try {
      const fullName = `${form.firstName} ${form.lastName}`;
      const payload = {
        employeeId,
        date: selectedSlotDate.format("YYYY-MM-DD"),
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        title: fullName, // Shows their first and last name on the host's calendar
        description: `Client: ${fullName}\nEmail: ${form.attendeeEmail}`,
        attendeeName: fullName,
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
        fetchWeekSlots();
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

  // Generate calendar days for current month view (mini calendar)
  const generateCalendarDays = () => {
    const startOfMonth = currentMonth.startOf("month");
    const startDayOfWeek = startOfMonth.day();
    const daysInMonth = currentMonth.daysInMonth();
    
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
    return dayjs(`2000-01-01 ${timeStr}`).format("h:mm a");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans select-none">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-brand-teal mx-auto" />
          <p className="text-slate-500 font-medium text-sm">Loading scheduler...</p>
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
              Online appointment scheduling
            </h2>
            <p className="text-[14px] text-slate-600 font-normal leading-relaxed max-w-md mx-auto">
              Take the pain out of scheduling appointments by integrating your own dedicated booking page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();
  const hostInitials = employee.name ? employee.name.charAt(0).toUpperCase() : "J";

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800 p-6 max-w-[1280px] mx-auto select-none">
      
      {/* ─── TOP BRAND HEADER ─── */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-teal text-white flex items-center justify-center font-semibold text-lg">
              {hostInitials}
            </div>
            <span className="text-[20px] font-medium text-slate-900">{employee.name}</span>
          </div>
          
          {/* Booking Page Title & Duration */}
          <div className="flex flex-col border-l border-slate-200 pl-6 py-1">
            <h1 className="text-[20px] font-normal text-slate-950 leading-tight">
              {config.title || "Appointment booking"}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{config.duration} min appointments</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN SCHEDULING INTERFACE ─── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[580px] bg-white">
        
        {/* LEFT COLUMN: MINI CALENDAR */}
        <div className="w-full lg:w-[280px] shrink-0 border-r border-slate-100 pr-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 pl-1">
            Select an appointment time
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-slate-800">
                {currentMonth.format("MMMM YYYY")}
              </span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
                  onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600 transition-colors"
                  onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                <div key={idx} className="text-[10px] font-semibold text-slate-400 py-1 uppercase">
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
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setSelectedDate(day);
                      // Align week grid view start dayjs date
                      setCurrentWeekStart(day.startOf("week").add(1, "day"));
                    }}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold mx-auto transition-all ${
                      isSelected
                        ? "bg-brand-teal text-white shadow-sm"
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
        </div>

        {/* RIGHT COLUMN: WEEKLY SLOTS COLUMNS */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Timezone and Week Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <span className="text-xs text-slate-500 font-medium">
              (GMT+05:30) India Standard Time - Kolkata
            </span>
            
            {/* Week Navigation */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                onClick={() => setCurrentWeekStart(currentWeekStart.subtract(7, "day"))}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700">
                {weekDays[0].format("MMM D")} – {weekDays[6].format("MMM D, YYYY")}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                onClick={() => setCurrentWeekStart(currentWeekStart.add(7, "day"))}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Booking Status Success Screen */}
          {bookingSuccess ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-sm text-center py-10 px-6 border border-emerald-100 bg-emerald-50/50 rounded-2xl space-y-4">
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Booking Confirmed!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your appointment has been successfully scheduled. A calendar invite has been sent to your email.
                </p>
                <Button
                  className="bg-brand-teal text-white hover:bg-brand-teal/90 rounded-full px-6 py-2 text-xs font-semibold shadow-sm w-full mt-2 h-9"
                  onClick={() => {
                    setBookingSuccess(false);
                    setForm({ firstName: "", lastName: "", attendeeEmail: "" });
                  }}
                >
                  Book Another Slot
                </Button>
              </div>
            </div>
          ) : (
            /* Slots Columns Grid */
            <div className="flex-1 overflow-x-auto select-none pt-4 custom-scrollbar">
              <div className="flex gap-4 min-w-[700px] h-full">
                
                {weekDays.map((day) => {
                  const dateStr = day.format("YYYY-MM-DD");
                  const slotsForDay = weekSlots[dateStr] || [];
                  const isDayToday = day.isSame(dayjs(), "day");
                  const isPast = day.isBefore(dayjs().startOf("day"));
                  
                  return (
                    <div key={dateStr} className="flex-1 flex flex-col items-center min-w-[90px]">
                      
                      {/* Day Column Header Label */}
                      <div className="text-center pb-5 flex flex-col items-center">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {day.format("ddd")}
                        </span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mt-1 transition-all ${
                          isDayToday ? "bg-brand-teal text-white shadow-sm" : "text-slate-800"
                        }`}>
                          {day.date()}
                        </div>
                      </div>
                      
                      {/* Slots or Lines Divider */}
                      <div className="w-full flex-1 flex flex-col gap-2.5 items-center justify-start pr-1 min-h-[350px]">
                        {isLoadingSlots ? (
                          <div className="w-full h-8 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-ping" />
                          </div>
                        ) : slotsForDay.length > 0 && !isPast ? (
                          slotsForDay.map((slot, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setSelectedSlotDate(day);
                                setBookModalOpen(true);
                              }}
                              className="w-full py-2 border border-brand-teal/20 bg-brand-teal/5 text-brand-teal font-semibold text-xs rounded-full hover:bg-brand-teal hover:text-white transition-all shadow-sm flex items-center justify-center"
                            >
                              {format12Hour(slot.start)}
                            </button>
                          ))
                        ) : (
                          // Divider line when unavailable (Google style)
                          <div className="w-8 h-0.5 bg-slate-200 mt-4 rounded-full shrink-0" />
                        )}
                      </div>

                    </div>
                  );
                })}

              </div>
            </div>
          )}

        </div>

      </div>

      {/* ─── CONFIRM BOOKING MODAL ─── */}
      {selectedSlot && selectedSlotDate && (
        <Dialog open={bookModalOpen} onOpenChange={setBookModalOpen}>
          <DialogContent className="sm:max-w-[420px] p-0 border-none bg-white rounded-2xl overflow-hidden shadow-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>{config.title || "Appointment booking"}</DialogTitle>
              <DialogDescription>Confirm your booking details and enter contact information.</DialogDescription>
            </DialogHeader>
            
            {/* Modal Body Container */}
            <div className="p-6 space-y-6 text-slate-700">
              
              {/* Heading Title & Date Info */}
              <div className="space-y-1.5">
                <h3 className="text-xl font-medium text-slate-900 leading-tight">
                  {config.title || "Appointment booking"}
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {selectedSlotDate.format("dddd, D MMMM")} · {format12Hour(selectedSlot.start)} – {format12Hour(selectedSlot.end)}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  (GMT+05:30) India Standard Time - Kolkata
                </p>
              </div>

              {/* Your Contact Info Section Header */}
              <div className="flex gap-3 items-center border-t border-slate-100 pt-4">
                <div className="text-slate-500 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-[14px] font-semibold text-slate-900">
                  Your contact info
                </h4>
              </div>

              {/* Form Input Fields */}
              <div className="space-y-4">
                
                {/* First name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">First name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#f1f3f4] border border-slate-200 focus:border-brand-teal focus:bg-white text-slate-900 text-sm font-semibold rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-brand-teal transition-all"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>

                {/* Surname */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Surname</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#f1f3f4] border border-slate-200 focus:border-brand-teal focus:bg-white text-slate-900 text-sm font-semibold rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-brand-teal transition-all"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>

                {/* Email address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Email address</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-[#f1f3f4] border border-slate-200 focus:border-brand-teal focus:bg-white text-slate-900 text-sm font-semibold rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-brand-teal transition-all"
                    value={form.attendeeEmail}
                    onChange={(e) => setForm({ ...form, attendeeEmail: e.target.value })}
                  />
                </div>

              </div>

            </div>

            {/* Modal Bottom Buttons */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
              <button
                type="button"
                className="text-xs font-semibold text-brand-teal hover:text-brand-teal/90 px-4 py-2 transition-colors rounded-full"
                onClick={() => setBookModalOpen(false)}
              >
                Cancel
              </button>
              <Button
                className="bg-brand-teal hover:bg-brand-teal/90 text-white font-semibold rounded-full px-6 h-9 text-xs shadow-sm"
                onClick={handleBook}
                disabled={isBooking}
              >
                {isBooking ? "Booking..." : "Book"}
              </Button>
            </div>

          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
