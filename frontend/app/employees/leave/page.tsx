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
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "antd";

import { API_URL } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
import { toast } from "sonner";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);


export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [timeFilter, setTimeFilter] = useState("today"); // "today" | "custom"
  const [filterDate, setFilterDate] = useState(dayjs());
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (targetId && requests.length > 0) {
      setSelectedId(targetId);
      // If we are looking for a specific request, we should probably show "All" 
      // or at least ensure the date filter doesn't hide it.
      // For now, let's switch to All Requests to be safe.
      setTimeFilter("all");
    }
  }, [targetId, requests.length]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/leaves`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
        
        // Handle targetId from URL immediately
        if (targetId) {
          setSelectedId(targetId);
          setTimeFilter("all");
        } else if (data.length > 0 && !selectedId) {
          // Default selection if no targetId (Optional: based on previous user request, I disabled this, but keeping logic for clarity)
          // setSelectedId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
      toast.error("Failed to fetch leave requests");
    } finally {
      setIsLoading(false);
    }
  };

  const { user } = useUserContext();

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const body: any = { status: newStatus };
      if (newStatus === 'Approved' && user) {
        body.approved_by = user.name;
        body.approved_by_role = user.role;
        body.approved_by_id = user.id;
        body.approved_by_photo = user.profilePhoto;
      }
      
      const res = await fetch(`${API_URL}/leaves/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
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
            <h2 className="font-bold text-lg text-foreground">Leave Requests</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button 
              onClick={() => {
                setTimeFilter("today");
                setFilterDate(dayjs());
              }}
              className={`h-10 text-[11px] font-bold rounded-lg border transition-all flex items-center justify-center gap-2 ${timeFilter === 'today' ? 'bg-brand-teal text-white border-brand-teal shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-teal hover:text-brand-teal'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
            
            <div className={`h-10 px-2 rounded-lg border transition-all flex items-center ${timeFilter === 'custom' ? 'bg-white border-brand-teal shadow-sm' : 'bg-gray-50/50 border-slate-200'}`}>
              <DatePicker 
                value={filterDate}
                onChange={(date) => {
                  if (date) {
                    setFilterDate(date);
                    setTimeFilter("custom");
                  }
                }}
                allowClear={false}
                variant="borderless"
                className="w-full h-8 text-[11px] font-bold p-0"
                format="DD-MM-YYYY"
              />
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search requests..." 
              className="pl-9 bg-gray-50/50 border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => {
                const next = statusFilter === 'Pending' ? null : 'Pending';
                setStatusFilter(next);
                if (next) setTimeFilter("all");
                else {
                  setTimeFilter("today");
                  setFilterDate(dayjs());
                }
              }}
              className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${statusFilter === 'Pending' ? 'bg-brand-teal text-white border-brand-teal shadow-md' : 'bg-brand-light/40 border-brand-teal/10 hover:border-brand-teal/30'}`}
            >
              <div className={`text-xl font-bold ${statusFilter === 'Pending' ? 'text-white' : 'text-foreground'}`}>
                {requests.filter(r => r.status?.toLowerCase() === 'pending').length}
              </div>
              <div className={`text-xs font-bold ${statusFilter === 'Pending' ? 'text-white/90' : 'text-muted-foreground'}`}>Pending</div>
            </div>
            <div 
              onClick={() => {
                const next = statusFilter === 'Approved' ? null : 'Approved';
                setStatusFilter(next);
                if (next) setTimeFilter("all");
                else {
                  setTimeFilter("today");
                  setFilterDate(dayjs());
                }
              }}
              className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${statusFilter === 'Approved' ? 'bg-brand-teal text-white border-brand-teal shadow-md' : 'bg-gray-50 border-border hover:border-brand-teal'}`}
            >
              <div className={`text-xl font-bold ${statusFilter === 'Approved' ? 'text-white' : 'text-foreground'}`}>
                {requests.filter(r => r.status?.toLowerCase() === 'approved').length}
              </div>
              <div className={`text-xs font-bold ${statusFilter === 'Approved' ? 'text-white/90' : 'text-muted-foreground'}`}>Approved</div>
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
          ) : requests
              .filter((req) => {
                const matchesStatus = statusFilter ? req.status?.toLowerCase() === statusFilter.toLowerCase() : true;
                if (!matchesStatus) return false;

                const matchesSearch = req.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
                if (!matchesSearch) return false;

                // If a status filter (Pending/Approved) is active, show ALL requests for that status regardless of date
                if (statusFilter) return true;

                if (timeFilter === "all") return true;
                if (!req.start_date || !req.end_date) return false;
                const targetDate = filterDate.startOf('day');
                const start = dayjs(req.start_date, "DD-MM-YYYY").startOf('day');
                const end = dayjs(req.end_date, "DD-MM-YYYY").endOf('day');
                return targetDate.isSameOrAfter(start) && targetDate.isSameOrBefore(end);
              })
              .map((req) => (
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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full 
                  ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                    req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                    req.status === 'Cancelled' ? 'bg-amber-100 text-amber-700' : 
                    'bg-brand-light text-brand-teal'}`}>
                  {req.status}
                </span>
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
                {(user?.role === 'Admin' || user?.role === 'HR') && (
                  <>
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
                  </>
                )}

                <Button variant="outline" className="flex-1 sm:flex-none font-medium">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Button>
                
                {(user?.role === 'Admin' || user?.role === 'HR') && selectedReq.status === 'Pending' && (
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
                    <div className="text-sm text-muted-foreground mt-2">
                      {selectedReq.status === 'Approved' && selectedReq.approved_by ? (
                        <div className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-lg border border-border">
                          <Avatar className="w-10 h-10 rounded-md">
                            <AvatarImage src={selectedReq.approved_by_photo} className="object-cover" />
                            <AvatarFallback className="bg-brand-light text-brand-teal font-bold text-xs">
                              {selectedReq.approved_by.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">Approved by {selectedReq.approved_by}</span>
                            <span className="text-xs text-muted-foreground">{selectedReq.approved_by_role || 'Admin'}</span>
                          </div>
                        </div>
                      ) : selectedReq.status === 'Pending' ? (
                        `This request was submitted on ${selectedReq.requested_on}.`
                      ) : (
                        `This request is ${selectedReq.status.toLowerCase()}.`
                      )}
                    </div>
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
