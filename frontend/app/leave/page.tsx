"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Plus, Sun, Thermometer, Clock, MoreHorizontal, PartyPopper, Church, Briefcase, Flag, Gift, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2, Eye, Download, Search, RotateCcw, UploadCloud, ImageIcon, X, Paperclip, Check, Globe, Info } from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";

import { TablePagination } from "@/components/common/TablePagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "antd";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

import { useUserContext } from "@/context/UserContext";
import { API_URL, getAvatarUrl } from "@/lib/config";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";

  // Holidays will be fetched from database

interface TableAvatarProps {
  photoUrl?: string;
  name?: string;
}

function TableAvatar({ photoUrl, name }: TableAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);
  
  const isInvalidPhoto = !photoUrl || photoUrl === "undefined" || photoUrl === "null";
  const resolvedUrl = isInvalidPhoto ? undefined : getAvatarUrl(photoUrl);

  if (!resolvedUrl || hasError) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">
        {(name || "Employee")[0].toUpperCase()}
      </div>
    );
  }

  return (
    <img 
      src={resolvedUrl} 
      alt="" 
      className="w-full h-full object-cover" 
      onError={() => setHasError(true)}
    />
  );
}

export default function LeavePage() {
  const { confirm } = useConfirm();
  const { user } = useUserContext();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const router = useRouter();

  const canViewLeave = isAdmin || checkPermission('leave', 'canView');
  const canAddLeave = isAdmin || checkPermission('leave', 'canAdd');
  const canEditLeave = isAdmin || checkPermission('leave', 'canEdit');
  const canDeleteLeave = isAdmin || checkPermission('leave', 'canDelete');

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('leave', 'canView')) {
        router.push('/');
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission]);

  const [activeTab, setActiveTab] = useState("history");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellingLeaveId, setCancellingLeaveId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
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
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewStatus, setViewStatus] = useState<string | null>(null);
  const [viewRejectReason, setViewRejectReason] = useState<string | null>(null);
  const [viewApproveReason, setViewApproveReason] = useState<string | null>(null);
  const [viewApprovedBy, setViewApprovedBy] = useState<string | null>(null);

  // Pagination states
  const [historyPage, setHistoryPage] = useState(1);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [balancePage, setBalancePage] = useState(1);
  const [holidaysPage, setHolidaysPage] = useState(1);
  const itemsPerPage = 10;

  // Holiday Form State
  const [holidays, setHolidays] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [sysSettings, setSysSettings] = useState<any>(null);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    date: dayjs(),
    type: "National",
    company: "All Companies"
  });
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);

  const [isFetchHolidaysDialogOpen, setIsFetchHolidaysDialogOpen] = useState(false);
  const [fetchYear, setFetchYear] = useState("2026");
  const [fetchCountry, setFetchCountry] = useState("IN");
  const [fetchedHolidays, setFetchedHolidays] = useState<any[]>([]);
  const [selectedFetchedHolidays, setSelectedFetchedHolidays] = useState<Set<string>>(new Set());
  const [isFetchingHolidays, setIsFetchingHolidays] = useState(false);

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
      fetchSysSettings();
    }
  }, [user?.id]);

  const fetchSysSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/system-settings`);
      if (res.ok) {
        setSysSettings(await res.json());
      }
    } catch (err) {
      console.error("Error fetching system settings:", err);
    }
  };

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
      const endpoint = `${API_URL}/leaves/employee/${user?.id}`;
      
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should not exceed 5MB.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProofImage(data.url);
        toast.success("Proof image uploaded successfully!");
      } else {
        toast.error("Failed to upload proof image.");
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Error connecting to upload server.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (leaveType === "annual") {
      const allowed = sysSettings?.allowedMonthlyPaidLeaves !== undefined ? sysSettings.allowedMonthlyPaidLeaves : 1;
      if (annualCurrentMonth >= allowed) {
        toast.error("You have reached your limit of free monthly leaves. You cannot request more monthly leaves.");
        return;
      }
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for your leave.");
      return;
    }


    if (endDate.isBefore(startDate)) {
      toast.error("End date cannot be before start date.");
      return;
    }

    setIsSubmitting(true);
    let duration = calculateLeaveDays(startDate, endDate);
    if (duration === 1 && (dayType === "First Half" || dayType === "Second Half")) {
      duration = 0.5;
    }

    if (duration === 0) {
      toast.error("The selected date range only contains holidays/Sundays.");
      setIsSubmitting(false);
      return;
    }
    const leaveTypeLabel = 
      leaveType === 'annual' ? 'Monthly Leave' : 
      leaveType === 'other' ? 'Other' : 
      leaveType.charAt(0).toUpperCase() + leaveType.slice(1) + " Leave";
    const leaveRequest = {
      type: leaveTypeLabel,
      start_date: startDate.format("DD-MM-YYYY"),
      end_date: endDate.format("DD-MM-YYYY"),
      duration: `${duration} Day${duration > 1 ? 's' : ''}`,
      reason: reason,
      day_type: dayType,
      proof_image: proofImage
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
          requested_on: dayjs().format("DD-MM-YYYY HH:mm"),
          status: "Pending"
        })
      });

      if (res.ok) {
        toast.success(editingId ? "Leave request updated successfully!" : "Leave request submitted successfully!");
        setIsDialogOpen(false);
        setEditingId(null);
        setProofImage(null);
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
    const typeLower = item.type.toLowerCase();
    if (typeLower.includes('monthly') || typeLower.includes('annual')) {
      setLeaveType('annual');
    } else {
      setLeaveType(typeLower.split(' ')[0]);
    }
    setStartDate(dayjs(item.start_date, "DD-MM-YYYY"));
    setEndDate(dayjs(item.end_date, "DD-MM-YYYY"));
    setReason(item.reason);
    setDayType(item.day_type || "Full Day");
    setProofImage(item.proof_image || null);
    setViewStatus(item.status || null);
    setViewRejectReason(item.reject_reason || null);
    setViewApproveReason(item.approve_reason || null);
    setViewApprovedBy(item.approved_by || null);
    setIsDialogOpen(true);
  };

  const handleView = (item: any) => {
    setEditingId(item.id);
    setLeaveType(item.type.toLowerCase().split(' ')[0]);
    setStartDate(dayjs(item.start_date, "DD-MM-YYYY"));
    setEndDate(dayjs(item.end_date, "DD-MM-YYYY"));
    setReason(item.reason);
    setDayType(item.day_type || "Full Day");
    setProofImage(item.proof_image || null);
    setViewStatus(item.status || null);
    setViewRejectReason(item.reject_reason || null);
    setViewApproveReason(item.approve_reason || null);
    setViewApprovedBy(item.approved_by || null);
    setIsViewOnly(true);
    setIsDialogOpen(true);
  };


  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this leave request?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
    
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

  const handleCancelInitiate = (id: string) => {
    setCancellingLeaveId(id);
    setCancelReason("");
    setIsCancelDialogOpen(true);
  };

  const handleCancelSubmit = async () => {
    if (!cancellingLeaveId) return;
    if (!cancelReason.trim()) {
      toast.error("Please enter a reason for cancellation");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/leaves/${cancellingLeaveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Cancelled',
          reject_reason: cancelReason.trim()
        })
      });

      if (res.ok) {
        toast.success("Request cancelled successfully");
        setIsCancelDialogOpen(false);
        setCancellingLeaveId(null);
        setCancelReason("");
        fetchLeaves();
      } else {
        toast.error("Failed to cancel request");
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

  useEffect(() => {
    handleSearch();
  }, [filterType, filterStatus, filterDateRange]);

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

  const handleFetchExternalHolidays = async () => {
    setIsFetchingHolidays(true);
    try {
      const res = await fetch(`${API_URL}/holidays/fetch-external?year=${fetchYear}&country=${fetchCountry}`);
      if (res.ok) {
        const data = await res.json();
        setFetchedHolidays(data);
        const newSet = new Set<string>();
        data.forEach((h: any) => newSet.add(h.date + '-' + h.name));
        setSelectedFetchedHolidays(newSet);
      } else {
        toast.error("Failed to fetch holidays");
      }
    } catch (err) {
      toast.error("Error fetching holidays");
    } finally {
      setIsFetchingHolidays(false);
    }
  };

  const handleSaveFetchedHolidays = async () => {
    const toSave = fetchedHolidays.filter(h => selectedFetchedHolidays.has(h.date + '-' + h.name));
    if (toSave.length === 0) {
      toast.error("No holidays selected");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/holidays/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holidays: toSave })
      });
      if (res.ok) {
        toast.success(`Successfully added ${toSave.length} holidays`);
        setIsFetchHolidaysDialogOpen(false);
        fetchHolidays();
      } else {
        toast.error("Failed to save holidays");
      }
    } catch (err) {
      toast.error("Error saving holidays");
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
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Delete this holiday?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
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

  const handleDeleteAllHolidays = async () => {
    const isConfirmed = await confirm({
      title: "Delete All Holidays",
      message: "Are you sure you want to delete ALL public holidays? This action cannot be undone.",
      destructive: true,
      confirmText: "Delete All"
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/holidays`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("All holidays deleted successfully");
        fetchHolidays();
        setHolidaysPage(1);
      } else {
        toast.error("Failed to delete all holidays");
      }
    } catch (err) {
      toast.error("Failed to delete all holidays");
    }
  };

  const getHolidayIcon = (name: string) => {
    if (name.includes("New Year")) return PartyPopper;
    if (name.includes("Independence")) return Flag;
    if (name.includes("Christmas")) return Gift;
    return Briefcase;
  };

  const getTypeIcon = (type: string) => {
    if (type.includes("Annual") || type.includes("Monthly")) return Sun;
    if (type.includes("Sick")) return Thermometer;
    if (type.includes("Casual")) return Briefcase;
    return Clock;
  };

  // Helper to parse leave request duration from string (e.g., "1 Day", "0.5 Days", "2.5 Days")
  const parseDuration = (durationStr: string): number => {
    if (!durationStr) return 0;
    const cleaned = durationStr.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Filter leaves for the current logged-in employee to calculate stats
  const myLeaves = leaves.filter(l => l.employee_id === user?.id);

  // 1. Monthly Leave Calculations (matching 'annual' or 'monthly')
  const annualApproved = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return (t.includes('annual') || t.includes('monthly') || t === 'annual' || t === 'monthly') && l.status === 'Approved';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const annualPending = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return (t.includes('annual') || t.includes('monthly') || t === 'annual' || t === 'monthly') && l.status === 'Pending';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const annualCurrentMonth = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      const isCurrentMonth = l.start_date ? dayjs(l.start_date, "DD-MM-YYYY").isSame(dayjs(), 'month') : false;
      return (t.includes('annual') || t.includes('monthly') || t === 'annual' || t === 'monthly') && l.status === 'Approved' && isCurrentMonth;
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  // 2. Sick Leave Calculations
  const sickApproved = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return (t.includes('sick') || t === 'sick') && l.status === 'Approved';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const sickPending = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return (t.includes('sick') || t === 'sick') && l.status === 'Pending';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const sickCurrentMonth = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      const isCurrentMonth = l.start_date ? dayjs(l.start_date, "DD-MM-YYYY").isSame(dayjs(), 'month') : false;
      return (t.includes('sick') || t === 'sick') && l.status === 'Approved' && isCurrentMonth;
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  // 3. Casual Leave Calculations
  const casualApproved = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return (t.includes('casual') || t === 'casual') && l.status === 'Approved';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const casualPending = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return (t.includes('casual') || t === 'casual') && l.status === 'Pending';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const casualCurrentMonth = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      const isCurrentMonth = l.start_date ? dayjs(l.start_date, "DD-MM-YYYY").isSame(dayjs(), 'month') : false;
      return (t.includes('casual') || t === 'casual') && l.status === 'Approved' && isCurrentMonth;
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  // 4. Unpaid Leave Calculations
  const unpaidApproved = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return (t.includes('unpaid') || t === 'unpaid') && l.status === 'Approved';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const unpaidPending = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return (t.includes('unpaid') || t === 'unpaid') && l.status === 'Pending';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const unpaidCurrentMonth = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      const isCurrentMonth = l.start_date ? dayjs(l.start_date, "DD-MM-YYYY").isSame(dayjs(), 'month') : false;
      return (t.includes('unpaid') || t === 'unpaid') && l.status === 'Approved' && isCurrentMonth;
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  // 5. Other Leave Calculations
  const otherApproved = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return !t.includes('annual') && !t.includes('monthly') && !t.includes('sick') && !t.includes('casual') && !t.includes('unpaid') && l.status === 'Approved';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const otherPending = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      return !t.includes('annual') && !t.includes('monthly') && !t.includes('sick') && !t.includes('casual') && !t.includes('unpaid') && l.status === 'Pending';
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  const otherCurrentMonth = myLeaves
    .filter(l => {
      const t = (l.type || '').toLowerCase();
      const isCurrentMonth = l.start_date ? dayjs(l.start_date, "DD-MM-YYYY").isSame(dayjs(), 'month') : false;
      return !t.includes('annual') && !t.includes('monthly') && !t.includes('sick') && !t.includes('casual') && !t.includes('unpaid') && l.status === 'Approved' && isCurrentMonth;
    })
    .reduce((sum, l) => sum + parseDuration(l.duration), 0);

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="View your leave balances, history, and upcoming time off."
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          {(user?.role === 'Admin' || user?.role === 'HR') && (
            <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium" onClick={() => exportToCSV(leaves, 'leaves')}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
          <Button variant="outline" className="shadow-sm w-full sm:w-auto font-medium" onClick={() => setIsCalendarOpen(true)}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            View Calendar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
              setIsViewOnly(false);
              setProofImage(null);
              setViewStatus(null);
              setViewRejectReason(null);
              setViewApproveReason(null);
              setViewApprovedBy(null);
            }
          }}>


            {canAddLeave && user?.role !== 'Admin' && (
              <DialogTrigger asChild>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Request Leave
                </Button>
              </DialogTrigger>
            )}
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-6">
            <DialogHeader className="shrink-0 pb-2">
              <DialogTitle className="text-xl font-bold">
                {isViewOnly ? 'View Leave Request' : editingId ? 'Edit Leave Request' : 'Request Leave'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isViewOnly ? 'Review leave request details' : editingId ? 'Update your leave request details' : 'Submit a new request for leave'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-2 md:pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select value={leaveType} onValueChange={(val) => {
                  setLeaveType(val);
                  if (val === "annual") setDayType("Full Day");
                }} disabled={isViewOnly}>

                  <SelectTrigger id="leave-type" className="w-full">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Monthly Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                 {leaveType === "annual" && (
                   <p className="text-xs text-muted-foreground">
                    {(sysSettings?.allowedMonthlyPaidLeaves !== undefined ? sysSettings.allowedMonthlyPaidLeaves : 1) - annualCurrentMonth <= 0 ? (
                      <span className="text-rose-500 font-semibold flex items-center gap-1 animate-in fade-in duration-200">
                        ❌ Free leaves limit reached ({sysSettings?.allowedMonthlyPaidLeaves !== undefined ? sysSettings.allowedMonthlyPaidLeaves : 1} Day(s) Taken). You cannot request more monthly leaves.
                      </span>
                    ) : (
                      `Free Leave Allowance: ${sysSettings?.allowedMonthlyPaidLeaves !== undefined ? sysSettings.allowedMonthlyPaidLeaves : 1} Free Day(s) per Month (Remaining: ${Math.max(0, (sysSettings?.allowedMonthlyPaidLeaves !== undefined ? sysSettings.allowedMonthlyPaidLeaves : 1) - annualCurrentMonth)} Day(s))`
                    )}
                   </p>
                 )}
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
                  <Select value={dayType} onValueChange={setDayType} disabled={isViewOnly || leaveType === "annual"}>
                    <SelectTrigger id="day-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full Day">Full Day</SelectItem>
                      {leaveType !== "annual" && (
                        <>
                          <SelectItem value="First Half">First Half</SelectItem>
                          <SelectItem value="Second Half">Second Half</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isViewOnly ? (
                <div className="text-left space-y-1 pt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Employee Reason</span>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    {reason || "No reason specified."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea 
                    id="reason" 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for leave..." 
                    className="resize-none min-h-[80px]" 
                  />
                </div>
              )}

              {isViewOnly && viewStatus === 'Rejected' && (
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3.5 flex flex-col gap-1.5 mt-4">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <X className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Request Rejected</span>
                  </div>
                  {viewRejectReason ? (
                    <div className="text-xs text-rose-700 leading-relaxed pl-6">
                      <span className="font-bold block mb-0.5">Reason:</span>
                      <span>{viewRejectReason}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-rose-700 italic pl-6">
                      No rejection reason was provided.
                    </div>
                  )}
                </div>
              )}

              {isViewOnly && viewStatus === 'Approved' && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5 flex flex-col gap-1.5 mt-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Request Approved</span>
                  </div>
                  {viewApprovedBy && (
                    <p className="text-xs text-emerald-700 pl-6 leading-relaxed">
                      Approved by <span className="font-bold">{viewApprovedBy}</span>.
                    </p>
                  )}
                  {viewApproveReason && (
                    <div className="text-xs text-emerald-700 leading-relaxed pl-6 animate-in fade-in duration-200">
                      <span className="font-bold block mb-0.5">Note:</span>
                      <span>{viewApproveReason}</span>
                    </div>
                  )}
                </div>
              )}

              {isViewOnly && viewStatus === 'Cancelled' && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3.5 flex flex-col gap-1.5 mt-4">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <X className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Request Cancelled</span>
                  </div>
                  {viewApprovedBy && (
                    <p className="text-xs text-amber-700 pl-6 leading-relaxed">
                      Cancelled by <span className="font-bold">{viewApprovedBy}</span>.
                    </p>
                  )}
                  {viewRejectReason ? (
                    <div className="text-xs text-amber-700 leading-relaxed pl-6">
                      <span className="font-bold block mb-0.5">Reason:</span>
                      <span>{viewRejectReason}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 italic pl-6">
                      No cancellation reason was provided.
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Label className="text-sm font-semibold text-slate-700">Proof of Leave (Optional)</Label>
                {isViewOnly ? (
                  proofImage ? (
                    <div className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 transition-all hover:shadow-md duration-300">
                      <img 
                        src={proofImage.startsWith('http') ? proofImage : `${API_URL}${proofImage}`} 
                        alt="Leave Proof" 
                        className="w-full max-h-[180px] object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a 
                          href={proofImage.startsWith('http') ? proofImage : `${API_URL}${proofImage}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Full Image
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 bg-slate-50/50 text-center">
                      <p className="text-xs text-slate-400 font-medium italic">No proof image uploaded.</p>
                    </div>
                  )
                ) : (
                  proofImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                      <img 
                        src={proofImage.startsWith('http') ? proofImage : `${API_URL}${proofImage}`} 
                        alt="Leave Proof" 
                        className="w-full max-h-[150px] object-cover animate-in fade-in duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setProofImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow transition-colors duration-200 active:scale-95"
                        title="Remove Proof"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <label 
                        htmlFor="proof-upload" 
                        className="flex flex-col items-center justify-center w-full h-[100px] border-2 border-dashed border-slate-200 hover:border-brand-teal/50 rounded-xl bg-slate-50 hover:bg-brand-light/10 cursor-pointer transition-all duration-300 group"
                      >
                        <div className="flex flex-col items-center justify-center pt-3 pb-3">
                          {isUploading ? (
                            <>
                              <Loader2 className="w-6 h-6 text-brand-teal animate-spin mb-1" />
                              <p className="text-xs text-brand-teal font-semibold">Uploading proof image...</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-brand-teal group-hover:scale-110 transition-all duration-300 mb-1" />
                              <p className="text-xs text-slate-500 group-hover:text-slate-700 font-medium transition-colors duration-200">Click to upload leave proof image</p>
                              <p className="text-[10px] text-slate-400 font-normal">PNG, JPG, JPEG, WEBP up to 5MB</p>
                            </>
                          )}
                        </div>
                        <input 
                          id="proof-upload" 
                          type="file" 
                          accept="image/*,application/pdf"
                          className="hidden" 
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  )
                )}
              </div>

            </div>
            <DialogFooter className="shrink-0 pt-4 border-t border-slate-100 mt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{isViewOnly ? 'Close' : 'Cancel'}</Button>
              {!isViewOnly && (
                <Button 
                  onClick={handleRequestSubmit} 
                  disabled={isSubmitting || (leaveType === "annual" && annualCurrentMonth >= (sysSettings?.allowedMonthlyPaidLeaves !== undefined ? sysSettings.allowedMonthlyPaidLeaves : 1))}
                  className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
      {user?.role !== 'Admin' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Monthly Leave Card */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="font-medium text-xs text-slate-700">Monthly Leave</span>
            <div className="p-1 bg-brand-light rounded-md">
              <Sun className="w-3.5 h-3.5 text-brand-teal" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-foreground">{annualCurrentMonth}</span>
              <span className="text-[11px] text-muted-foreground">Days Taken ({dayjs().format('MMMM')})</span>
            </div>
          </div>
          <div className="flex justify-between text-xs pt-3 border-t border-border gap-2">
            <div>
              <div className="text-muted-foreground mb-0.5">Pending</div>
              <div className="font-medium">{annualPending} Day{annualPending !== 1 ? 's' : ''}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground mb-0.5">Free Allowance</div>
              <div className="font-medium">
                {sysSettings?.allowedMonthlyPaidLeaves !== undefined ? sysSettings.allowedMonthlyPaidLeaves : 1} Free Day{(sysSettings?.allowedMonthlyPaidLeaves !== 1) ? 's' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-0.5">Unpaid ({dayjs().format('MMM')})</div>
              <div className="font-semibold text-amber-600">
                {Math.max(0, annualCurrentMonth - (sysSettings?.allowedMonthlyPaidLeaves !== undefined ? sysSettings.allowedMonthlyPaidLeaves : 1))} Day(s)
              </div>
            </div>
          </div>
        </div>

        {/* Sick Leave Card */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="font-medium text-xs text-slate-700">Sick Leave</span>
            <div className="p-1 bg-brand-light rounded-md">
              <Thermometer className="w-3.5 h-3.5 text-brand-teal" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-foreground">{sickCurrentMonth}</span>
              <span className="text-[11px] text-muted-foreground">Days Taken ({dayjs().format('MMMM')})</span>
            </div>
          </div>
          <div className="flex justify-between text-xs pt-3 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-0.5">Pending</div>
              <div className="font-medium">{sickPending} Day{sickPending !== 1 ? 's' : ''}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-0.5">Overall</div>
              <div className="font-semibold text-amber-600">{sickApproved} Day{sickApproved !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Casual Leave Card */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="font-medium text-xs text-slate-700">Casual Leave</span>
            <div className="p-1 bg-brand-light rounded-md">
              <Briefcase className="w-3.5 h-3.5 text-brand-teal" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-foreground">{casualCurrentMonth}</span>
              <span className="text-[11px] text-muted-foreground">Days Taken ({dayjs().format('MMMM')})</span>
            </div>
          </div>
          <div className="flex justify-between text-xs pt-3 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-0.5">Pending</div>
              <div className="font-medium">{casualPending} Day{casualPending !== 1 ? 's' : ''}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-0.5">Overall</div>
              <div className="font-semibold text-amber-600">{casualApproved} Day{casualApproved !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Unpaid Leave Card */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="font-medium text-xs text-slate-700">Unpaid Leave</span>
            <div className="p-1 bg-brand-light rounded-md">
              <Clock className="w-3.5 h-3.5 text-brand-teal" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-foreground">{unpaidCurrentMonth}</span>
              <span className="text-[11px] text-muted-foreground">Days Taken ({dayjs().format('MMMM')})</span>
            </div>
          </div>
          <div className="flex justify-between text-xs pt-3 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-0.5">Pending</div>
              <div className="font-medium">{unpaidPending} Day{unpaidPending !== 1 ? 's' : ''}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-0.5">Overall</div>
              <div className="font-semibold text-amber-600">{unpaidApproved} Day{unpaidApproved !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Other Leave Card */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="font-medium text-xs text-slate-700">Other Leave</span>
            <div className="p-1 bg-brand-light rounded-md">
              <CalendarIcon className="w-3.5 h-3.5 text-brand-teal" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-foreground">{otherCurrentMonth}</span>
              <span className="text-[11px] text-muted-foreground">Days Taken ({dayjs().format('MMMM')})</span>
            </div>
          </div>
          <div className="flex justify-between text-xs pt-3 border-t border-border">
            <div>
              <div className="text-muted-foreground mb-0.5">Pending</div>
              <div className="font-medium">{otherPending} Day{otherPending !== 1 ? 's' : ''}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-0.5">Overall</div>
              <div className="font-semibold text-amber-600">{otherApproved} Day{otherApproved !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Filter Section */}
      {user?.role !== 'Admin' && (
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
                <SelectItem value="annual">Monthly Leave</SelectItem>
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
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <DatePicker.RangePicker 
              className="w-full h-10 border border-brand-teal/20 hover:border-brand-teal/40 bg-brand-light/30 rounded-lg transition-colors focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal" 
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
      )}

      {/* Main Content Tabs */}
      <div className="bg-transparent mt-8">
        <Tabs defaultValue={user?.role === 'Admin' ? 'public' : 'history'} className="w-full" onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0 h-auto space-x-4 sm:space-x-6 overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {user?.role !== 'Admin' && (
              <>
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
              </>
            )}
            {(user?.role === 'Admin' || user?.role === 'HR') && (
              <TabsTrigger 
                value="public" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-teal data-[state=active]:text-brand-teal text-muted-foreground data-[state=active]:bg-transparent px-1 py-3 data-[state=active]:shadow-none font-medium"
              >
                Public Holidays
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="history" className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Leave Requests</h3>
              <p className="text-sm text-muted-foreground">{historyLeaves.length} records found</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[12px] text-slate-500 font-bold bg-slate-50/50 border-b border-slate-100 tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Sr. No.</th>
                    <th className="px-6 py-4 font-bold">Leave Type</th>
                    <th className="px-6 py-4 font-bold">Day Type</th>
                    <th className="px-6 py-4 font-bold">From</th>
                    <th className="px-6 py-4 font-bold">Approved By</th>
                    <th className="px-6 py-4 font-bold">To</th>
                    <th className="px-6 py-4 font-bold">No of Days</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLeaves.length > 0 ? (
                    historyLeaves.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage).map((item, index) => {
                      const Icon = getTypeIcon(item.type);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 font-medium text-slate-500">
                            {String((historyPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
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
                              {item.proof_image && (
                                <span 
                                  className="inline-flex items-center justify-center p-1 bg-brand-light border border-brand-teal/20 text-brand-teal rounded cursor-pointer hover:bg-brand-teal hover:text-white transition-colors"
                                  onClick={() => handleView(item)}
                                  title="View Leave Proof Image"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-slate-600">{item.day_type || "Full"}</span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                            {item.start_date}
                          </td>
                          <td className="px-6 py-4">
                            {item.status === 'Approved' || item.status === 'Rejected' || item.status === 'Cancelled' ? (
                              item.approved_by || item.status === 'Cancelled' ? (
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                                    <TableAvatar photoUrl={item.approved_by_photo} name={item.approved_by || 'Employee'} />
                                  </div>
                                  <div className="flex flex-col text-left">
                                    <span className="text-[14px] font-bold text-[#111827] leading-tight">
                                      {item.approved_by || 'Employee'}
                                    </span>
                                    <span className="text-[13px] font-medium text-slate-500">
                                      {item.status === 'Cancelled' && !item.approved_by ? "Self" : (item.approved_by_role || "Hr")}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-left">
                                  <span className="text-slate-400 font-medium text-[13px]">Reviewed</span>
                                </div>
                              )
                            ) : (
                              <div className="text-left">
                                <span className="text-slate-300 font-medium italic text-[13px]">Pending Review</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                            {item.end_date}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900">{item.duration}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start justify-center">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  item.status === 'Approved' ? 'bg-emerald-500' : 
                                  item.status === 'Rejected' ? 'bg-rose-500' : 
                                  item.status === 'Cancelled' ? 'bg-slate-400' : 
                                  'bg-amber-500'
                                }`} />
                                <span className="text-[12px] font-semibold text-slate-900">
                                  {item.status}
                                </span>
                              </div>
                              {(item.status === 'Rejected' || item.status === 'Cancelled') && item.reject_reason && (
                                <span className="text-[10px] text-slate-500 font-normal max-w-[150px] truncate block pl-3 mt-0.5" title={item.reject_reason}>
                                  Reason: {item.reject_reason}
                                </span>
                              )}
                              {item.status === 'Approved' && item.approve_reason && (
                                <span className="text-[10px] text-slate-500 font-normal max-w-[150px] truncate block pl-3 mt-0.5" title={item.approve_reason}>
                                  Note: {item.approve_reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            { item.status === 'Pending' ? (
                               <div className="flex gap-2 justify-end">
                                 {canEditLeave && (
                                   <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-brand-teal hover:bg-brand-light"
                                    onClick={() => handleEdit(item)}
                                    title="Edit Request"
                                   >
                                     <Pencil className="w-4 h-4" />
                                   </Button>
                                 )}
                                 {canDeleteLeave && (
                                   <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                    onClick={() => handleCancelInitiate(item.id)}
                                    title="Cancel Request"
                                   >
                                     <X className="w-4 h-4" />
                                   </Button>
                                 )}
                                 {!canEditLeave && !canDeleteLeave && (
                                   <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-brand-teal hover:bg-brand-light"
                                    onClick={() => handleView(item)}
                                    title="View Details"
                                   >
                                     <Eye className="w-4 h-4" />
                                   </Button>
                                 )}
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
            <TablePagination 
              totalItems={historyLeaves.length}
              itemsPerPage={itemsPerPage}
              currentPage={historyPage}
              onPageChange={setHistoryPage}
              itemName="requests"
            />
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6 bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-center border-b border-border gap-4">
              <h3 className="font-bold text-lg">Upcoming Requests</h3>
              <p className="text-sm text-muted-foreground">{upcomingLeaves.length} records found</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[12px] text-slate-500 font-bold bg-slate-50/50 border-b border-slate-100 tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold text-center">Sr. No.</th>
                    <th className="px-6 py-4 font-bold">Leave Type</th>
                    <th className="px-6 py-4 font-bold text-center">Day Type</th>
                    <th className="px-6 py-4 font-bold text-center">From</th>
                    <th className="px-6 py-4 font-bold text-left">Approved By</th>
                    <th className="px-6 py-4 font-bold text-center">To</th>
                    <th className="px-6 py-4 font-bold text-center">No of Days</th>
                    <th className="px-6 py-4 font-bold text-center">Status</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-center">
                  {upcomingLeaves.length > 0 ? (
                    upcomingLeaves.slice((upcomingPage - 1) * itemsPerPage, upcomingPage * itemsPerPage).map((item, index) => {
                      const Icon = getTypeIcon(item.type);
                      return (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-500">
                            {String((upcomingPage - 1) * itemsPerPage + index + 1).padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4 text-left">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-brand-light rounded-md">
                                <Icon className="w-4 h-4 text-brand-teal" />
                              </div>
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
                              {item.proof_image && (
                                <span 
                                  className="inline-flex items-center justify-center p-1 bg-brand-light border border-brand-teal/20 text-brand-teal rounded cursor-pointer hover:bg-brand-teal hover:text-white transition-colors"
                                  onClick={() => handleView(item)}
                                  title="View Leave Proof Image"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-slate-600">{item.half_day ? 'Half Day' : 'Full Day'}</span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                            {item.start_date}
                          </td>
                          <td className="px-6 py-4 text-left">
                            {item.status === 'Approved' || item.status === 'Rejected' || item.status === 'Cancelled' ? (
                               item.approved_by || item.status === 'Cancelled' ? (
                                 <div className="flex items-center gap-3">
                                   <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                                     <TableAvatar photoUrl={item.approved_by_photo} name={item.approved_by || 'Employee'} />
                                   </div>
                                   <div className="flex flex-col text-left">
                                     <span className="text-[14px] font-bold text-[#111827] leading-tight">
                                       {item.approved_by || 'Employee'}
                                     </span>
                                     <span className="text-[13px] font-medium text-slate-500">
                                       {item.status === 'Cancelled' && !item.approved_by ? "Self" : (item.approved_by_role || "Hr")}
                                     </span>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="text-left">
                                   <span className="text-slate-400 font-medium text-[13px]">Reviewed</span>
                                 </div>
                               )
                             ) : (
                               <div className="text-left">
                                 <span className="text-slate-300 font-medium italic text-[13px]">Pending Review</span>
                               </div>
                             )}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                            {item.end_date}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {item.duration}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-center justify-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  item.status === 'Approved' ? 'bg-emerald-500' : 
                                  item.status === 'Rejected' ? 'bg-rose-500' : 
                                  item.status === 'Cancelled' ? 'bg-slate-400' : 
                                  'bg-amber-500'
                                }`} />
                                <span className="text-[12px] font-semibold text-slate-900">
                                  {item.status}
                                </span>
                              </div>
                              {(item.status === 'Rejected' || item.status === 'Cancelled') && item.reject_reason && (
                                <span className="text-[10px] text-slate-500 font-normal max-w-[150px] truncate block mt-0.5" title={item.reject_reason}>
                                  Reason: {item.reject_reason}
                                </span>
                              )}
                              {item.status === 'Approved' && item.approve_reason && (
                                <span className="text-[10px] text-slate-500 font-normal max-w-[150px] truncate block mt-0.5" title={item.approve_reason}>
                                  Note: {item.approve_reason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            { item.status === 'Pending' ? (
                               <div className="flex gap-2 justify-end">
                                 {canEditLeave && (
                                   <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-brand-teal hover:bg-brand-light"
                                    onClick={() => handleEdit(item)}
                                    title="Edit Request"
                                   >
                                     <Pencil className="w-4 h-4" />
                                   </Button>
                                 )}
                                 {canDeleteLeave && (
                                   <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                    onClick={() => handleCancelInitiate(item.id)}
                                    title="Cancel Request"
                                   >
                                     <X className="w-4 h-4" />
                                   </Button>
                                 )}
                                 {!canEditLeave && !canDeleteLeave && (
                                   <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-brand-teal hover:bg-brand-light"
                                    onClick={() => handleView(item)}
                                    title="View Details"
                                   >
                                     <Eye className="w-4 h-4" />
                                   </Button>
                                 )}
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
                      <td colSpan={9} className="px-6 py-10 text-center text-muted-foreground">
                        No upcoming leave requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination 
              totalItems={upcomingLeaves.length}
              itemsPerPage={itemsPerPage}
              currentPage={upcomingPage}
              onPageChange={setUpcomingPage}
              itemName="requests"
            />
          </TabsContent>

          {(user?.role === 'Admin' || user?.role === 'HR') && (
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

                  {canAddLeave && (
                    <>
                    <Dialog open={isFetchHolidaysDialogOpen} onOpenChange={setIsFetchHolidaysDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="h-9 bg-brand-orange hover:bg-brand-orange/90 text-white font-medium mr-2" onClick={() => {
                          setFetchedHolidays([]);
                          setSelectedFetchedHolidays(new Set());
                        }}>
                          <Globe className="w-4 h-4 mr-2" />
                          Auto-Fetch
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Auto-Fetch External Holidays</DialogTitle>
                          <DialogDescription>Fetch holidays for a specific country and year.</DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 py-4 border-b">
                          <Select value={fetchCountry} onValueChange={setFetchCountry}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Country Code" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IN">India (IN)</SelectItem>
                              <SelectItem value="US">United States (US)</SelectItem>
                              <SelectItem value="GB">United Kingdom (GB)</SelectItem>
                              <SelectItem value="AU">Australia (AU)</SelectItem>
                              <SelectItem value="CA">Canada (CA)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={fetchYear} onValueChange={setFetchYear}>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button onClick={handleFetchExternalHolidays} disabled={isFetchingHolidays} className="bg-slate-800 text-white">
                            {isFetchingHolidays ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
                          </Button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto py-2 max-h-[300px]">
                          {fetchedHolidays.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center px-1 pb-2">
                                <span className="text-sm font-semibold">{fetchedHolidays.length} Holidays found</span>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    if (selectedFetchedHolidays.size === fetchedHolidays.length) {
                                      setSelectedFetchedHolidays(new Set());
                                    } else {
                                      const all = new Set<string>();
                                      fetchedHolidays.forEach((h: any) => all.add(h.date + '-' + h.name));
                                      setSelectedFetchedHolidays(all);
                                    }
                                  }}
                                >
                                  {selectedFetchedHolidays.size === fetchedHolidays.length ? "Deselect All" : "Select All"}
                                </Button>
                              </div>
                              {fetchedHolidays.map((h, i) => {
                                const key = h.date + '-' + h.name;
                                const isSelected = selectedFetchedHolidays.has(key);
                                return (
                                  <div key={i} className="flex items-center space-x-3 bg-slate-50 p-2 rounded-md border border-slate-100">
                                    <Checkbox 
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        const newSet = new Set(selectedFetchedHolidays);
                                        if (checked) newSet.add(key);
                                        else newSet.delete(key);
                                        setSelectedFetchedHolidays(newSet);
                                      }}
                                    />
                                    <div className="flex flex-col flex-1">
                                      <span className="text-sm font-semibold">{h.name}</span>
                                      <span className="text-xs text-slate-500">{dayjs(h.date).format("MMM DD, YYYY")} - {h.type}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-slate-400 text-sm">
                              Click Fetch to load holidays
                            </div>
                          )}
                        </div>

                        <DialogFooter className="pt-4 border-t">
                          <Button variant="outline" onClick={() => setIsFetchHolidaysDialogOpen(false)}>Cancel</Button>
                          <Button 
                            className="bg-brand-teal hover:bg-brand-teal-light text-white" 
                            onClick={handleSaveFetchedHolidays}
                            disabled={selectedFetchedHolidays.size === 0}
                          >
                            Save Selected ({selectedFetchedHolidays.size})
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="h-9 bg-brand-teal hover:bg-brand-teal-light text-white font-medium" onClick={() => {
                          setEditingHolidayId(null);
                          setHolidayForm({ name: "", date: dayjs(), type: "National", company: "All Companies" });
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
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsHolidayDialogOpen(false)}>Cancel</Button>
                          <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={handleHolidaySubmit}>
                            Save Holiday
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {user?.role === 'Admin' && holidays.length > 0 && (
                      <Button 
                        variant="destructive" 
                        className="h-9" 
                        onClick={handleDeleteAllHolidays}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All
                      </Button>
                    )}
                    </>
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
                    {(() => {
                      const filteredHolidays = holidays.filter(h => 
                        user?.role === 'Admin' || user?.role === 'HR' || 
                        !h.company || h.company === "All Companies" || h.company === user?.company
                      );
                      return filteredHolidays
                        .slice((holidaysPage - 1) * itemsPerPage, holidaysPage * itemsPerPage)
                        .map((item) => {
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
                                 {(canEditLeave || canDeleteLeave) && (
                                   <div className="flex gap-2 justify-end">
                                     {canEditLeave && (
                                       <Button variant="ghost" size="icon" className="text-brand-teal h-8 w-8" onClick={() => handleHolidayEdit(item)}>
                                         <Pencil className="w-4 h-4" />
                                       </Button>
                                     )}
                                     {canDeleteLeave && (
                                       <Button variant="ghost" size="icon" className="text-red-600 h-8 w-8" onClick={() => handleHolidayDelete(item.id)}>
                                         <Trash2 className="w-4 h-4" />
                                       </Button>
                                     )}
                                   </div>
                                 )}
                               </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>
              <TablePagination 
                totalItems={holidays.filter(h => 
                  user?.role === 'Admin' || user?.role === 'HR' || 
                  !h.company || h.company === "All Companies" || h.company === user?.company
                ).length}
                itemsPerPage={itemsPerPage}
                currentPage={holidaysPage}
                onPageChange={setHolidaysPage}
                itemName="holidays"
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      {/* Calendar Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh] [&>button]:hidden">
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
                
                // Add empty slots for next month to keep grid height static (6 weeks = 42 cells)
                const remainingSlots = 42 - days.length;
                for (let i = 0; i < remainingSlots; i++) {
                  days.push(<div key={`next-${i}`} className="aspect-square"></div>);
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

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[420px] p-6 rounded-xl">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle className="text-lg font-bold text-slate-900">Cancel Leave Request</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1">
              Please provide the reason for cancelling this leave request. This will notify your manager.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason" className="text-xs font-bold text-slate-700 block mb-2">
              Reason for Cancellation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g. Plans changed, task rescheduled..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full min-h-[100px] text-sm"
            />
          </div>
          <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setCancellingLeaveId(null);
                setCancelReason("");
              }}
              className="font-bold text-slate-700"
            >
              Back
            </Button>
            <Button
              onClick={handleCancelSubmit}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Cancel Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
