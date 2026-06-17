"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MessageSquare, Plus, User, Clock, Users, Pencil, Trash2, MapPin, Link as LinkIcon, Target, Flag, X, Search, Check, Loader2, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";

interface SmmMeetingDialogProps {
  client: any;
  onUpdate: () => void;
  userId?: string;
  userName?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  department?: string;
  designation?: string;
  profilePhoto?: string;
}

const formatDisplayDate = (dStr: string) => {
  if (!dStr) return '';
  try {
    let d = dStr.replace(' ', 'T');
    if (d.length === 10) d += 'T00:00';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return dStr;
    
    // Format to look like: 18 Jun 2026, 02:30 PM
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    };
    return dateObj.toLocaleString('en-GB', options).toUpperCase();
  } catch (e) {
    return dStr;
  }
};

// --- Multi-Select Employee Dropdown ---
function EmployeeMultiSelect({ 
  employees, 
  selectedIds, 
  onChange, 
  isLoading 
}: { 
  employees: EmployeeOption[]; 
  selectedIds: string[]; 
  onChange: (ids: string[]) => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    (emp.department || "").toLowerCase().includes(search.toLowerCase()) ||
    (emp.designation || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleEmployee = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeEmployee = (id: string) => {
    onChange(selectedIds.filter(sid => sid !== id));
  };

  const selectedEmployees = employees.filter(e => selectedIds.includes(e.id));

  return (
    <div ref={containerRef} className="relative">
      {/* Selected employees as badge chips */}
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selectedEmployees.map(emp => (
            <Badge 
              key={emp.id} 
              variant="outline" 
              className="bg-brand-teal/10 text-brand-teal border-brand-teal/30 text-[10px] py-0 px-1.5 pr-0.5 gap-1 font-medium"
            >
              {emp.name}
              <button 
                onClick={(e) => { e.stopPropagation(); removeEmployee(emp.id); }}
                className="ml-0.5 hover:bg-brand-teal/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
        <Input
          placeholder={isLoading ? "Loading employees..." : "Search employees..."}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="bg-white border-slate-200 focus-visible:ring-brand-teal h-8 text-xs pl-7"
          disabled={isLoading}
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Dropdown list */}
      {isOpen && !isLoading && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[180px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              No employees found
            </div>
          ) : (
            filtered.map(emp => {
              const isSelected = selectedIds.includes(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => toggleEmployee(emp.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors text-xs hover:bg-slate-50 ${isSelected ? 'bg-brand-teal/5' : ''}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-brand-teal border-brand-teal text-white' : 'border-slate-300'}`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700 truncate">{emp.name}</div>
                    {(emp.department || emp.designation) && (
                      <div className="text-[10px] text-slate-400 truncate">
                        {[emp.designation, emp.department].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// --- Free Slot Badge ---
function FreeSlotBadge({ slot, onClick }: { slot: { start: string; end: string }; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-150 cursor-pointer shadow-sm hover:shadow"
      title="Click to use this time slot"
    >
      <Clock className="w-3 h-3" />
      {slot.start} – {slot.end}
    </button>
  );
}

export function SmmMeetingDialog({ client, onUpdate, userId, userName }: SmmMeetingDialogProps) {
  const { confirm } = useConfirm();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [editDate, setEditDate] = useState("");

  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState("");
  const [status, setStatus] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [duration, setDuration] = useState("");
  const [link, setLink] = useState("");

  const [editType, setEditType] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAttendees, setEditAttendees] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNextSteps, setEditNextSteps] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLink, setEditLink] = useState("");

  // New state: employees list, selected employee IDs, free slots
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [freeSlots, setFreeSlots] = useState<{ start: string; end: string }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Edit mode employee selection
  const [editSelectedEmployeeIds, setEditSelectedEmployeeIds] = useState<string[]>([]);
  const [editFreeSlots, setEditFreeSlots] = useState<{ start: string; end: string }[]>([]);
  const [isLoadingEditSlots, setIsLoadingEditSlots] = useState(false);

  // Time Validation Constants
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const nowTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const isAddToday = meetingDate === todayStr;
  const isEditToday = editDate === todayStr;

  // Fetch employees when dialog opens
  useEffect(() => {
    if (isOpen && employees.length === 0) {
      fetchEmployees();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const data = await res.json();
        const active = data
          .filter((e: any) => e.status?.toLowerCase() !== "inactive")
          .map((e: any) => ({
            id: e.id,
            name: e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
            department: e.department || '',
            designation: e.designation || '',
            profilePhoto: e.profilePhoto || '',
          }));
        setEmployees(active);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Fetch free slots when date + attendees change (add mode)
  const fetchFreeSlots = useCallback(async (empIds: string[], dateStr: string) => {
    if (!empIds.length || !dateStr) {
      setFreeSlots([]);
      return;
    }
    // Use the date value directly (YYYY-MM-DD)
    const datePart = dateStr.split("T")[0];
    if (!datePart || datePart.length !== 10) {
      setFreeSlots([]);
      return;
    }

    setIsLoadingSlots(true);
    try {
      const res = await fetch(`${API_URL}/schedules/free-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: empIds,
          date: datePart,
          durationMins: 30,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFreeSlots(data.freeSlots || []);
      }
    } catch (err) {
      console.error("Error fetching free slots:", err);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  // Fetch free slots when date + attendees change (edit mode)
  const fetchEditFreeSlots = useCallback(async (empIds: string[], dateStr: string) => {
    if (!empIds.length || !dateStr) {
      setEditFreeSlots([]);
      return;
    }
    const datePart = dateStr.split("T")[0] || dateStr;
    if (!datePart || datePart.length !== 10) {
      setEditFreeSlots([]);
      return;
    }

    setIsLoadingEditSlots(true);
    try {
      const res = await fetch(`${API_URL}/schedules/free-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: empIds,
          date: datePart,
          durationMins: 30,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditFreeSlots(data.freeSlots || []);
      }
    } catch (err) {
      console.error("Error fetching edit free slots:", err);
    } finally {
      setIsLoadingEditSlots(false);
    }
  }, []);

  // Watch for changes in add mode
  useEffect(() => {
    fetchFreeSlots(selectedEmployeeIds, meetingDate);
  }, [selectedEmployeeIds, meetingDate, fetchFreeSlots]);

  // Watch for changes in edit mode
  useEffect(() => {
    if (editingIdx !== null) {
      fetchEditFreeSlots(editSelectedEmployeeIds, editDate);
    }
  }, [editSelectedEmployeeIds, editDate, editingIdx, fetchEditFreeSlots]);

  // Sync selected employee IDs to attendees string
  useEffect(() => {
    const names = employees
      .filter(e => selectedEmployeeIds.includes(e.id))
      .map(e => e.name);
    setAttendees(names.join(", "));
  }, [selectedEmployeeIds, employees]);

  // Sync edit selected employee IDs to edit attendees string
  useEffect(() => {
    if (editingIdx !== null) {
      const names = employees
        .filter(e => editSelectedEmployeeIds.includes(e.id))
        .map(e => e.name);
      setEditAttendees(names.join(", "));
    }
  }, [editSelectedEmployeeIds, employees, editingIdx]);

  const handleAddMeeting = async () => {
    if (!note.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/clients/${client.id}/meetings?performedBy=${userId}&userName=${userName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note,
          date: meetingDate ? `${meetingDate} ${startTime}`.trim() : new Date().toISOString().split('T')[0],
          performedBy: userName,
          type: type,
          location: location,
          attendees: attendees,
          attendeeIds: selectedEmployeeIds,
          status: status,
          nextSteps: nextSteps,
          duration: startTime && endTime ? `${startTime} - ${endTime}` : duration,
          link: link
        }),
      });

      if (res.ok) {
        toast.success("Meeting added");
        setNote("");
        setMeetingDate("");
        setStartTime("");
        setEndTime("");
        setType("");
        setLocation("");
        setAttendees("");
        setSelectedEmployeeIds([]);
        setStatus("");
        setNextSteps("");
        setDuration("");
        setLink("");
        setFreeSlots([]);
        onUpdate();
      } else {
        toast.error("Failed to add meeting");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMeeting = async (idx: number) => {
    if (!editNote.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/clients/${client.id}/meetings/${idx}?performedBy=${userId}&userName=${userName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...client.meetings[idx],
          note: editNote,
          date: editDate ? `${editDate} ${editStartTime}`.trim() : client.meetings[idx].date,
          type: editType,
          location: editLocation,
          attendees: editAttendees,
          attendeeIds: editSelectedEmployeeIds,
          status: editStatus,
          nextSteps: editNextSteps,
          duration: editStartTime && editEndTime ? `${editStartTime} - ${editEndTime}` : editDuration,
          link: editLink
        }),
      });

      if (res.ok) {
        toast.success("Meeting updated");
        setEditingIdx(null);
        setEditNote("");
        setEditSelectedEmployeeIds([]);
        setEditFreeSlots([]);
        onUpdate();
      } else {
        toast.error("Failed to update meeting");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (idx: number) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this meeting?",
      destructive: true,
      confirmText: "Delete"
    });
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/clients/${client.id}/meetings/${idx}?performedBy=${userId}&userName=${userName}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Meeting deleted");
        if (editingIdx === idx) {
          setEditingIdx(null);
          setEditNote("");
        }
        onUpdate();
      } else {
        toast.error("Failed to delete meeting");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: resolve attendee names to employee IDs (for edit mode)
  const resolveAttendeesToIds = (attendeesStr: string): string[] => {
    if (!attendeesStr || employees.length === 0) return [];
    const names = attendeesStr.split(",").map(n => n.trim().toLowerCase()).filter(Boolean);
    return employees
      .filter(e => names.includes(e.name.toLowerCase()))
      .map(e => e.id);
  };

  // Helper: apply a free slot to the date/time picker
  const applyFreeSlot = (slot: { start: string; end: string }, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      setStartTime(slot.start);
      setEndTime(slot.end);
    } else {
      setEditStartTime(slot.start);
      setEditEndTime(slot.end);
    }
    toast.success(`Time slot ${slot.start} – ${slot.end} applied`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="h-8 w-8 text-slate-400 hover:text-brand-teal hover:bg-teal-50 z-10"
          title="Meetings"
        >
          <Users className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Meetings: <span className="text-brand-teal">{client.companyName}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date *</Label>
                <Input 
                  type="date" 
                  value={meetingDate}
                  min={todayStr}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="bg-white border-slate-200 focus-visible:ring-brand-teal h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Type</Label>
                <Select value={type || undefined} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-slate-400 italic">None</SelectItem>
                    <SelectItem value="Monthly Review">Monthly Review</SelectItem>
                    <SelectItem value="Strategy Pitch">Strategy Pitch</SelectItem>
                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                    <SelectItem value="Check-in">Check-in</SelectItem>
                    <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Location / Platform</Label>
                <Select value={location || undefined} onValueChange={setLocation}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-slate-400 italic">None</SelectItem>
                    <SelectItem value="Google Meet">Google Meet</SelectItem>
                    <SelectItem value="Zoom">Zoom</SelectItem>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="In-Person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</Label>
                <Select value={status || undefined} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-slate-400 italic">None</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Attendees: Multi-select employee dropdown */}
            <div className="space-y-1.5 mt-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Attendees *</Label>
              <EmployeeMultiSelect
                employees={employees}
                selectedIds={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
                isLoading={isLoadingEmployees}
              />
            </div>

            {/* Free Slots Section */}
            {(selectedEmployeeIds.length > 0 && meetingDate) && (
              <div className="mt-3 space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  Available Free Slots
                </Label>
                {isLoadingSlots ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-3 h-3 animate-spin text-brand-teal" />
                    <span className="text-[10px] text-slate-400">Finding free slots...</span>
                  </div>
                ) : freeSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {freeSlots.map((slot, idx) => (
                      <FreeSlotBadge 
                        key={idx} 
                        slot={slot} 
                        onClick={() => applyFreeSlot(slot, 'add')} 
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-rose-500 bg-rose-50 rounded px-2 py-1.5 border border-rose-100">
                    No common free slots available for the selected attendees on this date.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Start Time *</Label>
                <Input 
                  type="time" 
                  value={startTime}
                  min={isAddToday ? nowTimeStr : undefined}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-white border-slate-200 focus-visible:ring-brand-teal h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">End Time *</Label>
                <Input 
                  type="time" 
                  value={endTime}
                  min={startTime || (isAddToday ? nowTimeStr : undefined)}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-white border-slate-200 focus-visible:ring-brand-teal h-8 text-xs"
                />
              </div>
            </div>
            
            <div className="space-y-1.5 mt-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meeting Link</Label>
              <Input 
                placeholder="https://..." 
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="bg-white border-slate-200 focus-visible:ring-brand-teal h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5 mt-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meeting Note *</Label>
              <Textarea 
                placeholder="What was the outcome of the interaction?" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[60px] bg-white border-slate-200 focus-visible:ring-brand-teal text-sm"
              />
            </div>

            <div className="space-y-1.5 mt-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Next Steps</Label>
              <Textarea 
                placeholder="Action items?" 
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                className="min-h-[40px] bg-white border-slate-200 focus-visible:ring-brand-teal text-sm"
              />
            </div>
            <Button 
              className="w-full bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-9"
              onClick={handleAddMeeting}
              disabled={isSubmitting || !note.trim() || !meetingDate || !startTime || !endTime || selectedEmployeeIds.length === 0 || (isAddToday && startTime < nowTimeStr) || startTime >= endTime}
              title={!meetingDate ? 'Select a date' : (!startTime || !endTime) ? 'Select start and end time' : (isAddToday && startTime < nowTimeStr) ? 'Start time cannot be in the past' : (startTime >= endTime) ? 'End time must be after start time' : selectedEmployeeIds.length === 0 ? 'Select attendees' : !note.trim() ? 'Add a meeting note' : ''}
            >
              {isSubmitting ? "Saving..." : "Add Meeting"}
            </Button>
          </div>

          {/* History */}
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Interaction History
            </Label>
            <ScrollArea className="h-[250px] pr-4">
              {client.meetings && client.meetings.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                  {client.meetings.slice().reverse().map((m: any, revIdx: number) => {
                    const originalIdx = client.meetings.length - 1 - revIdx;
                    const isEditing = editingIdx === originalIdx;

                    return (
                      <div key={revIdx} className="pl-6 relative">
                        <div className="absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full bg-brand-teal ring-4 ring-white" />
                        <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{formatDisplayDate(m.date)}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                <User className="w-3 h-3" />
                                {m.performedBy || "System"}
                              </div>
                              {!isEditing && (
                                <>
                                  <button 
                                    onClick={() => {
                                      setEditingIdx(originalIdx);
                                      setEditNote(m.note);
                                      let dStr = m.date || '';
                                      // Extract just the date part (YYYY-MM-DD)
                                      dStr = dStr.replace(' ', 'T');
                                      const dPart = dStr.split('T')[0] || dStr.substring(0, 10);
                                      const tPart = dStr.split('T')[1]?.substring(0, 5) || "";
                                      setEditDate(dPart);
                                      setEditStartTime(tPart);
                                      
                                      // Try to parse end time from duration if present
                                      let eTime = "";
                                      if (m.duration && m.duration.includes("-")) {
                                        eTime = m.duration.split("-")[1].trim();
                                      }
                                      setEditEndTime(eTime);
                                      
                                      setEditType(m.type || "");
                                      setEditLocation(m.location || "");
                                      setEditAttendees(m.attendees || "");
                                      setEditStatus(m.status || "");
                                      setEditNextSteps(m.nextSteps || "");
                                      setEditDuration(m.duration || "");
                                      setEditLink(m.link || "");
                                      // Resolve attendee names to IDs for editing
                                      const ids = resolveAttendeesToIds(m.attendees || "");
                                      setEditSelectedEmployeeIds(ids);
                                    }}
                                    className="text-teal-600 hover:text-teal-700 transition-colors border border-teal-100 rounded p-1 bg-teal-50"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteMeeting(originalIdx)}
                                    className="text-red-600 hover:text-red-700 transition-colors border border-red-100 rounded p-1 bg-red-50"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {isEditing ? (
                            <div className="space-y-2 mt-2 border-t pt-2 border-slate-100">
                              <div className="grid grid-cols-2 gap-2">
                                <Input 
                                  type="date" 
                                  value={editDate}
                                  min={todayStr}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <Select value={editType || undefined} onValueChange={setEditType}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-slate-400 italic">None</SelectItem>
                                    <SelectItem value="Monthly Review">Monthly Review</SelectItem>
                                    <SelectItem value="Strategy Pitch">Strategy Pitch</SelectItem>
                                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                                    <SelectItem value="Check-in">Check-in</SelectItem>
                                    <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Select value={editLocation || undefined} onValueChange={setEditLocation}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Location" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-slate-400 italic">None</SelectItem>
                                    <SelectItem value="Google Meet">Google Meet</SelectItem>
                                    <SelectItem value="Zoom">Zoom</SelectItem>
                                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                                    <SelectItem value="In-Person">In-Person</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select value={editStatus || undefined} onValueChange={setEditStatus}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-slate-400 italic">None</SelectItem>
                                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Edit mode: employee multi-select */}
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendees</Label>
                                <EmployeeMultiSelect
                                  employees={employees}
                                  selectedIds={editSelectedEmployeeIds}
                                  onChange={setEditSelectedEmployeeIds}
                                  isLoading={isLoadingEmployees}
                                />
                              </div>

                              {/* Edit mode: free slots */}
                              {(editSelectedEmployeeIds.length > 0 && editDate) && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5 text-emerald-500" />
                                    Free Slots
                                  </Label>
                                  {isLoadingEditSlots ? (
                                    <div className="flex items-center gap-1.5 py-1">
                                      <Loader2 className="w-3 h-3 animate-spin text-brand-teal" />
                                      <span className="text-[10px] text-slate-400">Finding slots...</span>
                                    </div>
                                  ) : editFreeSlots.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {editFreeSlots.map((slot, idx) => (
                                        <FreeSlotBadge 
                                          key={idx} 
                                          slot={slot} 
                                          onClick={() => applyFreeSlot(slot, 'edit')} 
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-rose-500">No common free slots available.</p>
                                  )}
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                <Input 
                                  type="time" 
                                  value={editStartTime}
                                  min={isEditToday ? nowTimeStr : undefined}
                                  onChange={(e) => setEditStartTime(e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <Input 
                                  type="time" 
                                  value={editEndTime}
                                  min={editStartTime || (isEditToday ? nowTimeStr : undefined)}
                                  onChange={(e) => setEditEndTime(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <Input 
                                placeholder="Meeting Link" 
                                value={editLink}
                                onChange={(e) => setEditLink(e.target.value)}
                                className="h-8 text-xs"
                              />
                              <Textarea 
                                className="min-h-[60px] text-xs" 
                                placeholder="Meeting Note"
                                value={editNote} 
                                onChange={(e) => setEditNote(e.target.value)} 
                              />
                              <Textarea 
                                className="min-h-[40px] text-xs" 
                                placeholder="Next Steps"
                                value={editNextSteps} 
                                onChange={(e) => setEditNextSteps(e.target.value)} 
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="h-7 text-[10px] font-bold bg-brand-teal hover:bg-brand-teal-light text-white"
                                  onClick={() => handleUpdateMeeting(originalIdx)}
                                  disabled={isSubmitting || !editNote.trim() || !editDate || !editStartTime || !editEndTime || editSelectedEmployeeIds.length === 0 || (isEditToday && editStartTime < nowTimeStr) || editStartTime >= editEndTime}
                                  title={(isEditToday && editStartTime < nowTimeStr) ? 'Start time cannot be in the past' : (editStartTime >= editEndTime) ? 'End time must be after start time' : ''}
                                >
                                  {isSubmitting ? "..." : "Save"}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-[10px] font-bold text-slate-500"
                                  onClick={() => { setEditingIdx(null); setEditSelectedEmployeeIds([]); setEditFreeSlots([]); }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-1.5 mb-1 mt-1">
                                {m.type && m.type !== "none" && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-50 text-slate-600 border-slate-200">
                                    <Target className="w-3 h-3 mr-1" /> {m.type}
                                  </Badge>
                                )}
                                {m.location && m.location !== "none" && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-50 text-slate-600 border-slate-200">
                                    <MapPin className="w-3 h-3 mr-1" /> {m.location}
                                  </Badge>
                                )}
                                {m.status && m.status !== "none" && (
                                  <Badge variant="outline" className={`text-[10px] py-0 px-1.5 border-slate-200 ${m.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : m.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                    <Flag className="w-3 h-3 mr-1" /> {m.status}
                                  </Badge>
                                )}
                                {m.duration && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-50 text-slate-600 border-slate-200">
                                    <Clock className="w-3 h-3 mr-1" /> {m.duration}
                                  </Badge>
                                )}
                              </div>
                              
                              {m.attendees && (
                                <div className="text-[11px] text-slate-500 flex items-start gap-1">
                                  <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" /> 
                                  <span><span className="font-semibold">Attendees:</span> {m.attendees}</span>
                                </div>
                              )}

                              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-slate-100">
                                {m.note}
                              </div>

                              {m.nextSteps && (
                                <div className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap bg-amber-50/50 p-2 rounded border border-amber-100/50">
                                  <span className="font-semibold block mb-0.5 text-amber-700">Next Steps:</span>
                                  {m.nextSteps}
                                </div>
                              )}

                              {m.link && (
                                <a href={m.link.startsWith('http') ? m.link : `https://${m.link}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-teal hover:underline bg-brand-teal/5 px-2 py-1 rounded">
                                  <LinkIcon className="w-3 h-3" /> View Meeting Link
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[100px] text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-xl">
                  <Users className="w-6 h-6 opacity-20" />
                  <p className="text-xs font-medium">No meetings recorded yet.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
