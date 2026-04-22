"use client";

import React, { useState } from "react";
import { 
  Filter, 
  Search, 
  X, 
  MessageSquare, 
  Check, 
  FileText, 
  Clock, 
  Users,
  History,
  ChevronLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const requests = [
  {
    id: "LR-8492",
    name: "Sarah Jenkins",
    role: "Product Designer • Design Department",
    avatar: "/avatars/sarah.jpg",
    timeAgo: "2h ago",
    leaveType: "Annual Leave",
    duration: "5d",
    durationText: "5 Days",
    dateRange: "Dec 20 - Dec 26, 2026",
    status: "Pending",
    statusColor: "bg-brand-teal",
    textColor: "text-brand-teal",
    submitted: "Oct 12, 2026 at 10:30 AM",
    reason: "Family vacation and holidays. I will be completely offline during this time and will not be checking emails or Slack. Handover document is prepared in Notion.",
    balanceRemaining: 7,
    balanceUsed: 8,
    balanceReq: 5,
    balanceTotal: 20,
    overlapName: "Michael Chang",
    overlapAvatar: "/avatars/michael.jpg",
    overlapDates: "Dec 22 - Dec 28",
    overlapDays: 3,
    history: [
      { type: "Sick Leave", dates: "Sep 10 - Sep 11, 2025", status: "Approved" },
      { type: "Annual Leave", dates: "Jul 01 - Jul 05, 2025", status: "Approved" }
    ]
  },
  {
    id: "LR-8493",
    name: "Marcus Vance",
    role: "Backend Developer • Engineering",
    timeAgo: "1d ago",
    leaveType: "Sick Leave",
    duration: "2d",
    durationText: "2 Days",
    dateRange: "Nov 15 - Nov 16, 2026",
    status: "Pending",
    statusColor: "bg-red-500",
    textColor: "text-red-500",
    submitted: "Nov 14, 2026 at 09:15 AM",
    reason: "Feeling unwell, need some time to rest and recover.",
    balanceRemaining: 4,
    balanceUsed: 6,
    balanceReq: 2,
    balanceTotal: 12,
    history: []
  },
  {
    id: "LR-8494",
    name: "Elena Rodriguez",
    role: "Marketing Manager • Marketing",
    timeAgo: "2d ago",
    leaveType: "Work From Home",
    duration: "5d",
    durationText: "5 Days",
    dateRange: "Nov 20 - Nov 24, 2026",
    status: "Pending",
    statusColor: "bg-amber-500",
    textColor: "text-amber-500",
    submitted: "Nov 10, 2026 at 11:20 AM",
    reason: "Will be working remotely from my hometown for the week.",
    balanceRemaining: 10,
    balanceUsed: 0,
    balanceReq: 5,
    balanceTotal: 15,
    history: []
  }
];

export default function LeaveRequestsPage() {
  const [selectedId, setSelectedId] = useState<string>(requests[0].id);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);

  const selectedReq = requests.find((r) => r.id === selectedId) || requests[0];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsMobileDetailView(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] overflow-hidden">
      
      {/* LEFT COLUMN: LIST */}
      <div className={`w-full lg:w-[350px] shrink-0 flex flex-col border border-border bg-white rounded-xl overflow-hidden shadow-sm ${isMobileDetailView ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-border bg-white z-10 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-foreground">Pending Review</h2>
            <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground shadow-sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search requests..." 
              className="pl-9 bg-gray-50/50 border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-light/40 border border-brand-teal/10 rounded-lg p-3">
              <div className="text-xl font-bold text-foreground">3</div>
              <div className="text-xs text-muted-foreground font-medium">Pending</div>
            </div>
            <div className="bg-gray-50 border border-border rounded-lg p-3">
              <div className="text-xl font-bold text-foreground">12</div>
              <div className="text-xs text-muted-foreground font-medium">Approved</div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {requests.map((req) => (
            <div 
              key={req.id}
              onClick={() => handleSelect(req.id)}
              className={`p-4 border-b border-border cursor-pointer transition-colors relative ${
                selectedId === req.id 
                  ? 'bg-brand-light/20 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand-teal' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={req.avatar} />
                    <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-semibold">
                      {req.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm text-foreground">{req.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{req.timeAgo}</span>
              </div>
              
              <div className="pl-11">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${req.statusColor}`}></span>
                  <span className="text-sm font-medium text-foreground">{req.leaveType}</span>
                  <span className="text-sm text-muted-foreground">({req.duration})</span>
                </div>
                <div className="text-xs text-muted-foreground">{req.dateRange}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAILS */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto bg-transparent ${!isMobileDetailView ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Mobile Back Button */}
        <div className="lg:hidden mb-4">
          <Button variant="outline" size="sm" onClick={() => setIsMobileDetailView(false)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to List
          </Button>
        </div>

        {/* Detail Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 border border-border">
              <AvatarImage src={selectedReq.avatar} />
              <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-lg">
                {selectedReq.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">REQUEST #{selectedReq.id}</div>
              <h1 className="text-2xl font-bold text-foreground leading-none mb-1">{selectedReq.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedReq.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-medium">
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none font-medium">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm">
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Approve Leave Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <p className="text-sm text-muted-foreground">
                    Review the details below before confirming. The employee will be notified automatically.
                  </p>
                  
                  <div className="bg-gray-50 border border-border rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-brand-light text-brand-teal font-bold">
                          {selectedReq.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{selectedReq.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedReq.role.split(' • ')[0]}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedReq.statusColor}`}></span>
                        <span className="font-semibold text-foreground">{selectedReq.leaveType} ({selectedReq.durationText})</span>
                      </div>
                      <span className="text-muted-foreground">{selectedReq.dateRange}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Add a note (Optional)</label>
                    <Textarea 
                      placeholder="Have a great vacation! Make sure everything is documented in Notion before you leave." 
                      className="resize-none h-24 text-sm bg-white"
                    />
                  </div>

                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox id="notify" defaultChecked className="mt-0.5 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal" />
                    <label htmlFor="notify" className="text-sm text-foreground font-medium cursor-pointer">
                      Notify team channel (#design-team) about this absence
                    </label>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-2 mt-4">
                  <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
                  <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setApproveModalOpen(false)}>
                    <Check className="w-4 h-4 mr-2" />
                    Confirm Approval
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content Cards */}
        <div className="space-y-6 pb-6">
          
          {/* Request Details Card */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-brand-teal" />
              <h3 className="font-bold text-foreground text-lg">Request Details</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Leave Type</div>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedReq.statusColor}`}></span>
                  <span className="font-medium text-foreground">{selectedReq.leaveType}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duration</div>
                <div className="font-medium text-foreground">{selectedReq.durationText}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dates</div>
                <div className="font-medium text-foreground">{selectedReq.dateRange}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Submitted</div>
                <div className="font-medium text-foreground">{selectedReq.submitted}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reason / Notes</div>
              <div className="bg-brand-light/30 border border-brand-teal/10 rounded-lg p-4 text-sm text-foreground/80 leading-relaxed">
                {selectedReq.reason}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Balance Context */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-brand-teal" />
                <h3 className="font-bold text-foreground text-lg">Balance Context</h3>
              </div>
              
              <div className="flex-1">
                <div className="text-xl font-bold text-foreground mb-1">{selectedReq.balanceRemaining} days remaining</div>
                <div className="text-sm text-muted-foreground mb-6">If this request is approved</div>
                
                <div className="h-2 w-full bg-gray-100 rounded-full mb-3 flex overflow-hidden">
                  <div className="bg-slate-400 h-full" style={{ width: `${(selectedReq.balanceUsed / selectedReq.balanceTotal) * 100}%` }}></div>
                  <div className="bg-brand-teal h-full" style={{ width: `${(selectedReq.balanceReq / selectedReq.balanceTotal) * 100}%` }}></div>
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Used: {selectedReq.balanceUsed}</span>
                  <span>Req: {selectedReq.balanceReq}</span>
                  <span>Total: {selectedReq.balanceTotal}</span>
                </div>
              </div>
            </div>

            {/* Team Overlap */}
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-brand-teal" />
                <h3 className="font-bold text-foreground text-lg">Team Overlap</h3>
              </div>
              
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-4">
                  1 team member is on leave during this period.
                </p>
                
                {selectedReq.overlapName && (
                  <div className="flex items-center justify-between bg-gray-50 border border-border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-semibold">
                          {selectedReq.overlapName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm text-foreground">{selectedReq.overlapName}</div>
                        <div className="text-xs text-muted-foreground">{selectedReq.overlapDates}</div>
                      </div>
                    </div>
                    <div className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-md">
                      Overlap: {selectedReq.overlapDays} Days
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-brand-teal" />
              <h3 className="font-bold text-foreground text-lg">Recent Leave History</h3>
            </div>
            
            <div className="space-y-4">
              {selectedReq.history.length > 0 ? selectedReq.history.map((hist, idx) => (
                <div key={idx} className={`flex items-center justify-between pb-4 ${idx !== selectedReq.history.length - 1 ? 'border-b border-border' : ''}`}>
                  <div>
                    <div className="font-medium text-sm text-foreground mb-1">{hist.type}</div>
                    <div className="text-xs text-muted-foreground">{hist.dates}</div>
                  </div>
                  <div className="bg-brand-light/50 text-brand-teal text-xs font-semibold px-2 py-1 rounded-md border border-brand-teal/20">
                    {hist.status}
                  </div>
                </div>
              )) : (
                <div className="text-sm text-muted-foreground text-center py-4">No recent leave history</div>
              )}
            </div>
          </div>
          
        </div>
      </div>

    </div>
  );
}
