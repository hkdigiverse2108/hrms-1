"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Plus, Sun, Thermometer, Clock, MoreHorizontal, PartyPopper, Church, Briefcase, Flag, Gift, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2, Eye, Download, Search, RotateCcw } from "lucide-react";
import { exportToCSV } from "@/lib/export";

import { TablePagination } from "@/components/common/TablePagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "antd";
import { toast } from "sonner";

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { useUserContext } from "@/context/UserContext";
import { API_URL } from "@/lib/config";

  // Holidays will be fetched from database

export default function LeavePage() {
  const { user } = useUserContext();
  const [activeTab, setActiveTab] = useState("history");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(dayjs());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Filter State
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("Pending");
  const [filterDateRange, setFilterDateRange] = useState<any>(null);
  const [appliedFilters, setAppliedFilters] = useState({
    type: "all",
    status: "Pending",
    dateRange: null as any
  });



  // Form State
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState<any>(dayjs());
  const [endDate, setEndDate] = useState<any>(dayjs());
  const [reason, setReason] = useState("");
  const [dayType, setDayType] = useState("Full Day");

  // Holiday Form State
  const [holidays, setHolidays] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    date: dayjs(),
    type: "National",
    company: "All Companies"
  });
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);


  const calculateLeaveDays = (start: any, end: any) => {
    if (!start || !end) return 0;
    let count = 0;
    let current = dayjs(start);
    const last = dayjs(end);
    
    while (current.isSameOrBefore(last, 'day')) {
      const isSunday = current.day() === 0;
      const isPublicHoliday = holidays.some(h => 
        dayjs(h.date).isSame(current, 'day') && 
        (!h.company || h.company === "All Companies" || h.company === user?.company)
      );
      
      if (!isSunday && !isPublicHoliday) {
        count++;
      }
      current = current.add(1, 'day');
    }
    return count;
  };

  useEffect(() => {
    if (user?.id) {
      fetchLeaves();
      fetchHolidays();
      fetchCompanies();
    }
  }, [user?.id]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/companies`);
      if (res.ok) {
        setCompanies(await res.json());
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_URL}/holidays`);
      if (res.ok) {
        setHolidays(await res.json());
      }
    } catch (err) {
      console.error("Error fetching holidays:", err);
    }
  };

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const endpoint = user?.role === "Admin" || user?.role === "HR" 
        ? `${API_URL}/leaves` 
        : `${API_URL}/leaves/employee/${user?.id}`;
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your leave.");
      return;
    }


    if (endDate.isBefore(startDate)) {
      toast.error("End date cannot be before start date.");
      return;
    }

    setIsSubmitting(true);
    const duration = calculateLeaveDays(startDate, endDate);
    if (duration === 0) {
      toast.error("The selected date range only contains holidays/Sundays.");
      setIsSubmitting(false);
      return;
    }
    const leaveTypeLabel = leaveType === 'other' ? 'Other' : leaveType.charAt(0).toUpperCase() + leaveType.slice(1) + " Leave";
    const leaveRequest = {
      type: leaveTypeLabel,
      start_date: startDate.format("DD-MM-YYYY"),
      end_date: endDate.format("DD-MM-YYYY"),
      duration: `${duration} Day${duration > 1 ? 's' : ''}`,
      reason: reason,
      day_type: dayType
    };

    try {
      const url = editingId ? `${API_URL}/leaves/${editingId}` : `${API_URL}/leaves`;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? leaveRequest : {
          ...leaveRequest,
          employee_id: user?.id,
          employee_name: user?.name,
          requested_on: dayjs().format("DD-MM-YYYY"),
          status: "Pending"
        })
      });

      if (res.ok) {
        toast.success(editingId ? "Leave request updated successfully!" : "Leave request submitted successfully!");
        setIsDialogOpen(false);
        setEditingId(null);
        fetchLeaves();
        // Reset form
        setReason("");
        setStartDate(dayjs());
        setEndDate(dayjs());
      } else {
        const errData = await res.json();
        toast.error(errData.detail || (editingId ? "Failed to update leave request." : "Failed to submit leave request."));
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Error connecting to server.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setLeaveType(item.type.toLowerCase().split(' ')[0]); // 'Annual Leave' -> 'annual'
    setStartDate(dayjs(item.start_date, "DD-MM-YYYY"));
    setEndDate(dayjs(item.end_date, "DD-MM-YYYY"));
    setReason(item.reason);
    setDayType(item.day_type || "Full Day");
    setIsDialogOpen(true);
  };

  const handleView = (item: any) => {
    setEditingId(item.id);
    setLeaveType(item.type.toLowerCase().split(' ')[0]);
    setStartDate(dayjs(item.start_date, "DD-MM-YYYY"));
    setEndDate(dayjs(item.end_date, "DD-MM-YYYY"));
    setReason(item.reason);
    setDayType(item.day_type || "Full Day");
    setIsViewOnly(true);
    setIsDialogOpen(true);
  };


  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leave request?")) return;
    
    try {
      const res = await fetch(`${API_URL}/leaves/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Request deleted successfully");
        fetchLeaves();
      } else {
        toast.error("Failed to delete request");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    }
  };

  const handleSearch = () => {
    setAppliedFilters({
      type: filterType,
      status: filterStatus,
      dateRange: filterDateRange
    });
  };

  const handleReset = () => {
    setFilterType("all");
    setFilterStatus("all");
    setFilterDateRange(null);
    setAppliedFilters({
      type: "all",
      status: "all",
      dateRange: null
    });
  };

  const getFilteredLeaves = () => {
    return leaves.filter(l => {
      // Type Filter
      if (appliedFilters.type !== "all") {
        const typeMatch = l.type.toLowerCase().includes(appliedFilters.type.toLowerCase());
        if (!typeMatch) return false;
      }

      // Status Filter
      if (appliedFilters.status !== "all") {
        if (l.status !== appliedFilters.status) return false;
      }

      // Date Range Filter
      if (appliedFilters.dateRange && appliedFilters.dateRange.length === 2) {
        const start = appliedFilters.dateRange[0].startOf('day');
        const end = appliedFilters.dateRange[1].endOf('day');
        const leaveStart = dayjs(l.start_date, "DD-MM-YYYY");
        const leaveEnd = dayjs(l.end_date, "DD-MM-YYYY");
        
        // Check if overlap
        const isOverlap = (leaveStart.isSameOrBefore(end) && leaveEnd.isSameOrAfter(start));
        if (!isOverlap) return false;
      }

      return true;
    });
  };

  const filteredLeavesData = getFilteredLeaves();
  const historyLeaves = filteredLeavesData.filter(l => dayjs(l.end_date, "DD-MM-YYYY").isBefore(dayjs(), 'day'));
  const upcomingLeaves = filteredLeavesData.filter(l => dayjs(l.end_date, "DD-MM-YYYY").isSameOrAfter(dayjs(), 'day'));

  const handleHolidaySubmit = async () => {
    if (!holidayForm.name) {
      toast.error("Please enter holiday name");
      return;
    }
    try {
      const url = editingHolidayId ? `${API_URL}/holidays/${editingHolidayId}` : `${API_URL}/holidays`;
      const method = editingHolidayId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: holidayForm.name,
          date: holidayForm.date.format("YYYY-MM-DD"),
          type: holidayForm.type,
          company: holidayForm.company === "All Companies" ? "" : holidayForm.company,
          duration: "1 Day"
        })
      });
      if (res.ok) {
        toast.success(editingHolidayId ? "Holiday updated successfully" : "Holiday added successfully");
        setIsHolidayDialogOpen(false);
        setEditingHolidayId(null);
        setHolidayForm({ name: "", date: dayjs(), type: "National", company: "All Companies" });
        fetchHolidays();
      }
    } catch (err) {
      toast.error(editingHolidayId ? "Failed to update holiday" : "Failed to add holiday");
    }
  };

  const handleHolidayEdit = (item: any) => {
    setEditingHolidayId(item.id);
    setHolidayForm({
      name: item.name,
      date: dayjs(item.date),
      type: item.type || "National",
      company: item.company || "All Companies"
    });
    setIsHolidayDialogOpen(true);
  };

  const handleHolidayDelete = async (id: string) => {
    if (!confirm("Delete this holiday?")) return;
    try {
      const res = await fetch(`${API_URL}/holidays/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Holiday deleted");
        fetchHolidays();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const getHolidayIcon = (name: string) => {
    if (name.includes("New Year")) return PartyPopper;
    if (name.includes("Independence")) return Flag;
    if (name.includes("Christmas")) return Gift;
    return Briefcase;
  };

  const getTypeIcon = (type: string) => {
    if (type.includes("Annual")) return Sun;
    if (type.includes("Sick")) return Thermometer;
    if (type.includes("Casual")) return Briefcase;
    return Clock;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="View your leave balances, history, and upcoming time off."
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium" onClick={() => exportToCSV(leaves, 'leaves')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium" onClick={() => setIsCalendarOpen(true)}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            View Calendar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
              setIsViewOnly(false);
            }
          }}>


            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Request Time Off
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {isViewOnly ? 'View Leave Request' : editingId ? 'Edit Leave Request' : 'Request Time Off'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isViewOnly ? 'Review leave request details' : editingId ? 'Update your leave request details' : 'Submit a new request for time off'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType} disabled={isViewOnly}>

                  <SelectTrigger id="leave-type" className="w-full">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Balance: 9 Days Available</p>
              </div>

                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="start-date">Start Date</Label>
                  <DatePicker 
                    id="start-date" 
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    className="w-full h-9" 
                    format="DD-MM-YYYY"
                    disabled={isViewOnly}
                  />
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="end-date">End Date</Label>
                  <DatePicker 
                    id="end-date" 
                    value={endDate}
                    onChange={(date) => setEndDate(date)}
                    className="w-full h-9" 
                    format="DD-MM-YYYY"
                    disabled={isViewOnly}
                  />
                </div>


              <div className="grid grid-cols-1 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="day-type">Day Type</Label>
                  <Select value={dayType} onValueChange={setDayType} disabled={isViewOnly}>
                    <SelectTrigger id="day-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full Day">Full Day</SelectItem>
                      <SelectItem value="First Half">First Half</SelectItem>
                      <SelectItem value="Second Half">Second Half</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


              <div className="bg-brand-light rounded-lg p-3 flex gap-3 border border-brand-teal/20 mt-4">
                <CalendarIcon className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-brand-teal">
                  {calculateLeaveDays(startDate, endDate)} days will be deducted from your balance.<br />
                  <span className="font-normal">(Excludes Sundays & Public Holidays)</span>
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea 
                  id="reason" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for leave..." 
                  className="resize-none min-h-[80px]" 
                  readOnly={isViewOnly}
                />
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{isViewOnly ? 'Close' : 'Cancel'}</Button>
              {!isViewOnly && (
                <Button 
                  onClick={handleRequestSubmit} 
                  disabled={isSubmitting}
                  className="bg-brand-teal hover:bg-brand-teal-light text-white"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingId ? 'Update Request' : 'Submit Request'}
                </Button>
              )}
            </DialogFooter>

          </DialogContent>
        </Dialog>
        </div>
      </PageHeader>

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Annual Leave Card */}
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="font-medium text-sm">Annual Leave</span>
            <div className="p-1.5 bg-brand-light rounded-md">
              <Sun className="w-4 h-4 text-brand-teal" />
            </div>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">9</span>
              <span className="text-sm text-muted-foreground">Days Available</span>
            </div>
          </div>
          <div className="flex justify-between text-sm pt-4 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-1">Used</div>
              <div className="font-medium">5 Days</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1">Allowance</div>
              <div className="font-medium">14 Days</div>
            </div>
          </div>
        </div>

        {/* Sick Leave Card */}
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="font-medium text-sm">Sick Leave</span>
            <div className="p-1.5 bg-brand-light rounded-md">
              <Thermometer className="w-4 h-4 text-brand-teal" />
            </div>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">4</span>
              <span className="text-sm text-muted-foreground">Days Available</span>
            </div>
          </div>
          <div className="flex justify-between text-sm pt-4 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-1">Used</div>
              <div className="font-medium">3 Days</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1">Allowance</div>
              <div className="font-medium">7 Days</div>
            </div>
          </div>
        </div>

        {/* Unpaid Leave Card */}
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="font-medium text-sm">Unpaid Leave</span>
            <div className="p-1.5 bg-brand-light rounded-md">
              <Clock className="w-4 h-4 text-brand-teal" />
            </div>
          </div>
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">0</span>
              <span className="text-sm text-muted-foreground">Days Taken</span>
            </div>
          </div>
          <div className="flex justify-between text-sm pt-4 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-1">Current Year</div>
              <div className="font-medium">0 Days</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1">Limit</div>
              <div className="font-medium">No limit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm mt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Leave Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-gray-50/50">
                <SelectValue placeholder="Select Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                <SelectItem value="annual">Annual Leave</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="casual">Casual Leave</SelectItem>
                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-gray-50/50">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <DatePicker.RangePicker 
              className="w-full h-10 bg-gray-50/50" 
              format="DD-MM-YYYY"
              value={filterDateRange}
              onChange={(dates) => setFilterDateRange(dates)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white font-medium">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="bg-transparent mt-8">
        <Tabs defaultValue="history" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto space-x-4 sm:space-x-6 overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsTrigger 
              value="history" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-muted-foreground data-[state=active]:bg-transparent px-1 py-3 data-[state=active]:shadow-none font-medium"
            >
              Leave History
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-muted-foreground data-[state=active]:bg-transparent px-1 py-3 data-[state=active]:shadow-none font-medium"
            >
              Upcoming Time Off
            </TabsTrigger>
            <TabsTrigger 
              value="public" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-muted-foreground data-[state=active]:bg-transparent px-1 py-3 data-[state=active]:shadow-none font-medium"
            >
              Public Holidays
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Leave Requests</h3>
              <p className="text-sm text-muted-foreground">{historyLeaves.length} records found</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground font-semibold bg-brand-light/40 border-b border-border uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Leave Type</th>
                    { (user?.role === 'Admin' || user?.role === 'HR') && <th className="px-6 py-4 font-medium tracking-wider">Employee</th> }
                    <th className="px-6 py-4 font-medium tracking-wider">Date Range</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Duration</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Requested On</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyLeaves.length > 0 ? (
                    historyLeaves.map((item) => {
                      const Icon = getTypeIcon(item.type);
                      return (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-brand-light rounded-md">
                                <Icon className="w-4 h-4 text-brand-teal" />
                              </div>
                              <span className="font-medium text-foreground">{item.type}</span>
                            </div>
                          </td>
                          { (user?.role === 'Admin' || user?.role === 'HR') && (
                            <td className="px-6 py-4">
                               <span className="font-medium">{item.employee_name}</span>
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="font-medium">{item.start_date} - {item.end_date}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{item.reason}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">{item.duration}</td>
                          <td className="px-6 py-4 text-muted-foreground">{item.requested_on}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-md ${
                              item.status === 'Approved' ? 'bg-green-50 text-green-700' : 
                              item.status === 'Rejected' ? 'bg-red-50 text-red-700' : 
                              'bg-orange-50 text-orange-600'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            { item.status === 'Pending' ? (
                               <div className="flex gap-2 justify-end">
                                 <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-brand-teal hover:bg-brand-light"
                                  onClick={() => handleEdit(item)}
                                  title="Edit Request"
                                 >
                                   <Pencil className="w-4 h-4" />
                                 </Button>
                                 <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(item.id)}
                                  title="Delete Request"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </Button>

                               </div>
                            ) : (
                               <div className="flex justify-end">
                                 <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-brand-teal hover:bg-brand-light"
                                  onClick={() => handleView(item)}
                                  title="View Details"
                                 >
                                   <Eye className="w-4 h-4" />
                                 </Button>
                               </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "No leave requests found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination />
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Upcoming Requests</h3>
              <p className="text-sm text-muted-foreground">{upcomingLeaves.length} records found</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground font-semibold bg-brand-light/40 border-b border-border uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Leave Type</th>
                    { (user?.role === 'Admin' || user?.role === 'HR') && <th className="px-6 py-4 font-medium tracking-wider">Employee</th> }
                    <th className="px-6 py-4 font-medium tracking-wider">Date Range</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Duration</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Requested On</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {upcomingLeaves.length > 0 ? (
                    upcomingLeaves.map((item) => {
                      const Icon = getTypeIcon(item.type);
                      return (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-brand-light rounded-md">
                                <Icon className="w-4 h-4 text-brand-teal" />
                              </div>
                              <span className="font-medium text-foreground">{item.type}</span>
                            </div>
                          </td>
                          { (user?.role === 'Admin' || user?.role === 'HR') && (
                            <td className="px-6 py-4">
                               <span className="font-medium">{item.employee_name}</span>
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="font-medium">{item.start_date} - {item.end_date}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{item.reason}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">{item.duration}</td>
                          <td className="px-6 py-4 text-muted-foreground">{item.requested_on}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-md ${
                              item.status === 'Approved' ? 'bg-green-50 text-green-700' : 
                              item.status === 'Rejected' ? 'bg-red-50 text-red-700' : 
                              'bg-orange-50 text-orange-600'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                        No upcoming leave requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination />
          </TabsContent>

          <TabsContent value="public" className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Public Holidays</h3>
              <div className="flex w-full sm:w-auto gap-3">
                <Select defaultValue="2026">
                  <SelectTrigger className="flex-1 sm:w-[120px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">Year: 2026</SelectItem>
                    <SelectItem value="2025">Year: 2025</SelectItem>
                  </SelectContent>
                </Select>

                {(user?.role === 'Admin' || user?.role === 'HR') && (
                  <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="h-9 bg-brand-teal hover:bg-brand-teal-light text-white font-medium" onClick={() => {
                        setEditingHolidayId(null);
                        setHolidayForm({ name: "", date: dayjs(), type: "National" });
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Holiday
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px]">
                      <DialogHeader>
                        <DialogTitle>{editingHolidayId ? 'Edit Public Holiday' : 'Add Public Holiday'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Holiday Name</Label>
                          <Input 
                            placeholder="e.g. New Year's Day" 
                            value={holidayForm.name}
                            onChange={(e) => setHolidayForm({...holidayForm, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2 flex flex-col">
                          <Label>Date</Label>
                          <DatePicker 
                            value={holidayForm.date}
                            onChange={(date) => setHolidayForm({...holidayForm, date: date || dayjs()})}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select 
                            value={holidayForm.type}
                            onValueChange={(val) => setHolidayForm({...holidayForm, type: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="National">National</SelectItem>
                              <SelectItem value="Regional">Regional</SelectItem>
                              <SelectItem value="Optional">Optional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Company</Label>
                          <Select 
                            value={holidayForm.company}
                            onValueChange={(val) => setHolidayForm({...holidayForm, company: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All Companies">All Companies</SelectItem>
                              {companies.map(c => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsHolidayDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={handleHolidaySubmit}>
                          Save Holiday
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground font-semibold bg-brand-light/40 border-b border-border uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Holiday Name</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-center">Type</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {holidays.filter(h => 
                    user?.role === 'Admin' || user?.role === 'HR' || 
                    !h.company || h.company === "All Companies" || h.company === user?.company
                  ).map((item) => {
                    const Icon = getHolidayIcon(item.name);
                    return (
                      <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-brand-light rounded-md">
                              <Icon className="w-4 h-4 text-brand-teal" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{item.name}</span>
                              {item.company && <span className="text-[10px] text-muted-foreground uppercase">{item.company}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-foreground font-medium">
                          {dayjs(item.date).format("MMMM DD, YYYY")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold rounded-md ${
                            item.type === 'National' ? 'bg-indigo-50 text-indigo-700' :
                            item.type === 'Regional' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(user?.role === 'Admin' || user?.role === 'HR') && (
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="icon" className="text-brand-teal h-8 w-8" onClick={() => handleHolidayEdit(item)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 h-8 w-8" onClick={() => handleHolidayDelete(item.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Calendar Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Leave Calendar</DialogTitle>
            <DialogDescription>Visualize your planned time off and public holidays on a calendar view.</DialogDescription>
          </DialogHeader>
          <div className="bg-brand-teal p-4 text-white">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Leave Calendar</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20 h-7 w-7"
                  onClick={() => setCalendarMonth(calendarMonth.subtract(1, 'month'))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-bold text-xs min-w-[90px] text-center">{calendarMonth.format("MMMM YYYY")}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20 h-7 w-7"
                  onClick={() => setCalendarMonth(calendarMonth.add(1, 'month'))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-brand-light/80 text-xs font-medium">Visualize your planned time off and holidays.</p>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-4 bg-white">
            <div className="grid grid-cols-7 gap-px mb-4 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{d}</div>
              ))}
              
              {(() => {
                const daysInMonth = calendarMonth.daysInMonth();
                const startDay = calendarMonth.startOf('month').day();
                const days = [];
                
                // Empty slots for previous month
                for (let i = 0; i < startDay; i++) {
                  days.push(<div key={`prev-${i}`} className="aspect-square"></div>);
                }
                
                for (let i = 1; i <= daysInMonth; i++) {
                  const currentDay = calendarMonth.date(i);
                  const isToday = currentDay.isSame(dayjs(), 'day');
                  const holiday = holidays.find(h => dayjs(h.date).isSame(currentDay, 'day'));
                  
                  const leave = leaves.find(l => {
                    const start = dayjs(l.start_date, "DD-MM-YYYY");
                    const end = dayjs(l.end_date, "DD-MM-YYYY");
                    return currentDay.isSameOrAfter(start, 'day') && currentDay.isSameOrBefore(end, 'day');
                  });

                  let bgColor = "bg-gray-50";
                  let textColor = "text-foreground";
                  let indicator = null;

                  if (isToday) {
                    bgColor = "bg-brand-light border-2 border-brand-teal/30";
                    textColor = "text-brand-teal font-bold";
                  }
                  
                  if (holiday) {
                    bgColor = "bg-indigo-50";
                    textColor = "text-indigo-700 font-bold";
                    indicator = <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>;
                  }

                  if (leave) {
                    if (leave.status === "Approved") {
                      bgColor = "bg-green-100";
                      textColor = "text-green-800 font-bold";
                    } else if (leave.status === "Pending") {
                      bgColor = "bg-amber-100";
                      textColor = "text-amber-800 font-bold";
                    } else if (leave.status === "Rejected") {
                      bgColor = "bg-red-50 opacity-60";
                    }
                  }

                  days.push(
                    <div 
                      key={i} 
                      className={`aspect-square relative flex flex-col items-center justify-center rounded-lg text-sm transition-all hover:scale-105 cursor-default group ${bgColor} ${textColor}`}
                    >
                      {i}
                      {indicator}
                      {leave && (
                        <div className={`absolute bottom-1 w-1 h-1 rounded-full ${
                          leave.status === "Approved" ? "bg-green-600" : "bg-amber-600"
                        }`}></div>
                      )}
                      {holiday && (
                        <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap z-10 pointer-events-none">
                          {holiday.name}
                        </div>
                      )}
                    </div>
                  );
                }
                return days;
              })()}
            </div>

            <div className="flex flex-wrap gap-4 pt-4 border-t border-border mt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
                <span>Approved</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="w-3 h-3 rounded bg-indigo-50 border border-indigo-200"></div>
                <span>Public Holiday</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <div className="w-3 h-3 rounded bg-brand-light border border-brand-teal/30"></div>
                <span>Today</span>
              </div>
            </div>
          </div>
          </div>
          <DialogFooter className="p-4 bg-gray-50 border-t border-border">
             <Button onClick={() => setIsCalendarOpen(false)} className="bg-brand-teal hover:bg-brand-teal-light text-white w-full sm:w-auto font-bold">Close Calendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
