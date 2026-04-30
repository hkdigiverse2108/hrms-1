"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Plus, Sun, Thermometer, Clock, MoreHorizontal, PartyPopper, Church, Briefcase, Flag, Gift, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2, Eye, Download } from "lucide-react";
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

const publicHolidays = [
  { id: 1, name: "New Year's Day", icon: PartyPopper, date: "January 1, 2026", duration: "1 Day", day: "Wednesday", type: "National" },
  { id: 2, name: "Good Friday", icon: Church, date: "April 18, 2026", duration: "1 Day", day: "Friday", type: "National" },
  { id: 3, name: "Labour Day", icon: Briefcase, date: "May 01, 2026", duration: "1 Day", day: "Thursday", type: "National" },
  { id: 4, name: "Independence Day", icon: Flag, date: "Aug 15, 2026", duration: "1 Day", day: "Friday", type: "National" },
  { id: 5, name: "Christmas Day", icon: Gift, date: "December 25, 2026", duration: "1 Day", day: "Thursday", type: "National" },
];

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



  // Form State
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState<any>(dayjs());
  const [endDate, setEndDate] = useState<any>(dayjs());
  const [reason, setReason] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);


  const calculateLeaveDays = (start: any, end: any) => {
    if (!start || !end) return 0;
    let count = 0;
    let current = dayjs(start);
    const last = dayjs(end);
    
    while (current.isSameOrBefore(last, 'day')) {
      const isSunday = current.day() === 0;
      const isPublicHoliday = publicHolidays.some(h => dayjs(h.date).isSame(current, 'day'));
      
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
    }
  }, [user?.id]);

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
    const leaveRequest = {
      type: leaveType === 'annual' ? 'Annual Leave' : leaveType === 'sick' ? 'Sick Leave' : 'Unpaid Leave',
      start_date: startDate.format("DD-MM-YYYY"),
      end_date: endDate.format("DD-MM-YYYY"),
      duration: `${duration} Day${duration > 1 ? 's' : ''}`,
      reason: reason,
      half_day: isHalfDay
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
    setIsHalfDay(item.half_day || false);
    setIsDialogOpen(true);
  };

  const handleView = (item: any) => {
    setEditingId(item.id);
    setLeaveType(item.type.toLowerCase().split(' ')[0]);
    setStartDate(dayjs(item.start_date, "DD-MM-YYYY"));
    setEndDate(dayjs(item.end_date, "DD-MM-YYYY"));
    setReason(item.reason);
    setIsHalfDay(item.half_day || false);
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



  const historyLeaves = leaves.filter(l => dayjs(l.end_date, "DD-MM-YYYY").isBefore(dayjs()));
  const upcomingLeaves = leaves.filter(l => dayjs(l.end_date, "DD-MM-YYYY").isSameOrAfter(dayjs()));

  const getTypeIcon = (type: string) => {
    if (type.includes("Annual")) return Sun;
    if (type.includes("Sick")) return Thermometer;
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
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
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


              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Half Day Request</Label>
                  <p className="text-xs text-muted-foreground">Apply as a half day for the start or end date</p>
                </div>
                <Switch checked={isHalfDay} onCheckedChange={setIsHalfDay} disabled={isViewOnly} />
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
            <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Recent Requests</h3>
              <div className="flex w-full sm:w-auto gap-3">
                <Select defaultValue="all">
                  <SelectTrigger className="flex-1 sm:w-[140px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="2026">
                  <SelectTrigger className="flex-1 sm:w-[120px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">Year: 2026</SelectItem>
                    <SelectItem value="2025">Year: 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  {leaves.length > 0 ? (
                    leaves.map((item) => {
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
            <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Upcoming Requests</h3>
              <div className="flex w-full sm:w-auto gap-3">
                <Select defaultValue="all">
                  <SelectTrigger className="flex-1 sm:w-[140px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="2026">
                  <SelectTrigger className="w-[120px] h-9 bg-gray-50/50">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">Year: 2026</SelectItem>
                    <SelectItem value="2025">Year: 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border gap-4">
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
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground font-semibold bg-brand-light/40 border-b border-border uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Holiday Name</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Duration</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Day of Week</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {publicHolidays.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-brand-light rounded-md">
                            <item.icon className="w-4 h-4 text-brand-teal" />
                          </div>
                          <span className="font-medium text-foreground">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">{item.date}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">{item.duration}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{item.day}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-600">
                          {item.type}
                        </span>
                      </td>
                    </tr>
                  ))}
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
                  const holiday = publicHolidays.find(h => dayjs(h.date).isSame(currentDay, 'day'));
                  
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
