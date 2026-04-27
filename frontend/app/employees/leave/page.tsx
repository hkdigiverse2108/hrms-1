"use client";

import React, { useState, useEffect } from "react";
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
  ChevronLeft,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { API_URL } from "@/lib/config";
import { toast } from "sonner";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);


export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/leaves`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
      toast.error("Failed to fetch leave requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/leaves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Request ${newStatus.toLowerCase()} successfully`);
        fetchRequests();
        setApproveModalOpen(false);
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Error updating status");
    } finally {
      setIsUpdating(false);
    }
  };



  const selectedReq = requests.find((r) => r.id === selectedId);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Approved': return { color: 'bg-green-500', text: 'text-green-600' };
      case 'Rejected': return { color: 'bg-red-500', text: 'text-red-600' };
      case 'Cancelled': return { color: 'bg-amber-500', text: 'text-amber-600' };
      default: return { color: 'bg-brand-teal', text: 'text-brand-teal' };
    }
  };


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
              <div className="text-xl font-bold text-foreground">
                {requests.filter(r => r.status === 'Pending').length}
              </div>
              <div className="text-xs text-muted-foreground font-medium">Pending</div>
            </div>
            <div className="bg-gray-50 border border-border rounded-lg p-3">
              <div className="text-xl font-bold text-foreground">
                {requests.filter(r => r.status === 'Approved').length}
              </div>
              <div className="text-xs text-muted-foreground font-medium">Approved</div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand-teal" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No leave requests found
            </div>
          ) : requests.map((req) => (
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
                    <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-semibold">
                      {req.employee_name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm text-foreground">{req.employee_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{dayjs(req.requested_on, "DD-MM-YYYY").fromNow()}</span>
              </div>
              
              <div className="pl-11">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusInfo(req.status).color}`}></span>
                  <span className="text-sm font-medium text-foreground capitalize">{req.type}</span>
                  <span className="text-sm text-muted-foreground">({req.duration})</span>
                </div>
                <div className="text-xs text-muted-foreground">{req.start_date} - {req.end_date}</div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* RIGHT COLUMN: DETAILS */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto bg-transparent ${!isMobileDetailView ? 'hidden lg:flex' : 'flex'}`}>
        
        {!selectedReq ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="bg-gray-50 rounded-full p-6 mb-4">
              <FileText className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No Request Selected</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Select a leave request from the list on the left to view full details and take action.
            </p>
          </div>
        ) : (
          <>
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
                  <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-lg">
                    {selectedReq.employee_name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">REQUEST #{selectedReq.id.slice(-6)}</div>
                  <h1 className="text-2xl font-bold text-foreground leading-none mb-1">{selectedReq.employee_name}</h1>
                  <p className="text-sm text-muted-foreground">Employee ID: {selectedReq.employee_id}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {selectedReq.status === 'Pending' && (
                  <Button 
                    variant="outline" 
                    disabled={isUpdating}
                    onClick={() => handleStatusUpdate(selectedReq.id, 'Rejected')}
                    className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-medium"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                )}
                {selectedReq.status === 'Approved' && (
                  <Button 
                    variant="outline" 
                    disabled={isUpdating}
                    onClick={() => handleStatusUpdate(selectedReq.id, 'Cancelled')}
                    className="flex-1 sm:flex-none text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 font-medium"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Leave
                  </Button>
                )}

                <Button variant="outline" className="flex-1 sm:flex-none font-medium">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Button>
                {selectedReq.status === 'Pending' && (
                  <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={isUpdating}
                        className="flex-1 sm:flex-none bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm"
                      >
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
                                {selectedReq.employee_name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground text-sm">{selectedReq.employee_name}</div>
                              <div className="text-xs text-muted-foreground">Employee Request</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusInfo(selectedReq.status).color}`}></span>
                              <span className="font-semibold text-foreground capitalize">{selectedReq.type} ({selectedReq.duration})</span>
                            </div>
                            <span className="text-muted-foreground">{selectedReq.start_date} - {selectedReq.end_date}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Add a note (Optional)</label>
                          <Textarea 
                            placeholder="Have a great vacation!" 
                            className="resize-none h-24 text-sm bg-white"
                          />
                        </div>

                        <div className="flex items-start gap-2 pt-2">
                          <Checkbox id="notify" defaultChecked className="mt-0.5 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal" />
                          <label htmlFor="notify" className="text-sm text-foreground font-medium cursor-pointer">
                            Notify the employee about this decision
                          </label>
                        </div>
                      </div>
                      <DialogFooter className="gap-2 sm:gap-2 mt-4">
                        <Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
                        <Button 
                          disabled={isUpdating}
                          className="bg-brand-teal hover:bg-brand-teal-light text-white" 
                          onClick={() => handleStatusUpdate(selectedReq.id, 'Approved')}
                        >
                          {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                          Confirm Approval
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

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
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusInfo(selectedReq.status).color}`}></span>
                      <span className="font-medium text-foreground capitalize">{selectedReq.type}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duration</div>
                    <div className="font-medium text-foreground">{selectedReq.duration}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dates</div>
                    <div className="font-medium text-foreground">{selectedReq.start_date} - {selectedReq.end_date}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Submitted</div>
                    <div className="font-medium text-foreground">{selectedReq.requested_on}</div>
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
                    <h3 className="font-bold text-foreground text-lg">Current Status</h3>
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-xl font-bold text-foreground mb-1">Status: {selectedReq.status}</div>
                    <p className="text-sm text-muted-foreground">
                      This request was submitted on {selectedReq.requested_on}.
                    </p>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="w-5 h-5 text-brand-teal" />
                    <h3 className="font-bold text-foreground text-lg">Employee Info</h3>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Employee ID: <span className="font-bold text-foreground">{selectedReq.employee_id}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>


    </div>
  );
}
