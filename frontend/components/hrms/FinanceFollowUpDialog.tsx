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
import { Input } from "@/components/ui/input";
import { Calendar, MessageSquare, User, Clock, Banknote, CheckCircle2, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import dayjs from "dayjs";

interface FinanceFollowUpDialogProps {
  project: any;
  onUpdate: () => void;
  userId?: string;
  userName?: string;
}

export function FinanceFollowUpDialog({ project, onUpdate, userId, userName }: FinanceFollowUpDialogProps) {
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [isPaymentReceived, setIsPaymentReceived] = useState(false);
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddFollowUp = async () => {
    if (!note.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        note: note,
        date: new Date().toISOString().split('T')[0] + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        performedBy: userName,
      };
      if (nextDate) payload.nextFollowUpDate = new Date(nextDate).toISOString();
      if (amountReceived) payload.amountReceived = parseFloat(amountReceived);
      if (paymentTouched) payload.isPaymentReceived = isPaymentReceived;
      if (nextPaymentDate) payload.nextPaymentDate = nextPaymentDate;
      if (projectStatus && projectStatus !== "none") payload.projectStatus = projectStatus;

      const res = await fetch(`${API_URL}/projects/${project.id}/finance-follow-ups?performedBy=${userId}&userName=${userName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Finance follow-up added");
        setNote("");
        setNextDate("");
        setAmountReceived("");
        setIsPaymentReceived(false);
        setPaymentTouched(false);
        setNextPaymentDate("");
        setProjectStatus("");
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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          className="h-7 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-800 gap-1.5 transition-colors rounded-lg px-2.5"
        >
          <MessageSquare className="w-3 h-3 text-emerald-600" />
          Follow-ups ({project.financeFollowUps?.length || 0})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px] font-bold">
            Finance Follow-ups: <span className="text-emerald-600">{project.title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-2">
          {/* Add New Follow-up */}
          <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              New Finance Follow-up <span className="text-red-500">*</span>
            </Label>
            <Textarea 
              placeholder="Payment status update, client communication notes, next steps..." 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[70px] bg-white border-emerald-200 focus-visible:ring-emerald-500 text-xs"
            />

            {/* Payment Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Amount Received (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="bg-white border-emerald-200 focus-visible:ring-emerald-500 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Next Payment Date</Label>
                <input 
                  type="date"
                  value={nextPaymentDate}
                  onChange={(e) => setNextPaymentDate(e.target.value)}
                  className="w-full border border-emerald-200 rounded-lg p-2 text-xs focus:ring-emerald-500 focus:border-emerald-500 bg-white h-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-100">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 cursor-pointer">Payment Received?</Label>
              <Switch 
                checked={isPaymentReceived} 
                onCheckedChange={(checked) => { setIsPaymentReceived(checked); setPaymentTouched(true); }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Update Project Status (Optional)</Label>
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
                className="w-full border border-emerald-200 rounded-lg p-2 text-xs focus:ring-emerald-500 focus:border-emerald-500 bg-white h-9"
              >
                <option value="">-- Leave Unchanged --</option>
                <option value="completed">Completed (Payment Received / Finished)</option>
                <option value="on-hold">On Hold (Client Not Continuing)</option>
                <option value="cancelled">Cancelled</option>
                <option value="in-progress">In Progress</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Next Follow-up Date & Time (Optional)</Label>
              <input 
                type="datetime-local"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full border border-emerald-200 rounded-lg p-2 text-xs focus:ring-emerald-500 focus:border-emerald-500 bg-white h-9"
              />
            </div>

            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs"
              onClick={handleAddFollowUp}
              disabled={isSubmitting || !note.trim()}
            >
              {isSubmitting ? "Saving..." : "Add Follow-up"}
            </Button>
          </div>

          {/* History Section */}
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Finance Follow-up History
            </Label>

            <ScrollArea className="h-[280px] pr-4">
              {project.financeFollowUps && project.financeFollowUps.length > 0 ? (
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-emerald-200">
                  {project.financeFollowUps.slice().reverse().map((f: any, revIdx: number) => (
                    <div key={revIdx} className="pl-6 relative">
                      <div className="absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="bg-white border border-emerald-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{f.date}</span>
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                            <User className="w-3.5 h-3.5" />
                            {f.performedBy || "System"}
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                            {f.note}
                          </p>

                          {/* Payment Info */}
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {f.amountReceived != null && f.amountReceived > 0 && (
                              <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 text-[9.5px] font-bold">
                                <Banknote className="w-2.5 h-2.5" />
                                ₹{f.amountReceived}
                              </div>
                            )}
                            {f.isPaymentReceived != null && (
                              <div className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold border ${
                                f.isPaymentReceived 
                                  ? 'bg-green-50 text-green-700 border-green-100' 
                                  : 'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                {f.isPaymentReceived ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                                {f.isPaymentReceived ? "Paid" : "Not Paid"}
                              </div>
                            )}
                            {f.nextPaymentDate && (
                              <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5 text-[9.5px] font-bold">
                                <Calendar className="w-2.5 h-2.5" />
                                Next Payment: {f.nextPaymentDate}
                              </div>
                            )}
                            {f.projectStatus && (
                              <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase">
                                Status Changed: {f.projectStatus}
                              </div>
                            )}
                          </div>

                          {f.nextFollowUpDate && (
                            <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5 text-[9.5px] font-bold">
                              <Calendar className="w-2.5 h-2.5 text-amber-600" />
                              Next Follow-up: {dayjs(f.nextFollowUpDate).format("DD/MM/YYYY, hh:mm A")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[120px] text-slate-400 gap-2 border-2 border-dashed border-emerald-100 rounded-xl">
                  <MessageSquare className="w-6 h-6 opacity-20" />
                  <p className="text-xs font-medium">No finance follow-ups recorded yet.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
