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
import { Label } from "@/components/ui/label";
import { Calendar, MessageSquare, Plus, User, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

interface FollowUpDialogProps {
  lead: any;
  onUpdate: () => void;
  userId?: string;
  userName?: string;
}

export function FollowUpDialog({ lead, onUpdate, userId, userName }: FollowUpDialogProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddFollowUp = async () => {
    if (!note.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/leads/${lead.id}/follow-ups?performedBy=${userId}&userName=${userName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note,
          date: new Date().toISOString().split('T')[0] + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          performedBy: userName
        }),
      });

      if (res.ok) {
        toast.success("Follow-up added");
        setNote("");
        onUpdate();
      } else {
        toast.error("Failed to add follow-up");
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
        <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-slate-500 hover:text-brand-teal gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          Follow-ups ({lead.followUps?.length || 0})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Follow-ups: <span className="text-brand-teal">{lead.company}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Add New Follow-up */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">New Follow-up Note</Label>
            <Textarea 
              placeholder="What was the outcome of the last interaction? Next steps?" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] bg-white border-slate-200 focus-visible:ring-brand-teal"
            />
            <Button 
              className="w-full bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-9"
              onClick={handleAddFollowUp}
              disabled={isSubmitting || !note.trim()}
            >
              {isSubmitting ? "Saving..." : "Add Follow-up"}
            </Button>
          </div>

          {/* History */}
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Interaction History
            </Label>
            <ScrollArea className="h-[250px] pr-4">
              {lead.followUps && lead.followUps.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                  {lead.followUps.slice().reverse().map((f: any, idx: number) => (
                    <div key={idx} className="pl-6 relative">
                      <div className="absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full bg-brand-teal ring-4 ring-white" />
                      <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{f.date}</span>
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                            <User className="w-3 h-3" />
                            {f.performedBy || "System"}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {f.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[100px] text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-xl">
                  <MessageSquare className="w-6 h-6 opacity-20" />
                  <p className="text-xs font-medium">No follow-ups recorded yet.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
