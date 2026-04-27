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
import dayjs from "dayjs";
 
interface RequestPunchOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPunchedIn: boolean;
  onGoToPunchOut: () => void;
}
 
export function RequestPunchOutDialog({ open, onOpenChange, isPunchedIn, onGoToPunchOut }: RequestPunchOutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
        <div className="sr-only">
          <DialogTitle>Request Punch Out</DialogTitle>
          <DialogDescription>Submit a request to recover your missing punch-out time or view required actions.</DialogDescription>
        </div>
        <div className="p-8 relative">
 
          {isPunchedIn ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-[#FFF7ED] rounded-full flex items-center justify-center mb-8">
                <div className="text-[#9A3412]">
                   <LogOut className="w-10 h-10" />
                </div>
              </div>
              
              <h2 className="text-[22px] font-bold text-[#111827] mb-3 text-center">Punch out required first</h2>
              <p className="text-[15px] text-[#6B7280] leading-[1.6] mb-8 text-center px-6">
                Before sending a forgot punch-out request, you need to complete today's punch out entry. After that, you can continue with the recovery request.
              </p>
 
              <div className="w-full bg-[#ECFDF5] border border-[#D1FAE5] rounded-xl p-5 mb-8 flex gap-4 items-start">
                <div className="mt-0.5">
                  <div className="w-5 h-5 rounded-full border-2 border-[#065F46] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[#065F46]">i</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#064E3B] mb-1 leading-tight">Why this appears: Your attendance record is still active.</h4>
                  <p className="text-[13px] text-[#065F46] leading-snug">
                    The system only allows forgot punch-out recovery after a punch out has already been recorded.
                  </p>
                </div>
              </div>
 
              <div className="w-full space-y-6 mb-10">
                <h4 className="text-[13px] font-bold text-[#374151] mb-4">Required actions</h4>
                
                <div className="space-y-0">
                  <div className="flex items-center gap-4 relative">
                    <div className="absolute left-[14px] top-8 w-[1.5px] h-8 bg-[#F3F4F6]"></div>
                    <div className="w-8 h-8 bg-[#00A389] rounded-full flex items-center justify-center text-white text-sm font-bold z-10 shadow-sm shadow-[#00A389]/20">1</div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-[15px] font-bold text-[#111827]">Punch out for today</span>
                      <span className="text-[12px] font-bold bg-[#FFEDD5] text-[#9A3412] px-3 py-1 rounded-full">Pending</span>
                    </div>
                  </div>
 
                  <div className="flex items-center gap-4 mt-8">
                    <div className="w-8 h-8 bg-[#F0FDF4] rounded-full flex items-center justify-center text-[#D1FAE5] text-sm font-bold border border-[#F3F4F6]">2</div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-[15px] font-bold text-[#9CA3AF]">Open forgot punch-out request</span>
                      <div className="flex items-center gap-2 bg-[#F3F4F6] text-[#9CA3AF] px-3 py-1 rounded-full border border-[#E5E7EB]">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-[12px] font-bold">Locked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
 
              <div className="flex w-full gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-[52px] rounded-xl font-bold text-[#374151] border-[#E5E7EB] hover:bg-gray-50 text-[15px]"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-[52px] rounded-xl font-bold bg-[#00A389] hover:bg-[#008F78] text-white text-[15px] flex items-center justify-center gap-2"
                  onClick={onGoToPunchOut}
                >
                  Go to punch out <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="w-20 h-20 bg-[#F0FDF4] rounded-full flex items-center justify-center mb-8">
                <div className="text-[#065F46]">
                   <Clock className="w-10 h-10" />
                </div>
              </div>
              
              <h2 className="text-[22px] font-bold text-[#111827] mb-2 text-center">Forgot Punch-Out Request</h2>
              <p className="text-[15px] text-[#6B7280] leading-[1.6] mb-10 text-center px-6">
                Submit a request to recover your missing punch-out time. This will be sent to your manager for approval.
              </p>
 
              <div className="w-full space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[14px] font-bold text-[#374151]">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF]" />
                    <Input 
                      disabled 
                      value={dayjs().format("MMMM DD, YYYY")} 
                      className="pl-11 h-[52px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[#374151] font-medium text-[15px] disabled:opacity-100" 
                    />
                  </div>
                </div>
 
                <div className="space-y-2.5">
                  <label className="text-[14px] font-bold text-[#374151]">
                    Recorded Punch-In
                  </label>
                  <div className="relative">
                    <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF]" />
                    <Input 
                      disabled 
                      value="09:00 AM" 
                      className="pl-11 h-[52px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[#374151] font-medium text-[15px] disabled:opacity-100" 
                    />
                  </div>
                </div>
 
                <div className="space-y-2.5">
                  <label className="text-[14px] font-bold text-[#374151]">
                    Recover Punch-Out Time <span className="text-red-500">*</span>
                  </label>
                  <Select>
                    <SelectTrigger className="h-[52px] bg-white border-[#E5E7EB] rounded-xl px-4 font-medium text-[#9CA3AF] text-[15px] focus:ring-0 focus:border-[#00A389]">
                      <div className="flex items-center gap-3">
                        <LogOut className="w-[18px] h-[18px] text-[#9CA3AF]" />
                        <SelectValue placeholder="Select time..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E5E7EB] shadow-lg">
                      <SelectItem value="18:00">06:00 PM</SelectItem>
                      <SelectItem value="18:30">06:30 PM</SelectItem>
                      <SelectItem value="19:00">07:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
 
                <div className="space-y-2.5">
                  <label className="text-[14px] font-bold text-[#374151]">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <Select defaultValue="forgot">
                    <SelectTrigger className="h-[52px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl px-4 font-medium text-[#374151] text-[15px] focus:ring-0 focus:border-[#00A389]">
                      <SelectValue placeholder="Reason for request" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E5E7EB] shadow-lg">
                      <SelectItem value="forgot">Forgot to punch out</SelectItem>
                      <SelectItem value="system">System error</SelectItem>
                      <SelectItem value="other">Other reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
 
              <div className="flex w-full gap-4 mt-12">
                <Button 
                  variant="outline" 
                  className="flex-1 h-[52px] rounded-xl font-bold text-[#374151] border-[#E5E7EB] hover:bg-gray-50 text-[15px]"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-[52px] rounded-xl font-bold bg-[#00A389] hover:bg-[#008F78] text-white text-[15px] shadow-lg shadow-[#00A389]/10"
                  onClick={() => onOpenChange(false)}
                >
                  Submit Request
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
