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
  Activity,
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
  Upload,
  FileSpreadsheet,
  FileX,
  Settings,
  Maximize,
  Minimize,
  ArrowLeftRight,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { startOfToday, subDays, format, isSameDay, differenceInDays, parseISO, isAfter, startOfDay } from "date-fns";
import { OtherWorkDialog } from "@/components/hrms/OtherWorkDialog";
import { PendingWorkEmbedded } from "@/components/hrms/PendingWorkEmbedded";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";
import { DailyProgressView } from "@/components/hrms/DailyProgressView";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

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

  const hasFullDMAccess = React.useMemo(() => {
    if (!user) return false;
    const r = (user.role || "").toLowerCase();
    const d = (user.designation || "").toLowerCase();
    const fullRoles = ["admin", "manager", "social media manager", "smm", "director", "head", "super admin", "digital marketer", "digital marketing", "hr"];
    if (fullRoles.includes(r) || fullRoles.includes(d) || r.includes("social media") || d.includes("social media") || r.includes("digital marketing") || d.includes("digital marketing")) {
      return true;
    }
    const perms = (user as any).permissions || [];
    const dmPerms = ["projects", "smm", "clients", "digital-marketing", "work-management", "marketing"];
    return perms.some((p: any) => dmPerms.includes(p.moduleName) && (p.canView || p.canEdit || p.canAdd));
  }, [user]);

  const isEmployee = user && !["Admin", "Manager", "HR"].includes(user.role) && !hasFullDMAccess;
  const isRegularEmployee = !user || !(['admin', 'super admin', 'superadmin', 'team leader'].includes(user.role?.toLowerCase() || '') || user.designation?.toLowerCase() === 'team leader');

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
  const [projectRemarks, setProjectRemarks] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(true);
  const [editingRemarks, setEditingRemarks] = useState<string[]>([]);

  const handleUpdateProjectRemark = async (projectId: string, dateStr: string, remark: string, clientId?: string) => {
    try {
      const res = await fetch(`${API_URL}/marketing/project-remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          date: dateStr,
          remark,
          clientId
        })
      });
      if (res.ok) {
        const saved = await res.json();
        setProjectRemarks(prev => {
          const filtered = prev.filter(p => !(p.projectId === projectId && p.date === dateStr));
          return [...filtered, { ...saved, isDirty: false }];
        });
        
        // Save detailed task log
        await fetch(`${API_URL}/task-logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Daily Follow-up Completed",
            details: `For Date: ${dateStr} - Remark: ${remark}`,
            projectId: projectId,
            clientId: clientId,
            performedBy: user?.id || user?._id,
            userName: user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown User",
          })
        });

        toast.success("Daily follow-up saved");
      } else {
        toast.error("Failed to save follow-up");
      }
    } catch (err) {
      console.error("Failed to update remark:", err);
      toast.error("An error occurred while saving follow-up");
    }
  };
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(startOfToday(), 1),
    to: subDays(startOfToday(), 1)
  });

  const analysisStats = React.useMemo(() => {
    let filtered = dailyReports.filter(r => !r.isDeleted);
    if (dateRange?.from) {
      filtered = filtered.filter(r => new Date(r.date) >= dateRange.from!);
    }
    if (dateRange?.to) {
      filtered = filtered.filter(r => new Date(r.date) <= dateRange.to!);
    }

    let totalSpend = 0;
    let totalLeads = 0;
    let totalRevenue = 0;
    
    const dailyDataMap: Record<string, any> = {};
    const employeeDataMap: Record<string, any> = {};
    const projectDataMap: Record<string, any> = {};

    filtered.forEach(r => {
      const spend = Number(r.spend) || 0;
      const leads = Number(r.leads) || 0;
      const revenue = Number(r.revenue) || 0;
      
      totalSpend += spend;
      totalLeads += leads;
      totalRevenue += revenue;

      const d = r.date;
      if(!dailyDataMap[d]) dailyDataMap[d] = { date: d, spend: 0, leads: 0, revenue: 0 };
      dailyDataMap[d].spend += spend;
      dailyDataMap[d].leads += leads;
      dailyDataMap[d].revenue += revenue;

      const emp = r.userName || 'Unknown User';
      if(!employeeDataMap[emp]) employeeDataMap[emp] = { name: emp, spend: 0, leads: 0, revenue: 0 };
      employeeDataMap[emp].spend += spend;
      employeeDataMap[emp].leads += leads;
      employeeDataMap[emp].revenue += revenue;

      const proj = r.projectName || 'Unknown Project';
      if(!projectDataMap[proj]) projectDataMap[proj] = { name: proj, spend: 0, leads: 0, revenue: 0 };
      projectDataMap[proj].spend += spend;
      projectDataMap[proj].leads += leads;
      projectDataMap[proj].revenue += revenue;
    });

    const dailyTrends = Object.values(dailyDataMap).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const employeeStats = Object.values(employeeDataMap).sort((a,b) => b.revenue - a.revenue);
    const projectStats = Object.values(projectDataMap).sort((a,b) => b.revenue - a.revenue);

    return {
      totalSpend, totalLeads, totalRevenue, roas: totalSpend > 0 ? (totalRevenue / totalSpend) : 0,
      dailyTrends, employeeStats, projectStats
    };
  }, [dailyReports, dateRange]);
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
  const [selectedLeadsIds, setSelectedLeadsIds] = useState<string[]>([]);

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
  const [selectedClientFilter, setSelectedClientFilter] = useState("");
  // Pagination State
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyItemsPerPage, setDailyItemsPerPage] = useState(10);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [monthlyItemsPerPage, setMonthlyItemsPerPage] = useState(10);

  const [monthFilter, setMonthFilter] = useState<string[]>([getLocalMonthString()]);

  const handleMonthFilterChange = (val: string) => {
    setMonthFilter([val]);
  };
  const [newCampaignName, setNewCampaignName] = useState<{
    [key: string]: string;
  }>({});
  const [newCampaignMetric, setNewCampaignMetric] = useState<{
    [key: string]: string;
  }>({});

  const [dailyMetricsProject, setDailyMetricsProject] = useState<any>(null);
  const [dailyMetricsOpen, setDailyMetricsOpen] = useState(false);
  const [isDailyFullScreen, setIsDailyFullScreen] = useState(false);
  const [taskFilterType, setTaskFilterType] = useState<"my" | "all">("all");
  const [dailyMetricsData, setDailyMetricsData] = useState({
    revenue: 0,
    followers: 0,
    userRemark: "",
    clientRemark: "",
    remark: ""
  });
  const [projectEndDate, setProjectEndDate] = useState<string>("");
  const [isSavingDailyMetrics, setIsSavingDailyMetrics] = useState(false);
  
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferringProject, setTransferringProject] = useState<any>(null);
  const [selectedReceiverId, setSelectedReceiverId] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [transferRequests, setTransferRequests] = useState<any[]>([]);
  const [isSendingTransfer, setIsSendingTransfer] = useState(false);

  const acceptedTransfers = React.useMemo(() => {
    return transferRequests.filter(r => r.status === 'Accepted');
  }, [transferRequests]);

  const isUserAuthorizedForReport = (report: any) => {
    if (isAdmin || checkPermission("marketing", "canEdit")) return true;
    if (!user) return false;
    const proj = projects.find(p => String(p.id) === String(report.projectId));
    if (!proj) return false;
    const isOriginalAssignee = proj.assignedEmployeeId === user.id;
    const isTransferredToMe = acceptedTransfers.some(t => 
      String(t.taskId) === String(report.projectId) && 
      normalizeDate(t.stage) === normalizeDate(report.date) && 
      t.receiverId === user.id
    );
    const isTransferredToSomeoneElse = acceptedTransfers.some(t => 
      String(t.taskId) === String(report.projectId) && 
      normalizeDate(t.stage) === normalizeDate(report.date) && 
      t.receiverId !== user.id
    );
    return (isOriginalAssignee && !isTransferredToSomeoneElse) || isTransferredToMe;
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const fetchTransferRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/work-transfer-requests?taskType=digital-marketing`);
      if (res.ok) {
        setTransferRequests(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch transfer requests", err);
    }
  };

  const handleSendTransferRequest = async () => {
    if (!selectedReceiverId) {
      toast.error("Please select an employee to transfer this work to.");
      return;
    }
    if (!transferDate) {
      toast.error("Please select a date for the transfer.");
      return;
    }
    const receiver = employees.find((e: any) => e.id === selectedReceiverId);
    if (!receiver) {
      toast.error("Selected employee not found.");
      return;
    }
    const existing = transferRequests.find(r => 
      String(r.taskId) === String(transferringProject.id) && 
      normalizeDate(r.stage) === normalizeDate(transferDate) && 
      r.status !== 'Rejected'
    );
    if (existing) {
      toast.error(`A transfer request is already ${existing.status.toLowerCase()} for this date.`);
      return;
    }
    setIsSendingTransfer(true);
    try {
      const response = await fetch(`${API_URL}/work-transfer-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: transferringProject.id,
          taskType: "digital-marketing",
          taskName: transferringProject.title,
          stage: transferDate,
          senderId: user?.id || user?._id || "",
          senderName: user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown User",
          receiverId: receiver.id,
          receiverName: `${receiver.firstName} ${receiver.lastName || ''}`.trim(),
        }),
      });
      if (response.ok) {
        toast.success("Transfer request sent successfully.");
        setIsTransferModalOpen(false);
        setSelectedReceiverId("");
        setTransferDate("");
        fetchTransferRequests();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed to send transfer request.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send transfer request.");
    } finally {
      setIsSendingTransfer(false);
    }
  };

  const fetchDailyMetricsData = async (projectId: string, dateStr: string) => {
    try {
      const res = await fetch(`${API_URL}/marketing/project-remarks?projectId=${projectId}&startDate=${dateStr}&endDate=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const m = data[0];
          setDailyMetricsData({
            revenue: m.revenue || 0,
            followers: m.followers || 0,
            userRemark: m.userRemark || "",
            clientRemark: m.clientRemark || "",
            remark: m.remark || ""
          });
        } else {
          setDailyMetricsData({ revenue: 0, followers: 0, userRemark: "", clientRemark: "", remark: "" });
        }
      }
    } catch (error) {
      console.error("Failed to fetch daily metrics", error);
    }
  };

  const handleSaveDailyMetrics = async () => {
    if (!dailyMetricsProject || !dateRange?.from) return;
    setIsSavingDailyMetrics(true);
    try {
      const dateStr = format(dateRange.from, "yyyy-MM-dd");
      const res = await fetch(`${API_URL}/marketing/project-remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: dailyMetricsProject.id,
          clientId: dailyMetricsProject.clientId,
          date: dateStr,
          revenue: dailyMetricsData.revenue,
          followers: dailyMetricsData.followers,
          userRemark: dailyMetricsData.userRemark,
          clientRemark: dailyMetricsData.clientRemark,
          remark: dailyMetricsData.remark
        })
      });
      if (res.ok) {
        toast.success("Daily metrics saved successfully");
        setDailyMetricsOpen(false);
        fetchData();
        fetchClients();
      } else {
        toast.error("Failed to save metrics");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving metrics");
    } finally {
      setIsSavingDailyMetrics(false);
    }
  };

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
      { name: name.trim(), isActive: true, metric, createdAt: new Date().toISOString() },
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
    clientName: "",
    reach: 0,
    impression: 0,
    leads: 0,
    followers: 0,
    spend: 0,
    cpl: 0,
    remarks: "",
    leadsFileUrl: "",
    campaignOptimization: false,
  });

  const [quickAddData, setQuickAddData] = useState({
    date: "",
    projectId: "",
    projectName: "",
    campaignName: "",
    reach: 0,
    impression: 0,
    leads: 0,
    spend: 0,
    cpl: 0,
    remarks: "",
    leadsFileUrl: "",
  });
  const [isQuickAdding, setIsQuickAdding] = useState(false);

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

  const fetchedDateRef = useRef<string>("");

  useEffect(() => {
    if (permissionsLoading || userLoading || !canViewMarketing) return;
    fetchData();
    fetchClients();
    fetchProjects();
    fetchEmployees();
    fetchTransferRequests();
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
      const [res, sysSetRes] = await Promise.all([
        fetch(`${API_URL}/clients${userParams}`),
        fetch(`${API_URL}/system-settings`)
      ]);
      
      if (res.ok) {
        const data = await res.json();
        setClients(
          data.filter(
            (c: any) => {
              if (!c.department) return false;
              const depts = c.department.split(',').map((d: string) => d.trim().toLowerCase());
              return depts.includes("marketing") || depts.includes("digital marketing");
            }
          ),
        );
      }
      
      if (sysSetRes && sysSetRes.ok) {
        setSystemSettings(await sysSetRes.json());
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(
          data.filter(
            (p: any) => p.department && p.department.trim().toLowerCase() === "digital marketing"
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
        activeTab === "daily" || activeTab === "analysis"
          ? "/marketing/reports/daily"
          : "/marketing/reports/monthly";
      const params = new URLSearchParams();
      if (selectedClientFilter !== "all" && selectedClientFilter !== "")
        params.append("client_id", selectedClientFilter);
      if (user) {
        params.append("userId", user.id);
        params.append("role", user.role);
      }
      if (activeTab === "daily" || activeTab === "analysis") {
        if (dateRange?.from) {
          const startStr = format(dateRange.from, "yyyy-MM-dd");
          const endStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startStr;
          params.append("start_date", startStr);
          params.append("end_date", endStr);
        }
        
        const [res, remarksRes] = await Promise.all([
          fetch(`${API_URL}${endpoint}?${params.toString()}`),
          fetch(`${API_URL}/marketing/project-remarks?${params.toString()}`)
        ]);
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
          if (remarksRes.ok) {
            const rData = await remarksRes.json();
            setProjectRemarks(rData);
          }
          if (dateRange?.from) {
            const startStr = format(dateRange.from, "yyyy-MM-dd");
            const endStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startStr;
            fetchedDateRef.current = `${startStr}_${endStr}`;
          } else {
            fetchedDateRef.current = "";
          }
        }
      } else {
        monthFilter.forEach(m => params.append("month", m));
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

  const handleQuickAddSubmit = async (clientId: string, clientName: string) => {
    const chosenDate = quickAddData.date || (dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : "");
    if (!quickAddData.campaignName || !chosenDate) {
      toast.error("Please enter a campaign name and ensure a date is selected.");
      return;
    }

    const clientProjects = projects.filter((p: any) => p.clientId === clientId);
    const projectId = quickAddData.projectId || (clientProjects.length > 0 ? clientProjects[0].id : "");
    const projectName = quickAddData.projectName || (clientProjects.length > 0 ? clientProjects[0].title : "");

    const project = projects.find(p => p.id === projectId);
    if (project && project.status === "on-hold") {
      toast.error("Cannot add daily report because the associated project is on hold.");
      return;
    }

    const isAuthToAdd = () => {
      if (isAdmin || checkPermission("marketing", "canAdd")) return true;
      if (!project) return false;
      const isOriginalAssignee = project.assignedEmployeeId === user?.id;
      const isTransferredToMe = acceptedTransfers.some(t => 
        String(t.taskId) === String(project.id) && 
        normalizeDate(t.stage) === normalizeDate(chosenDate) && 
        t.receiverId === user?.id
      );
      const isTransferredToSomeoneElse = acceptedTransfers.some(t => 
        String(t.taskId) === String(project.id) && 
        normalizeDate(t.stage) === normalizeDate(chosenDate) && 
        t.receiverId !== user?.id
      );
      return (isOriginalAssignee && !isTransferredToSomeoneElse) || isTransferredToMe;
    };

    if (!isAuthToAdd()) {
      toast.error("You do not have permission to add reports for this project and date.");
      return;
    }

    setIsQuickAdding(true);
    try {
      let submitDateStr = new Date().toISOString();
      if (chosenDate) {
         const parsed = new Date(chosenDate);
         submitDateStr = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())).toISOString();
      }

      const response = await fetch(`${API_URL}/marketing/reports/daily`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...quickAddData,
          clientId,
          clientName,
          projectId,
          projectName,
          date: submitDateStr,
          revenue: 0,
          followers: 0,
          campaignOptimization: false,
          performedBy: user?.id,
          userName: user?.name || user?.firstName || "Unknown User",
        }),
      });

      if (response.ok) {
        toast.success("Daily report added successfully");
        setQuickAddData({
          date: quickAddData.date,
          projectId: quickAddData.projectId,
          projectName: quickAddData.projectName,
          campaignName: "",
          reach: 0,
          impression: 0,
          leads: 0,
          spend: 0,
          cpl: 0,
          remarks: "",
          leadsFileUrl: "",
        });
        fetchData();
        fetchClients();
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to add report");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsQuickAdding(false);
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
    
    if (!editingReport) {
      const project = projects.find(p => p.id === dailyFormData.projectId || p.clientId === dailyFormData.clientId);
      if (project && project.status === "on-hold") {
        toast.error("Cannot add daily report because the associated project is on hold.");
        return;
      }
    }
    
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
          performedBy: user?.id,
          userName: user?.name || user?.firstName || "Unknown User",
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
          clientName: "",
          reach: 0,
          impression: 0,
          leads: 0,
          followers: 0,
          spend: 0,
          cpl: 0,
          remarks: "",
          leadsFileUrl: "",
          campaignOptimization: false,
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
        const report = monthlyReports.find((r: any) => r.id === id);
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
    if (type === "daily") {
      const report = dailyReports.find((r: any) => r.id === id);
      if (!canEditMarketing && !isUserAuthorizedForReport(report)) {
        toast.error("You do not have permission to edit reports");
        return;
      }
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

  const handleUploadLeads = async (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    type: "daily" | "monthly",
    oldFileUrl?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size should be smaller than 10 MB");
      e.target.value = ''; // Reset input
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        toast.error("Failed to upload file");
        return;
      }

      if (oldFileUrl) {
        const parts = oldFileUrl.split('/uploads/');
        if (parts.length > 1) {
          const oldFilename = parts[1];
          await fetch(`${API_URL}/upload/${oldFilename}`, {
            method: "DELETE",
          }).catch(() => {});
        }
      }

      const { url } = await uploadRes.json();
      await handleInlineUpdate(id, "leadsFileUrl", url, type);
      toast.success("Leads file uploaded successfully");
    } catch (err) {
      toast.error("An error occurred during upload");
    }
  };

  const handleRemoveLeadsFile = async (id: string, fileUrl: string, type: "daily" | "monthly") => {
    try {
      if (fileUrl) {
        const parts = fileUrl.split('/uploads/');
        if (parts.length > 1) {
          const filename = parts[1];
          await fetch(`${API_URL}/upload/${filename}`, {
            method: "DELETE",
          });
        }
      }
      await handleInlineUpdate(id, "leadsFileUrl", "", type);
      toast.success("Leads file removed successfully");
    } catch (err) {
      toast.error("Failed to remove leads file");
    }
  };

  const handleUploadLeadsForm = async (e: React.ChangeEvent<HTMLInputElement>, target: "quick" | "edit") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size should be smaller than 10 MB");
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        toast.error("Failed to upload file");
        return;
      }

      const { url } = await uploadRes.json();
      if (target === "quick") {
        setQuickAddData(prev => ({ ...prev, leadsFileUrl: url }));
      } else {
        setDailyFormData(prev => ({ ...prev, leadsFileUrl: url }));
      }
      toast.success("Leads file uploaded successfully");
    } catch (err) {
      toast.error("An error occurred during upload");
    }
  };

  const handleRemoveLeadsFileForm = async (target: "quick" | "edit") => {
    const fileUrl = target === "quick" ? quickAddData.leadsFileUrl : dailyFormData.leadsFileUrl;
    try {
      if (fileUrl) {
        const parts = fileUrl.split('/uploads/');
        if (parts.length > 1) {
          const filename = parts[1];
          await fetch(`${API_URL}/upload/${filename}`, {
            method: "DELETE",
          });
        }
      }
      if (target === "quick") {
        setQuickAddData(prev => ({ ...prev, leadsFileUrl: "" }));
      } else {
        setDailyFormData(prev => ({ ...prev, leadsFileUrl: "" }));
      }
      toast.success("Leads file removed successfully");
    } catch (err) {
      toast.error("Failed to remove leads file");
    }
  };

  const handleBulkDeleteLeadsFiles = async () => {
    if (selectedLeadsIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the leads files for ${selectedLeadsIds.length} selected reports?`)) return;

    try {
      const res = await fetch(`${API_URL}/marketing/reports/daily/bulk-delete-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedLeadsIds }),
      });
      if (res.ok) {
        toast.success("Selected leads files deleted successfully");
        setSelectedLeadsIds([]);
        fetchData();
      } else {
        toast.error("Failed to bulk delete leads files");
      }
    } catch (error) {
      toast.error("An error occurred during bulk deletion");
    }
  };
  const handleDownloadLeads = (fileUrl: string) => {
    const isExternal = fileUrl.startsWith('http');
    const fullUrl = isExternal ? fileUrl : `${API_URL}${fileUrl.replace('/api', '')}`;
    
    let originalName = 'leads_file';
    try {
      const parts = fileUrl.split('/');
      const fileNameWithUuid = parts[parts.length - 1];
      const nameParts = fileNameWithUuid.split('_');
      if (nameParts.length > 1 && nameParts[0].length === 32) {
        originalName = nameParts.slice(1).join('_');
      } else {
        originalName = fileNameWithUuid;
      }
    } catch (e) {
      // fallback
    }

    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isZeroOrEmpty = (val: any) =>
    !val || val === 0 || val === "0" || String(val).trim() === "";

  const startEditingRow = (report: any) => {
    if (!canEditMarketing && !isUserAuthorizedForReport(report)) return;
    setEditingRowId(report.id);
    setEditFormData({ ...report });
  };

  const saveRowEdit = async (id: string, type: "daily" | "monthly") => {
    const report = dailyReports.find(r => r.id === id);
    if (!canEditMarketing && !isUserAuthorizedForReport(report)) return;

    if (type === "daily") {
      const report = dailyReports.find(r => r.id === id);
      if (report) {
        const isTrulyEmpty =
          isZeroOrEmpty(report.reach) &&
          isZeroOrEmpty(report.impression) &&
          isZeroOrEmpty(report.leads) &&
          isZeroOrEmpty(report.revenue) &&
          isZeroOrEmpty(report.followers) &&
          isZeroOrEmpty(report.spend) &&
          isZeroOrEmpty(report.cpl) &&
          isZeroOrEmpty(report.remarks);
        const isDue = isTrulyEmpty && normalizeDate(report.date) < getYesterdayStr();

        if (isDue) {
          const savingEmpty =
            isZeroOrEmpty(editFormData.reach) &&
            isZeroOrEmpty(editFormData.impression) &&
            isZeroOrEmpty(editFormData.leads) &&
            isZeroOrEmpty(editFormData.spend) &&
            isZeroOrEmpty(editFormData.cpl);
            
          if (savingEmpty && (!editFormData.reason || editFormData.reason.trim() === '')) {
            toast.error("Please provide a reason before saving an empty report.");
            return;
          }
        }
      }
    }

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
    type: "daily" | "monthly" | "client" | "project-remark",
  ) => {
    setIsLoadingLogs(true);
    setLogsOpen(true);
    setActiveReport({ ...report, type });
    try {
      let param = "";
      if (type === "daily") param = `dailyReportId=${report.id}`;
      else if (type === "monthly") param = `monthlyReportId=${report.id}`;
      else if (type === "project-remark") param = `projectId=${report.id}`;
      else {
        const clientProjs = projects.filter((p: any) => p.clientId === report.id);
        if (clientProjs.length > 0) {
          param = `projectId=${clientProjs[0].id}`;
        } else {
          setReportLogs([]);
          setIsLoadingLogs(false);
          return;
        }
      }
      console.log(`Fetching logs from: ${API_URL}/task-logs?${param}`);

      const res = await fetch(`${API_URL}/task-logs?${param}`);
      if (res.ok) {
        const data = await res.json();
        if (type === "project-remark") {
          setReportLogs(data.filter((d: any) => d.action === "Daily Follow-up Completed"));
        } else {
          setReportLogs(data);
        }
      } else {
        toast.error(`Failed to load logs: ${res.status}`);
        setReportLogs([]);
      }
    } catch (err) {
      console.error("Fetch logs error:", err);
      toast.error("Network error while fetching logs");
      setReportLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };



  const filteredDaily = dailyReports.filter((r) => {
    if (r.isDeleted) return false;
    const isEmpty =
      !r.reach &&
      !r.impression &&
      !r.leads &&
      !r.followers &&
      !r.spend &&
      !r.cpl &&
      (!r.remarks || r.remarks.trim() === "");
    let isCurrentlyActive = false;
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

    const assocProject = projects.find((p: any) => String(p.id) === String(r.projectId) || String(p.clientId) === String(r.clientId));
    if (assocProject && (assocProject.status === "on-hold" || assocProject.status === "onhold" || assocProject.status?.toLowerCase() === "on-hold")) {
      isCurrentlyActive = false;
    }

    const reportDate = normalizeDate(r.date);
    const todayStr = getTodayStr();

    // Hide future dates completely
    if (reportDate > todayStr) {
      return false;
    }


    const isTrulyEmpty =
      isZeroOrEmpty(r.reach) &&
      isZeroOrEmpty(r.impression) &&
      isZeroOrEmpty(r.leads) &&
      isZeroOrEmpty(r.revenue) &&
      isZeroOrEmpty(r.followers) &&
      isZeroOrEmpty(r.spend) &&
      isZeroOrEmpty(r.cpl) &&
      isZeroOrEmpty(r.remarks);

    // Hide empty placeholder rows if the campaign/project is inactive, on-hold, or deleted
    if (!isCurrentlyActive && isTrulyEmpty) {
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

    // Show pending and due rows regardless of date filter
    let isPendingRow = false;
    let isDueRow = false;
    if (isCurrentlyActive && isTrulyEmpty) {
      const yesterdayStr = getYesterdayStr();
      if (reportDate === yesterdayStr) {
        isPendingRow = true;
      } else if (reportDate < yesterdayStr) {
        isDueRow = true;
      }
    }

    let matchesDate = false;
    if (isPendingRow || isDueRow) {
      matchesDate = true;
    } else if (dateRange?.from) {
      const startStr = format(dateRange.from, "yyyy-MM-dd");
      const endStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : startStr;
      if (reportDate >= startStr && reportDate <= endStr) {
        matchesDate = true;
      }
    } else {
      matchesDate = true;
    }

    const matchesMonth = true;
      
    const isDMProject = r.projectId 
      ? projects.some(p => p.id === r.projectId) 
      : true;

    // Filter by User's assigned projects if "My Tasks" is selected
    let matchesTaskType = true;
    if ((taskFilterType === "my" || isRegularEmployee) && user?.id) {
      const assocProj = projects.find(p => String(p.id) === String(r.projectId));
      if (assocProj) {
        const isOriginalAssignee = assocProj.assignedEmployeeId === user.id;
        const isTransferredToMe = acceptedTransfers.some(t => 
          String(t.taskId) === String(r.projectId) && 
          normalizeDate(t.stage) === normalizeDate(r.date) && 
          t.receiverId === user.id
        );
        const isTransferredToSomeoneElse = acceptedTransfers.some(t => 
          String(t.taskId) === String(r.projectId) && 
          normalizeDate(t.stage) === normalizeDate(r.date) && 
          t.receiverId !== user.id
        );
        matchesTaskType = (isOriginalAssignee && !isTransferredToSomeoneElse) || isTransferredToMe;
      } else {
        matchesTaskType = false;
      }
    }

    return matchesSearch && matchesClient && matchesDate && matchesMonth && isDMProject && matchesTaskType;
  });

  const filteredMonthly = monthlyReports.filter((r) => {
    const matchesSearch =
      (r.projectName && r.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.clientName && r.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.month.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient =
      selectedClientFilter === "all" || r.clientId === selectedClientFilter;
    const matchesMonth =
      monthFilter.includes("all") || monthFilter.includes(r.month);

    let matchesTaskType = true;
    if ((taskFilterType === "my" || isRegularEmployee) && user?.id) {
      const assocProj = projects.find(p => String(p.id) === String(r.projectId));
      if (assocProj) {
        matchesTaskType = assocProj.assignedEmployeeId === user.id;
      } else {
        matchesTaskType = false;
      }
    }

    return matchesSearch && matchesClient && matchesMonth && matchesTaskType;
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

  const getProjectNameForReport = (report: any) => {
    if (report.projectName && report.projectName !== "N/A") {
      return report.projectName;
    }
    if (report.projectId) {
      const proj = projects.find((p: any) => String(p.id) === String(report.projectId));
      if (proj) return proj.title;
    }
    const clientProjs = projects.filter((p: any) => String(p.clientId) === String(report.clientId));
    if (clientProjs.length > 0) {
      return clientProjs.map((p: any) => p.title).join(", ");
    }
    return report.clientName || "Unknown";
  };

  const groupedPaginatedDaily = paginatedDaily.reduce(
    (acc: Record<string, any[]>, curr) => {
      const pName = getProjectNameForReport(curr);
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

  const getDailyExportData = () => {
    let exportData: any[] = [];
    let serialNumber = 1;

    // Group by Client
    const groupedByClient: Record<string, any[]> = {};
    filteredDaily.forEach((r) => {
      const clientName = clients.find((c: any) => String(c.id) === String(r.clientId))?.companyName || "Unknown";
      if (!groupedByClient[clientName]) {
        groupedByClient[clientName] = [];
      }
      groupedByClient[clientName].push(r);
    });

    Object.keys(groupedByClient).forEach((clientName) => {
      const clientRows = groupedByClient[clientName];
      let clientReach = 0;
      let clientImpressions = 0;
      let clientLeads = 0;
      let clientSpend = 0;
      let clientRevenue = 0;
      let clientFollowers = 0;

      clientRows.forEach((r) => {
        exportData.push({
          "S.N.": serialNumber++,
          Date: normalizeDate(r.date),
          Client: clientName,
          Project: getProjectNameForReport(r),
          Campaign: r.campaignName,
          Reach: r.reach || 0,
          Impressions: r.impression || 0,
          Leads: r.leads || 0,
          Spend: r.spend || 0,
          CPL: r.cpl || 0,
          Revenue: r.revenue || 0,
          Followers: r.followers || 0,
          Remarks: r.remarks || "",
          "Daily Follow-up": "",
        });

        clientReach += r.reach || 0;
        clientImpressions += r.impression || 0;
        clientLeads += r.leads || 0;
        clientSpend += r.spend || 0;
        clientRevenue += r.revenue || 0;
        clientFollowers += r.followers || 0;
      });

      // Get group remark from the first row in the group
      const targetDate = clientRows.length > 0 ? normalizeDate(clientRows[0].date) : "";
      const targetProjectId = clientRows.length > 0 ? (clientRows[0].projectId || clientRows[0].clientId || "unknown") : "unknown";
      const remarkObj = projectRemarks.find(pr => String(pr.projectId) === String(targetProjectId) && pr.date === targetDate);
      const groupRemarkText = remarkObj?.remark || "";

      // Add Subtotal Row
      exportData.push({
        "S.N.": "",
        Date: "",
        Client: `${clientName} Total`,
        Project: "",
        Campaign: "",
        Reach: clientReach,
        Impressions: clientImpressions,
        Leads: clientLeads,
        Spend: clientSpend,
        CPL: clientLeads > 0 ? Number((clientSpend / clientLeads).toFixed(2)) : 0,
        Revenue: clientRevenue,
        Followers: clientFollowers,
        Remarks: "",
        "Daily Follow-up": groupRemarkText,
      });
    });

    // Add Grand Total Row
    exportData.push({
      "S.N.": "",
      Date: "",
      Client: "GRAND TOTAL",
      Project: "",
      Campaign: "",
      Reach: dailyTotals.reach,
      Impressions: dailyTotals.impression,
      Leads: dailyTotals.leads,
      Spend: dailyTotals.spend,
      CPL: dailyTotals.leads > 0 ? Number((dailyTotals.spend / dailyTotals.leads).toFixed(2)) : 0,
      Revenue: dailyTotals.revenue,
      Followers: dailyTotals.followers,
      Remarks: "",
      "Daily Follow-up": "",
    });

    return exportData;
  };

  const getMonthlyExportData = () => {
    let exportData: any[] = [];
    let serialNumber = 1;

    filteredMonthly.forEach((r: any) => {
      exportData.push({
        "S.N.": serialNumber++,
        "Project Name": getProjectNameForReport(r),
        Month: r.month,
        "Total Spend": r.totalSpend || 0,
        "Total Leads": r.totalLeads || 0,
        "Avg CP": Number((r.avgCPR || 0).toFixed(2)),
        "Total Revenue": r.totalRevenue || 0,
        "Overall ROAS": `${Number((r.overallROAS || 0).toFixed(2))}x`,
        "Employee POV": r.employeeConclusion || "-",
        "Admin POV": r.adminConclusion || "-",
        "Client POV": r.clientConclusion || "-",
      });
    });

    // Add Grand Total Row
    exportData.push({
      "S.N.": "",
      "Project Name": "Total",
      Month: "",
      "Total Spend": monthlyTotals.totalSpend,
      "Total Leads": monthlyTotals.totalLeads,
      "Avg CP": monthlyTotals.totalLeads > 0 ? Number((monthlyTotals.totalSpend / monthlyTotals.totalLeads).toFixed(2)) : 0,
      "Total Revenue": monthlyTotals.totalRevenue,
      "Overall ROAS": "",
      "Employee POV": "",
      "Admin POV": "",
      "Client POV": "",
    });

    return exportData;
  };

  // Replaced by getProjectNameForReport earlier

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

      {/* Work Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-brand-teal" />
              <span>Transfer Digital Marketing Work</span>
            </DialogTitle>
            <div className="text-[11px] text-slate-400 font-medium tracking-tight mt-1">
              Select an employee and date to transfer this daily report work.
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1.5">
              <div>Project: <span className="font-semibold text-slate-800">{transferringProject?.title}</span></div>
              <div>Client: <span className="font-semibold text-slate-800">{clients.find(c => c.id === transferringProject?.clientId)?.companyName || "Unknown"}</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Select Employee to Transfer To</label>
              <Select value={selectedReceiverId} onValueChange={setSelectedReceiverId}>
                <SelectTrigger className="w-full focus:ring-brand-teal focus:border-brand-teal bg-white">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((emp: any) => {
                      if (emp.id === user?.id) return false;
                      const isAdminUser = user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin';
                      if (isAdminUser) return true;
                      if (!user?.department) return true;
                      return emp.department?.toLowerCase() === user?.department?.toLowerCase();
                    })
                    .map((emp: any) => {
                      const name = `${emp.firstName} ${emp.lastName || ''}`.trim();
                      return (
                        <SelectItem key={emp.id} value={emp.id}>
                          {name} ({emp.role || 'Employee'})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Select Date of Transfer</label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="bg-white focus:ring-brand-teal focus:border-brand-teal"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-teal hover:bg-brand-teal/90 text-white font-semibold"
              disabled={isSendingTransfer}
              onClick={handleSendTransferRequest}
            >
              {isSendingTransfer ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                                  <span>{getProjectNameForReport(r)}</span>
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
                                  <span>{getProjectNameForReport(r)}</span>
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
          {(isAdmin || user?.role === 'Team Leader' || user?.role === 'HR') && <OtherWorkDialog source="digital-marketing" />}
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
              value="tasks"
              className="px-6 py-2 rounded-md transition-all"
            >
              Creative Tasks
            </TabsTrigger>
            {user?.role?.toLowerCase() === 'admin' && (
              <TabsTrigger
                value="analysis"
                className="px-6 py-2 rounded-md transition-all"
              >
                Analysis
              </TabsTrigger>
            )}
            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'team leader' || user?.designation?.toLowerCase() === 'team leader') && (
              <TabsTrigger
                value="all_clients"
                className="px-6 py-2 rounded-md transition-all"
              >
                All Clients
              </TabsTrigger>
            )}
            {!isAdmin && (
              <TabsTrigger
                value="progress"
                className="px-6 py-2 rounded-md transition-all"
              >
                Daily Progress
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {activeTab !== "clients" && activeTab !== "tasks" && activeTab !== "analysis" && activeTab !== "progress" && activeTab !== "all_clients" && !isDailyFullScreen && (
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
            {user && (['admin', 'super admin', 'superadmin', 'team leader'].includes(user.role?.toLowerCase() || '') || user.designation?.toLowerCase() === 'team leader') && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Task Scope</Label>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border h-9">
                  <button
                    type="button"
                    onClick={() => setTaskFilterType("my")}
                    className={`px-3 text-xs font-bold rounded-md transition-all cursor-pointer ${taskFilterType === "my" ? "bg-white text-brand-teal shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    My Tasks
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilterType("all")}
                    className={`px-3 text-xs font-bold rounded-md transition-all cursor-pointer ${taskFilterType === "all" ? "bg-white text-brand-teal shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    All Tasks
                  </button>
                </div>
              </div>
            )}
            {activeTab !== "daily" && activeTab !== "analysis" && (
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
                  {clients.map((client) => {
                    const displayName = client.companyName || client.name || "Unknown";
                    return (
                      <SelectItem key={client.id} value={client.id}>
                        {displayName} {client.name && client.companyName ? `(${client.name})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            )}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-start text-left font-normal truncate bg-white">
                      {monthFilter.includes("all") || monthFilter.length === 0 
                        ? "All Months" 
                        : monthFilter.length === 1 
                          ? monthFilter[0]
                          : `${monthFilter.length} months`}
                      <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[150px] max-h-[300px] overflow-y-auto">
                    <DropdownMenuCheckboxItem
                      checked={monthFilter.includes("all")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setMonthFilter(["all"]);
                        }
                      }}
                    >
                      All Months
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December",
                    ].map((m) => (
                      <DropdownMenuCheckboxItem
                        key={m}
                        checked={monthFilter.includes(m)}
                        onCheckedChange={(checked) => {
                          setMonthFilter(prev => {
                            let next = prev.filter(x => x !== "all");
                            if (checked) {
                              next = [...next, m];
                            } else {
                              next = next.filter(x => x !== m);
                            }
                            if (next.length === 0) return ["all"];
                            return next;
                          });
                        }}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {m}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <div className="flex self-end pb-[1px] items-center gap-2 ml-auto">
              {activeTab === "daily" && selectedLeadsIds.length > 0 && canDeleteMarketing && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 px-3 text-xs font-medium"
                  onClick={handleBulkDeleteLeadsFiles}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete {selectedLeadsIds.length} Leads Files
                </Button>
              )}
              {activeTab === "daily" && filteredDaily.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs font-medium text-slate-700 hover:text-brand-teal hover:bg-brand-teal/5"
                    onClick={() => {
                      exportToPDF(getDailyExportData(), `Daily_Marketing_Report_${getTodayStr()}`);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1.5" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs font-medium text-slate-700 hover:text-[#107c41] hover:bg-[#107c41]/5"
                    onClick={() => {
                      exportToExcel(getDailyExportData(), `Daily_Marketing_Report_${getTodayStr()}`);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1.5" /> Excel
                  </Button>
                </>
              )}
              {activeTab === "daily" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-medium text-slate-700 hover:text-brand-teal hover:bg-brand-teal/5"
                  onClick={() => setIsDailyFullScreen(!isDailyFullScreen)}
                >
                  {isDailyFullScreen ? (
                    <>
                      <Minimize className="w-4 h-4 mr-1.5" /> Minimize
                    </>
                  ) : (
                    <>
                      <Maximize className="w-4 h-4 mr-1.5" /> Maximize
                    </>
                  )}
                </Button>
              )}
              {activeTab === "monthly" && filteredMonthly.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs font-medium text-slate-700 hover:text-brand-teal hover:bg-brand-teal/5"
                    onClick={() => {
                      exportToPDF(getMonthlyExportData(), `Monthly_Marketing_Report_${monthFilter.includes("all") || monthFilter.length === 0 ? "All" : monthFilter.join("_")}`);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1.5" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs font-medium text-slate-700 hover:text-[#107c41] hover:bg-[#107c41]/5"
                    onClick={() => {
                      exportToExcel(getMonthlyExportData(), `Monthly_Marketing_Report_${monthFilter.includes("all") || monthFilter.length === 0 ? "All" : monthFilter.join("_")}`);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1.5" /> Excel
                  </Button>
                </>
              )}
              {(selectedClientFilter !== "" ||
                !(dateRange?.from && isSameDay(dateRange.from, subDays(startOfToday(), 1)) && dateRange?.to && isSameDay(dateRange.to, subDays(startOfToday(), 1))) ||
                searchQuery !== "" ||
                !(monthFilter.length === 1 && monthFilter[0] === getLocalMonthString())) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-xs text-brand-teal hover:text-brand-teal/80 hover:bg-brand-teal/5 bg-brand-teal/10 ml-2"
                  onClick={() => {
                    setSelectedClientFilter("");
                    setDateRange({ from: subDays(startOfToday(), 1), to: subDays(startOfToday(), 1) });
                    setMonthFilter([getLocalMonthString()]);
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
          value="daily"
          className={isDailyFullScreen ? "fixed inset-0 z-50 bg-slate-100 flex flex-col p-6 overflow-hidden" : "mt-0 flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col min-h-0"}
        >
          {isDailyFullScreen && (
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Daily Marketing Reports</h2>
                  <p className="text-xs text-slate-500">Full Screen View</p>
                </div>
              </div>

              {/* Filters inline in the header */}
              <div className="flex flex-wrap items-center gap-4 flex-1 justify-center max-w-4xl">
                <div className="flex-1 min-w-[200px] max-w-xs relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Filter reports..."
                    className="pl-10 h-9 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {user && (['admin', 'super admin', 'superadmin', 'team leader'].includes(user.role?.toLowerCase() || '') || user.designation?.toLowerCase() === 'team leader') && (
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border h-9">
                    <button
                      type="button"
                      onClick={() => setTaskFilterType("my")}
                      className={`px-3 text-xs font-bold rounded-md transition-all cursor-pointer ${taskFilterType === "my" ? "bg-white text-brand-teal shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      My Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilterType("all")}
                      className={`px-3 text-xs font-bold rounded-md transition-all cursor-pointer ${taskFilterType === "all" ? "bg-white text-brand-teal shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      All Tasks
                    </button>
                  </div>
                )}
                
                <div className="w-[280px]">
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                  />
                </div>

                {(searchQuery || (dateRange?.from && dateRange?.to)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                    onClick={() => {
                      setSearchQuery("");
                      setDateRange({ from: new Date(), to: new Date() });
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {filteredDaily.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-xs font-medium text-slate-700 hover:text-brand-teal hover:bg-brand-teal/5"
                      onClick={() => exportToPDF(getDailyExportData(), `Daily_Marketing_Report_${getTodayStr()}`)}
                    >
                      <Download className="w-4 h-4 mr-1.5" /> PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-xs font-medium text-slate-700 hover:text-[#107c41] hover:bg-[#107c41]/5"
                      onClick={() => exportToExcel(getDailyExportData(), `Daily_Marketing_Report_${getTodayStr()}`)}
                    >
                      <Download className="w-4 h-4 mr-1.5" /> Excel
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-bold text-slate-700 hover:text-brand-teal hover:bg-brand-teal/5"
                  onClick={() => setIsDailyFullScreen(false)}
                >
                  <Minimize className="w-4 h-4 mr-1.5" /> Minimize
                </Button>
              </div>
            </div>
          )}
          <ResizablePanelGroup direction="horizontal" className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 min-h-0">
            {/* Left Column: Client List */}
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40} className="border-r border-slate-200 flex flex-col bg-slate-50/50">
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
                  const filteredClients = clients.filter((c) => {
                    const matchesSearch = c.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
                    const clientProjs = projects.filter((p) => p.clientId === c.id && p.department === "Digital Marketing");
                    const filteredProjs = clientProjs.filter((p) => {
                      if (p.status === "on-hold") return false;
                      if ((taskFilterType === "my" || isRegularEmployee) && user?.id) {
                        const isOriginalAssignee = p.assignedEmployeeId === user.id;
                        const isTransferredToMe = acceptedTransfers.some(t => 
                          String(t.taskId) === String(p.id) && 
                          t.receiverId === user.id
                        );
                        return isOriginalAssignee || isTransferredToMe;
                      }
                      return true;
                    });
                    return matchesSearch && filteredProjs.length > 0;
                  });
                  
                  return (
                    <>

                      {filteredClients.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400 italic">No clients found</div>
                      ) : (
                        filteredClients.map((client) => {
                          const isSelected = selectedClientFilter === client.id;

                          const clientProjects = projects.filter((p: any) => p.clientId === client.id);

                          return (
                            <div
                              key={client.id}
                              onClick={() => setSelectedClientFilter(client.id)}
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
                                          <div key={p.id} className="text-[10px] text-slate-500 flex items-start group py-0.5 w-full">
                                            <div className="flex-1 overflow-hidden" title={`${p.title} (${days.active}d active)`}>
                                              <div className="flex items-center justify-between w-full pr-1">
                                                <div className="truncate">
                                                  <span className="font-medium text-[11px]">{p.title}</span>: 
                                                  <span className="text-emerald-600 font-medium ml-1">{days.active}d active</span>
                                                  {days.onHold > 0 || p.status === 'on-hold' ? (
                                                    <span className="text-amber-600 font-medium ml-1">({days.onHold}d hold)</span>
                                                  ) : null}
                                                </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {canEditMarketing && (
                                                      <>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            fetchLogs(p, "project-remark");
                                                          }}
                                                          className="p-1.5 text-slate-500 hover:text-brand-teal hover:bg-brand-teal/10 rounded transition-all"
                                                          title="View Logs"
                                                        >
                                                          <History className="w-[18px] h-[18px]" />
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDailyMetricsProject(p);
                                                            setProjectEndDate(p.endDate ? p.endDate.split('T')[0] : "");
                                                            const dateStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : new Date().toISOString().split("T")[0];
                                                            fetchDailyMetricsData(p.id, dateStr);
                                                            setDailyMetricsOpen(true);
                                                          }}
                                                          className="p-1.5 text-slate-500 hover:text-brand-teal hover:bg-brand-teal/10 rounded transition-all"
                                                          title="Daily Project Metrics"
                                                        >
                                                          <Settings className="w-[18px] h-[18px]" />
                                                        </button>
                                                      </>
                                                    )}
                                                    {(p.assignedEmployeeId === user?.id || isAdmin) && (
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setTransferringProject(p);
                                                          setSelectedReceiverId("");
                                                          setTransferDate("");
                                                          setIsTransferModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-brand-teal hover:bg-brand-teal/10 rounded transition-all"
                                                        title="Transfer Work"
                                                      >
                                                        <ArrowLeftRight className="w-[18px] h-[18px]" />
                                                      </button>
                                                    )}
                                                  </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  );
                })()}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Column: Daily Reports Table */}
            <ResizablePanel defaultSize={75} className="flex flex-col bg-white overflow-hidden">

              <div className="overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
              <DragDropContext onDragEnd={handleDragEndDaily}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-12 text-center font-bold text-slate-700"></TableHead>
                      <TableHead className="w-10 text-center font-bold text-slate-700">
                        {filteredDaily.some((r: any) => r.leadsFileUrl) && (
                          <input 
                            type="checkbox" 
                            className="cursor-pointer w-3.5 h-3.5 mt-1"
                            title="Select all with leads files"
                            checked={
                              filteredDaily.filter((r: any) => r.leadsFileUrl).length > 0 &&
                              filteredDaily.filter((r: any) => r.leadsFileUrl).every((r: any) => selectedLeadsIds.includes(r.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const idsWithFiles = filteredDaily.filter((r: any) => r.leadsFileUrl).map((r: any) => r.id);
                                setSelectedLeadsIds(idsWithFiles);
                              } else {
                                setSelectedLeadsIds([]);
                              }
                            }}
                          />
                        )}
                      </TableHead>
                      <TableHead className="w-12 text-center font-bold text-slate-700">
                        S.N
                      </TableHead>
                      <TableHead className="font-bold text-slate-700 w-28">
                        Date
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
                              colSpan={14}
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
                            {filteredDaily.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={15}
                                  className="text-center py-20 text-slate-400 italic"
                                >
                                  {selectedClientFilter === "" ? "Please select a client from the left sidebar to view daily reports." : "No daily reports found."}
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
                                              {(provided) => {
                                                const isTrulyEmpty =
                                                  isZeroOrEmpty(report.reach) &&
                                                  isZeroOrEmpty(report.impression) &&
                                                  isZeroOrEmpty(report.leads) &&
                                                  isZeroOrEmpty(report.revenue) &&
                                                  isZeroOrEmpty(report.followers) &&
                                                  isZeroOrEmpty(report.spend) &&
                                                  isZeroOrEmpty(report.cpl) &&
                                                  isZeroOrEmpty(report.remarks);
                                                const isDue = isTrulyEmpty && normalizeDate(report.date) < getYesterdayStr();
                                                
                                                return (
                                                <TableRow
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  className={isDue ? "bg-red-50/50 hover:bg-red-100/50" : "hover:bg-slate-50/50"}
                                                >
                                                  <TableCell className="text-center w-8">
                                                    <div
                                                      {...provided.dragHandleProps}
                                                      className="cursor-grab hover:text-brand-teal text-slate-400"
                                                    >
                                                      <GripVertical className="w-4 h-4 mx-auto" />
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="text-center w-10">
                                                    {report.leadsFileUrl ? (
                                                      <input 
                                                        type="checkbox" 
                                                        className="cursor-pointer w-3.5 h-3.5 mt-1"
                                                        checked={selectedLeadsIds.includes(report.id)}
                                                        onChange={(e) => {
                                                          if (e.target.checked) {
                                                            setSelectedLeadsIds([...selectedLeadsIds, report.id]);
                                                          } else {
                                                            setSelectedLeadsIds(selectedLeadsIds.filter((id: string) => id !== report.id));
                                                          }
                                                        }}
                                                      />
                                                    ) : (
                                                      <span className="text-slate-300">-</span>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="text-center text-slate-400">
                                                    {globalIdx}
                                                  </TableCell>
                                                  <TableCell className="text-slate-600 font-semibold text-xs whitespace-nowrap">
                                                    {report.date ? (() => {
                                                      try {
                                                        const parsed = new Date(report.date);
                                                        const formattedDate = format(parsed, "dd MMM yyyy");
                                                        const transfer = transferRequests.find(t => 
                                                          String(t.taskId) === String(report.projectId) && 
                                                          normalizeDate(t.stage) === normalizeDate(report.date)
                                                        );
                                                        return (
                                                          <div className="flex flex-col gap-1">
                                                            <span>{formattedDate}</span>
                                                            {transfer && transfer.status === 'Pending' && (
                                                              <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded font-semibold whitespace-nowrap">
                                                                Pending Transfer to {transfer.receiverName}
                                                              </span>
                                                            )}
                                                            {transfer && transfer.status === 'Accepted' && (
                                                              <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded font-semibold whitespace-nowrap">
                                                                Transferred to {transfer.receiverName}
                                                              </span>
                                                            )}
                                                          </div>
                                                        );
                                                      } catch (e) {
                                                        return report.date;
                                                      }
                                                    })() : "N/A"}
                                                  </TableCell>

                                                  <TableCell className="text-slate-600">
                                                    {report.campaignName || "N/A"}
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
                                                        className="h-8 text-xs text-center outline-none min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                        className="h-8 text-xs text-center outline-none min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                        className="h-8 text-xs text-center outline-none min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                        className="h-8 text-xs text-center outline-none min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                        className="h-8 text-xs text-center outline-none min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                        className="h-8 text-xs text-center outline-none min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                        className="h-8 text-xs text-center outline-none min-w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                    className={`text-center ${canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}`}
                                                    onClick={() =>
                                                      startEditingRow(report)
                                                    }
                                                  >
                                                    {editingRowId ===
                                                    report.id ? (
                                                      <Input
                                                        className="h-8 text-xs bg-white"
                                                        placeholder="Remark"
                                                        value={editFormData.remarks || ""}
                                                        onChange={(e) =>
                                                          setEditFormData({
                                                            ...editFormData,
                                                            remarks: e.target.value,
                                                          })
                                                        }
                                                      />
                                                    ) : (
                                                      report.remarks || "-"
                                                    )}
                                                  </TableCell>

                                                  <TableCell className="text-center">
                                                    <div className="flex justify-center items-center gap-1">
                                                      {editingRowId ===
                                                      report.id ? (
                                                        <>
                                                          {isDue && (
                                                            <Input
                                                              placeholder="Reason for zero metrics..."
                                                              className="h-6 text-[10px] w-28 border-red-300 focus-visible:ring-red-300"
                                                              value={editFormData.reason || ""}
                                                              onChange={(e) =>
                                                                setEditFormData({
                                                                  ...editFormData,
                                                                  reason: e.target.value,
                                                                })
                                                              }
                                                            />
                                                          )}
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
                                                          {isDue && report.reason && (
                                                            <span className="text-[10px] text-red-600 font-medium max-w-[80px] truncate mr-1" title={report.reason}>
                                                              {report.reason}
                                                            </span>
                                                          )}
                                                          {isDue && !report.reason && (
                                                            <Badge variant="outline" className="text-[9px] bg-red-100 text-red-600 border-red-200 px-1 py-0 shadow-none mr-1">DUE</Badge>
                                                          )}
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

                                                          {report.leadsFileUrl && (
                                                            <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                              title="Download Leads"
                                                              onClick={() => handleDownloadLeads(report.leadsFileUrl)}
                                                            >
                                                              <FileSpreadsheet className="w-4 h-4" />
                                                            </Button>
                                                          )}

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
                                                );
                                              }}
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
                                          <TableCell>
                                            <div className="flex items-center gap-1">
                                              {(() => {
                                                const targetDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                                                const targetProjectId = reports[0]?.projectId || reports[0]?.clientId || "unknown";
                                                const remarkObj = projectRemarks.find(pr => pr.projectId === targetProjectId && pr.date === targetDate);
                                                const remarkText = remarkObj?.remark || "";
                                                const isEditing = editingRemarks.includes(`${targetProjectId}_${targetDate}`);
                                                const showInput = !remarkObj || isEditing || remarkObj.isDirty || !remarkText;

                                                if (!showInput) {
                                                  return (
                                                    <div 
                                                      className="text-xs text-slate-700 cursor-text hover:bg-slate-50 px-2 py-1.5 rounded border border-transparent hover:border-slate-200 transition-colors w-[150px] truncate"
                                                      onClick={() => setEditingRemarks(prev => [...prev, `${targetProjectId}_${targetDate}`])}
                                                      title={remarkText}
                                                    >
                                                      {remarkText}
                                                    </div>
                                                  );
                                                }

                                                return (
                                                  <>
                                                    <Input
                                                      placeholder="Daily follow-up / remark"
                                                      className="w-[150px] h-8 text-xs bg-white/50 focus:bg-white"
                                                      value={remarkText}
                                                      onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setProjectRemarks(prev => {
                                                          const filtered = prev.filter(p => !(p.projectId === targetProjectId && p.date === targetDate));
                                                          return [...filtered, { projectId: targetProjectId, date: targetDate, remark: newVal, isDirty: true }];
                                                        });
                                                      }}
                                                      autoFocus={isEditing}
                                                      onBlur={() => {
                                                        if (!remarkObj?.isDirty) {
                                                          setEditingRemarks(prev => prev.filter(id => id !== `${targetProjectId}_${targetDate}`));
                                                        }
                                                      }}
                                                    />
                                                    {remarkObj?.isDirty && (
                                                      <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 shrink-0"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                          handleUpdateProjectRemark(
                                                            targetProjectId,
                                                            targetDate,
                                                            remarkText,
                                                            reports[0]?.clientId
                                                          );
                                                          setEditingRemarks(prev => prev.filter(id => id !== `${targetProjectId}_${targetDate}`));
                                                        }}
                                                      >
                                                        <Check className="w-4 h-4" />
                                                      </Button>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                              onClick={() => {
                                                const targetProjectId = reports[0]?.projectId || reports[0]?.clientId || "unknown";
                                                fetchLogs(
                                                  { id: targetProjectId, type: "project" },
                                                  "project-remark"
                                                );
                                              }}
                                            >
                                              <History className="w-4 h-4" />
                                            </Button>
                                          </TableCell>
                                          <TableCell></TableCell>
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
              
              {selectedClientFilter !== "all" && selectedClientFilter !== "" && canAddMarketing && (
                <div className="border-t border-slate-200 mt-2 bg-slate-50/30">
                  {!showAddForm ? (
                    <div className="p-4 flex justify-center">
                      <Button variant="outline" className="border-dashed bg-slate-50/50 hover:bg-slate-50 text-brand-teal w-full max-w-sm" onClick={() => setShowAddForm(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Add New Entry
                      </Button>
                    </div>
                  ) : (
                    <div className="p-5 m-4 bg-white rounded-xl shadow-sm border border-slate-200">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-3">
                          <h3 className="text-lg font-semibold text-slate-800">New Daily Report</h3>
                          <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                            <X className="w-5 h-5"/>
                          </Button>
                        </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input 
                          type="date"
                          className="h-10 bg-white text-xs font-bold text-slate-700" 
                          value={quickAddData.date || (dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : "")}
                          onChange={(e) => {
                            const newDateStr = e.target.value;
                            setQuickAddData({...quickAddData, date: newDateStr});
                            if (newDateStr) {
                              const newDateObj = new Date(newDateStr);
                              setDateRange({ from: newDateObj, to: newDateObj });
                            }
                          }}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Project</Label>
                        {(() => {
                          const clientProjs = projects.filter((p: any) => p.clientId === selectedClientFilter);
                          return clientProjs.length > 1 ? (
                            <Select
                              value={quickAddData.projectId}
                              onValueChange={(val) => {
                                const p = clientProjs.find((x: any) => x.id === val);
                                if (p) setQuickAddData({...quickAddData, projectId: p.id, projectName: p.title});
                              }}
                            >
                              <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Project"/></SelectTrigger>
                              <SelectContent>
                                {clientProjs.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="truncate font-medium text-slate-600 px-3 py-2 h-10 bg-slate-50 rounded-md border border-slate-200 flex items-center">
                              {clientProjs[0]?.title || "N/A"}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <Label>Campaign Name</Label>
                        <Input 
                          className="h-10 bg-white" 
                          placeholder="e.g. Awareness Campaign"
                          value={quickAddData.campaignName}
                          onChange={(e) => setQuickAddData({...quickAddData, campaignName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reach</Label>
                        <Input 
                          type="number"
                          className="h-10 bg-white" 
                          placeholder="0"
                          value={quickAddData.reach || ""}
                          onChange={(e) => setQuickAddData({...quickAddData, reach: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Impressions</Label>
                        <Input 
                          type="number"
                          className="h-10 bg-white" 
                          placeholder="0"
                          value={quickAddData.impression || ""}
                          onChange={(e) => setQuickAddData({...quickAddData, impression: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Leads</Label>
                        <Input 
                          type="number"
                          className="h-10 bg-white" 
                          placeholder="0"
                          value={quickAddData.leads || ""}
                          onChange={(e) => setQuickAddData({...quickAddData, leads: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Spend (₹)</Label>
                        <Input 
                          type="number" step="0.01"
                          className="h-10 bg-white" 
                          placeholder="0.00"
                          value={quickAddData.spend || ""}
                          onChange={(e) => setQuickAddData({...quickAddData, spend: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cost Metric</Label>
                        <Input 
                          type="number" step="0.01"
                          className="h-10 bg-white" 
                          placeholder="0.00"
                          value={quickAddData.cpl || ""}
                          onChange={(e) => setQuickAddData({...quickAddData, cpl: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Remark</Label>
                        <Input
                          className="h-10 bg-white" 
                          placeholder="Remark"
                          value={quickAddData.remarks || ""}
                          onChange={(e) => setQuickAddData({...quickAddData, remarks: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Leads File (Optional)</Label>
                        {quickAddData.leadsFileUrl ? (
                          <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg h-10">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-semibold text-emerald-800 truncate flex-1">
                              Leads File Uploaded
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleRemoveLeadsFileForm("quick");
                              }}
                              className="h-6 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-bold"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input 
                              type="file" 
                              id="quick-upload-leads"
                              className="hidden" 
                              accept=".xlsx,.xls,.csv"
                              onChange={(e) => handleUploadLeadsForm(e, "quick")}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById("quick-upload-leads")?.click()}
                              className="w-full h-10 border-dashed bg-white hover:bg-slate-50 text-slate-500 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Upload className="w-4 h-4 text-slate-400" /> Upload Leads (.xlsx, .xls, .csv)
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t">
                      <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                      <Button 
                         className="bg-brand-teal hover:bg-brand-teal/90 text-white" 
                         disabled={!quickAddData.campaignName || isQuickAdding} 
                         onClick={() => {
                           const activeClient = clients.find((c: any) => c.id === selectedClientFilter);
                           handleQuickAddSubmit(selectedClientFilter, activeClient?.companyName || "");
                         }}
                      >
                        {isQuickAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                        Submit Entry
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
            <TablePagination
              totalItems={filteredDaily.length}
              itemsPerPage={dailyItemsPerPage}
              currentPage={dailyPage}
              onPageChange={setDailyPage}
              onItemsPerPageChange={setDailyItemsPerPage}
              itemName="daily reports"
            />
            </ResizablePanel>
          </ResizablePanelGroup>
      </TabsContent>

        <TabsContent
          value="monthly"
          className="mt-0 flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col min-h-0"
        >
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
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
                                          <span>{getProjectNameForReport(report)}</span>
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
                                            if (canEditThisPOV && !(inlineEditing?.id === report.id && inlineEditing?.field === povField)) {
                                              setInlineEditing({
                                                id: report.id,
                                                field: povField,
                                              });
                                            }
                                          }}
                                        >
                                          {inlineEditing?.id === report.id &&
                                          inlineEditing?.field === povField ? (
                                            <div className="flex items-center gap-1">
                                              <Input
                                                autoFocus
                                                id={`monthly-pov-${report.id}-${povField}`}
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
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 shrink-0"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const inputEl = document.getElementById(`monthly-pov-${report.id}-${povField}`) as HTMLInputElement;
                                                  if (inputEl) {
                                                    handleInlineUpdate(
                                                      report.id,
                                                      povField,
                                                      inputEl.value,
                                                      "monthly",
                                                    );
                                                  }
                                                }}
                                              >
                                                <Check className="w-4 h-4" />
                                              </Button>
                                            </div>
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
        <TabsContent value="tasks" className="flex-1 overflow-hidden mt-0">
          <PendingWorkEmbedded type="all" defaultTaskType="digital-marketing" hideTaskTypeFilter hideStageFilter hideProjectFilter />
        </TabsContent>
        {user?.role?.toLowerCase() === 'admin' && (
          <TabsContent value="analysis" className="flex-1 overflow-y-auto mt-0 px-1 pb-10">
            <div className="space-y-6">
              {/* Date Filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100 gap-4">
                <h3 className="font-bold text-slate-800 text-lg">Marketing Analysis Dashboard</h3>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Filter by Brand:</span>
                    <Select
                      value={selectedClientFilter}
                      onValueChange={setSelectedClientFilter}
                    >
                      <SelectTrigger className="w-[200px] h-9 bg-white">
                        <SelectValue placeholder="All Brands" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {clients.map((client) => {
                          const displayName = client.companyName || client.name || "Unknown";
                          return (
                            <SelectItem key={client.id} value={client.id}>
                              {displayName} {client.name && client.companyName ? `(${client.name})` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Date Range:</span>
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                      className="w-[280px]"
                    />
                  </div>
                </div>
              </div>

              {/* Top Aggregate Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="w-12 h-12 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider z-10">Total Spend</span>
                  <span className="text-3xl font-bold text-slate-800 z-10">₹{analysisStats.totalSpend.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Users className="w-12 h-12 text-brand-teal" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider z-10">Total Leads</span>
                  <span className="text-3xl font-bold text-slate-800 z-10">{analysisStats.totalLeads.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BarChart3 className="w-12 h-12 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider z-10">Total Revenue</span>
                  <span className="text-3xl font-bold text-slate-800 z-10">₹{analysisStats.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BarChart3 className="w-12 h-12 text-indigo-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider z-10">Overall ROAS</span>
                  <span className="text-3xl font-bold text-slate-800 z-10">{analysisStats.roas.toFixed(2)}x</span>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Company Trend */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm col-span-1 xl:col-span-2">
                  <h4 className="font-bold text-slate-800 mb-4">Company Trends (Daily)</h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysisStats.dailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} minTickGap={30} />
                        <YAxis yAxisId="left" tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend (₹)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Employee Wise */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Employee Performance</h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysisStats.employeeStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="revenue" name="Revenue (₹)" fill="#10b981" radius={[4,4,0,0]} />
                        <Bar dataKey="spend" name="Spend (₹)" fill="#3b82f6" radius={[4,4,0,0]} />
                        <Bar dataKey="leads" name="Leads" fill="#0ea5e9" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Project Wise */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Project Performance</h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysisStats.projectStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="revenue" name="Revenue (₹)" fill="#8b5cf6" radius={[4,4,0,0]} />
                        <Bar dataKey="spend" name="Spend (₹)" fill="#f59e0b" radius={[4,4,0,0]} />
                        <Bar dataKey="leads" name="Leads" fill="#f43f5e" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          </TabsContent>
        )}
        {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'team leader' || user?.designation?.toLowerCase() === 'team leader') && (
          <TabsContent value="all_clients" className="m-0 flex-1 overflow-auto h-full mt-4 px-1 pb-10">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-bold text-slate-800 text-lg mb-4">All Clients & Projects (Digital Marketing)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b">
                    <tr>
                      <th className="px-4 py-3">Company Name</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">End Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projects
                      .filter(p => p.department === "Digital Marketing")
                      .sort((a, b) => {
                        if (!a.endDate && !b.endDate) return 0;
                        if (!a.endDate) return 1;
                        if (!b.endDate) return -1;
                        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
                      })
                      .map(p => {
                        const client = clients.find(c => c.id === p.clientId);
                      
                      let calculatedEndStr = "-";
                      if (p.endDate) {
                        const days = calculateProjectDays(p);
                        const endObj = new Date(p.endDate);
                        if (systemSettings?.addHoldDaysToEndDate !== false && days.onHold > 0) {
                          endObj.setDate(endObj.getDate() + days.onHold);
                          calculatedEndStr = format(endObj, 'dd MMM yyyy') + ` (+${days.onHold} days)`;
                        } else {
                          calculatedEndStr = format(endObj, 'dd MMM yyyy');
                        }
                      }
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{client?.companyName || client?.name || p.clientName || 'Unknown'}</td>
                          <td className="px-4 py-3 text-slate-600">{p.title}</td>
                          <td className="px-4 py-3 font-medium text-brand-teal">{calculatedEndStr}</td>
                        </tr>
                      );
                    })}
                    {projects.filter(p => p.department === "Digital Marketing").length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No projects found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}
        {!isAdmin && (
          <TabsContent value="progress" className="m-0 flex-1 overflow-auto h-full mt-4 pb-10">
            <DailyProgressView defaultDepartment="Digital Marketing" />
          </TabsContent>
        )}
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
                  onChange={(e) => {
                    const newDateStr = e.target.value;
                    setDailyFormData({ ...dailyFormData, date: newDateStr });
                    if (newDateStr) {
                      const newDateObj = new Date(newDateStr);
                      setDateRange({ from: newDateObj, to: newDateObj });
                    }
                  }}
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
                <Label>Remarks</Label>
                <Input
                  placeholder="Add remark..."
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

      <Dialog open={dailyMetricsOpen} onOpenChange={setDailyMetricsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Daily Metrics - {dailyMetricsProject?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Revenue (₹)</Label>
              <Input
                type="number"
                value={dailyMetricsData.revenue || ""}
                onChange={(e) => setDailyMetricsData({...dailyMetricsData, revenue: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Followers</Label>
              <Input
                type="number"
                value={dailyMetricsData.followers || ""}
                onChange={(e) => setDailyMetricsData({...dailyMetricsData, followers: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>User Remark</Label>
              <Textarea
                rows={2}
                placeholder="Add user remark..."
                value={dailyMetricsData.userRemark || ""}
                onChange={(e) => setDailyMetricsData({...dailyMetricsData, userRemark: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Client Remark</Label>
              <Textarea
                rows={2}
                placeholder="Add client remark..."
                value={dailyMetricsData.clientRemark || ""}
                onChange={(e) => setDailyMetricsData({...dailyMetricsData, clientRemark: e.target.value})}
              />
            </div>
            
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label>Base End Date (Project Level)</Label>
              <Input
                type="text"
                readOnly
                className="bg-slate-50 cursor-not-allowed font-medium text-slate-700 h-10"
                value={dailyMetricsProject?.endDate ? format(new Date(dailyMetricsProject.endDate), 'dd MMM yyyy') : "Not Set"}
              />
            </div>
            {(() => {
              if (!dailyMetricsProject || !dailyMetricsProject.endDate) return null;
              
              const endDateObj = new Date(dailyMetricsProject.endDate);
              const days = calculateProjectDays(dailyMetricsProject);
              
              if (systemSettings?.addHoldDaysToEndDate !== false && days.onHold > 0) {
                endDateObj.setDate(endDateObj.getDate() + days.onHold);
                return (
                  <div className="space-y-2">
                    <Label className="text-brand-teal font-bold">Calculated End Date (Added {days.onHold} On-Hold Days)</Label>
                    <Input
                      type="text"
                      readOnly
                      className="bg-emerald-50 cursor-not-allowed font-medium text-brand-teal border-emerald-200 h-10"
                      value={format(endDateObj, 'dd MMM yyyy')}
                    />
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDailyMetricsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDailyMetrics} disabled={isSavingDailyMetrics} className="bg-brand-teal text-white hover:bg-brand-teal/90">
              {isSavingDailyMetrics ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Metrics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
