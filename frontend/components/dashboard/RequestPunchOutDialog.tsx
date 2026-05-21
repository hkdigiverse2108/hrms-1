"use client";
 
import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  Info, 
  Clock, 
  Calendar, 
  ChevronDown, 
  ArrowRight,
  Lock,
  LogIn
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/config";
import { formatTime12h } from "@/lib/utils";
import dayjs from "dayjs";
 
interface RequestPunchOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPunchedIn: boolean;
  punchInTime: string;
  onGoToPunchOut: () => void;
  employeeId: string;
  employeeName: string;
}
 
export function RequestPunchOutDialog({ open, onOpenChange, isPunchedIn, punchInTime, onGoToPunchOut, employeeId, employeeName }: RequestPunchOutDialogProps) {
  const [formData, setFormData] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    punchOutTime: "18:30",
    reason: "forgot",
    otherReason: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAttendance, setUserAttendance] = useState<any[]>([]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        date: dayjs().format("YYYY-MM-DD"),
        punchOutTime: "18:30",
        reason: "forgot",
        otherReason: ""
      });
    }
  }, [open]);

  // Fetch all attendance for this employee when open
  useEffect(() => {
    if (open && employeeId) {
      fetch(`${API_URL}/attendance`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const filtered = data.filter((a: any) => a.employeeId === employeeId);
            setUserAttendance(filtered);
          }
        })
        .catch(err => console.error("Error fetching user attendance for recovery:", err));
    }
  }, [open, employeeId]);

  // Find record matching the selected date
  const selectedRecord = useMemo(() => {
    return userAttendance.find(a => {
      const aDateStr = a.date?.split('T')[0]?.split(' ')[0];
      return aDateStr === formData.date;
    });
  }, [userAttendance, formData.date]);

  // Format the check-in time for the recorded punch-in
  const recordedPunchIn = useMemo(() => {
    if (!selectedRecord) return "--:--";
    const checkIn = selectedRecord.checkIn;
    if (!checkIn || checkIn === "--" || checkIn === "--:--") return "--:--";
    return formatTime12h(checkIn);
  }, [selectedRecord]);

  // Note: formData.punchOutTime ("HH:mm") binds directly to the unified HTML5 time input.

  // Validate if selected punch-out time is earlier than or equal to recorded punch-in time
  const isTimeInvalid = useMemo(() => {
    if (!recordedPunchIn || recordedPunchIn === "--:--" || recordedPunchIn === "Not Started") return false;
    
    const parseToMinutes = (timeStr: string, isCheckIn = true) => {
      const dummyDateStr = `2000-01-01 ${timeStr}`;
      const format = isCheckIn ? 'YYYY-MM-DD hh:mm A' : 'YYYY-MM-DD HH:mm';
      const parsed = dayjs(dummyDateStr, format);
      if (parsed.isValid()) {
        return parsed.hour() * 60 + parsed.minute();
      }
      return 0;
    };
    
    const punchInMinutes = parseToMinutes(recordedPunchIn, true);
    const punchOutMinutes = parseToMinutes(formData.punchOutTime, false);
    
    return punchOutMinutes <= punchInMinutes;
  }, [recordedPunchIn, formData.punchOutTime]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formattedTime = dayjs(`2000-01-01 ${formData.punchOutTime}`, 'YYYY-MM-DD HH:mm').format('HH:mm:ss');
      const res = await fetch(`${API_URL}/time-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          employee_name: employeeName,
          date: formData.date,
          late_minutes: 0,
          recovery_minutes: 0,
          reason: `Forgot Punch-Out. Actual Punch-Out: ${formattedTime}. Reason: ${formData.reason === 'other' ? formData.otherReason : formData.reason}`,
          status: "pending"
        })
      });
      
      if (res.ok) {
        onOpenChange(false);
      } else {
        alert("Failed to submit request.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-[20px]">
        <div className="sr-only">
          <DialogTitle>Request Punch Out</DialogTitle>
          <DialogDescription>Submit a request to recover your missing punch-out time or view required actions.</DialogDescription>
        </div>
        <div className="p-6 relative">
 
          {isPunchedIn ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="w-14 h-14 bg-[#FFF7ED] rounded-full flex items-center justify-center mb-3">
                <div className="text-[#9A3412]">
                   <LogOut className="w-6 h-6" />
                </div>
              </div>
              
              <h2 className="text-[18px] font-bold text-[#111827] mb-1.5 text-center">Punch out required first</h2>
              <p className="text-[13px] text-[#6B7280] leading-[1.5] mb-5 text-center px-4">
                Before sending a forgot punch-out request, you need to complete today's punch out entry. After that, you can continue with the recovery request.
              </p>
 
              <div className="w-full bg-[#ECFDF5] border border-[#D1FAE5] rounded-lg p-4 mb-5 flex gap-3 items-start">
                <div className="mt-0.5">
                  <div className="w-4 h-4 rounded-full border-2 border-[#065F46] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-[#065F46]">i</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-[#064E3B] mb-0.5 leading-tight">Why this appears: Your attendance record is still active.</h4>
                  <p className="text-[12px] text-[#065F46] leading-snug">
                    The system only allows forgot punch-out recovery after a punch out has already been recorded.
                  </p>
                </div>
              </div>
 
              <div className="w-full space-y-4 mb-6">
                <h4 className="text-[12px] font-bold text-[#374151] mb-2">Required actions</h4>
                
                <div className="space-y-0">
                  <div className="flex items-center gap-3 relative">
                    <div className="absolute left-[11px] top-6 w-[1.5px] h-6 bg-[#F3F4F6]"></div>
                    <div className="w-6 h-6 bg-[#00A389] rounded-full flex items-center justify-center text-white text-xs font-bold z-10 shadow-sm shadow-[#00A389]/20">1</div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-[14px] font-bold text-[#111827]">Punch out for today</span>
                      <span className="text-[11px] font-bold bg-[#FFEDD5] text-[#9A3412] px-2.5 py-0.5 rounded-full">Pending</span>
                    </div>
                  </div>
 
                  <div className="flex items-center gap-3 mt-6">
                    <div className="w-6 h-6 bg-[#F0FDF4] rounded-full flex items-center justify-center text-[#D1FAE5] text-xs font-bold border border-[#F3F4F6]">2</div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-[14px] font-bold text-[#9CA3AF]">Open forgot punch-out request</span>
                      <div className="flex items-center gap-1.5 bg-[#F3F4F6] text-[#9CA3AF] px-2.5 py-0.5 rounded-full border border-[#E5E7EB]">
                        <Lock className="w-3 h-3" />
                        <span className="text-[11px] font-bold">Locked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
 
              <div className="flex w-full gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-[42px] rounded-lg font-bold text-[#374151] border-[#E5E7EB] hover:bg-gray-50 text-[14px]"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-[42px] rounded-lg font-bold bg-[#00A389] hover:bg-[#008F78] text-white text-[14px] flex items-center justify-center gap-1.5"
                  onClick={onGoToPunchOut}
                >
                  Go to punch out <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="w-14 h-14 bg-[#F0FDF4] rounded-full flex items-center justify-center mb-3">
                <div className="text-[#065F46]">
                   <Clock className="w-6 h-6" />
                </div>
              </div>
              
              <h2 className="text-[18px] font-bold text-[#111827] mb-1.5 text-center">Forgot Punch-Out Request</h2>
              <p className="text-[13px] text-[#6B7280] leading-[1.5] mb-5 text-center px-4">
                Submit a request to recover your missing punch-out time. This will be sent to your manager for approval.
              </p>
 
              <div className="w-full space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#374151]">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    <Input 
                      type="date"
                      value={formData.date} 
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      max={dayjs().format("YYYY-MM-DD")}
                      className="pl-10 h-[42px] bg-white border-[#E5E7EB] rounded-lg text-[#374151] font-medium text-[14px] focus:ring-0 focus:border-[#00A389] cursor-pointer" 
                    />
                  </div>
                </div>
 
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#374151]">
                    Recorded Punch-In
                  </label>
                  <div className="relative">
                    <LogIn className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                    <Input 
                      disabled 
                      value={recordedPunchIn} 
                      className="pl-10 h-[42px] bg-[#F9FAFB] border-[#F3F4F6] rounded-lg text-[#374151] font-medium text-[14px] disabled:opacity-100" 
                    />
                  </div>
                </div>
 
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#374151] flex justify-between items-center">
                    <span>Recover Punch-Out Time <span className="text-red-500">*</span></span>
                    {isTimeInvalid && (
                      <span className="text-red-500 text-[11px] font-semibold animate-pulse">
                        Must be after punch-in time
                      </span>
                    )}
                  </label>
                  
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    <Input 
                      type="time"
                      value={formData.punchOutTime} 
                      onChange={(e) => setFormData({...formData, punchOutTime: e.target.value})}
                      className="pl-10 h-[42px] bg-white border-[#E5E7EB] rounded-lg text-[#374151] font-medium text-[14px] focus:ring-0 focus:border-[#00A389] cursor-pointer" 
                    />
                  </div>
                </div>
 
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#374151]">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <Select 
                    value={formData.reason} 
                    onValueChange={(val) => setFormData({...formData, reason: val})}
                  >
                    <SelectTrigger className="h-[42px] bg-[#F9FAFB] border-[#F3F4F6] rounded-lg px-3.5 font-medium text-[#374151] text-[14px] focus:ring-0 focus:border-[#00A389]">
                      <SelectValue placeholder="Reason for request" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-[#E5E7EB] shadow-lg">
                      <SelectItem value="forgot">Forgot to punch out</SelectItem>
                      <SelectItem value="system">System error</SelectItem>
                      <SelectItem value="other">Other reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
 
                {formData.reason === 'other' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[13px] font-bold text-[#374151]">
                      Specific Reason <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      placeholder="Please specify..."
                      value={formData.otherReason}
                      onChange={(e) => setFormData({...formData, otherReason: e.target.value})}
                      className="h-[42px] bg-white border-[#E5E7EB] rounded-lg px-3.5 font-medium text-[#374151] text-[14px] focus:ring-0 focus:border-[#00A389]"
                    />
                  </div>
                )}
              </div>
 
              <div className="flex w-full gap-3 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1 h-[42px] rounded-lg font-bold text-[#374151] border-[#E5E7EB] hover:bg-gray-50 text-[14px]"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-[42px] rounded-lg font-bold bg-[#00A389] hover:bg-[#008F78] text-white text-[14px] shadow-lg shadow-[#00A389]/10 disabled:opacity-50"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isTimeInvalid || (formData.reason === 'other' && !formData.otherReason)}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
