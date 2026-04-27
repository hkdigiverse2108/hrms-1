"use client";
 
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  ChevronDown
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
 
interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEvent: (event: any) => void;
  initialData?: any;
}
 
export function AddEventDialog({ open, onOpenChange, onAddEvent, initialData }: AddEventDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [eventType, setEventType] = useState("meeting");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("11:00 AM");
  const [description, setDescription] = useState("");
 
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setEventType(initialData.type || "meeting");
      setDate(initialData.date ? parseISO(initialData.date) : new Date());
      setStartTime(initialData.time || "10:00 AM");
      setDescription(initialData.description === "No description provided." ? "" : initialData.description || "");
    } else {
      setTitle("");
      setEventType("meeting");
      setDate(new Date());
      setStartTime("10:00 AM");
      setEndTime("11:00 AM");
      setDescription("");
    }
  }, [initialData, open]);
 
  const handleCreate = () => {
    if (!title || !date) {
      alert("Please enter a title and select a date.");
      return;
    }
 
    const newEvent = {
      title,
      type: eventType,
      date: format(date, "yyyy-MM-dd"),
      time: eventType === "birthday" ? "" : `${startTime}`,
      description: description || "No description provided."
    };
 
    onAddEvent(newEvent);
    onOpenChange(false);
  };
 
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
        <div className="sr-only">
          <DialogTitle>{initialData ? "Edit Event" : "Add New Event"}</DialogTitle>
          <DialogDescription>Fill in the details below to manage organization event.</DialogDescription>
        </div>
        
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="text-lg font-bold text-[#111827]">{initialData ? "Edit Event" : "Add New Event"}</h3>
        </div>
 
        <div className="p-6 space-y-5 bg-white">
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-[#374151]">Event Title</label>
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Marketing Planning" 
              className="h-[48px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[14px] placeholder:text-gray-400 focus:ring-0 focus:border-brand-teal" 
            />
          </div>
 
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#374151]">Event Type</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="h-[48px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[14px] focus:ring-0">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#374151]">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full h-[48px] justify-start text-left font-normal bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[14px]",
                      !date && "text-gray-400"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {date ? format(date, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
 
          {eventType !== "birthday" && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#374151]">Start Time</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="10:00 AM" 
                    className="pl-10 h-[48px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[14px] placeholder:text-gray-400 focus:ring-0" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#374151]">End Time</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="11:00 AM" 
                    className="pl-10 h-[48px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[14px] placeholder:text-gray-400 focus:ring-0" 
                  />
                </div>
              </div>
            </div>
          )}
 
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-[#374151]">Description (Optional)</label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Monthly marketing planning to discuss strategies and metrics with the team." 
              className="min-h-[100px] bg-[#F9FAFB] border-[#F3F4F6] rounded-xl text-[14px] py-3 placeholder:text-gray-400 focus:ring-0 resize-none" 
            />
          </div>
        </div>
 
        <div className="p-6 bg-[#F0FDF9] flex justify-end gap-3">
          <Button 
            variant="ghost" 
            className="h-[44px] px-6 rounded-lg font-bold text-gray-500 hover:bg-white/50 border border-transparent"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            className="h-[44px] px-6 rounded-lg font-bold bg-[#00A389] hover:bg-[#008F78] text-white shadow-sm"
            onClick={handleCreate}
          >
            {initialData ? "Save Changes" : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
