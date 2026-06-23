"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  ArrowUpDown,
  ChevronDown,
  Check,
  Trash2,
  Edit2,
  Play,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  MoreVertical,
  Plus,
  Info,
  TrendingUp,
  Power,
  FileText,
  History,
  ClipboardList,
  Calendar as CalendarIcon,
  Download,
  Filter,
  MoreHorizontal,
  GripVertical,
  X,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfToday, subDays, format, isSameDay, differenceInDays, parseISO, isAfter, startOfDay } from "date-fns";
import { OtherWorkDialog } from "@/components/hrms/OtherWorkDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/TablePagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";

const monthMap: { [key: string]: string } = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

const normalizeDate = (dateStr: string) => {
  if (!dateStr) return "";
  return dateStr.split(" ")[0].split("T")[0];
};

const calculateProjectDays = (project: any) => {
  if (!project.startDate) return { active: 0, onHold: 0 };
  
  const startDate = parseISO(project.startDate);
  const today = startOfDay(new Date());
  
  if (!project.statusHistory || project.statusHistory.length === 0) {
    const totalDays = Math.max(0, differenceInDays(today, startDate));
    if (project.status === "on-hold") {
      return { active: 0, onHold: totalDays };
    }
    return { active: totalDays, onHold: 0 };
  }

  let activeDays = 0;
  let onHoldDays = 0;
  
  const history = [...project.statusHistory].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  let lastTime = startDate;
  let lastStatus = "in-progress";

  for (const log of history) {
    const logTime = startOfDay(parseISO(log.timestamp));
    if (isAfter(logTime, lastTime)) {
      const days = differenceInDays(logTime, lastTime);
      if (lastStatus === "on-hold") {
        onHoldDays += days;
      } else {
        activeDays += days;
      }
      lastTime = logTime;
    }
    lastStatus = log.status;
  }
  
  if (isAfter(today, lastTime)) {
    const days = differenceInDays(today, lastTime);
    if (lastStatus === "on-hold") {
      onHoldDays += days;
    } else {
      activeDays += days;
    }
  }

  return { active: Math.max(0, activeDays), onHold: Math.max(0, onHoldDays) };
};

export default function MarketingReportsPage() {
  const { confirm } = useConfirm();
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const {
    checkPermission,
    isAdmin,
    loading: permissionsLoading,
  } = usePermissions();

  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };

  const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };

  const getLocalMonthString = () => {
    return new Date().toLocaleString("default", { month: "long" });
  };

  const canViewMarketing = isAdmin || checkPermission("marketing", "canView");
  const canAddMarketing = isAdmin || checkPermission("marketing", "canAdd");
  const canEditMarketing = isAdmin || checkPermission("marketing", "canEdit");
  const canDeleteMarketing =
    isAdmin || checkPermission("marketing", "canDelete");

  const [activeTab, setActiveTab] = useState("daily");
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [inlineEditing, setInlineEditing] = useState<{
    id: string;
    field: string;
  } | null>(null);

  // Row Editing
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSavingRow, setIsSavingRow] = useState(false);

  // Logs state
  const [logsOpen, setLogsOpen] = useState(false);
  const [reportLogs, setReportLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeReport, setActiveReport] = useState<any>(null);

  // Client filtering
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedClientForCampaigns, setSelectedClientForCampaigns] = useState<
    string | null
  >(null);

  const isActiveClientOnHold = clients?.find((c: any) => c.id === selectedClientForCampaigns)?.status === "on-hold";
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  // Pagination State
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyItemsPerPage, setDailyItemsPerPage] = useState(10);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [monthlyItemsPerPage, setMonthlyItemsPerPage] = useState(10);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(startOfToday(), 1),
    to: subDays(startOfToday(), 1)
  });
  const [monthFilter, setMonthFilter] = useState(getLocalMonthString());



  const handleMonthFilterChange = (val: string) => {
    setMonthFilter(val);
  };
  const [newCampaignName, setNewCampaignName] = useState<{
    [key: string]: string;
  }>({});
  const [newCampaignMetric, setNewCampaignMetric] = useState<{
    [key: string]: string;
  }>({});

  const handleAddCampaign = async (clientId: string) => {
    const name = newCampaignName[clientId];
    const metric = newCampaignMetric[clientId] || "CPL";
    if (!name || !name.trim()) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const currentCampaigns = client.campaigns || [];
    const exists = currentCampaigns.some(
      (c: any) => (typeof c === "string" ? c : c.name) === name.trim(),
    );
    if (exists) {
      toast.error("Campaign already exists");
      return;
    }
    const updatedCampaigns = [
      ...currentCampaigns,
      { name: name.trim(), isActive: true, metric },
    ];
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaigns: updatedCampaigns,
          performedBy: user?.id,
          userName: user?.name,
        }),
      });
      if (res.ok) {
        toast.success("Campaign added");
        setNewCampaignName((prev) => ({ ...prev, [clientId]: "" }));
        setNewCampaignMetric((prev) => ({ ...prev, [clientId]: "CPL" }));
        fetchClients();
      } else {
        toast.error("Failed to add campaign");
      }
    } catch (err) {
      toast.error("Failed to add campaign");
    }
  };

  const handleRemoveCampaign = async (
    clientId: string,
    campaignToRemove: string,
  ) => {
    if (!canEditMarketing) {
      toast.error("You do not have permission to edit campaigns");
      return;
    }
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to remove this campaign?",
      destructive: true,
      confirmText: "Remove",
    });
    if (!isConfirmed) return;

    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const updatedCampaigns = (client.campaigns || []).filter(
      (c: any) => (typeof c === "string" ? c : c.name) !== campaignToRemove,
    );
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaigns: updatedCampaigns,
          performedBy: user?.id,
          userName: user?.name,
        }),
      });
      if (res.ok) {
        toast.success("Campaign removed");
        fetchClients();
      } else {
        toast.error("Failed to remove campaign");
      }
    } catch (err) {
      toast.error("Failed to remove campaign");
    }
  };

  const handleToggleCampaignStatus = async (
    clientId: string,
    campaignName: string,
  ) => {
    if (!canEditMarketing) {
      toast.error("You do not have permission to edit campaigns");
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    const updatedCampaigns = (client.campaigns || []).map((c: any) => {
      const cName = typeof c === "string" ? c : c.name;
      const cActive = typeof c === "string" ? true : c.isActive;
      if (cName === campaignName) {
        return { name: cName, isActive: !cActive };
      }
      return typeof c === "string" ? { name: cName, isActive: true } : c;
    });
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaigns: updatedCampaigns,
          performedBy: user?.id,
          userName: user?.name,
        }),
      });
      if (res.ok) {
        toast.success("Campaign status updated");
        fetchClients();
      } else {
        toast.error("Failed to update campaign status");
      }
    } catch (err) {
      toast.error("Failed to update campaign status");
    }
  };

  const [viewClientReports, setViewClientReports] = useState<string | null>(
    null,
  );
  const [clientReportsData, setClientReportsData] = useState<{
    daily: any[];
    monthly: any[];
  }>({ daily: [], monthly: [] });
  const [loadingClientReports, setLoadingClientReports] = useState(false);

  const handleViewClientReports = async (clientId: string) => {
    setViewClientReports(clientId);
    setLoadingClientReports(true);
    try {
      const userParams = user ? `&userId=${user.id}&role=${user.role}` : "";
      const [dailyRes, monthlyRes] = await Promise.all([
        fetch(`${API_URL}/marketing/reports/daily?client_id=${clientId}${userParams}`),
        fetch(`${API_URL}/marketing/reports/monthly?client_id=${clientId}${userParams}`),
      ]);
      const daily = await dailyRes.json();
      const monthly = await monthlyRes.json();
      setClientReportsData({
        daily: Array.isArray(daily) ? daily : [],
        monthly: Array.isArray(monthly) ? monthly : [],
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load client reports");
    } finally {
      setLoadingClientReports(false);
    }
  };

  // Form States
  const [dailyFormData, setDailyFormData] = useState({
    date: "",
    campaignName: "",
    projectId: "",
    projectName: "",
    clientId: "",
    reach: 0,
    impression: 0,
    leads: 0,
    followers: 0,
    spend: 0,
    cpl: 0,
    remarks: "",
    campaignOptimization: false,
  });

  const [monthlyFormData, setMonthlyFormData] = useState({
    projectId: "",
    projectName: "",
    clientId: "",
    clientName: "",
    month: getLocalMonthString(),
    totalSpend: 0,
    totalLeads: 0,
    totalSales: 0,
    avgCPR: 0,
    avgCPP: 0,
    totalRevenue: 0,
    overallROAS: 0,
    employeeConclusion: "",
    adminConclusion: "",
    clientConclusion: "",
  });

  useEffect(() => {
    if (!permissionsLoading && !canViewMarketing) {
      setTimeout(() => {
        router.push("/");
      }, 0);
    }
  }, [router, permissionsLoading, canViewMarketing]);

  const hasGeneratedForDateRef = useRef<string>("");
  const fetchedDateRef = useRef<string>("");

  useEffect(() => {
    if (activeTab !== "daily" || !dateRange || clients.length === 0 || loading)
      return;

    // Do not auto-generate for future dates
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;
    const yesterdayDate = subDays(startOfToday(), 1);
    const yesterdayStr = format(yesterdayDate, "yyyy-MM-dd");

    // Check if yesterday is in the selected date range
    let inRange = false;
    if (dateRange?.from) {
      const fromD = dateRange.from;
      const toD = dateRange.to || dateRange.from;
      if (yesterdayDate >= fromD && yesterdayDate <= toD) {
        inRange = true;
      }
    }

    if (!inRange) return;

    const startStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
    const endStr = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : startStr;
    const fetchKey = `${startStr}_${endStr}`;

    if (fetchedDateRef.current !== fetchKey) return; // Wait until data for this range is fetched

    if (hasGeneratedForDateRef.current === yesterdayStr) return;

    hasGeneratedForDateRef.current = yesterdayStr;

    const checkAndGenerate = async () => {
      const datesToCheck = [yesterdayStr];
      const today = new Date();
      // Also check past 2 days to ensure weekends are covered
      for (let i = 2; i <= 3; i++) {
        const pastD = new Date(today);
        pastD.setDate(today.getDate() - i);
        const pastStr = pastD.toISOString().split("T")[0];
        if (!datesToCheck.includes(pastStr)) datesToCheck.push(pastStr);
      }

      const missingCampaigns: any[] = [];
      datesToCheck.forEach((checkDate) => {
        clients.forEach((client) => {
          if (client.status === "active" || client.status === "Active") {
            const campaigns = client.campaigns || [];
            campaigns.forEach((camp: any) => {
              const campName = typeof camp === "string" ? camp : camp.name;
              const isActive = typeof camp === "string" ? true : camp.isActive;
              if (isActive && campName) {
                const exists = dailyReports.some(
                  (r) =>
                    r.clientId === client.id &&
                    r.campaignName === campName &&
                    normalizeDate(r.date) === checkDate,
                );
                const alreadyMissing = missingCampaigns.some(
                  (c) =>
                    c.clientId === client.id &&
                    c.campaignName === campName &&
                    c.date === checkDate,
                );
                if (!exists && !alreadyMissing) {
                  // Try to find an associated project for this client
                  const project = projects.find(p => p.clientId === client.id);
                  
                  missingCampaigns.push({
                    projectId: project ? project.id : "",
                    projectName: project ? project.title : "",
                    clientId: client.id,
                    clientName: client.companyName || "",
                    date: checkDate,
                    campaignName: campName,
                    reach: 0,
                    impression: 0,
                    leads: 0,
                    followers: 0,
                    spend: 0,
                    cpl: 0,
                    remarks: "",
                  });
                }
              }
            });
          }
        });
      });

      if (missingCampaigns.length > 0) {
        try {
          const promises = missingCampaigns.map((campaign) =>
            fetch(`${API_URL}/marketing/reports/daily`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(campaign),
            }).then((res) => (res.ok ? res.json() : null)),
          );
          const results = await Promise.all(promises);
          const newReports = results.filter((r) => r !== null);
          if (newReports.length > 0) {
            setDailyReports((prev) => {
              const existingIds = new Set(prev.map((r: any) => String(r.id)));
              const uniqueNew = newReports.filter(
                (r: any) => !existingIds.has(String(r.id)),
              );
              return [...prev, ...uniqueNew];
            });
          }
        } catch (err) {
          console.error("Failed to auto-generate", err);
        }
      }
    };

    checkAndGenerate();
  }, [activeTab, dateRange, clients, dailyReports, loading]);

  useEffect(() => {
    if (permissionsLoading || userLoading || !canViewMarketing) return;
    fetchData();
    fetchClients();
    fetchProjects();
  }, [
    activeTab,
    selectedClientFilter,
    dateRange,
    monthFilter,
    permissionsLoading,
    canViewMarketing,
    userLoading,
    user?.id,
    user?.role,
  ]);

  const fetchClients = async () => {
    try {
      const userParams = user ? `?userId=${user.id}&role=${user.role}` : "";
      const res = await fetch(`${API_URL}/clients${userParams}`);
      if (res.ok) {
        const data = await res.json();
        setClients(
          data.filter(
            (c: any) =>
              c.department === "Marketing" ||
              c.department === "Digital Marketing",
          ),
        );
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const userParams = user ? `?userId=${user.id}&role=${user.role}` : "";
      const res = await fetch(`${API_URL}/projects${userParams}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(
          data.filter(
            (p: any) => p.department === "Digital Marketing"
          )
        );
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint =
        activeTab === "daily"
          ? "/marketing/reports/daily"
          : "/marketing/reports/monthly";
      const params = new URLSearchParams();
      if (selectedClientFilter !== "all")
        params.append("client_id", selectedClientFilter);
      if (user) {
        params.append("userId", user.id);
        params.append("role", user.role);
      }
      if (activeTab === "daily") {
        if (dateRange?.from) {
          const startStr = format(dateRange.from, "yyyy-MM-dd");
          const endStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startStr;
          params.append("start_date", startStr);
          params.append("end_date", endStr);
        }
        
        const res = await fetch(`${API_URL}${endpoint}?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const seen = new Set();
          const uniqueData = data.filter((r: any) => {
            const key = `${normalizeDate(r.date)}-${r.clientId}-${r.campaignName}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setDailyReports(uniqueData);
          if (dateRange?.from) {
            const startStr = format(dateRange.from, "yyyy-MM-dd");
            const endStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startStr;
            fetchedDateRef.current = `${startStr}_${endStr}`;
          } else {
            fetchedDateRef.current = "";
          }
        }
      } else {
        if (monthFilter !== "all") params.append("month", monthFilter);
        const res = await fetch(`${API_URL}${endpoint}?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setMonthlyReports(data);
        }
      }
    } catch (err) {
      console.error("Error fetching marketing reports:", err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDailySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReport ? !canEditMarketing : !canAddMarketing) {
      toast.error("You do not have permission to perform this action");
      return;
    }
    if (!dailyFormData.clientId) {
      toast.error("Please select a client before adding a daily report.");
      return;
    }
    if (!dailyFormData.campaignName.trim()) {
      toast.error("Please enter a campaign name.");
      return;
    }
    const client = clients.find((c) => c.id === dailyFormData.clientId);
    try {
      const method = editingReport ? "PUT" : "POST";
      const url = editingReport
        ? `${API_URL}/marketing/reports/daily/${editingReport.id}`
        : `${API_URL}/marketing/reports/daily`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dailyFormData,
          clientName: client?.companyName || "",
        }),
      });

      if (res.ok) {
        setIsDailyModalOpen(false);
        setEditingReport(null);
        setDailyFormData({
          date: "",
          campaignName: "",
          projectId: "",
          projectName: "",
          clientId: "",
          reach: 0,
          impression: 0,
          leads: 0,
          followers: 0,
          spend: 0,
          cpl: 0,
          remarks: "",
        });
        toast.success(
          editingReport
            ? "Daily report updated successfully!"
            : "Daily report added successfully!",
        );
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg =
          errData.detail || errData.message || "Failed to save daily report";
        toast.error(
          typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg,
        );
      }
    } catch (err) {
      toast.error("Failed to save daily report");
    }
  };

  const handleMonthlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("You do not have permission to perform this action");
      return;
    }
    if (!monthlyFormData.clientId) {
      toast.error("Please select a client before adding a monthly report.");
      return;
    }
    if (!monthlyFormData.month) {
      toast.error("Please select a month.");
      return;
    }
    try {
      const method = editingReport ? "PUT" : "POST";
      const url = editingReport
        ? `${API_URL}/marketing/reports/monthly/${editingReport.id}`
        : `${API_URL}/marketing/reports/monthly`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(monthlyFormData),
      });

      if (res.ok) {
        setIsMonthlyModalOpen(false);
        setEditingReport(null);
        toast.success(
          editingReport
            ? "Monthly report updated successfully!"
            : "Monthly report added successfully!",
        );
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg =
          errData.detail || errData.message || "Failed to save monthly report";
        toast.error(
          typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg,
        );
      }
    } catch (err) {
      toast.error("Failed to save monthly report");
    }
  };

  const handleDelete = async (id: string, type: "daily" | "monthly") => {
    if (type === "monthly") {
      toast.error("Monthly reports cannot be deleted");
      return;
    }
    if (type === "daily" && !canDeleteMarketing) {
      toast.error("You do not have permission to delete reports");
      return;
    }
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this report?",
      destructive: true,
      confirmText: "Confirm",
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_URL}/marketing/reports/${type}/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Report deleted successfully");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to delete report");
    }
  };

  const handleInlineUpdate = async (
    id: string,
    field: string | object,
    value: any,
    type: "daily" | "monthly",
  ) => {
    if (type === "monthly" && !isAdmin) {
      if (field === "employeeConclusion") {
        const report = clientReportsData.monthly.find((r: any) => r.id === id);
        const isAssigned = report && projects.some((p: any) => p.clientId === report.clientId && p.assignedEmployeeId === user?.id);
        if (!isAssigned) {
          toast.error("You do not have permission to edit this conclusion");
          return;
        }
      } else {
        toast.error("You do not have permission to edit monthly reports");
        return;
      }
    }
    if (type === "daily" && !canEditMarketing) {
      toast.error("You do not have permission to edit reports");
      return;
    }
    try {
      const payload =
        typeof field === "object" ? { ...field } : { [field as string]: value };

      const res = await fetch(`${API_URL}/marketing/reports/${type}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          performedBy: user?.id,
          userName: user?.name || "Unknown User",
        }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    }
    setInlineEditing(null);
  };

  const startEditingRow = (report: any) => {
    if (!canEditMarketing) return;
    setEditingRowId(report.id);
    setEditFormData({ ...report });
  };

  const saveRowEdit = async (id: string, type: "daily" | "monthly") => {
    if (!canEditMarketing) return;
    setIsSavingRow(true);
    try {
      const res = await fetch(`${API_URL}/marketing/reports/${type}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          performedBy: user?.id,
          userName: user?.name || "Unknown User",
        }),
      });
      if (res.ok) {
        fetchData();
        setEditingRowId(null);
      } else {
        toast.error("Failed to save");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    } finally {
      setIsSavingRow(false);
    }
  };

  // Reset pages when filters change
  useEffect(() => {
    setDailyPage(1);
    setMonthlyPage(1);
  }, [searchQuery, selectedClientFilter, dateRange, monthFilter]);

  const handleDragEndDaily = (result: any) => {
    if (!result.destination) return;
    const sourceId = result.draggableId;
    const sourceIndex = dailyReports.findIndex(
      (r) => String(r.id) === String(sourceId),
    );

    // Using filteredDaily since it represents the visual list before pagination
    // Wait, destination.index is relative to the droppable container, which contains paginated items
    // and also maybe Quick Add row? The Quick Add row is NOT a Draggable. Droppable might just count draggables.
    const destId = paginatedDaily[result.destination.index]?.id;
    let destIndex = dailyReports.findIndex(
      (r) => String(r.id) === String(destId),
    );

    if (destIndex === -1) destIndex = dailyReports.length;

    if (sourceIndex !== -1 && destIndex !== -1) {
      const newReports = Array.from(dailyReports);
      const [moved] = newReports.splice(sourceIndex, 1);
      newReports.splice(destIndex, 0, moved);
      setDailyReports(newReports);
    }
  };

  const handleDragEndMonthly = (result: any) => {
    if (!result.destination) return;
    const sourceId = result.draggableId;
    const sourceIndex = monthlyReports.findIndex(
      (r) => String(r.id) === String(sourceId),
    );

    const destId = paginatedMonthly[result.destination.index]?.id;
    let destIndex = monthlyReports.findIndex(
      (r) => String(r.id) === String(destId),
    );

    if (destIndex === -1) destIndex = monthlyReports.length;

    if (sourceIndex !== -1 && destIndex !== -1) {
      const newReports = Array.from(monthlyReports);
      const [moved] = newReports.splice(sourceIndex, 1);
      newReports.splice(destIndex, 0, moved);
      setMonthlyReports(newReports);
    }
  };

  if (permissionsLoading || !canViewMarketing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  const fetchLogs = async (
    report: any,
    type: "daily" | "monthly" | "client",
  ) => {
    setIsLoadingLogs(true);
    setLogsOpen(true);
    setActiveReport({ ...report, type });
    try {
      let param = "";
      if (type === "daily") param = `dailyReportId=${report.id}`;
      else if (type === "monthly") param = `monthlyReportId=${report.id}`;
      else {
        const clientProjs = projects.filter((p: any) => p.clientId === report.id);
        param = clientProjs.length > 0 ? `projectId=${clientProjs[0].id}` : `clientId=${report.id}`;
      }

      console.log(`Fetching logs from: ${API_URL}/task-logs?${param}`);

      const res = await fetch(`${API_URL}/task-logs?${param}`);
      if (res.ok) {
        setReportLogs(await res.json());
      } else {
        toast.error(`Failed to load logs: ${res.status}`);
        console.error("Logs fetch failed:", res.status, res.statusText);
      }
    } catch (err) {
      toast.error("Network error while fetching logs");
      console.error("Error fetching report logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const filteredDaily = dailyReports.filter((r) => {
    const isEmpty =
      !r.reach &&
      !r.impression &&
      !r.leads &&
      !r.followers &&
      !r.spend &&
      !r.cpl &&
      (!r.remarks || r.remarks.trim() === "");
    let isCurrentlyActive = true;
    const client = clients.find((c) => String(c.id) === String(r.clientId));
    if (client) {
      const camp = (client.campaigns || []).find(
        (c: any) => (typeof c === "string" ? c : c.name) === r.campaignName,
      );
      if (camp) {
        isCurrentlyActive = typeof camp === "string" ? true : camp.isActive;
      } else {
        isCurrentlyActive = false;
      }
      if (client.status !== "active" && client.status !== "Active") {
        isCurrentlyActive = false;
      }
    }

    const reportDate = normalizeDate(r.date);
    const todayStr = getTodayStr();

    // Hide future dates completely
    if (reportDate > todayStr) {
      return false;
    }

    const isZeroOrEmpty = (val: any) =>
      !val || val === 0 || val === "0" || String(val).trim() === "";
    const isTrulyEmpty =
      isZeroOrEmpty(r.reach) &&
      isZeroOrEmpty(r.impression) &&
      isZeroOrEmpty(r.leads) &&
      isZeroOrEmpty(r.revenue) &&
      isZeroOrEmpty(r.followers) &&
      isZeroOrEmpty(r.spend) &&
      isZeroOrEmpty(r.cpl) &&
      isZeroOrEmpty(r.remarks);

    // Hide inactive rows for today or future dates, regardless of whether they are empty
    if (!isCurrentlyActive && reportDate >= todayStr) {
      return false;
    }

    const matchesSearch =
      r.campaignName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.projectName &&
        r.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.clientName &&
        r.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesClient =
      selectedClientFilter === "all" || r.clientId === selectedClientFilter;

    // Only show pending rows if they are from exactly the previous day
    let isPendingRow = false;
    if (isCurrentlyActive && isTrulyEmpty) {
      const yesterdayStr = format(subDays(startOfToday(), 1), "yyyy-MM-dd");
      if (reportDate === yesterdayStr) {
        isPendingRow = true;
      }
    }

    let matchesDate = false;
    if (dateRange?.from) {
      const startStr = format(dateRange.from, "yyyy-MM-dd");
      const endStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startStr;
      if (reportDate >= startStr && reportDate <= endStr) {
        matchesDate = true;
      }
    } else {
      matchesDate = true;
    }

    const matchesMonth =
      monthFilter === "all" ||
      (r.date && normalizeDate(r.date).split("-")[1] === monthMap[monthFilter]);
      
    const isDMProject = r.projectId 
      ? projects.some(p => p.id === r.projectId) 
      : true;

    return matchesSearch && matchesClient && matchesDate && matchesMonth && isDMProject;
  });

  const filteredMonthly = monthlyReports.filter((r) => {
    const matchesSearch =
      (r.projectName && r.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.clientName && r.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.month.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient =
      selectedClientFilter === "all" || r.clientId === selectedClientFilter;
    const matchesMonth =
      monthFilter === "all" || !monthFilter || r.month === monthFilter;
    return matchesSearch && matchesClient && matchesMonth;
  });

  // Pagination Logic
  const paginatedDaily = filteredDaily.slice(
    (dailyPage - 1) * dailyItemsPerPage,
    dailyPage * dailyItemsPerPage,
  );
  const paginatedMonthly = filteredMonthly.slice(
    (monthlyPage - 1) * monthlyItemsPerPage,
    monthlyPage * monthlyItemsPerPage,
  );

  const groupedPaginatedDaily = paginatedDaily.reduce(
    (acc: Record<string, any[]>, curr) => {
      const pName = curr.projectName || curr.clientName || "Unknown";
      if (!acc[pName]) acc[pName] = [];
      acc[pName].push(curr);
      return acc;
    },
    {},
  );

  const dailyTotals = filteredDaily.reduce(
    (acc, curr) => ({
      reach: acc.reach + (curr.reach || 0),
      impression: acc.impression + (curr.impression || 0),
      leads: acc.leads + (curr.leads || 0),
      revenue: acc.revenue + (curr.revenue || 0),
      followers: acc.followers + (curr.followers || 0),
      spend: acc.spend + (curr.spend || 0),
    }),
    { reach: 0, impression: 0, leads: 0, revenue: 0, followers: 0, spend: 0 },
  );

  const dailyClientTotals = filteredDaily.reduce(
    (acc: Record<string, any>, curr) => {
      const clientName = curr.clientName || "Unknown";
      if (!acc[clientName]) {
        acc[clientName] = {
          reach: 0,
          impression: 0,
          leads: 0,
          revenue: 0,
          followers: 0,
          spend: 0,
        };
      }
      acc[clientName].reach += curr.reach || 0;
      acc[clientName].impression += curr.impression || 0;
      acc[clientName].leads += curr.leads || 0;
      acc[clientName].revenue += curr.revenue || 0;
      acc[clientName].followers += curr.followers || 0;
      acc[clientName].spend += curr.spend || 0;
      return acc;
    },
    {},
  );

  const monthlyTotals = filteredMonthly.reduce(
    (acc, curr) => ({
      totalSpend: acc.totalSpend + (curr.totalSpend || 0),
      totalLeads: acc.totalLeads + (curr.totalLeads || 0),
      totalSales: acc.totalSales + (curr.totalSales || 0),
      totalRevenue: acc.totalRevenue + (curr.totalRevenue || 0),
    }),
    { totalSpend: 0, totalLeads: 0, totalSales: 0, totalRevenue: 0 },
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      <ActivityLogDialog
        open={logsOpen}
        onOpenChange={setLogsOpen}
        title={
          activeReport?.type === "client"
            ? "Client Activity History"
            : "Report Activity History"
        }
        subtitle={
          activeReport
            ? activeReport.type === "daily"
              ? activeReport.campaignName
              : activeReport.type === "client"
                ? activeReport.companyName
                : activeReport.clientName
            : undefined
        }
        logs={reportLogs}
        isLoading={isLoadingLogs}
      />

      <Dialog
        open={!!viewClientReports}
        onOpenChange={(open) => !open && setViewClientReports(null)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Client Reports:{" "}
              {clients.find((c) => c.id === viewClientReports)?.companyName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {loadingClientReports ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
              </div>
            ) : (
              <div className="space-y-8 p-1">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-800">
                    Daily Reports
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-bold text-slate-700">
                            Date
                          </TableHead>
                          <TableHead className="font-bold text-slate-700">
                            Project
                          </TableHead>
                          <TableHead className="font-bold text-slate-700">
                            Campaign
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Reach
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Impressions
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Leads
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Spend (₹)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientReportsData.daily.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-slate-400 italic"
                            >
                              No daily reports found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          clientReportsData.daily.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{normalizeDate(r.date)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col items-start gap-1">
                                  <span>{r.projectName || "N/A"}</span>
                                  {projects.find((p: any) => p.id === r.projectId)?.status === 'on-hold' && (
                                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 px-1 py-0 shadow-none font-semibold">ON HOLD</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{r.campaignName}</TableCell>
                              <TableCell className="text-center">
                                {r.reach}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.impression}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.leads}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.spend}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-800">
                    Monthly Reports
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-bold text-slate-700">
                            Month
                          </TableHead>
                          <TableHead className="font-bold text-slate-700">
                            Project
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Total Spend (₹)
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Total Leads
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Total Sales
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Total Revenue (₹)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientReportsData.monthly.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-8 text-slate-400 italic"
                            >
                              No monthly reports found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          clientReportsData.monthly.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">
                                {r.month}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col items-start gap-1">
                                  <span>{r.projectName || r.clientName || "N/A"}</span>
                                  {projects.find((p: any) => (p.id === r.projectId || p.clientId === r.clientId))?.status === 'on-hold' && (
                                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 px-1 py-0 shadow-none font-semibold">ON HOLD</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {r.totalSpend}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.totalLeads}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.totalSales}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.totalRevenue}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-brand-teal" />
            Marketing Reports
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track daily performance and monthly ROI metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OtherWorkDialog source="digital-marketing" />
        </div>
      </div>

      {/* Tabs & Search */}
      <Tabs
        defaultValue="daily"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex-1 flex flex-col min-h-0"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger
              value="daily"
              className="px-6 py-2 rounded-md transition-all"
            >
              Daily Reports
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="px-6 py-2 rounded-md transition-all"
            >
              Monthly Reports
            </TabsTrigger>
            <TabsTrigger
              value="clients"
              className="px-6 py-2 rounded-md transition-all"
            >
              Clients
            </TabsTrigger>
          </TabsList>
        </div>

        {activeTab !== "clients" && (
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border shadow-sm mb-6">
            <div className="flex-1 min-w-[200px] max-w-md space-y-1.5">
              <Label className="text-xs text-slate-500">
                Search Campaign, Project or Client
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Filter reports..."
                  className="pl-10 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="w-[200px] space-y-1.5">
              <Label className="text-xs text-slate-500">Filter by Client</Label>
              <Select
                value={selectedClientFilter}
                onValueChange={setSelectedClientFilter}
              >
                <SelectTrigger className="h-9 w-full">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <SelectValue placeholder="All Clients" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeTab === "daily" && (
              <div className="w-[300px] space-y-1.5 flex flex-col gap-1.5">
                <Label className="text-xs text-slate-500">Filter by Date</Label>
                <DateRangePicker 
                  value={dateRange} 
                  onChange={setDateRange} 
                />
              </div>
            )}
            {activeTab === "monthly" && (
              <div className="w-[150px] space-y-1.5">
                <Label className="text-xs text-slate-500">
                  Filter by Month
                </Label>
                <Select
                  value={monthFilter}
                  onValueChange={handleMonthFilterChange}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex self-end pb-[1px]">
              {(selectedClientFilter !== "all" ||
                !(dateRange?.from && isSameDay(dateRange.from, subDays(startOfToday(), 1)) && dateRange?.to && isSameDay(dateRange.to, subDays(startOfToday(), 1))) ||
                searchQuery !== "" ||
                monthFilter !== getLocalMonthString()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 ml-2"
                  onClick={() => {
                    setSelectedClientFilter("all");
                    setDateRange({ from: subDays(startOfToday(), 1), to: subDays(startOfToday(), 1) });
                    setMonthFilter(getLocalMonthString());
                    setSearchQuery("");
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}

        <TabsContent
          value="clients"
          className="mt-0 flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col min-h-0"
        >
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex min-h-0">
            {/* Left Column: Client List */}
            <div className="w-1/3 min-w-[280px] max-w-[350px] border-r border-slate-200 flex flex-col bg-slate-50/50">
              <div className="p-4 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-10 h-9 bg-slate-50 border-transparent focus:bg-white focus:border-brand-teal/30 focus:ring-brand-teal/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-auto flex-1 custom-scrollbar p-3 space-y-2">
                {(() => {
                  const isEmployee = user && !["Admin", "Manager", "HR"].includes(user.role);
                  const filteredClients = clients.filter((c) => {
                    const matchesSearch = c.companyName.toLowerCase().includes(searchQuery.toLowerCase());
                    const hasProject = isEmployee ? projects.some((p: any) => p.clientId === c.id) : true;
                    return matchesSearch && hasProject;
                  });
                  if (filteredClients.length === 0) {
                    return (
                      <div className="text-center py-8 text-sm text-slate-400 italic">
                        No clients found
                      </div>
                    );
                  }
                  // Auto-select first client if none selected
                  if (
                    !selectedClientForCampaigns &&
                    filteredClients.length > 0
                  ) {
                    setTimeout(
                      () =>
                        setSelectedClientForCampaigns(filteredClients[0].id),
                      0,
                    );
                  }

                  return filteredClients.map((client) => {
                    const isSelected = selectedClientForCampaigns === client.id;
                    const activeCount =
                      client.campaigns?.filter((c: any) =>
                        typeof c === "string" ? true : c.isActive,
                      ).length || 0;

                    const clientProjects = projects.filter((p: any) => p.clientId === client.id);
                    const projectNames = clientProjects.map((p: any) => p.title).join(", ");

                    return (
                      <div
                        key={client.id}
                        onClick={() => setSelectedClientForCampaigns(client.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${isSelected ? "bg-white border-brand-teal shadow-sm ring-1 ring-brand-teal/20" : "bg-transparent border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-brand-teal text-white shadow-md shadow-brand-teal/20" : "bg-brand-teal/10 text-brand-teal"}`}
                          >
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <div
                              className={`font-semibold truncate ${isSelected ? "text-brand-teal" : "text-slate-700"}`}
                              title={client.companyName}
                            >
                              {client.companyName}
                            </div>
                            {clientProjects.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {clientProjects.map((p: any) => {
                                  const days = calculateProjectDays(p);
                                  return (
                                    <div key={p.id} className="text-[10px] text-slate-500 truncate max-w-[160px]" title={`${p.title} (${days.active}d active)`}>
                                      <span className="font-medium">{p.title}</span>: 
                                      <span className="text-emerald-600 font-medium ml-1">{days.active}d active</span>
                                      {days.onHold > 0 || p.status === 'on-hold' ? (
                                        <span className="text-amber-600 font-medium ml-1">({days.onHold}d hold)</span>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 mt-0.5">
                              {activeCount} active campaign(s)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column: Campaigns for Selected Client */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {(() => {
                const activeClient = clients.find(
                  (c) => c.id === selectedClientForCampaigns,
                );
                if (!activeClient) {
                  return (
                    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400 bg-slate-50/30">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <p>Select a client to view their campaigns</p>
                    </div>
                  );
                }

                const activeClientProjects = projects.filter((p: any) => p.clientId === activeClient.id);
                const activeProjectNames = activeClientProjects.map((p: any) => p.title).join(", ");

                return (
                  <>
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">
                          {activeClient.companyName}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Manage digital marketing campaigns {activeProjectNames ? `for ${activeProjectNames}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                          onClick={() =>
                            fetchLogs(
                              {
                                id: activeClient.id,
                                companyName: activeClient.companyName,
                              },
                              "client",
                            )
                          }
                        >
                          <History className="w-4 h-4 mr-2" />
                          View Logs
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-brand-teal border-brand-teal hover:bg-brand-teal/5"
                          onClick={() =>
                            handleViewClientReports(activeClient.id)
                          }
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          View Reports
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-slate-50/30">
                      <div className="max-w-3xl space-y-6">
                        {/* Campaigns List */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-teal"></span>
                            Active & Inactive Campaigns
                          </h3>

                          {activeClient.campaigns?.length ? (
                            <div className="space-y-2">
                              {activeClient.campaigns.map((campRaw: any) => {
                                const campName =
                                  typeof campRaw === "string"
                                    ? campRaw
                                    : campRaw.name;
                                const isActive =
                                  typeof campRaw === "string"
                                    ? true
                                    : campRaw.isActive;
                                return (
                                  <div
                                    key={campName}
                                    className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${isActive ? "bg-white border-slate-200 hover:border-brand-teal/30 hover:shadow-sm" : "bg-slate-50 border-slate-100"}`}
                                  >
                                    <div className="flex items-center gap-3.5">
                                      <div
                                        className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-slate-300"}`}
                                      ></div>
                                      <span
                                        className={`font-medium ${!isActive ? "text-slate-400 line-through" : "text-slate-700"}`}
                                      >
                                        {campName}
                                      </span>
                                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500 border border-slate-200">
                                        {typeof campRaw === "object" &&
                                        campRaw.metric
                                          ? campRaw.metric
                                          : "CPL"}
                                      </span>
                                    </div>

                                    {canEditMarketing && (
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`text-xs font-medium ${isActive ? "text-brand-teal" : "text-slate-400"}`}
                                          >
                                            {isActive ? "Active" : "Inactive"}
                                          </span>
                                          <Switch
                                            checked={isActive}
                                            onCheckedChange={() =>
                                              handleToggleCampaignStatus(
                                                activeClient.id,
                                                campName,
                                              )
                                            }
                                            className={
                                              isActive
                                                ? "data-[state=checked]:bg-brand-teal"
                                                : ""
                                            }
                                          />
                                        </div>
                                        <button
                                          onClick={() =>
                                            handleRemoveCampaign(
                                              activeClient.id,
                                              campName,
                                            )
                                          }
                                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                          title="Remove Campaign"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                              <span className="text-sm text-slate-400">
                                No campaigns found for this client.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Add New Campaign */}
                        {canAddMarketing && (
                          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                              <Plus className="w-4 h-4 text-brand-teal" />
                              Add New Campaign
                            </h3>
                            <div className="flex items-center gap-3">
                              <div className="relative flex-1 flex gap-2">
                                <Input
                                  placeholder="Enter campaign name..."
                                  className="h-11 flex-1 bg-slate-50 border-slate-200 focus:bg-white focus:border-brand-teal focus:ring-brand-teal/20 transition-all rounded-lg"
                                  value={newCampaignName[activeClient.id] || ""}
                                  onChange={(e) =>
                                    setNewCampaignName((prev) => ({
                                      ...prev,
                                      [activeClient.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleAddCampaign(activeClient.id);
                                  }}
                                />
                                <Select
                                  value={
                                    newCampaignMetric[activeClient.id] || "CPL"
                                  }
                                  onValueChange={(val) =>
                                    setNewCampaignMetric((prev) => ({
                                      ...prev,
                                      [activeClient.id]: val,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-24 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-brand-teal focus:ring-brand-teal/20">
                                    <SelectValue placeholder="Metric" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CPL">CPL</SelectItem>
                                    <SelectItem value="CPR">CPR</SelectItem>
                                    <SelectItem value="CPC">CPC</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                className="h-11 px-6 rounded-lg bg-brand-teal hover:bg-teal-700 text-white font-medium shadow-md shadow-brand-teal/20"
                                onClick={() =>
                                  handleAddCampaign(activeClient.id)
                                }
                                disabled={isActiveClientOnHold}
                                title={isActiveClientOnHold ? "Cannot add campaigns to on-hold clients" : ""}
                              >
                                Create Campaign
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="daily"
          className="mt-0 flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col min-h-0"
        >
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <DragDropContext onDragEnd={handleDragEndDaily}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-12 text-center font-bold text-slate-700"></TableHead>
                      <TableHead className="w-12 text-center font-bold text-slate-700">
                        S.N
                      </TableHead>
                      <TableHead className="font-bold text-slate-700">
                        Date
                      </TableHead>
                      <TableHead className="font-bold text-slate-700">
                        Project
                      </TableHead>
                      <TableHead className="font-bold text-slate-700">
                        Campaign Name
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Reach
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Impressions
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Leads
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Revenue (₹)
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Followers
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Spend (₹)
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Cost Metric (₹)
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Optimization
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Remarks
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <Droppable droppableId="daily-reports">
                    {(provided) => (
                      <TableBody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={15}
                              className="text-center py-20"
                            >
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                              <p className="mt-2 text-slate-500">
                                Loading daily reports...
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {/* Integrated Quick Add Row Removed as per user request */}

                            {filteredDaily.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={15}
                                  className="text-center py-20 text-slate-400 italic"
                                >
                                  No daily reports found.
                                </TableCell>
                              </TableRow>
                            ) : (
                              (() => {
                                let globalDragIndex = 0;
                                return Object.entries(
                                  groupedPaginatedDaily,
                                ).map(
                                  ([clientName, reports]: [string, any[]]) => {
                                    const groupTotals = reports.reduce(
                                      (acc: any, curr: any) => ({
                                        reach: acc.reach + (curr.reach || 0),
                                        impression:
                                          acc.impression +
                                          (curr.impression || 0),
                                        leads: acc.leads + (curr.leads || 0),
                                        revenue:
                                          acc.revenue + (curr.revenue || 0),
                                        followers:
                                          acc.followers + (curr.followers || 0),
                                        spend: acc.spend + (curr.spend || 0),
                                      }),
                                      {
                                        reach: 0,
                                        impression: 0,
                                        leads: 0,
                                        revenue: 0,
                                        followers: 0,
                                        spend: 0,
                                      },
                                    );

                                    return (
                                      <React.Fragment key={clientName}>
                                        {reports.map((report: any) => {
                                          const dragIndex = globalDragIndex++;
                                          const globalIdx =
                                            filteredDaily.findIndex(
                                              (r) =>
                                                String(r.id) ===
                                                String(report.id),
                                            ) + 1;
                                          return (
                                            <Draggable
                                              key={String(report.id)}
                                              draggableId={String(report.id)}
                                              index={dragIndex}
                                            >
                                              {(provided) => (
                                                <TableRow
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  className="hover:bg-slate-50/50"
                                                >
                                                  <TableCell className="text-center w-8">
                                                    <div
                                                      {...provided.dragHandleProps}
                                                      className="cursor-grab hover:text-brand-teal text-slate-400"
                                                    >
                                                      <GripVertical className="w-4 h-4 mx-auto" />
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-center text-slate-400">
                                                    {globalIdx}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`font-medium ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        type="date"
                                                        className="h-8 text-xs outline-none"
                                                        value={normalizeDate(
                                                          editFormData.date,
                                                        )}
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            date: e.target
                                                              .value,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      normalizeDate(report.date)
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`font-semibold text-slate-600 ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Select
                                                        onValueChange={(v) => {
                                                          const project = projects.find(p => p.id === v);
                                                          if (project) {
                                                            setEditFormData({
                                                              ...editFormData,
                                                              projectId: project.id,
                                                              projectName: project.title,
                                                              clientId: project.clientId,
                                                              clientName: project.clientName,
                                                            });
                                                          }
                                                        }}
                                                        value={editFormData.projectId || ""}
                                                      >
                                                        <SelectTrigger className="h-8 text-xs">
                                                          <SelectValue placeholder="Select Project" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {projects.map((p) => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                              {p.title} {p.clientName ? `(${p.clientName})` : ''}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                    ) : (
                                                      <div className="flex flex-col items-start gap-1">
                                                        <span>{report.projectName || "N/A"}</span>
                                                        {projects.find((p: any) => p.id === report.projectId)?.status === 'on-hold' && (
                                                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 px-1 py-0 shadow-none font-semibold">ON HOLD</Badge>
                                                        )}
                                                      </div>
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={
                                                      canEditMarketing
                                                        ? "cursor-text hover:bg-slate-50"
                                                        : ""
                                                    }
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Select
                                                        onValueChange={(v) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            campaignName: v,
                                                          })
                                                        }
                                                        value={
                                                          editFormData.campaignName ||
                                                          ""
                                                        }
                                                      >
                                                        <SelectTrigger className="h-8 text-xs outline-none">
                                                          <SelectValue placeholder="Select Campaign" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {clients
                                                            .find(
                                                              (c) =>
                                                                c.id ===
                                                                (editFormData.clientId ||
                                                                  report.clientId),
                                                            )
                                                            ?.campaigns?.filter(
                                                              (c: any) =>
                                                                typeof c ===
                                                                "string"
                                                                  ? true
                                                                  : c.isActive,
                                                            )
                                                            .map((c: any) => {
                                                              const name =
                                                                typeof c ===
                                                                "string"
                                                                  ? c
                                                                  : c.name;
                                                              return (
                                                                <SelectItem
                                                                  key={name}
                                                                  value={name}
                                                                >
                                                                  {name}
                                                                </SelectItem>
                                                              );
                                                            })}
                                                        </SelectContent>
                                                      </Select>
                                                    ) : (
                                                      report.campaignName
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        type="number"
                                                        className="h-8 text-xs text-center outline-none"
                                                        value={
                                                          editFormData.reach ??
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            reach:
                                                              parseInt(
                                                                e.target.value,
                                                              ) || 0,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      report.reach.toLocaleString()
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        type="number"
                                                        className="h-8 text-xs text-center outline-none"
                                                        value={
                                                          editFormData.impression ??
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            impression:
                                                              parseInt(
                                                                e.target.value,
                                                              ) || 0,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      report.impression.toLocaleString()
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        type="number"
                                                        className="h-8 text-xs text-center outline-none"
                                                        value={
                                                          editFormData.leads ??
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            leads:
                                                              parseInt(
                                                                e.target.value,
                                                              ) || 0,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      report.leads
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center font-semibold text-brand-teal ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-8 text-xs text-center outline-none"
                                                        value={
                                                          editFormData.revenue ??
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            revenue:
                                                              parseFloat(
                                                                e.target.value,
                                                              ) || 0,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      `₹${(report.revenue || 0).toLocaleString()}`
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        type="number"
                                                        className="h-8 text-xs text-center outline-none"
                                                        value={
                                                          editFormData.followers ??
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            followers:
                                                              parseInt(
                                                                e.target.value,
                                                              ) || 0,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      report.followers || 0
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center font-semibold text-brand-teal ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-8 text-xs text-center outline-none"
                                                        value={
                                                          editFormData.spend ??
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            spend:
                                                              parseFloat(
                                                                e.target.value,
                                                              ) || 0,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      `₹${report.spend.toFixed(2)}`
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-8 text-xs text-center outline-none"
                                                        value={
                                                          editFormData.cpl ?? ""
                                                        }
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            cpl:
                                                              parseFloat(
                                                                e.target.value,
                                                              ) || 0,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      `₹${report.cpl.toFixed(2)}`
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center ${canEditMarketing ? "cursor-pointer hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Select
                                                        value={editFormData.campaignOptimization ? "yes" : "no"}
                                                        onValueChange={(val) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            campaignOptimization: val === "yes",
                                                          })
                                                        }
                                                      >
                                                        <SelectTrigger className="h-8 text-xs">
                                                          <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="yes">Yes</SelectItem>
                                                          <SelectItem value="no">No</SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                    ) : (
                                                      report.campaignOptimization ? "Yes" : "No"
                                                    )}
                                                  </TableCell>

                                                  <TableCell
                                                    className={`text-center ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        className="h-8 text-xs text-center outline-none"
                                                        value={
                                                          editFormData.remarks ||
                                                          ""
                                                        }
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            remarks:
                                                              e.target.value,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      report.remarks || "-"
                                                    )}
                                                  </TableCell>

                                                  <TableCell className="text-center">
                                                    <div className="flex justify-center gap-1">
                                                      {editingRowId ===
                                                      report.id ? (
                                                        <>
                                                          <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 text-emerald-600 hover:bg-emerald-50"
                                                            onClick={() =>
                                                              saveRowEdit(
                                                                report.id,
                                                                "daily",
                                                              )
                                                            }
                                                            disabled={
                                                              isSavingRow
                                                            }
                                                          >
                                                            {isSavingRow ? (
                                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                              <Check className="w-3.5 h-3.5" />
                                                            )}
                                                          </Button>
                                                          <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 text-slate-400 hover:bg-slate-100"
                                                            onClick={() =>
                                                              setEditingRowId(
                                                                null,
                                                              )
                                                            }
                                                          >
                                                            <X className="w-3.5 h-3.5" />
                                                          </Button>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                                            onClick={() =>
                                                              fetchLogs(
                                                                report,
                                                                "daily",
                                                              )
                                                            }
                                                          >
                                                            <History className="w-4 h-4" />
                                                          </Button>

                                                          {canDeleteMarketing && (
                                                            <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                              onClick={() =>
                                                                handleDelete(
                                                                  report.id,
                                                                  "daily",
                                                                )
                                                              }
                                                            >
                                                              <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                          )}
                                                        </>
                                                      )}
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              )}
                                            </Draggable>
                                          );
                                        })}
                                        {/* Subtotal row for the group */}
                                        <TableRow className="bg-slate-50/80 font-medium">
                                          <TableCell
                                            colSpan={5}
                                            className="text-right text-slate-600"
                                          >
                                            Total
                                          </TableCell>
                                          <TableCell className="text-center text-slate-600">
                                            {groupTotals.reach.toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-center text-slate-600">
                                            {groupTotals.impression.toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-center text-slate-600">
                                            {groupTotals.leads.toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-center font-semibold text-brand-teal">
                                            ₹
                                            {(
                                              groupTotals.revenue || 0
                                            ).toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-center text-slate-600">
                                            {groupTotals.followers.toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-center text-brand-teal">
                                            ₹
                                            {groupTotals.spend.toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-center font-semibold text-rose-500">
                                            ₹
                                            {(groupTotals.leads > 0
                                              ? groupTotals.spend /
                                                groupTotals.leads
                                              : 0
                                            ).toLocaleString(undefined, {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}
                                          </TableCell>
                                          <TableCell colSpan={3}></TableCell>
                                        </TableRow>
                                      </React.Fragment>
                                    );
                                  },
                                );
                              })()
                            )}
                          </>
                        )}
                        {provided.placeholder}
                      </TableBody>
                    )}
                  </Droppable>
                  {filteredDaily.length > 0 && (
                    <tfoot className="sticky bottom-0 z-20 bg-brand-teal/10 border-t-2 border-brand-teal/20 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={5}
                          className="text-right font-bold text-slate-900"
                        >
                          Grand Total
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900">
                          {dailyTotals.reach.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900">
                          {dailyTotals.impression.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900">
                          {dailyTotals.leads.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold text-brand-teal">
                          ₹{(dailyTotals.revenue || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900">
                          {dailyTotals.followers.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold text-brand-teal">
                          ₹{dailyTotals.spend.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold text-rose-500">
                          ₹
                          {(dailyTotals.leads > 0
                            ? dailyTotals.spend / dailyTotals.leads
                            : 0
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </tfoot>
                  )}
                </Table>
              </DragDropContext>
            </div>
            <TablePagination
              totalItems={filteredDaily.length}
              itemsPerPage={dailyItemsPerPage}
              currentPage={dailyPage}
              onPageChange={setDailyPage}
              onItemsPerPageChange={setDailyItemsPerPage}
              itemName="daily reports"
            />
          </div>
        </TabsContent>
        <TabsContent
          value="monthly"
          className="mt-0 flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col min-h-0"
        >
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <DragDropContext onDragEnd={handleDragEndMonthly}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-12 text-center font-bold text-slate-700"></TableHead>
                      <TableHead className="w-12 text-center font-bold text-slate-700">
                        S.N
                      </TableHead>
                      <TableHead className="font-bold text-slate-700">
                        Project Name
                      </TableHead>
                      <TableHead className="font-bold text-slate-700 text-center">
                        Month
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Total Spend
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Total Leads
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Avg CPR
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Total Revenue
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Overall ROAS
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700 min-w-[150px]">
                        Employee POV
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700 min-w-[150px]">
                        Admin POV
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700 min-w-[150px]">
                        Client POV
                      </TableHead>
                      <TableHead className="text-center font-bold text-slate-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <Droppable droppableId="monthly-reports">
                    {(provided) => (
                      <TableBody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="text-center py-20"
                            >
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                              <p className="mt-2 text-slate-500">
                                Loading monthly reports...
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {filteredMonthly.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={11}
                                  className="text-center py-20 text-slate-400 italic"
                                >
                                  No monthly reports found.
                                </TableCell>
                              </TableRow>
                            ) : (
                              paginatedMonthly.map((report, idx) => (
                                <Draggable
                                  key={String(report.id)}
                                  draggableId={String(report.id)}
                                  index={idx}
                                >
                                  {(provided) => (
                                    <TableRow
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="hover:bg-slate-50/50"
                                    >
                                      <TableCell className="text-center w-8">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="cursor-grab hover:text-brand-teal text-slate-400"
                                        >
                                          <GripVertical className="w-4 h-4 mx-auto" />
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center text-slate-400">
                                        {(monthlyPage - 1) *
                                          monthlyItemsPerPage +
                                          idx +
                                          1}
                                      </TableCell>

                                      <TableCell className="font-medium text-slate-800">
                                        <div className="flex flex-col items-start gap-1">
                                          <span>{report.projectName || report.clientName || "Unknown"}</span>
                                          {projects.find((p: any) => (p.id === report.projectId || p.clientId === report.clientId))?.status === 'on-hold' && (
                                            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 px-1 py-0 shadow-none font-semibold">ON HOLD</Badge>
                                          )}
                                        </div>
                                      </TableCell>

                                      {/* Month Field */}
                                      <TableCell className="text-center">
                                        {report.month || "Unknown"}
                                      </TableCell>

                                      {/* Total Spend Field */}
                                      <TableCell className="text-center">
                                        ₹
                                        {(
                                          Number(report.totalSpend) || 0
                                        ).toLocaleString()}
                                      </TableCell>

                                      {/* Total Leads Field */}
                                      <TableCell className="text-center">
                                        {(
                                          Number(report.totalLeads) || 0
                                        ).toLocaleString()}
                                      </TableCell>

                                      {/* Avg CPR Field */}
                                      <TableCell className="text-center">
                                        ₹
                                        {(Number(report.avgCPR) || 0).toFixed(
                                          2,
                                        )}
                                      </TableCell>

                                      {/* Total Revenue Field */}
                                      <TableCell className="text-center font-bold text-brand-teal">
                                        ₹
                                        {(
                                          Number(report.totalRevenue) || 0
                                        ).toLocaleString()}
                                      </TableCell>

                                      {/* ROAS Field */}
                                      <TableCell className="text-center">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-bold ${(Number(report.overallROAS) || 0) > 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                                        >
                                          {(
                                            Number(report.overallROAS) || 0
                                          ).toFixed(2)}
                                          x
                                        </span>
                                      </TableCell>

                                      {/* Conclusion Fields */}
                                      {['employeeConclusion', 'adminConclusion', 'clientConclusion'].map((povField) => {
                                        const isEmpPOV = povField === 'employeeConclusion';
                                        const isAssignedEmp = isEmployee && projects.some((p: any) => p.clientId === report.clientId && p.assignedEmployeeId === user?.id);
                                        const canEditThisPOV = isAdmin || (isEmpPOV && isAssignedEmp);

                                        return (
                                        <TableCell
                                          key={povField}
                                          className={`text-sm text-slate-500 italic max-w-[200px] truncate ${canEditThisPOV ? "cursor-text hover:bg-slate-50" : ""}`}
                                          onClick={() => {
                                            if (canEditThisPOV) {
                                              setInlineEditing({
                                                id: report.id,
                                                field: povField,
                                              });
                                            }
                                          }}
                                        >
                                          {inlineEditing?.id === report.id &&
                                          inlineEditing?.field === povField ? (
                                            <Input
                                              autoFocus
                                              className="h-8 text-xs outline-none"
                                              defaultValue={report[povField as keyof typeof report] as string}
                                              onBlur={(e) =>
                                                handleInlineUpdate(
                                                  report.id,
                                                  povField,
                                                  e.target.value,
                                                  "monthly",
                                                )
                                              }
                                              onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                handleInlineUpdate(
                                                  report.id,
                                                  povField,
                                                  e.currentTarget.value,
                                                  "monthly",
                                                )
                                              }
                                            />
                                          ) : (
                                            (report[povField as keyof typeof report] as string) || "-"
                                          )}
                                        </TableCell>
                                        );
                                      })}

                                      <TableCell className="text-center">
                                        <div className="flex justify-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                            onClick={() =>
                                              fetchLogs(report, "monthly")
                                            }
                                          >
                                            <History className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </Draggable>
                              ))
                            )}
                          </>
                        )}
                        {provided.placeholder}
                      </TableBody>
                    )}
                  </Droppable>
                  {filteredMonthly.length > 0 && (
                    <tfoot className="sticky bottom-0 z-20 bg-brand-teal/10 border-t-2 border-brand-teal/20 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={4}
                          className="text-right font-bold text-slate-900"
                        >
                          Total
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900">
                          ₹{monthlyTotals.totalSpend.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900">
                          {monthlyTotals.totalLeads.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-bold text-rose-500">
                          ₹
                          {(monthlyTotals.totalLeads > 0
                            ? monthlyTotals.totalSpend /
                              monthlyTotals.totalLeads
                            : 0
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-center font-bold text-brand-teal">
                          ₹{monthlyTotals.totalRevenue.toLocaleString()}
                        </TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    </tfoot>
                  )}
                </Table>
              </DragDropContext>
            </div>
            <TablePagination
              totalItems={filteredMonthly.length}
              itemsPerPage={monthlyItemsPerPage}
              currentPage={monthlyPage}
              onPageChange={setMonthlyPage}
              onItemsPerPageChange={setMonthlyItemsPerPage}
              itemName="monthly reports"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Daily Report Modal */}
      <Dialog open={isDailyModalOpen} onOpenChange={setIsDailyModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? "Edit" : "Add"} Daily Marketing Report
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDailySubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dailyFormData.date}
                  onChange={(e) =>
                    setDailyFormData({ ...dailyFormData, date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Select
                  value={dailyFormData.projectId}
                  onValueChange={(v) => {
                    const project = projects.find(p => p.id === v);
                    if (project) {
                      setDailyFormData({
                        ...dailyFormData,
                        projectId: project.id,
                        projectName: project.title,
                        clientId: project.clientId,
                        clientName: project.clientName,
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title} {project.clientName ? `(${project.clientName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  placeholder="e.g. Awareness Model View"
                  value={dailyFormData.campaignName}
                  onChange={(e) =>
                    setDailyFormData({
                      ...dailyFormData,
                      campaignName: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Reach</Label>
                <Input
                  type="number"
                  value={dailyFormData.reach}
                  onChange={(e) =>
                    setDailyFormData({
                      ...dailyFormData,
                      reach: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Impressions</Label>
                <Input
                  type="number"
                  value={dailyFormData.impression}
                  onChange={(e) =>
                    setDailyFormData({
                      ...dailyFormData,
                      impression: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Leads</Label>
                <Input
                  type="number"
                  value={dailyFormData.leads}
                  onChange={(e) =>
                    setDailyFormData({
                      ...dailyFormData,
                      leads: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Spend (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dailyFormData.spend}
                  onChange={(e) =>
                    setDailyFormData({
                      ...dailyFormData,
                      spend: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cost Metric (CPL/CPR/CPC) (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dailyFormData.cpl}
                  onChange={(e) =>
                    setDailyFormData({
                      ...dailyFormData,
                      cpl: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Followers</Label>
                <Input
                  type="number"
                  value={dailyFormData.followers}
                  onChange={(e) =>
                    setDailyFormData({
                      ...dailyFormData,
                      followers: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Optimization</Label>
                <Select
                  value={dailyFormData.campaignOptimization ? "yes" : "no"}
                  onValueChange={(val) =>
                    setDailyFormData({
                      ...dailyFormData,
                      campaignOptimization: val === "yes",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input
                  placeholder="e.g. High impression campaign"
                  value={dailyFormData.remarks || ""}
                  onChange={(e) =>
                    setDailyFormData({
                      ...dailyFormData,
                      remarks: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-brand-teal text-white w-full">
                Save Daily Report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Monthly Report Modal */}
      <Dialog open={isMonthlyModalOpen} onOpenChange={setIsMonthlyModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? "Edit" : "Add"} Monthly Marketing Summary
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMonthlySubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Select
                  value={monthlyFormData.projectId}
                  onValueChange={(v) => {
                    const project = projects.find(p => p.id === v);
                    if (project) {
                      setMonthlyFormData({
                        ...monthlyFormData,
                        projectId: project.id,
                        projectName: project.title,
                        clientId: project.clientId,
                        clientName: project.clientName || "",
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title} {project.clientName ? `(${project.clientName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select
                  value={monthlyFormData.month}
                  onValueChange={(v) =>
                    setMonthlyFormData({ ...monthlyFormData, month: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Spend</Label>
                <Input
                  type="number"
                  value={monthlyFormData.totalSpend}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      totalSpend: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Total Leads</Label>
                <Input
                  type="number"
                  value={monthlyFormData.totalLeads}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      totalLeads: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Total Sales</Label>
                <Input
                  type="number"
                  value={monthlyFormData.totalSales}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      totalSales: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Avg CPR</Label>
                <Input
                  type="number"
                  value={monthlyFormData.avgCPR}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      avgCPR: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Avg CPP</Label>
                <Input
                  type="number"
                  value={monthlyFormData.avgCPP}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      avgCPP: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Total Revenue</Label>
                <Input
                  type="number"
                  value={monthlyFormData.totalRevenue}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      totalRevenue: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Overall ROAS</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={monthlyFormData.overallROAS}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      overallROAS: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Employee POV</Label>
                <Input
                  placeholder="e.g. Completed requested tasks efficiently."
                  value={monthlyFormData.employeeConclusion || ""}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      employeeConclusion: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Admin POV</Label>
                <Input
                  placeholder="e.g. Budget utilized properly."
                  value={monthlyFormData.adminConclusion || ""}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      adminConclusion: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Client POV</Label>
                <Input
                  placeholder="e.g. Happy with the overall performance."
                  value={monthlyFormData.clientConclusion || ""}
                  onChange={(e) =>
                    setMonthlyFormData({
                      ...monthlyFormData,
                      clientConclusion: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-brand-teal text-white w-full">
                Save Monthly Summary
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
