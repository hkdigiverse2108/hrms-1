"use client";

import React, { useState } from "react";
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
import { Calendar, MessageSquare, Plus, User, Clock, Users, Pencil, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";

interface SmmMeetingDialogProps {
  client: any;
  onUpdate: () => void;
  userId?: string;
  userName?: string;
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

export function SmmMeetingDialog({ client, onUpdate, userId, userName }: SmmMeetingDialogProps) {
  const { confirm } = useConfirm();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleAddMeeting = async () => {
    if (!note.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/clients/${client.id}/meetings?performedBy=${userId}&userName=${userName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note,
          date: meetingDate ? meetingDate.replace('T', ' ') : new Date().toISOString().split('T')[0] + " " + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          performedBy: userName
        }),
      });

      if (res.ok) {
        toast.success("Meeting added");
        setNote("");
        setMeetingDate("");
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
          date: editDate ? editDate.replace('T', ' ') : client.meetings[idx].date,
        }),
      });

      if (res.ok) {
        toast.success("Meeting updated");
        setEditingIdx(null);
        setEditNote("");
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
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Meetings: <span className="text-brand-teal">{client.companyName}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date & Time</Label>
              <Input 
                type="datetime-local" 
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="bg-white border-slate-200 focus-visible:ring-brand-teal"
              />
            </div>
            <div className="space-y-1.5 mt-3">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">New Meeting Note</Label>
              <Textarea 
                placeholder="What was the outcome of the last interaction? Next steps?" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[80px] bg-white border-slate-200 focus-visible:ring-brand-teal"
              />
            </div>
            <Button 
              className="w-full bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-9"
              onClick={handleAddMeeting}
              disabled={isSubmitting || !note.trim()}
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
                                      dStr = dStr.replace(' ', 'T');
                                      if (dStr.length === 10) dStr += 'T00:00';
                                      if (dStr.length > 16) dStr = dStr.substring(0, 16);
                                      setEditDate(dStr);
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
                            <div className="space-y-2 mt-2">
                              <Input 
                                type="datetime-local" 
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="h-8 text-sm"
                              />
                              <Textarea 
                                className="min-h-[60px] text-sm" 
                                value={editNote} 
                                onChange={(e) => setEditNote(e.target.value)} 
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="h-7 text-[10px] font-bold bg-brand-teal hover:bg-brand-teal-light text-white"
                                  onClick={() => handleUpdateMeeting(originalIdx)}
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? "..." : "Save"}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-[10px] font-bold text-slate-500"
                                  onClick={() => setEditingIdx(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {m.note}
                            </p>
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
