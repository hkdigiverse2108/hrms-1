"use client";

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { SalesAnalytics } from "./components/SalesAnalytics";
import { PageHeader } from "@/components/common/PageHeader";
import { 
  TrendingUp, 
  Users, 
  Target, 
  IndianRupee, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Globe,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Trash2,
  Pencil,
  History as HistoryIcon,
  Flame,
  X,
  BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_URL } from "@/lib/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadForm, LeadFormData } from "@/components/hrms/LeadForm";
import { ClientForm, ClientFormData } from "@/components/hrms/ClientForm";
import { FollowUpDialog } from "@/components/hrms/FollowUpDialog";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { useConfirm } from "@/context/ConfirmContext";

const STATUS_REASONS: Record<string, string[]> = {
  "Lead": ["New lead created", "Reopened", "Other"],
  "Contacted": ["Introductory call completed", "Client responded", "Other"],
  "Proposal Sent": ["Proposal document ready", "Pricing discussed", "Other"],
  "On Hold": ["Client request", "Budget constraint", "No contact from client", "Other"],
  "Client Won": ["Contract signed", "Requirements finalized", "Payment received", "Other"],
  "Client Lost": ["Budget too high", "Lost to competitor", "Not interested", "No response", "Other"]
};

export default function SalesPage() {
  const { confirm } = useConfirm();
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const currentUserName = (user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`).trim();

  const canViewSales = isAdmin || checkPermission('sales', 'canView');
  const canAddSales = isAdmin || checkPermission('sales', 'canAdd');
  const canEditSales = isAdmin || checkPermission('sales', 'canEdit');
  const canDeleteSales = isAdmin || checkPermission('sales', 'canDelete');

  const canEditLead = (lead: any) => {
    if (isAdmin || canEditSales) return true;
    const assignedList = Array.isArray(lead.assignedTo) ? lead.assignedTo : (lead.assignedTo ? [lead.assignedTo] : []);
    const isAssigned = assignedList.some((name: string) => name.toLowerCase() === currentUserName.toLowerCase());
    const isCreator = lead.createdBy === user?.id || 
                      (lead.createdByUserName && lead.createdByUserName.toLowerCase() === currentUserName.toLowerCase());
    return !!currentUserName && (isAssigned || isCreator);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineDateFilter, setPipelineDateFilter] = useState("all");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [inlineEditing, setInlineEditing] = useState<{ id: string, field: string } | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientFormData, setClientFormData] = useState<Partial<ClientFormData> | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [isClientSubmitting, setIsClientSubmitting] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState("all");
  const [reportDateFilter, setReportDateFilter] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedLeadForLogs, setSelectedLeadForLogs] = useState<any>(null);
  const [leadLogs, setLeadLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState<{ leadId: string, newStatus: string, keepEditing?: boolean } | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("MMMM"));
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [targets, setTargets] = useState<any[]>([]);
  const [incentiveSlabs, setIncentiveSlabs] = useState<any[]>([]);
  const [isTargetSubmitting, setIsTargetSubmitting] = useState(false);
  const [targetForm, setTargetForm] = useState({
    employeeId: "",
    type: "Monthly",
    month: dayjs().format("MMMM"),
    year: dayjs().year(),
    week: 1,
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: dayjs().add(14, 'day').format("YYYY-MM-DD"),
    targetAmount: 0
  });

  const [slabForm, setSlabForm] = useState<{ minAmount: number; maxAmount: number; percentage: number; employees: string[]; clientCategories: string[]; isRecurring: boolean }>({
    minAmount: 0,
    maxAmount: 0,
    percentage: 0,
    employees: [],
    clientCategories: [],
    isRecurring: false
  });
  const [isSlabDialogOpen, setIsSlabDialogOpen] = useState(false);
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [isEditSlabDialogOpen, setIsEditSlabDialogOpen] = useState(false);
  const [editSlabForm, setEditSlabForm] = useState<{ minAmount: number; maxAmount: number; percentage: number; employees: string[]; clientCategories: string[]; isRecurring: boolean }>({
    minAmount: 0,
    maxAmount: 0,
    percentage: 0,
    employees: [],
    clientCategories: [],
    isRecurring: false
  });
  const [slabTab, setSlabTab] = useState<"global" | "employee">("global");
  const [selectedSlabEmployee, setSelectedSlabEmployee] = useState<string>("");

  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<any[]>([]);

  const fetchTargets = async () => {
    try {
      const res = await fetch(`${API_URL}/sales-targets`);
      if (res.ok) {
        setTargets(await res.json());
      } else {
        const errorText = await res.text();
        console.error(`Failed to fetch targets: ${res.status}`, errorText);
      }
    } catch (err) {
      console.error("Error fetching targets:", err);
    }
  };

  const fetchIncentiveSlabs = async () => {
    try {
      const res = await fetch(`${API_URL}/incentive-slabs`);
      if (res.ok) setIncentiveSlabs(await res.json());
    } catch (err) {
      console.error("Error fetching slabs:", err);
    }
  };

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewSales) {
      router.push("/");
    }
  }, [router, permissionsLoading, canViewSales]);

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
    fetchTargets();
    fetchIncentiveSlabs();
  }, []);

  useEffect(() => {
    const existing = targets.find(t => {
      if (t.employeeId !== targetForm.employeeId || t.type !== targetForm.type) return false;
      if (targetForm.type === "Custom") {
        return t.startDate === targetForm.startDate && t.endDate === targetForm.endDate;
      } else if (targetForm.type === "Weekly") {
        return t.month === targetForm.month && t.year === targetForm.year && t.week === targetForm.week;
      } else {
        return t.month === targetForm.month && t.year === targetForm.year;
      }
    });
    if (existing) {
      setTargetForm(prev => ({ ...prev, targetAmount: existing.targetAmount }));
    } else {
      setTargetForm(prev => ({ ...prev, targetAmount: 0 }));
    }
  }, [targetForm.employeeId, targetForm.month, targetForm.year, targetForm.type, targetForm.week, targetForm.startDate, targetForm.endDate, targets]);

  const fetchLeadLogs = async (lead: any) => {
    setSelectedLeadForLogs(lead);
    setIsLogsDialogOpen(true);
    setIsLogsLoading(true);
    try {
      const res = await fetch(`${API_URL}/leads/${lead.id}/logs`);
      if (res.ok) setLeadLogs(await res.json());
    } catch (err) {
      console.error("Error fetching lead logs:", err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const handleCreateSlab = async () => {
    try {
      const res = await fetch(`${API_URL}/incentive-slabs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slabForm),
      });
      if (res.ok) {
        toast.success("Slab created successfully");
        fetchIncentiveSlabs();
        setIsSlabDialogOpen(false);
        setSlabForm({ minAmount: 0, maxAmount: 0, percentage: 0, employees: [], clientCategories: [], isRecurring: false });
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.detail || "Failed to create slab");
      }
    } catch (err) {
      toast.error("An error occurred while creating slab");
    }
  };

  const handleDeleteSlab = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Delete this slab?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/incentive-slabs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Slab deleted");
        fetchIncentiveSlabs();
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.detail || "Failed to delete slab");
      }
    } catch (err) {
      toast.error("An error occurred while deleting slab");
    }
  };

  const handleUpdateSlab = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/incentive-slabs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSlabForm),
      });

      if (res.ok) {
        toast.success("Slab updated successfully");
        fetchIncentiveSlabs();
        setIsEditSlabDialogOpen(false);
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.detail || "Failed to update slab");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) setEmployees(await res.json());
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/leads`);
      if (res.ok) {
        const data = await res.json();
        const today = dayjs().startOf('day');
        let needsRefresh = false;
        for (const lead of data) {
          if (lead.status === "On Hold" && lead.holdResumeDate) {
            const resumeDate = dayjs(lead.holdResumeDate).startOf('day');
            if (today.isSame(resumeDate) || today.isAfter(resumeDate)) {
              needsRefresh = true;
              try {
                await fetch(`${API_URL}/leads/${lead.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "Lead",
                    performedBy: user?.id,
                    userName: currentUserName
                  }),
                });
              } catch (err) {
                console.error("Auto-resume failed for lead:", lead.id, err);
              }
            }
          }
        }
        if (needsRefresh) {
          const freshRes = await fetch(`${API_URL}/leads`);
          if (freshRes.ok) {
            setLeads(await freshRes.json());
          }
        } else {
          setLeads(data);
        }
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLead = async (formData: LeadFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          performedBy: user?.id,
          userName: currentUserName
        }),
      });

      if (res.ok) {
        toast.success("Lead added successfully");
        setIsDialogOpen(false);
        fetchLeads();
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.detail || "Failed to add lead");
      }
    } catch (err) {
      console.error("Error adding lead:", err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLead = async () => {
    if (!editingRowId || !editFormData) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/leads/${editingRowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          performedBy: user?.id,
          userName: currentUserName
        }),
      });

      if (res.ok) {
        toast.success("Lead updated successfully");
        setEditingRowId(null);
        setEditFormData(null);
        fetchLeads();
      } else {
        toast.error(`Update failed: ${res.status}`);
      }
    } catch (err) {
      toast.error("Network error: Could not reach backend");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlineUpdate = async (leadId: string, field: string, value: any, keepEditing?: boolean) => {
    try {
      const res = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: value,
          performedBy: user?.id,
          userName: currentUserName
        }),
      });

      if (res.ok) {
        toast.success("Lead updated successfully");
        fetchLeads();
      } else {
        toast.error(`Update failed: ${res.status}`);
      }
    } catch (err) {
      toast.error("Network error: Could not reach backend");
    } finally {
      if (!keepEditing) {
        setInlineEditing(null);
      }
    }
  };


  const handleClientSubmit = async (data: ClientFormData) => {
    if (!convertingLeadId) return;
    setIsClientSubmitting(true);
    try {
      const clientRes = await fetch(`${API_URL}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          performedBy: user?.id,
          userName: currentUserName
        })
      });

      if (!clientRes.ok) {
        const errorData = await clientRes.json().catch(() => null);
        toast.error(errorData?.detail || "Failed to create client");
        setIsClientSubmitting(false);
        return;
      }

      const leadRes = await fetch(`${API_URL}/leads/${convertingLeadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Client Won",
          closedDate: dayjs().format("YYYY-MM-DD"),
          performedBy: user?.id,
          userName: currentUserName
        }),
      });

      if (leadRes.ok) {
        toast.success("Client generated and Lead marked as Won");
        setClientDialogOpen(false);
        fetchLeads();
        setInlineEditing(null);
      } else {
        const errorData = await leadRes.json().catch(() => null);
        toast.error(errorData?.detail || "Client created, but failed to update Lead status");
      }
    } catch (err) {
      console.error("Error creating client:", err);
      toast.error("An error occurred while creating client");
    } finally {
      setIsClientSubmitting(false);
    }
  };

  const handleStatusChangeSubmit = async () => {
    if (!statusChangeData) return;
    const { leadId, newStatus, keepEditing } = statusChangeData;
    const finalReason = selectedReason === "Other" ? customReason : selectedReason;
    if (!finalReason.trim()) {
      toast.error("Please provide a reason for the status change.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reason: finalReason,
          performedBy: user?.id,
          userName: currentUserName
        }),
      });

      if (res.ok) {
        toast.success(`Lead status updated to ${newStatus}`);
        fetchLeads();
      } else {
        toast.error(`Update failed: ${res.status}`);
      }
    } catch (err) {
      toast.error("Network error: Could not reach backend");
    } finally {
      setStatusChangeData(null);
      setSelectedReason("");
      setCustomReason("");
      if (!keepEditing) {
        setInlineEditing(null);
      }
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this lead?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Lead deleted");
        fetchLeads();
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.detail || "Failed to delete lead");
      }
    } catch (err) {
      console.error("Error deleting lead:", err);
      toast.error("An error occurred while deleting lead");
    }
  };

  const handleUpsertTarget = async () => {
    if (!targetForm.employeeId || targetForm.targetAmount <= 0) {
      toast.error("Please select an employee and set a valid target amount");
      return;
    }
    if (targetForm.type === "Custom") {
      if (!targetForm.startDate || !targetForm.endDate) {
        toast.error("Please select both start date and end date");
        return;
      }
      if (dayjs(targetForm.startDate).isAfter(dayjs(targetForm.endDate))) {
        toast.error("Start date cannot be after end date");
        return;
      }
    }
    setIsTargetSubmitting(true);
    try {
      const employee = employees.find(e => e.id === targetForm.employeeId);
      const res = await fetch(`${API_URL}/sales-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetForm,
          employeeName: employee?.name || employee?.firstName,
          month: targetForm.type === "Custom" ? dayjs(targetForm.startDate).format("MMMM") : targetForm.month,
          year: targetForm.type === "Custom" ? dayjs(targetForm.startDate).year() : targetForm.year,
        }),
      });

      if (res.ok) {
        toast.success("Target set successfully");
        fetchTargets();
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.detail || "Failed to set target");
      }
    } catch (err) {
      console.error("Error setting target:", err);
      toast.error("An error occurred");
    } finally {
      setIsTargetSubmitting(false);
    }
  };

  const handleAwardIncentive = async (target: any, amount: number) => {
    try {
      const res = await fetch(`${API_URL}/sales-targets/${target.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incentiveAmount: amount
        }),
      });

      if (res.ok) {
        toast.success(`Incentive of ₹${amount} awarded successfully`);
        fetchTargets();
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.detail || "Failed to award incentive");
      }
    } catch (err) {
      console.error("Error awarding incentive:", err);
      toast.error("An error occurred");
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Client Won": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Client Won</Badge>;
      case "Client Lost": return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">Client Lost</Badge>;
      case "Proposal Sent": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Proposal Sent</Badge>;
      case "Contacted": return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">Contacted</Badge>;
      case "On Hold": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">On Hold</Badge>;
      default: return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">{status}</Badge>;
    }
  };

  const visibleLeads = isAdmin 
    ? leads 
    : leads.filter((l: any) => {
        const assignedList = Array.isArray(l.assignedTo) ? l.assignedTo : (l.assignedTo ? [l.assignedTo] : []);
        const isAssigned = assignedList.some((name: string) => name.toLowerCase() === currentUserName.toLowerCase());
        const isCreator = l.createdBy === user?.id || 
                          (l.createdByUserName && l.createdByUserName.toLowerCase() === currentUserName.toLowerCase());
        return isAssigned || isCreator;
      });

  const todayStr = dayjs().format("YYYY-MM-DD");
  const todayFollowUps = visibleLeads.filter((l: any) => {
    if (!l.nextFollowUpDate) return false;
    return dayjs(l.nextFollowUpDate).format("YYYY-MM-DD") === todayStr;
  });

  const activeLeads = visibleLeads.filter(l => {
    const isNotWon = l.status !== "Client Won";
    if (pipelineDateFilter === "today") {
      const today = dayjs().format('YYYY-MM-DD');
      const leadDate = dayjs(l.date).format('YYYY-MM-DD');
      return isNotWon && leadDate === today;
    }
    return isNotWon;
  });

  const convertedLeads = visibleLeads.filter(l => {
    const isWon = l.status === "Client Won";
    if (pipelineDateFilter === "today") {
      const today = dayjs().format('YYYY-MM-DD');
      const leadClosedDate = l.closedDate ? dayjs(l.closedDate).format('YYYY-MM-DD') : dayjs(l.date).format('YYYY-MM-DD');
      return isWon && leadClosedDate === today;
    }
    return isWon;
  });

  const hotLeads = visibleLeads.filter(l => {
    const isHot = l.isHot === true;
    if (pipelineDateFilter === "today") {
      const today = dayjs().format('YYYY-MM-DD');
      const leadDate = dayjs(l.date).format('YYYY-MM-DD');
      return isHot && leadDate === today;
    }
    return isHot;
  });

  const totalRevenue = convertedLeads.reduce((acc, l) => {
    const val = parseFloat(l.expectedIncome?.replace(/[^0-9.]/g, "") || "0");
    return acc + val;
  }, 0);

  const monthlyTargets = targets.filter(t => t.month === selectedMonth && t.year === selectedYear);
  const myTarget = targets.find(t => t.employeeName?.toLowerCase() === currentUserName.toLowerCase() && t.month === selectedMonth && t.year === selectedYear);

  const totalMonthlyTarget = isAdmin 
    ? monthlyTargets.reduce((acc, t) => acc + t.targetAmount, 0)
    : (myTarget?.targetAmount || 0);
  
  const myAchievement = leads.filter(l => {
    if (l.status !== "Client Won") return false;
    const assignedList = Array.isArray(l.assignedTo) ? l.assignedTo : (l.assignedTo ? [l.assignedTo] : []);
    const isAssignedToMe = assignedList.some((name: string) => name.toLowerCase() === currentUserName.toLowerCase());
    const isCreator = l.createdBy === user?.id || 
                      (l.createdByUserName && l.createdByUserName.toLowerCase() === currentUserName.toLowerCase());
    if (!isAssignedToMe && !isCreator) return false;
    const leadDate = l.closedDate ? dayjs(l.closedDate) : dayjs(l.date);
    return leadDate.format("MMMM") === selectedMonth && leadDate.year() === selectedYear;
  }).reduce((acc, l) => {
    const val = parseFloat(l.expectedIncome?.replace(/[^0-9.]/g, "") || "0");
    return acc + val;
  }, 0);

  const monthlyAchievement = isAdmin 
    ? leads.filter(l => {
        if (l.status !== "Client Won") return false;
        const leadDate = l.closedDate ? dayjs(l.closedDate) : dayjs(l.date);
        return leadDate.format("MMMM") === selectedMonth && leadDate.year() === selectedYear;
      }).reduce((acc, l) => {
        const val = parseFloat(l.expectedIncome?.replace(/[^0-9.]/g, "") || "0");
        return acc + val;
      }, 0)
    : myAchievement;

  const achievementRate = totalMonthlyTarget > 0 ? (monthlyAchievement / totalMonthlyTarget) * 100 : 0;

  const myProgress = myTarget?.targetAmount > 0 ? (myAchievement / myTarget.targetAmount) * 100 : 0;

  const stats = [
    { title: "Monthly Revenue", value: `₹${monthlyAchievement.toLocaleString()}`, trend: "+12.5%", trendUp: true, icon: <IndianRupee className="w-5 h-5" />, color: "text-emerald-600" },
    { title: "Monthly Progress", value: `${achievementRate.toFixed(1)}%`, trend: `₹${monthlyAchievement.toLocaleString()}`, trendUp: achievementRate >= 100, icon: <Target className="w-5 h-5" />, color: "text-indigo-600" },
    { title: "Active Leads", value: activeLeads.length.toString(), trend: "+5", trendUp: true, icon: <Users className="w-5 h-5" />, color: "text-blue-600" },
    { title: "Target (Monthly)", value: `₹${totalMonthlyTarget.toLocaleString()}`, trend: selectedMonth, trendUp: true, icon: <TrendingUp className="w-5 h-5" />, color: "text-brand-teal" },
  ];

  const LeadTable = ({ data, type }: { data: any[], type: 'active' | 'converted' | 'hot' }) => {
    const statusContainerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (inlineEditing?.field === 'status' && statusContainerRef.current) {
          const clickedElement = document.elementFromPoint(event.clientX, event.clientY);
          if (clickedElement && statusContainerRef.current.contains(clickedElement)) {
            return;
          }
          const portal = document.querySelector('[data-radix-popper-content-wrapper]');
          if (portal && portal.contains(event.target as Node)) {
            return;
          }
          setInlineEditing(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [inlineEditing]);

    const getLeadCategory = (lead: any) => {
      if (lead.status === "On Hold") {
        const today = dayjs().startOf('day');
        const resumeDate = lead.holdResumeDate ? dayjs(lead.holdResumeDate).startOf('day') : null;
        if (resumeDate && (today.isSame(resumeDate) || today.isAfter(resumeDate))) {
          return 1; // On Hold - Resumed (Very Top)
        }
        return 3; // On Hold - Pending (Very Bottom)
      }
      return 2; // Standard (Middle)
    };

    const filteredAndSorted = data
      .filter(l => 
        (l.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.contact || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.remarks || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const catA = getLeadCategory(a);
        const catB = getLeadCategory(b);
        if (catA !== catB) {
          return catA - catB;
        }
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="w-12 px-4 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hot</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Created By</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expected Income</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Follow-ups</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSorted.map((lead) => {
              const cat = getLeadCategory(lead);
              return (
                <tr 
                  key={lead.id} 
                  className={`hover:bg-slate-50/80 transition-colors group relative ${
                    cat === 1 ? 'border-l-4 border-l-rose-500 bg-rose-50/5' : ''
                  }`}
                >
                  <td className="px-4 py-4 text-center">
                    <input 
                      type="checkbox"
                      checked={!!lead.isHot}
                      onChange={(e) => handleInlineUpdate(lead.id, "isHot", e.target.checked)}
                      disabled={!canEditLead(lead) || lead.status === "On Hold" || lead.status === "Client Won" || lead.status === "Client Lost"}
                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-sm">
                            {lead.createdByUserName || 'Admin'}
                          </span>
                          {lead.isHot && (
                            <span title="Hot Lead">
                              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {inlineEditing?.id === lead.id && inlineEditing?.field === 'date' ? (
                            <Input 
                              type="date"
                              autoFocus
                              className="h-6 text-[10px] w-32 py-0" 
                              defaultValue={lead.date} 
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleInlineUpdate(lead.id, 'date', e.target.value);
                                }
                              }}
                              onBlur={(e) => {
                                handleInlineUpdate(lead.id, 'date', e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleInlineUpdate(lead.id, 'date', e.currentTarget.value);
                                }
                              }}
                            />
                          ) : (
                            <span
                              onClick={() => canEditLead(lead) && setInlineEditing({ id: lead.id, field: 'date' })}
                              className="cursor-text hover:bg-slate-50 rounded px-1 py-0.5"
                            >
                              Created: {lead.date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      {inlineEditing?.id === lead.id && inlineEditing?.field === 'contact' ? (
                        <Input 
                          autoFocus
                          className="h-8 text-[13px] font-bold" 
                          defaultValue={lead.contact} 
                          onBlur={(e) => handleInlineUpdate(lead.id, 'contact', e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(lead.id, 'contact', e.currentTarget.value)}
                        />
                      ) : (
                        <span 
                          onClick={() => canEditLead(lead) && setInlineEditing({ id: lead.id, field: 'contact' })}
                          className="text-[13px] font-bold text-slate-700 cursor-text hover:bg-slate-50 rounded px-1 py-0.5"
                        >
                          {lead.contact}
                        </span>
                      )}
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {inlineEditing?.id === lead.id && inlineEditing?.field === 'email' ? (
                            <Input 
                              autoFocus
                              className="h-6 text-[10px] w-full py-0" 
                              defaultValue={lead.email || ''} 
                              onBlur={(e) => handleInlineUpdate(lead.id, 'email', e.target.value)} 
                              onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(lead.id, 'email', e.currentTarget.value)}
                              placeholder="Email"
                            />
                          ) : (
                            <span 
                              onClick={() => canEditLead(lead) && setInlineEditing({ id: lead.id, field: 'email' })}
                              className="text-[10px] text-slate-500 cursor-text hover:bg-slate-50 rounded px-1 py-0.5"
                            >
                              {lead.email || 'Add email'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {inlineEditing?.id === lead.id && inlineEditing?.field === 'phone' ? (
                            <Input 
                              autoFocus
                              className="h-6 text-[10px] w-full py-0" 
                              defaultValue={lead.phone || ''} 
                              onBlur={(e) => handleInlineUpdate(lead.id, 'phone', e.target.value)} 
                              onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(lead.id, 'phone', e.currentTarget.value)}
                              placeholder="Phone"
                            />
                          ) : (
                            <span 
                              onClick={() => canEditLead(lead) && setInlineEditing({ id: lead.id, field: 'phone' })}
                              className="text-[10px] text-slate-500 cursor-text hover:bg-slate-50 rounded px-1 py-0.5"
                            >
                              {lead.phone || 'Add phone'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {inlineEditing?.id === lead.id && inlineEditing?.field === 'source' ? (
                      <Input 
                        autoFocus
                        className="h-8 text-[12px]" 
                        defaultValue={lead.source} 
                        onBlur={(e) => handleInlineUpdate(lead.id, 'source', e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(lead.id, 'source', e.currentTarget.value)}
                      />
                    ) : (
                      <div 
                        onClick={() => canEditLead(lead) && setInlineEditing({ id: lead.id, field: 'source' })}
                        className="flex items-center gap-1.5 cursor-text hover:bg-slate-50 rounded px-1 py-0.5"
                      >
                        {lead.source ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-teal/40" />
                            <span className="text-[12px] font-medium text-slate-600">{lead.source}</span>
                          </>
                        ) : (
                          <span className="text-[12px] text-slate-400 italic">Add source</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {inlineEditing?.id === lead.id && inlineEditing?.field === 'status' ? (
                      <div ref={statusContainerRef}>
                        <Select 
                          defaultValue={lead.status} 
                          defaultOpen={true} 
                          onValueChange={async (val) => {
                            if (val === lead.status) return;
                            if (val === "Client Won") {
                              setClientFormData({
                                companyName: lead.company || lead.contact,
                                name: lead.contact,
                                phone: lead.phone || "",
                                email: lead.email || "",
                                remarks: lead.remarks || "",
                                department: "Sales",
                              });
                              setConvertingLeadId(lead.id);
                              setClientDialogOpen(true);
                            } else {
                              setStatusChangeData({
                                leadId: lead.id,
                                newStatus: val,
                                keepEditing: val === "On Hold"
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lead">Lead</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                            <SelectItem value="Client Won">Client Won</SelectItem>
                            <SelectItem value="Client Lost">Client Lost</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {lead.status === "On Hold" && (
                          <div className="flex flex-col gap-1 mt-1">
                            <span className="text-[9px] uppercase font-bold text-slate-400">Resume Date</span>
                            <Input 
                              type="date"
                              defaultValue={lead.holdResumeDate || ""}
                              className="h-8 text-xs"
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleInlineUpdate(lead.id, 'holdResumeDate', e.target.value);
                                }
                              }}
                              onBlur={(e) => {
                                handleInlineUpdate(lead.id, 'holdResumeDate', e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleInlineUpdate(lead.id, 'holdResumeDate', e.currentTarget.value);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : inlineEditing?.id === lead.id && inlineEditing?.field === 'holdResumeDate' ? (
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getStatusBadge(lead.status)}
                          {lead.status !== "On Hold" && lead.holdResumeDate && (
                            <Badge className="bg-orange-50 text-orange-600 hover:bg-orange-50 border-orange-200 text-[9px] font-bold px-1.5 py-0.5 shadow-none shrink-0">
                              Resumed from Hold
                            </Badge>
                          )}
                        </div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">Resume Date</span>
                        <Input 
                          type="date"
                          defaultValue={lead.holdResumeDate || ""}
                          className="h-8 text-xs"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleInlineUpdate(lead.id, 'holdResumeDate', e.target.value);
                            }
                          }}
                          onBlur={(e) => {
                            handleInlineUpdate(lead.id, 'holdResumeDate', e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleInlineUpdate(lead.id, 'holdResumeDate', e.currentTarget.value);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={() => canEditLead(lead) && setInlineEditing({ id: lead.id, field: 'status' })}
                        className="cursor-pointer flex flex-col gap-1"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getStatusBadge(lead.status)}
                          {lead.status !== "On Hold" && lead.holdResumeDate && (
                            <Badge className="bg-orange-50 text-orange-600 hover:bg-orange-50 border-orange-200 text-[9px] font-bold px-1.5 py-0.5 shadow-none shrink-0">
                              Resumed from Hold
                            </Badge>
                          )}
                        </div>
                        {lead.status === "On Hold" && (
                          <span 
                            onClick={(e) => {
                              if (canEditLead(lead)) {
                                e.stopPropagation();
                                setInlineEditing({ id: lead.id, field: 'holdResumeDate' });
                              }
                            }}
                            className={`text-[10px] font-semibold mt-1 hover:underline cursor-pointer ${
                              cat === 1 ? 'text-rose-600 font-bold' : 'text-slate-500'
                            }`}
                          >
                            Resume: {lead.holdResumeDate ? dayjs(lead.holdResumeDate).format("DD MMM YYYY") : "Set Date"}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                <td className="px-6 py-4">
                  {inlineEditing?.id === lead.id && inlineEditing?.field === 'assignedTo' ? (
                    <Popover 
                      open={true} 
                      onOpenChange={(open) => {
                        if (!open) {
                          const originalList = Array.isArray(lead.assignedTo) ? lead.assignedTo : (lead.assignedTo ? [lead.assignedTo] : []);
                          const hasChanged = originalList.length !== selectedAssignees.length || 
                            !originalList.every((name: string) => selectedAssignees.includes(name)) ||
                            !selectedAssignees.every((name: string) => originalList.includes(name));
                          if (hasChanged) {
                            handleInlineUpdate(lead.id, 'assignedTo', selectedAssignees);
                          } else {
                            setInlineEditing(null);
                          }
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div className="flex flex-wrap gap-1 max-w-[150px] cursor-pointer hover:bg-slate-50 rounded p-1">
                          {selectedAssignees.length > 0 ? (
                            selectedAssignees.map((name: string) => (
                              <Badge key={name} variant="secondary" className="bg-brand-teal/5 text-brand-teal border-brand-teal/10 text-[10px] font-bold py-0.5 pl-1.5 pr-1 hover:bg-brand-teal/5 flex items-center gap-1">
                                {name}
                                {canEditLead(lead) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = selectedAssignees.filter((n: string) => n !== name);
                                      setSelectedAssignees(updated);
                                    }}
                                    className="text-brand-teal/60 hover:text-brand-teal hover:bg-brand-teal/10 rounded-full p-0.5 transition-colors"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-xs">Unassigned</span>
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-52 p-3 bg-white shadow-md border border-slate-100 rounded-lg z-50">
                        <Label className="text-[10px] uppercase font-black text-slate-400 mb-2 block">Assign Employees</Label>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 bg-slate-50/50 p-2 rounded border border-slate-100">
                          {employees.filter(emp => emp.department?.toLowerCase() === 'sales' || emp.role?.toLowerCase() === 'admin').map(emp => {
                            const empName = emp.name || `${emp.firstName} ${emp.lastName}`;
                            return (
                              <label key={emp.id} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={selectedAssignees.includes(empName)}
                                  onChange={(e) => {
                                    const updated = e.target.checked 
                                      ? [...selectedAssignees, empName] 
                                      : selectedAssignees.filter((n: string) => n !== empName);
                                    setSelectedAssignees(updated);
                                  }}
                                  className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-3.5 h-3.5"
                                />
                                {empName}
                              </label>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div 
                      onClick={() => {
                        if (canEditLead(lead)) {
                          setInlineEditing({ id: lead.id, field: 'assignedTo' });
                          const assignedList = Array.isArray(lead.assignedTo) ? lead.assignedTo : (lead.assignedTo ? [lead.assignedTo] : []);
                          setSelectedAssignees(assignedList);
                        }
                      }}
                      className="flex flex-wrap gap-1 max-w-[150px] cursor-pointer hover:bg-slate-50 rounded p-1"
                    >
                      {Array.isArray(lead.assignedTo) && lead.assignedTo.length > 0 ? (
                        lead.assignedTo.map((name: string) => (
                          <Badge key={name} variant="secondary" className="bg-brand-teal/5 text-brand-teal border-brand-teal/10 text-[10px] font-bold py-0.5 pl-1.5 pr-1 hover:bg-brand-teal/5 flex items-center gap-1">
                            {name}
                            {canEditLead(lead) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const assignedList = Array.isArray(lead.assignedTo) ? lead.assignedTo : (lead.assignedTo ? [lead.assignedTo] : []);
                                  const updated = assignedList.filter((n: string) => n !== name);
                                  handleInlineUpdate(lead.id, 'assignedTo', updated);
                                }}
                                className="text-brand-teal/60 hover:text-brand-teal hover:bg-brand-teal/10 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    {inlineEditing?.id === lead.id && inlineEditing?.field === 'expectedIncome' ? (
                      <Input 
                        autoFocus
                        className="h-8 text-sm font-bold" 
                        defaultValue={lead.expectedIncome} 
                        onBlur={(e) => handleInlineUpdate(lead.id, 'expectedIncome', e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(lead.id, 'expectedIncome', e.currentTarget.value)}
                      />
                    ) : (
                      <span 
                        onClick={() => canEditLead(lead) && setInlineEditing({ id: lead.id, field: 'expectedIncome' })}
                        className="font-bold text-slate-900 text-sm cursor-text hover:bg-slate-50 rounded px-1 py-0.5"
                      >
                        {lead.expectedIncome ? (lead.expectedIncome.startsWith('₹') ? lead.expectedIncome : `₹${lead.expectedIncome}`) : '--'}
                      </span>
                    )}
                    {type === 'converted' && (
                      <span className="text-[10px] text-emerald-600 font-bold uppercase mt-0.5">Won on {lead.closedDate}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {inlineEditing?.id === lead.id && inlineEditing?.field === 'remarks' ? (
                    <Input 
                      autoFocus
                      className="h-8 text-[12px]" 
                      defaultValue={lead.remarks} 
                      onBlur={(e) => handleInlineUpdate(lead.id, 'remarks', e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(lead.id, 'remarks', e.currentTarget.value)}
                    />
                  ) : (
                    <p 
                      onClick={() => canEditLead(lead) && setInlineEditing({ id: lead.id, field: 'remarks' })}
                      className="text-[12px] text-slate-500 italic max-w-[120px] truncate cursor-text hover:bg-slate-50 rounded px-1 py-0.5"
                      title={lead.remarks}
                    >
                      "{lead.remarks || 'No remarks'}"
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <FollowUpDialog 
                      lead={lead} 
                      onUpdate={fetchLeads} 
                      userId={user?.id} 
                      userName={currentUserName} 
                    />
                    {lead.nextFollowUpDate && (() => {
                      const today = dayjs().startOf('day');
                      const nextDate = dayjs(lead.nextFollowUpDate).startOf('day');
                      const isDue = today.isSame(nextDate) || today.isAfter(nextDate);
                      return (
                        <div className="flex flex-col gap-0.5 shrink-0">
                          {isDue ? (
                            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 animate-pulse text-[9px] font-bold px-1.5 py-0.5 whitespace-nowrap">
                              Follow-up Due
                            </Badge>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                              Next: {dayjs(lead.nextFollowUpDate).format("DD MMM")}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]">
                        <DropdownMenuItem onClick={() => fetchLeadLogs(lead)} className="cursor-pointer font-medium">
                          <HistoryIcon className="w-4 h-4 mr-2 text-brand-teal" />
                          View History
                        </DropdownMenuItem>
                        {canDeleteSales && (
                          <>
                            <div className="h-px bg-slate-100 my-1" />
                            <DropdownMenuItem onClick={() => handleDeleteLead(lead.id)} className="text-red-600 focus:text-red-600 cursor-pointer font-medium">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Lead
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

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
        title="Sales Management"
        description="Track leads, manage your sales pipeline, and monitor revenue growth in real-time."
      >
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-2 py-1 shadow-sm">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 w-[110px] border-none text-[11px] font-bold text-slate-600 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-slate-100" />
            <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="h-8 w-[80px] border-none text-[11px] font-bold text-slate-600 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>



                  {canAddSales && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white shadow-sm transition-all active:scale-95">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Sales Lead</DialogTitle>
                </DialogHeader>
                <LeadForm onSubmit={handleAddLead} isSubmitting={isSubmitting} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="overflow-hidden border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl bg-slate-50 ${stat.color}`}>
                  {stat.icon}
                </div>
                <div className={`flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${stat.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {stat.trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                  {stat.trend}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
          <TabsList className="bg-slate-100/50 p-1">
            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold">
              Active Pipeline ({activeLeads.length})
            </TabsTrigger>
            <TabsTrigger value="hot" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              Hot Leads ({hotLeads.length})
            </TabsTrigger>
            <TabsTrigger value="converted" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold">
              Converted Successes ({convertedLeads.length})
            </TabsTrigger>
            <TabsTrigger value="targets" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold">
              Monthly Targets
            </TabsTrigger>
            {canEditSales && (
              <button 
                onClick={() => router.push('/work-management/sales/analytics')}
                className="ml-1 text-foreground px-6 py-2 text-sm font-bold flex items-center gap-2 rounded-sm transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                Sales Analytics
              </button>
            )}
          </TabsList>

          <div className="flex items-center gap-2 mr-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-9 w-[180px] border-slate-200 focus-visible:ring-brand-teal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px] bg-white rounded-xl border border-dashed border-slate-200">
            <Loader2 className="w-10 h-10 text-brand-teal animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Fetching your leads...</p>
          </div>
        ) : (
          <>
            <TabsContent value="active">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                  <LeadTable data={activeLeads} type="active" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hot">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                  <LeadTable data={hotLeads} type="hot" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="converted">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                  <LeadTable data={convertedLeads} type="converted" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="targets">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {canEditSales && (
                  <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-700">Set Sales Target</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Type</label>
                          <Select value={targetForm.type} onValueChange={(val) => setTargetForm({...targetForm, type: val})}>
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Weekly">Weekly</SelectItem>
                              <SelectItem value="Custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Employee</label>
                          <Select value={targetForm.employeeId} onValueChange={(val) => setTargetForm({...targetForm, employeeId: val})}>
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.filter(emp => emp.department?.toLowerCase() === 'sales' || emp.role?.toLowerCase() === 'admin').map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.firstName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {targetForm.type === "Custom" ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Start Date</label>
                              <Input 
                                type="date" 
                                className="h-10 text-sm" 
                                value={targetForm.startDate || ""}
                                onChange={(e) => setTargetForm({...targetForm, startDate: e.target.value})}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">End Date</label>
                              <Input 
                                type="date" 
                                className="h-10 text-sm" 
                                value={targetForm.endDate || ""}
                                onChange={(e) => setTargetForm({...targetForm, endDate: e.target.value})}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Month</label>
                                <Select value={targetForm.month} onValueChange={(val) => setTargetForm({...targetForm, month: val})}>
                                  <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                      <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Year</label>
                                <Input 
                                  type="number" 
                                  className="h-10 text-sm" 
                                  value={targetForm.year} 
                                  onChange={(e) => setTargetForm({...targetForm, year: parseInt(e.target.value)})}
                                />
                              </div>
                            </div>

                            {targetForm.type === "Weekly" && (
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Week Number</label>
                                <Select value={String(targetForm.week)} onValueChange={(val) => setTargetForm({...targetForm, week: parseInt(val)})}>
                                  <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[1, 2, 3, 4, 5].map(w => (
                                      <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            Target Amount (₹) {targets.some(t => {
                              if (t.employeeId !== targetForm.employeeId || t.type !== targetForm.type) return false;
                              if (targetForm.type === "Custom") {
                                return t.startDate === targetForm.startDate && t.endDate === targetForm.endDate;
                              } else if (targetForm.type === "Weekly") {
                                return t.month === targetForm.month && t.year === targetForm.year && t.week === targetForm.week;
                              } else {
                                return t.month === targetForm.month && t.year === targetForm.year;
                              }
                            }) && <span className="text-brand-teal ml-1">(Existing)</span>}
                          </label>
                          <Input 
                            type="number" 
                            className="h-10 text-sm font-bold" 
                            placeholder="e.g. 50000"
                            value={targetForm.targetAmount || ""}
                            onChange={(e) => setTargetForm({...targetForm, targetAmount: parseFloat(e.target.value)})}
                          />
                        </div>

                        <Button 
                          className="w-full bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-10 mt-2 shadow-sm"
                          onClick={handleUpsertTarget}
                          disabled={isTargetSubmitting}
                        >
                          {isTargetSubmitting ? "Setting Target..." : "Set Target"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                      <CardHeader className="border-b border-slate-100 flex flex-col items-start space-y-3 pb-3">
                        <div className="flex flex-row items-center justify-between w-full">
                          <CardTitle className="text-sm font-bold text-slate-700">Incentive Slabs</CardTitle>
                          <Dialog open={isSlabDialogOpen} onOpenChange={setIsSlabDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] font-bold text-brand-teal border-brand-teal/20 hover:bg-brand-teal/5"
                                onClick={(e) => {
                                  if (slabTab === "employee" && !selectedSlabEmployee) {
                                    e.preventDefault();
                                    toast.error("Please select an employee first");
                                    return;
                                  }
                                  setSlabForm({ minAmount: 0, maxAmount: 0, percentage: 0, employees: slabTab === "employee" ? [selectedSlabEmployee] : [], clientCategories: [], isRecurring: false });
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add Slab
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                              <DialogHeader>
                                <DialogTitle>{slabTab === "global" ? "Add Common Slab" : `Add Slab for ${selectedSlabEmployee}`}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-black text-slate-400">Min Amount (₹)</Label>
                                    <Input type="number" value={slabForm.minAmount} onChange={e => setSlabForm({...slabForm, minAmount: parseFloat(e.target.value) || 0})} />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-black text-slate-400">Max Amount (₹)</Label>
                                    <Input type="number" value={slabForm.maxAmount} onChange={e => setSlabForm({...slabForm, maxAmount: parseFloat(e.target.value) || 0})} />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-black text-slate-400">Incentive (%)</Label>
                                  <Input type="number" step="0.1" value={slabForm.percentage} onChange={e => setSlabForm({...slabForm, percentage: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-black text-slate-400">Client Categories (Leave empty for All)</Label>
                                  <div className="flex flex-wrap gap-2 pt-1 border border-slate-100 rounded-lg p-2 max-h-32 overflow-y-auto bg-slate-50/50">
                                    {['Marketing', 'Development', 'Graphics'].map(cat => (
                                      <label key={cat} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                                        <input 
                                          type="checkbox"
                                          checked={slabForm.clientCategories?.includes(cat)}
                                          onChange={(e) => {
                                            const updated = e.target.checked 
                                              ? [...(slabForm.clientCategories || []), cat] 
                                              : (slabForm.clientCategories || []).filter(c => c !== cat);
                                            setSlabForm({...slabForm, clientCategories: updated});
                                          }}
                                          className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-3.5 h-3.5"
                                        />
                                        {cat}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5 flex flex-row items-center gap-2 pt-2">
                                  <input 
                                    type="checkbox" 
                                    id="isRecurring"
                                    checked={slabForm.isRecurring} 
                                    onChange={e => setSlabForm({...slabForm, isRecurring: e.target.checked})}
                                    className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-4 h-4"
                                  />
                                  <Label htmlFor="isRecurring" className="text-xs font-bold text-slate-600 cursor-pointer">This is a Recurring Slab</Label>
                                </div>
                                <Button className="w-full bg-brand-teal text-white font-bold" onClick={handleCreateSlab}>Create Slab</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <Tabs value={slabTab} onValueChange={(v) => setSlabTab(v as "global" | "employee")} className="w-full">
                          <TabsList className="w-full grid grid-cols-2 h-8">
                            <TabsTrigger value="global" className="text-xs">Common Slabs</TabsTrigger>
                            <TabsTrigger value="employee" className="text-xs">Employee Wise</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Dialog open={isEditSlabDialogOpen} onOpenChange={setIsEditSlabDialogOpen}>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Edit Incentive Slab</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-black text-slate-400">Min Amount (₹)</Label>
                                  <Input type="number" value={editSlabForm.minAmount} onChange={e => setEditSlabForm({...editSlabForm, minAmount: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-black text-slate-400">Max Amount (₹)</Label>
                                  <Input type="number" value={editSlabForm.maxAmount} onChange={e => setEditSlabForm({...editSlabForm, maxAmount: parseFloat(e.target.value) || 0})} />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-slate-400">Incentive (%)</Label>
                                <Input type="number" step="0.1" value={editSlabForm.percentage} onChange={e => setEditSlabForm({...editSlabForm, percentage: parseFloat(e.target.value) || 0})} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-black text-slate-400">Client Categories (Leave empty for All)</Label>
                                <div className="flex flex-wrap gap-2 pt-1 border border-slate-100 rounded-lg p-2 max-h-32 overflow-y-auto bg-slate-50/50">
                                  {['Marketing', 'Development', 'Graphics'].map(cat => (
                                    <label key={cat} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                                      <input 
                                        type="checkbox"
                                        checked={editSlabForm.clientCategories?.includes(cat)}
                                        onChange={(e) => {
                                          const updated = e.target.checked 
                                            ? [...(editSlabForm.clientCategories || []), cat] 
                                            : (editSlabForm.clientCategories || []).filter(c => c !== cat);
                                          setEditSlabForm({...editSlabForm, clientCategories: updated});
                                        }}
                                        className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-3.5 h-3.5"
                                      />
                                      {cat}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-1.5 flex flex-row items-center gap-2 pt-2">
                                <input 
                                  type="checkbox" 
                                  id="editIsRecurring"
                                  checked={editSlabForm.isRecurring} 
                                  onChange={e => setEditSlabForm({...editSlabForm, isRecurring: e.target.checked})}
                                  className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-4 h-4"
                                />
                                <Label htmlFor="editIsRecurring" className="text-xs font-bold text-slate-600 cursor-pointer">This is a Recurring Slab</Label>
                              </div>
                              <Button className="w-full bg-brand-teal text-white font-bold" onClick={() => editingSlabId && handleUpdateSlab(editingSlabId)}>Save Changes</Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <div className="divide-y divide-slate-100">
                          {slabTab === "global" && (
                            incentiveSlabs.filter(s => !s.employees || s.employees.length === 0).length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-400 italic">No common slabs configured</div>
                            ) : (
                              incentiveSlabs.filter(s => !s.employees || s.employees.length === 0).map(slab => (
                                <div key={slab.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-bold text-slate-700">₹{slab.minAmount.toLocaleString()} - ₹{slab.maxAmount.toLocaleString()}</div>
                                      {slab.isRecurring ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest">Recurring</span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase tracking-widest">Standard</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-black text-brand-teal uppercase tracking-widest">{slab.percentage}% Incentive</div>
                                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                      {slab.clientCategories && slab.clientCategories.length > 0 
                                        ? `Categories: ${slab.clientCategories.join(", ")}` 
                                        : 'All Categories'}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-slate-300 hover:text-brand-teal"
                                      onClick={() => { setEditSlabForm({ minAmount: slab.minAmount, maxAmount: slab.maxAmount, percentage: slab.percentage, employees: slab.employees || [], clientCategories: slab.clientCategories || [], isRecurring: slab.isRecurring || false }); setEditingSlabId(slab.id); setIsEditSlabDialogOpen(true); }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleDeleteSlab(slab.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )
                          )}

                          {slabTab === "employee" && (
                            <div className="p-3">
                              <div className="space-y-1.5 mb-3">
                                <Label className="text-[10px] uppercase font-black text-slate-400">Select Salesperson</Label>
                                <Select value={selectedSlabEmployee} onValueChange={setSelectedSlabEmployee}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Choose an employee..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {employees.filter(emp => emp.department?.toLowerCase() === 'sales' || emp.role?.toLowerCase() === 'admin').map(emp => {
                                      const empName = emp.name || `${emp.firstName} ${emp.lastName}`;
                                      return <SelectItem key={emp.id} value={empName}>{empName}</SelectItem>
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {selectedSlabEmployee ? (
                                <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100">
                                  {incentiveSlabs.filter(s => s.employees && s.employees.includes(selectedSlabEmployee)).length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/50">No custom slabs for this employee. Common slabs will apply.</div>
                                  ) : (
                                    incentiveSlabs.filter(s => s.employees && s.employees.includes(selectedSlabEmployee)).map(slab => (
                                      <div key={slab.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 bg-white">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <div className="text-sm font-bold text-slate-700">₹{slab.minAmount.toLocaleString()} - ₹{slab.maxAmount.toLocaleString()}</div>
                                            {slab.isRecurring ? (
                                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest">Recurring</span>
                                            ) : (
                                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase tracking-widest">Standard</span>
                                            )}
                                          </div>
                                          <div className="text-[10px] font-black text-brand-teal uppercase tracking-widest">{slab.percentage}% Incentive</div>
                                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                            {slab.clientCategories && slab.clientCategories.length > 0 
                                              ? `Categories: ${slab.clientCategories.join(", ")}` 
                                              : 'All Categories'}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-300 hover:text-brand-teal"
                                            onClick={() => { setEditSlabForm({ minAmount: slab.minAmount, maxAmount: slab.maxAmount, percentage: slab.percentage, employees: slab.employees || [], clientCategories: slab.clientCategories || [], isRecurring: slab.isRecurring || false }); setEditingSlabId(slab.id); setIsEditSlabDialogOpen(true); }}
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleDeleteSlab(slab.id)}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              ) : (
                                <div className="p-6 text-center text-xs text-slate-400 italic border border-slate-100 rounded-lg bg-slate-50/50">
                                  Select an employee to view or add their custom slabs
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card className={`border-none shadow-sm bg-white overflow-hidden ${canEditSales ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                  <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-700">
                      {canEditSales ? "Sales Performance Targets" : "My Performance Targets"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Type</th>
                            <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Period</th>
                            <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Target</th>
                            <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Achieved</th>
                            <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right text-indigo-600">Earned</th>
                            <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right text-brand-teal">Progress</th>
                            {canEditSales && <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {targets.filter(t => canEditSales || t.employeeName?.toLowerCase() === currentUserName.toLowerCase()).length > 0 ? (
                            targets
                              .filter(t => canEditSales || t.employeeName?.toLowerCase() === currentUserName.toLowerCase())
                              .sort((a,b) => b.year - a.year || (a.type === "Weekly" ? 1 : -1))
                              .map((t, i) => {
                                let achieved = t.currentAchievement || 0;
                                const percent = t.targetAmount > 0 ? (achieved / t.targetAmount) * 100 : 0;
                                const earnedIncentive = t.incentiveAmount || 0;

                                return (
                                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center text-[10px] font-bold uppercase">
                                          {t.employeeName?.substring(0, 2)}
                                        </div>
                                        <span className="font-bold text-slate-700 text-sm">{t.employeeName}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <Badge className={`${
                                        t.type === 'Weekly' ? 'bg-amber-100 text-amber-700' : 
                                        t.type === 'Custom' ? 'bg-emerald-100 text-emerald-700' : 
                                        'bg-indigo-100 text-indigo-700'
                                      } border-none text-[10px] font-bold`}>
                                        {t.type}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <div className="flex flex-col items-center">
                                        {t.type === "Custom" ? (
                                          <span className="text-[10px] font-bold text-slate-600">
                                            {dayjs(t.startDate).format("DD MMM YYYY")} - {dayjs(t.endDate).format("DD MMM YYYY")}
                                          </span>
                                        ) : (
                                          <>
                                            <span className="text-[10px] font-bold text-slate-600">{t.month} {t.year}</span>
                                            {t.type === "Weekly" && <span className="text-[9px] font-black text-brand-teal uppercase">Week {t.week}</span>}
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <span className="font-bold text-slate-900 text-sm">₹{t.targetAmount?.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <span className="font-bold text-emerald-600 text-sm">₹{achieved.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex flex-col items-end">
                                        <span className="font-bold text-indigo-600 text-sm">₹{earnedIncentive.toLocaleString()}</span>
                                        {t.breakdown && t.breakdown.length > 0 && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              e.preventDefault()
                                              setSelectedBreakdown(t.breakdown || [])
                                              setIsBreakdownOpen(true)
                                            }}
                                            className="flex items-center gap-1 text-[10px] text-brand-teal mt-1 hover:underline text-right w-max"
                                          >
                                            <BarChart2 className="w-3 h-3" />
                                            View Breakdown
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[11px] font-black ${percent >= 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                          {percent.toFixed(0)}%
                                        </span>
                                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-brand-teal'} transition-all`} 
                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    {canEditSales && (
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                          {canDeleteSales && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-rose-500" onClick={async () => {
                                              const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Delete target?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (isConfirmed) {
                                                await fetch(`${API_URL}/sales-targets/${t.id}`, { method: "DELETE" });
                                                fetchTargets();
                                              }
                                            }}>
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                                No targets set yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>


          </>
        )}

      </Tabs>

      <Dialog open={!!statusChangeData} onOpenChange={(open) => { if (!open) setStatusChangeData(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reason for Status Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Why did you change the status to {statusChangeData?.newStatus}?</Label>
              <Select value={selectedReason} onValueChange={(val) => { setSelectedReason(val); if (val !== "Other") setCustomReason(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {statusChangeData?.newStatus && STATUS_REASONS[statusChangeData.newStatus]?.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedReason === "Other" && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Specify Reason</Label>
                <Input 
                  id="customReason" 
                  placeholder="Enter custom reason..." 
                  value={customReason} 
                  onChange={(e) => setCustomReason(e.target.value)} 
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setStatusChangeData(null)}>Cancel</Button>
            <Button 
              className="bg-brand-teal hover:bg-brand-teal-light text-white" 
              onClick={handleStatusChangeSubmit}
              disabled={!selectedReason || (selectedReason === "Other" && !customReason.trim())}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
            <DialogTitle>Generate Client Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ClientForm
              initialData={clientFormData || undefined}
              onSubmit={handleClientSubmit}
              isSubmitting={isClientSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ActivityLogDialog 
        open={isLogsDialogOpen}
        onOpenChange={setIsLogsDialogOpen}
        title="Lead History"
        subtitle={selectedLeadForLogs?.company}
        logs={leadLogs}
        isLoading={isLogsLoading}
      />

      <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Incentive Breakdown</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedBreakdown.length > 0 ? (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Client / Invoice</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Type</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Invoice Value</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Slab %</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBreakdown.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.clientName}</p>
                          {item.invoiceNumber && <p className="text-[10px] text-slate-400">{item.invoiceNumber}</p>}
                        </td>
                        <td className="px-4 py-3">{item.category}</td>
                        <td className="px-4 py-3">
                          {item.isRecurring ? (
                            <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold">Recurring</span>
                          ) : (
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">First-time</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.subtotal || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{item.slabPercentage}%</td>
                        <td className="px-4 py-3 text-right text-brand-teal font-bold">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.earnedIncentive || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-700">Total Incentive:</td>
                      <td className="px-4 py-3 text-right font-bold text-brand-teal text-base">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                          selectedBreakdown.reduce((sum, item) => sum + (item.earnedIncentive || 0), 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No breakdown data available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
