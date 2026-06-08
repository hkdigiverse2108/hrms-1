"use client";
 
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  Clock, 
  Calendar, 
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
import dayjs from "dayjs";
import { toast } from "sonner";
 
interface RequestPunchOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPunchedIn: boolean;
  punchInTime: string;
  onGoToPunchOut: () => void;
  employeeId: string;
  employeeName: string;
  isForced?: boolean;
  punchInDate?: string;
  onSubmitSuccess?: () => void;
}
 
export function RequestPunchOutDialog({ 
  open, 
  onOpenChange, 
  isPunchedIn, 
  punchInTime, 
  onGoToPunchOut, 
  employeeId, 
  employeeName,
  isForced = false,
  punchInDate,
  onSubmitSuccess
}: RequestPunchOutDialogProps) {
  const [formData, setFormData] = useState({
    date: punchInDate || dayjs().format("YYYY-MM-DD"),
    punchOutTime: "18:30",
    reason: "forgot",
    otherReason: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      date: punchInDate || dayjs().format("YYYY-MM-DD")
    }));
  }, [punchInDate]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/time-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          employee_name: employeeName,
          date: formData.date,
          late_minutes: 0,
          recovery_minutes: 0,
          reason: `Forgot Punch-Out. Actual Punch-Out: ${formData.punchOutTime}. Reason: ${formData.reason === 'other' ? formData.otherReason : formData.reason}`,
          status: "pending"
        })
      });
      
      if (res.ok) {
        onOpenChange(false);
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      } else {
        toast.error("Failed to submit request.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting request.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]"
        showCloseButton={!isForced}
        onPointerDownOutside={(e) => isForced && e.preventDefault()}
        onEscapeKeyDown={(e) => isForced && e.preventDefault()}
      >
        <div className="sr-only">
          <DialogTitle>Request Punch Out</DialogTitle>
          <DialogDescription>Submit a request to recover your missing punch-out time or view required actions.</DialogDescription>
        </div>
        <div className="p-6 relative">
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center mb-4">
              <div className="text-[#065F46]">
                 <Clock className="w-8 h-8" />
              </div>
            </div>
            
            <h2 className="text-[20px] font-bold text-[#111827] mb-1 text-center">Forgot Punch-Out Request</h2>
            <p className="text-[14px] text-[#6B7280] leading-[1.5] mb-6 text-center px-4">
              Submit a request to recover your missing punch-out time. This will be sent to your manager for approval.
            </p>

            <div className="w-full space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#374151]">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#9CA3AF] pointer-events-none" />
                  <Input 
                    type="date"
                    value={formData.date} 
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    style={{ accentColor: '#00A389' }}
                    className="pl-11 pr-4 h-[46px] bg-white border-[#E5E7EB] rounded-xl text-[#374151] font-medium text-[14px] focus:ring-0 focus:border-[#00A389] w-full cursor-pointer" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#374151]">
                  Recorded Punch-In
                </label>
                <div className="relative">
                  <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#9CA3AF]" />
                  <Input 
                    disabled 
                    value={punchInTime} 
                    className="pl-11 h-[46px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[#374151] font-medium text-[14px] disabled:opacity-100" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#374151]">
                  Recover Punch-Out Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LogOut className="absolute left-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#9CA3AF] pointer-events-none" />
                  <Input 
                    type="time"
                    value={formData.punchOutTime} 
                    onChange={(e) => setFormData({...formData, punchOutTime: e.target.value})}
                    style={{ accentColor: '#00A389' }}
                    className="pl-11 pr-4 h-[46px] bg-white border-[#E5E7EB] rounded-xl text-[#374151] font-medium text-[14px] focus:ring-0 focus:border-[#00A389] w-full cursor-pointer" 
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
                  <SelectTrigger className="h-[46px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl px-4 font-medium text-[#374151] text-[14px] focus:ring-0 focus:border-[#00A389]">
                    <SelectValue placeholder="Reason for request" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E5E7EB] shadow-lg">
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
                    className="h-[46px] bg-white border-[#E5E7EB] rounded-xl px-4 font-medium text-[#374151] text-[14px] focus:ring-0 focus:border-[#00A389]"
                  />
                </div>
              )}
            </div>

            <div className="flex w-full gap-4 mt-8">
              {!isForced && (
                <Button 
                  variant="outline" 
                  className="flex-1 h-[46px] rounded-xl font-bold text-[#374151] border-[#E5E7EB] hover:bg-gray-50 text-[14px]"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              )}
              <Button 
                className="flex-1 h-[46px] rounded-xl font-bold bg-[#00A389] hover:bg-[#008F78] text-white text-[14px] shadow-lg shadow-[#00A389]/10 disabled:opacity-50"
                onClick={handleSubmit}
                disabled={isSubmitting || (formData.reason === 'other' && !formData.otherReason)}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
