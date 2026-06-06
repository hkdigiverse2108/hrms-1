"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  X, 
  MessageSquare, 
  Check, 
  FileText, 
  Clock, 
  Users,
  ChevronLeft,
  Loader2,
  Eye,
  ImageIcon,
  Calendar,
  Inbox,
  Briefcase,
  Paperclip,
  TrendingUp,
  Info,
  RotateCcw,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Trash2
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePagination } from "@/components/common/TablePagination";
import { DatePicker } from "antd";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import { API_URL, getAvatarUrl } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
import { toast } from "sonner";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Helper to determine background/text colors for fallback avatars based on name hash
const getAvatarColorClass = (name: string) => {
  const code = (name || "E").charCodeAt(0) % 5;
  switch (code) {
    case 0: return "bg-indigo-50 text-indigo-600 border border-indigo-100/60";
    case 1: return "bg-emerald-50 text-emerald-600 border border-emerald-100/60";
    case 2: return "bg-amber-50 text-amber-600 border border-amber-100/60";
    case 3: return "bg-rose-50 text-rose-600 border border-rose-100/60";
    default: return "bg-cyan-50 text-cyan-600 border border-cyan-100/60";
  }
};

// Helper to parse leave request duration from string (e.g., "1 Day", "0.5 Days", "2.5 Days")
const parseDuration = (durationStr: string): number => {
  if (!durationStr) return 0;
  const cleaned = durationStr.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export default function LeaveRequestsPage() {
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('leave-requests', 'canView')) {
        router.push('/');
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission]);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Filters State
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [tabFilter, setTabFilter] = useState("pending"); // "pending" | "approved" | "past" | "all"

  // Memoize unique employees from requests list
  const uniqueEmployees = React.useMemo(() => {
    const map = new Map();
    requests.forEach((req) => {
      if (req.employee_id && req.employee_name) {
        map.set(req.employee_id, {
          id: req.employee_id,
          name: req.employee_name,
        });
      }
    });
    return Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [requests]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (targetId && requests.length > 0) {
      setSelectedId(targetId);
      setTabFilter("all");
      setDetailsModalOpen(true);
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
          setTabFilter("all");
          setDetailsModalOpen(true);
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

  const handleStatusUpdate = async (id: string, newStatus: string, reasonText?: string) => {
    setIsUpdating(true);
    try {
      const body: any = { status: newStatus };
      if ((newStatus === 'Approved' || newStatus === 'Rejected' || newStatus === 'Cancelled') && user) {
        body.approved_by = user.name;
        body.approved_by_role = user.role;
        body.approved_by_id = user.id;
        body.approved_by_photo = user.profilePhoto;
      }
      if ((newStatus === 'Rejected' || newStatus === 'Cancelled') && reasonText) {
        body.reject_reason = reasonText;
      }
      if (newStatus === 'Approved' && reasonText) {
        body.approve_reason = reasonText;
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
        setRejectModalOpen(false);
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

  const handleDelete = async (id: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_URL}/leaves/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Leave request deleted successfully");
        fetchRequests();
      } else {
        toast.error("Failed to delete leave request");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Error deleting leave request");
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedReq = requests.find((r) => r.id === selectedId);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Approved': return { color: 'bg-emerald-500', text: 'text-emerald-600' };
      case 'Rejected': return { color: 'bg-rose-500', text: 'text-rose-600' };
      case 'Cancelled': return { color: 'bg-slate-400', text: 'text-slate-500' };
      default: return { color: 'bg-brand-teal', text: 'text-brand-teal' };
    }
  };

  const handleReset = () => {
    setSelectedEmployee("all");
    setFilterType("all");
    setFilterDateRange(null);
    setFilterStatus("all");
    setCurrentPage(1);
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    );
  }

  // Helper to filter all requests in memory
  const getFilteredRequests = () => {
    return requests.filter((req) => {
      // 1. Tab Filter
      if (tabFilter === "pending") {
        if (req.status?.toLowerCase() !== "pending") return false;
      } else if (tabFilter === "approved") {
        const isApproved = req.status === "Approved";
        const isFutureOrToday = req.end_date ? dayjs(req.end_date, "DD-MM-YYYY").isSameOrAfter(dayjs(), 'day') : true;
        if (!isApproved || !isFutureOrToday) return false;
      } else if (tabFilter === "past") {
        const isRejectedOrCancelled = req.status === "Rejected" || req.status === "Cancelled";
        const isApprovedPast = req.status === "Approved" && req.end_date && dayjs(req.end_date, "DD-MM-YYYY").isBefore(dayjs(), 'day');
        if (!isRejectedOrCancelled && !isApprovedPast) return false;
      }

      // 2. Employee Dropdown Filter
      if (selectedEmployee !== "all") {
        if (req.employee_id !== selectedEmployee) return false;
      }

      // 3. Leave Type Filter
      if (filterType !== "all") {
        const typeMatch = req.type?.toLowerCase().includes(filterType.toLowerCase());
        if (!typeMatch) return false;
      }

      // 4. Date Range Filter
      if (filterDateRange && filterDateRange.length === 2) {
        const filterStart = filterDateRange[0].startOf('day');
        const filterEnd = filterDateRange[1].endOf('day');
        const reqStart = dayjs(req.start_date, "DD-MM-YYYY").startOf('day');
        const reqEnd = dayjs(req.end_date, "DD-MM-YYYY").endOf('day');
        const isOverlap = reqStart.isSameOrBefore(filterEnd) && reqEnd.isSameOrAfter(filterStart);
        if (!isOverlap) return false;
      }

      // 5. Status Filter (Only when on 'All' tab)
      if (tabFilter === "all" && filterStatus !== "all") {
        if (req.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      return true;
    });
  };

  const filteredRequests = getFilteredRequests();
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Quick stats values
  const totalCount = requests.length;
  const pendingCountTotal = requests.filter(r => r.status?.toLowerCase() === 'pending').length;
  const approvedCountTotal = requests.filter(r => r.status === 'Approved').length;
  const rejectedCountTotal = requests.filter(r => r.status === 'Rejected' || r.status === 'Cancelled').length;

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-transparent">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-brand-teal" />
            <span>Employee Leave Requests</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Review, filter, and approve time-off and leave requests submitted by all organization members.
          </p>
        </div>
      </div>

      {/* QUICK STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Review Card */}
        <button 
          onClick={() => { setTabFilter("pending"); setCurrentPage(1); }}
          className={`text-left p-6 rounded-2xl border flex items-center gap-4.5 transition-all duration-300 cursor-pointer active:scale-98 select-none bg-white
            ${tabFilter === "pending" 
              ? "border-slate-300 shadow-sm" 
              : "border-slate-100 hover:border-slate-200 hover:shadow-2xs"
            }`}
        >
          <div className="p-3.5 rounded-xl shrink-0 bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Pending Review</span>
            <span className="text-3xl font-black font-sans leading-none mt-1 text-slate-800">{pendingCountTotal}</span>
          </div>
        </button>

        {/* Approved Leaves Card */}
        <button 
          onClick={() => { setTabFilter("approved"); setCurrentPage(1); }}
          className={`text-left p-6 rounded-2xl border flex items-center gap-4.5 transition-all duration-300 cursor-pointer active:scale-98 select-none bg-white
            ${tabFilter === "approved" 
              ? "border-slate-300 shadow-sm" 
              : "border-slate-100 hover:border-slate-200 hover:shadow-2xs"
            }`}
        >
          <div className="p-3.5 rounded-xl shrink-0 bg-emerald-50 text-emerald-600">
            <Check className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Approved Leaves</span>
            <span className="text-3xl font-black font-sans leading-none mt-1 text-slate-800">{approvedCountTotal}</span>
          </div>
        </button>

        {/* Rejected/Cancelled Card */}
        <button 
          onClick={() => { setTabFilter("all"); setFilterStatus("Rejected"); setCurrentPage(1); }}
          className={`text-left p-6 rounded-2xl border flex items-center gap-4.5 transition-all duration-300 cursor-pointer active:scale-98 select-none bg-white
            ${tabFilter === "all" && filterStatus === "Rejected" 
              ? "border-slate-300 shadow-sm" 
              : "border-slate-100 hover:border-slate-200 hover:shadow-2xs"
            }`}
        >
          <div className="p-3.5 rounded-xl shrink-0 bg-rose-50 text-rose-600">
            <X className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Rejected / Cancelled</span>
            <span className="text-3xl font-black font-sans leading-none mt-1 text-slate-800">{rejectedCountTotal}</span>
          </div>
        </button>

        {/* Total Requests Card */}
        <button 
          onClick={() => { setTabFilter("all"); setFilterStatus("all"); setCurrentPage(1); }}
          className={`text-left p-6 rounded-2xl border flex items-center gap-4.5 transition-all duration-300 cursor-pointer active:scale-98 select-none bg-white
            ${tabFilter === "all" && filterStatus === "all" 
              ? "border-slate-300 shadow-sm" 
              : "border-slate-100 hover:border-slate-200 hover:shadow-2xs"
            }`}
        >
          <div className="p-3.5 rounded-xl shrink-0 bg-indigo-50 text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Requests</span>
            <span className="text-3xl font-black font-sans leading-none mt-1 text-slate-800">{totalCount}</span>
          </div>
        </button>
      </div>

      {/* FILTER BAR SECTION */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        <div className={`grid grid-cols-1 ${tabFilter === "all" ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4 items-end`}>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Filter Employee</label>
            <Select value={selectedEmployee} onValueChange={(val) => { setSelectedEmployee(val); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-xl text-xs font-sans">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent className="font-sans max-h-60 overflow-y-auto">
                <SelectItem value="all">All Employees</SelectItem>
                {uniqueEmployees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Leave Type</label>
            <Select value={filterType} onValueChange={(val) => { setFilterType(val); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-xl text-xs font-sans">
                <SelectValue placeholder="Select Leave Type" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="all">All Leave Types</SelectItem>
                <SelectItem value="annual">Monthly Leave</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="casual">Casual Leave</SelectItem>
                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tabFilter === "all" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Status</label>
              <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-xl text-xs font-sans">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="font-sans">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Leave Period Range</label>
            <DatePicker.RangePicker 
              className="w-full h-10 border border-slate-200 bg-slate-50/50 hover:border-slate-300 rounded-xl transition-colors focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal/20 font-sans" 
              format="DD-MM-YYYY"
              value={filterDateRange}
              onChange={(dates) => { setFilterDateRange(dates); setCurrentPage(1); }}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline" className="flex-1 h-10 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl active:scale-95 transition-all">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* TABS & DATA TABLE */}
      <Tabs value={tabFilter} onValueChange={(val) => { setTabFilter(val); setCurrentPage(1); }} className="w-full">
        <TabsList className="bg-transparent border-b border-slate-100 w-full justify-start rounded-none p-0 h-auto space-x-6 overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden">
          <TabsTrigger 
            value="pending" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-slate-400 data-[state=active]:bg-transparent px-1 py-3.5 data-[state=active]:shadow-none font-bold text-xs capitalize cursor-pointer transition-all"
          >
            Pending
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-slate-400 data-[state=active]:bg-transparent px-1 py-3.5 data-[state=active]:shadow-none font-bold text-xs capitalize cursor-pointer transition-all"
          >
            Approved
          </TabsTrigger>
          <TabsTrigger 
            value="all" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-slate-400 data-[state=active]:bg-transparent px-1 py-3.5 data-[state=active]:shadow-none font-bold text-xs capitalize cursor-pointer transition-all"
          >
            All
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={tabFilter} className="mt-6 bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] text-slate-500 font-bold bg-slate-50/50 border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold text-center">Sr. No.</th>
                  <th className="px-6 py-4 font-bold">Employee</th>
                  <th className="px-6 py-4 font-bold">Leave Type</th>
                  <th className="px-6 py-4 font-bold">Leave Period</th>
                  <th className="px-6 py-4 font-bold text-center">Duration</th>
                  <th className="px-6 py-4 font-bold">Submitted</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Approver / Reviewer</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                        <span className="text-xs font-semibold">Loading leaves from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRequests.length > 0 ? (
                  paginatedRequests.map((item, index) => {
                    const avatarColor = getAvatarColorClass(item.employee_name);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-colors group">
                        
                        {/* Serial Number */}
                        <td className="px-6 py-4 text-center font-bold text-slate-400 font-sans">
                          {String((currentPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                        </td>
                        
                        {/* Employee Details */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border border-slate-100 shrink-0">
                              <AvatarFallback className={`font-bold text-xs ${avatarColor}`}>
                                {item.employee_name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-left">
                              <span className="text-[13px] font-extrabold text-slate-800 leading-tight">
                                {item.employee_name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Leave Type */}
                        <td className="px-6 py-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 bg-slate-100 rounded-md cursor-pointer hover:bg-slate-200 transition-colors">
                                  {item.type}
                                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs font-sans text-xs">
                                <p className="leading-relaxed">{item.reason || "No reason specified."}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>

                        {/* Leave Period */}
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          <div className="flex items-center gap-1.5 font-sans">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.start_date} to {item.end_date}</span>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-6 py-4 text-center font-bold text-slate-800 font-sans">
                          {item.duration}
                        </td>

                        {/* Submitted On */}
                        <td className="px-6 py-4 text-slate-500 text-xs font-sans">
                          {item.requested_on}
                        </td>

                        {/* Status badge / selector */}
                        <td className="px-6 py-4">
                          {(isAdmin || checkPermission('leave-requests', 'canEdit')) ? (
                            <Select 
                              value={item.status} 
                              onValueChange={(val) => {
                                if (val === 'Rejected') {
                                  setRejectingId(item.id);
                                  setRejectReason("");
                                  setRejectModalOpen(true);
                                } else if (val === 'Cancelled') {
                                  handleDelete(item.id);
                                } else {
                                  handleStatusUpdate(item.id, val);
                                }
                              }}
                            >
                              <SelectTrigger className={`!h-8 w-[105px] pl-3.5 pr-2.5 text-[10px] font-bold rounded-full border border-slate-200 bg-white uppercase tracking-wider cursor-pointer shadow-3xs font-sans focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 flex items-center justify-between leading-none
                                ${item.status === 'Approved' ? 'text-emerald-600' : 
                                  item.status === 'Rejected' ? 'text-rose-600' : 
                                  item.status === 'Cancelled' ? 'text-slate-500' : 
                                  'text-amber-600'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="font-sans text-[10px] font-semibold uppercase tracking-wider">
                                <SelectItem value="Pending" className="text-amber-600 focus:text-amber-600">Pending</SelectItem>
                                <SelectItem value="Approved" className="text-emerald-600 focus:text-emerald-600">Approved</SelectItem>
                                <SelectItem value="Rejected" className="text-rose-600 focus:text-rose-600">Rejected</SelectItem>
                                <SelectItem value="Cancelled" className="text-slate-500 focus:text-slate-500">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`inline-flex items-center justify-center h-8 px-3.5 text-[10px] font-bold rounded-full border border-slate-200 uppercase tracking-wider w-[105px]
                              ${item.status === 'Approved' ? 'text-emerald-600' : 
                                item.status === 'Rejected' ? 'text-rose-600' : 
                                item.status === 'Cancelled' ? 'text-slate-500' : 
                                'text-amber-600'}`}>
                              {item.status}
                            </span>
                          )}
                        </td>

                        {/* Reviewer / Approved By */}
                        <td className="px-6 py-4">
                          {item.status === 'Approved' || item.status === 'Rejected' || item.status === 'Cancelled' ? (
                            item.approved_by ? (
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7 border border-slate-100">
                                  <AvatarImage src={getAvatarUrl(item.approved_by_photo)} className="object-cover" />
                                  <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-[10px]">
                                    {item.approved_by.split(' ').map((n: string) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-[12px] font-extrabold text-slate-800 leading-tight">
                                    {item.approved_by}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-semibold uppercase">
                                    {item.approved_by_role || 'HR'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Reviewed</span>
                            )
                          ) : (
                            <span className="text-slate-400/70 text-xs italic flex items-center gap-1 font-sans">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              Awaiting Action
                            </span>
                          )}
                        </td>

                        {/* Inline Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            
                            {/* View Details button */}
                            <button 
                              type="button"
                              className="h-8 w-8 bg-slate-50 hover:bg-brand-teal hover:text-white text-slate-500 border border-slate-200 rounded-full cursor-pointer transition-all duration-200 flex items-center justify-center shadow-xs"
                              title="View Details"
                              onClick={() => {
                                setSelectedId(item.id);
                                setDetailsModalOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center p-8 gap-2.5">
                        <Inbox className="w-10 h-10 text-slate-300" />
                        <span className="text-xs font-semibold">No requests match the active filters</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Component */}
          {filteredRequests.length > 0 && (
            <TablePagination 
              totalItems={filteredRequests.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemName="requests"
            />
          )}

        </TabsContent>
      </Tabs>

      {/* DETAILS MODAL DIALOG */}
      <Dialog open={detailsModalOpen} onOpenChange={(open) => {
        setDetailsModalOpen(open);
        if (!open) setSelectedId(null);
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-6 rounded-2xl font-sans">
          
          {selectedReq ? (() => {
            return (
              <>
                <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
                  <DialogTitle className="text-lg font-bold text-slate-800 flex items-center justify-between pr-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-slate-100 shadow-xs">
                        <AvatarFallback className={`font-bold text-xs ${getAvatarColorClass(selectedReq.employee_name)}`}>
                          {selectedReq.employee_name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-slate-800 text-base leading-tight">{selectedReq.employee_name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Ref: #{selectedReq.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center justify-center h-8 px-3.5 text-[10px] font-bold rounded-full border border-slate-200 uppercase tracking-wider w-[105px]
                      ${selectedReq.status === 'Approved' ? 'text-emerald-600' : 
                        selectedReq.status === 'Rejected' ? 'text-rose-600' : 
                        selectedReq.status === 'Cancelled' ? 'text-slate-500' : 
                        'text-amber-600'}`}>
                      {selectedReq.status}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-4 overflow-y-auto flex-1 pr-1">
                  
                  {/* Parameter Grid */}
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Leave Type</span>
                      <span className="text-xs font-extrabold text-slate-700 capitalize mt-0.5">{selectedReq.type}</span>
                    </div>

                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Duration</span>
                      <span className="text-xs font-extrabold text-slate-700 mt-0.5">{selectedReq.duration}</span>
                    </div>

                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date Period</span>
                      <span className="text-xs font-extrabold text-slate-700 mt-0.5">{selectedReq.start_date} to {selectedReq.end_date}</span>
                    </div>

                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Submitted On</span>
                      <span className="text-xs font-extrabold text-slate-700 mt-0.5">{selectedReq.requested_on}</span>
                    </div>
                  </div>

                  {/* Reason Section */}
                  <div className="text-left space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Employee Reason</span>
                    <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                      {selectedReq.reason || "No reason specified."}
                    </p>
                  </div>

                  {/* Approval / Rejection Reason notes */}
                  {selectedReq.status === 'Approved' && selectedReq.approve_reason && (
                    <div className="text-left space-y-1 pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Approval Notes</span>
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed italic">
                        "{selectedReq.approve_reason}"
                      </p>
                    </div>
                  )}
                  {selectedReq.status === 'Rejected' && selectedReq.reject_reason && (
                    <div className="text-left space-y-1 pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rejection Reason</span>
                      <p className="text-xs text-rose-700 font-semibold leading-relaxed italic">
                        "{selectedReq.reject_reason}"
                      </p>
                    </div>
                  )}

                  {/* Proof Attachment */}
                  {selectedReq.proof_image && (
                    <div className="text-left space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Attachment</span>
                      <a 
                        href={selectedReq.proof_image.startsWith('http') ? selectedReq.proof_image : `${API_URL}${selectedReq.proof_image}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-3xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Open Attached Document
                      </a>
                    </div>
                  )}

                </div>

                <DialogFooter className="shrink-0 pt-3 border-t border-slate-100 flex gap-2 justify-end mt-2">
                  <Button variant="outline" onClick={() => setDetailsModalOpen(false)} className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">Close</Button>
                  
                  {selectedReq.status === 'Pending' && (isAdmin || checkPermission('leave-requests', 'canEdit')) && (
                    <>
                      <Button 
                        variant="outline" 
                        disabled={isUpdating}
                        onClick={() => {
                          setRejectingId(selectedReq.id);
                          setRejectReason("");
                          setDetailsModalOpen(false);
                          setRejectModalOpen(true);
                        }}
                        className="border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold text-xs rounded-xl transition-colors"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        disabled={isUpdating}
                        onClick={() => {
                          handleStatusUpdate(selectedReq.id, 'Approved');
                          setDetailsModalOpen(false);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                    </>
                  )}
                  {selectedReq.status === 'Approved' && (isAdmin || checkPermission('leave-requests', 'canEdit')) && (
                    <Button 
                      variant="outline" 
                      disabled={isUpdating}
                      onClick={() => {
                        handleDelete(selectedReq.id);
                        setDetailsModalOpen(false);
                      }}
                      className="border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 font-bold text-xs rounded-xl transition-colors"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Cancel Leave
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })() : null}

        </DialogContent>
      </Dialog>

      {/* QUICK STATUS UPDATE ACTION CONFIRM DIALOGS */}

      {/* REJECT CONFIRM DIALOG */}
      <Dialog open={rejectModalOpen} onOpenChange={(open) => { setRejectModalOpen(open); if (open) setRejectReason(""); }}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-700 border-b border-slate-50 pb-2 flex items-center gap-2">
              <X className="w-5 h-5 text-red-600 bg-red-50 rounded-full p-0.5" />
              Reject Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Rejection Reason <span className="text-rose-500">*</span></label>
              <Textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify the reason for rejection (required)..." 
                className="resize-none h-20 text-xs bg-white border-slate-200 rounded-xl focus:border-brand-teal focus:ring-brand-teal/20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4 border-t border-slate-50 pt-3">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} className="rounded-xl border-slate-200 text-xs font-semibold">Cancel</Button>
            <Button 
              disabled={isUpdating || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={() => handleStatusUpdate(rejectingId || "", 'Rejected', rejectReason)}
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <X className="w-3.5 h-3.5 mr-1" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
