"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, ArrowUpDown, ChevronDown, Check, Trash2, Edit2, Play, Users, BarChart3, Clock, CheckCircle2, MoreVertical, Plus, Info, TrendingUp, Power, FileText, History, ClipboardList, Calendar as CalendarIcon, Download, Filter, MoreHorizontal } from "lucide-react";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtherWorkDialog } from "@/components/hrms/OtherWorkDialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/TablePagination";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
  "January": "01",
  "February": "02",
  "March": "03",
  "April": "04",
  "May": "05",
  "June": "06",
  "July": "07",
  "August": "08",
  "September": "09",
  "October": "10",
  "November": "11",
  "December": "12"
};

const normalizeDate = (dateStr: string) => {
  if (!dateStr) return "";
  return dateStr.split(" ")[0].split("T")[0];
};

export default function MarketingReportsPage() {
  const { confirm } = useConfirm();
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const getLocalMonthString = () => {
    return new Date().toLocaleString('default', { month: 'long' });
  };

  const canViewMarketing = isAdmin || checkPermission('marketing', 'canView');
  const canAddMarketing = isAdmin || checkPermission('marketing', 'canAdd');
  const canEditMarketing = isAdmin || checkPermission('marketing', 'canEdit');
  const canDeleteMarketing = isAdmin || checkPermission('marketing', 'canDelete');

  const [activeTab, setActiveTab] = useState("daily");
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [inlineEditing, setInlineEditing] = useState<{id: string, field: string} | null>(null);

  // Logs state
  const [logsOpen, setLogsOpen] = useState(false);
  const [reportLogs, setReportLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeReport, setActiveReport] = useState<any>(null);

  // Client filtering
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  // Pagination State
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyItemsPerPage, setDailyItemsPerPage] = useState(10);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [monthlyItemsPerPage, setMonthlyItemsPerPage] = useState(10);

  const [dateFilter, setDateFilter] = useState(getLocalDateString());
  const [monthFilter, setMonthFilter] = useState(getLocalMonthString());

  const handleDateFilterChange = (val: string) => {
    setDateFilter(val);
    if (val) {
      const parts = val.split("-");
      if (parts.length === 3) {
        const monthNum = parts[1];
        const monthName = Object.keys(monthMap).find(key => monthMap[key] === monthNum);
        if (monthName) {
          setMonthFilter(monthName);
        }
      }
    }
  };

  const handleMonthFilterChange = (val: string) => {
    setMonthFilter(val);
    if (val !== "all" && dateFilter) {
      const parts = dateFilter.split("-");
      if (parts.length === 3) {
        const dateMonthNum = parts[1];
        if (monthMap[val] !== dateMonthNum) {
          setDateFilter("");
        }
      }
    }
  };
  const [newCampaignName, setNewCampaignName] = useState<{ [key: string]: string }>({});

  const handleAddCampaign = async (clientId: string) => {
    const name = newCampaignName[clientId];
    if (!name || !name.trim()) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const currentCampaigns = client.campaigns || [];
    const exists = currentCampaigns.some((c: any) => (typeof c === 'string' ? c : c.name) === name.trim());
    if (exists) {
      toast.error("Campaign already exists");
      return;
    }
    const updatedCampaigns = [...currentCampaigns, { name: name.trim(), isActive: true }];
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: updatedCampaigns, performedBy: user?.id, userName: user?.name })
      });
      if (res.ok) {
        toast.success("Campaign added");
        setNewCampaignName(prev => ({...prev, [clientId]: ""}));
        fetchClients();
      } else {
        toast.error("Failed to add campaign");
      }
    } catch(err) {
      toast.error("Failed to add campaign");
    }
  };

  const handleRemoveCampaign = async (clientId: string, campaignToRemove: string) => {
    if (!canEditMarketing) {
      toast.error("You do not have permission to edit campaigns");
      return;
    }
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to remove this campaign?",
      destructive: true,
      confirmText: "Remove"
    });
    if (!isConfirmed) return;

    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const updatedCampaigns = (client.campaigns || []).filter((c: any) => (typeof c === 'string' ? c : c.name) !== campaignToRemove);
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: updatedCampaigns, performedBy: user?.id, userName: user?.name })
      });
      if (res.ok) {
        toast.success("Campaign removed");
        fetchClients();
      } else {
        toast.error("Failed to remove campaign");
      }
    } catch(err) {
      toast.error("Failed to remove campaign");
    }
  };

  const handleToggleCampaignStatus = async (clientId: string, campaignName: string) => {
    if (!canEditMarketing) {
      toast.error("You do not have permission to edit campaigns");
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const updatedCampaigns = (client.campaigns || []).map((c: any) => {
      const cName = typeof c === 'string' ? c : c.name;
      const cActive = typeof c === 'string' ? true : c.isActive;
      if (cName === campaignName) {
        return { name: cName, isActive: !cActive };
      }
      return typeof c === 'string' ? { name: cName, isActive: true } : c;
    });
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: updatedCampaigns, performedBy: user?.id, userName: user?.name })
      });
      if (res.ok) {
        toast.success("Campaign status updated");
        fetchClients();
      } else {
        toast.error("Failed to update campaign status");
      }
    } catch(err) {
      toast.error("Failed to update campaign status");
    }
  };

  const [viewClientReports, setViewClientReports] = useState<string | null>(null);
  const [clientReportsData, setClientReportsData] = useState<{daily: any[], monthly: any[]}>({daily: [], monthly: []});
  const [loadingClientReports, setLoadingClientReports] = useState(false);

  const handleViewClientReports = async (clientId: string) => {
    setViewClientReports(clientId);
    setLoadingClientReports(true);
    try {
      const [dailyRes, monthlyRes] = await Promise.all([
        fetch(`${API_URL}/marketing/reports/daily?client_id=${clientId}`),
        fetch(`${API_URL}/marketing/reports/monthly?client_id=${clientId}`)
      ]);
      const daily = await dailyRes.json();
      const monthly = await monthlyRes.json();
      setClientReportsData({ daily: Array.isArray(daily) ? daily : [], monthly: Array.isArray(monthly) ? monthly : [] });
    } catch(err) {
      console.error(err);
      toast.error("Failed to load client reports");
    } finally {
      setLoadingClientReports(false);
    }
  };

  // Form States
  const [dailyFormData, setDailyFormData] = useState({
    date: getLocalDateString(),
    campaignName: "",
    clientId: "",
    reach: 0,
    impression: 0,
    leads: 0,
    followers: 0,
    spend: 0,
    cpl: 0,
    remarks: ""
  });

  const [monthlyFormData, setMonthlyFormData] = useState({
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
    conclusion: ""
  });

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewMarketing) {
      router.push("/");
    }
  }, [router, permissionsLoading, canViewMarketing]);

  useEffect(() => {
    if (permissionsLoading || !canViewMarketing) return;
    fetchData();
    fetchClients();
  }, [activeTab, selectedClientFilter, dateFilter, monthFilter, permissionsLoading, canViewMarketing]);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.filter((c: any) => c.department === "Marketing"));
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = activeTab === "daily" ? "/marketing/reports/daily" : "/marketing/reports/monthly";
      const params = new URLSearchParams();
      if (selectedClientFilter !== "all") params.append("client_id", selectedClientFilter);
      if (activeTab === "daily") {
        if (dateFilter) params.append("date", dateFilter);
      } else {
        if (monthFilter !== "all") params.append("month", monthFilter);
      }
      
      const res = await fetch(`${API_URL}${endpoint}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (activeTab === "daily") setDailyReports(data);
        else setMonthlyReports(data);
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
    const client = clients.find(c => c.id === dailyFormData.clientId);
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
          clientName: client?.companyName || ""
        }),
      });

      if (res.ok) {
        setIsDailyModalOpen(false);
        setEditingReport(null);
        setDailyFormData({
          date: getLocalDateString(),
          campaignName: "",
          clientId: "",
          reach: 0,
          impression: 0,
          leads: 0,
          followers: 0,
          spend: 0,
          cpl: 0,
          remarks: ""
        });
        toast.success(editingReport ? "Daily report updated successfully!" : "Daily report added successfully!");
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.detail || errData.message || "Failed to save daily report";
        toast.error(typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg);
      }
    } catch (err) {
      toast.error("Failed to save daily report");
    }
  };

  const handleMonthlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReport ? !canEditMarketing : !canAddMarketing) {
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
        toast.success(editingReport ? "Monthly report updated successfully!" : "Monthly report added successfully!");
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.detail || errData.message || "Failed to save monthly report";
        toast.error(typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg);
      }
    } catch (err) {
      toast.error("Failed to save monthly report");
    }
  };

  const handleDelete = async (id: string, type: "daily" | "monthly") => {
    if (type === "daily" || type === "monthly") {
      if (!canDeleteMarketing) {
        toast.error("You do not have permission to delete reports");
        return;
      }
    }
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this report?",
      destructive: true,
      confirmText: "Confirm"
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

  const handleInlineUpdate = async (id: string, field: string | object, value: any, type: "daily" | "monthly") => {
    if (!canEditMarketing) {
      toast.error("You do not have permission to edit reports");
      return;
    }
    try {
      const payload = typeof field === 'object' ? { ...field } : { [field as string]: value };
      
      const res = await fetch(`${API_URL}/marketing/reports/${type}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...payload,
          performedBy: user?.id,
          userName: user?.name || "Unknown User"
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

  // Reset pages when filters change
  useEffect(() => {
    setDailyPage(1);
    setMonthlyPage(1);
  }, [searchQuery, selectedClientFilter, dateFilter, monthFilter]);

  if (permissionsLoading || !canViewMarketing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  const fetchLogs = async (report: any, type: "daily" | "monthly") => {
    setIsLoadingLogs(true);
    setLogsOpen(true);
    setActiveReport({ ...report, type });
    try {
      const param = type === "daily" ? `dailyReportId=${report.id}` : `monthlyReportId=${report.id}`;
      const res = await fetch(`${API_URL}/task-logs?${param}`);
      if (res.ok) {
        setReportLogs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching report logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const filteredDaily = dailyReports.filter(r => {
    const matchesSearch = r.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (r.clientName && r.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesClient = selectedClientFilter === "all" || r.clientId === selectedClientFilter;
    const matchesDate = !dateFilter || normalizeDate(r.date) === dateFilter;
    const matchesMonth = monthFilter === "all" || (r.date && normalizeDate(r.date).split("-")[1] === monthMap[monthFilter]);
    return matchesSearch && matchesClient && matchesDate && matchesMonth;
  });

  const filteredMonthly = monthlyReports.filter(r => {
    const matchesSearch = r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.month.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = selectedClientFilter === "all" || r.clientId === selectedClientFilter;
    const matchesMonth = monthFilter === "all" || !monthFilter || r.month === monthFilter;
    return matchesSearch && matchesClient && matchesMonth;
  });

  // Pagination Logic
  const paginatedDaily = filteredDaily.slice((dailyPage - 1) * dailyItemsPerPage, dailyPage * dailyItemsPerPage);
  const paginatedMonthly = filteredMonthly.slice((monthlyPage - 1) * monthlyItemsPerPage, monthlyPage * monthlyItemsPerPage);

  const dailyTotals = filteredDaily.reduce((acc, curr) => ({
    reach: acc.reach + (curr.reach || 0),
    impression: acc.impression + (curr.impression || 0),
    leads: acc.leads + (curr.leads || 0),
    followers: acc.followers + (curr.followers || 0),
    spend: acc.spend + (curr.spend || 0)
  }), { reach: 0, impression: 0, leads: 0, followers: 0, spend: 0 });

  const monthlyTotals = filteredMonthly.reduce((acc, curr) => ({
    totalSpend: acc.totalSpend + (curr.totalSpend || 0),
    totalLeads: acc.totalLeads + (curr.totalLeads || 0),
    totalSales: acc.totalSales + (curr.totalSales || 0),
    totalRevenue: acc.totalRevenue + (curr.totalRevenue || 0),
  }), { totalSpend: 0, totalLeads: 0, totalSales: 0, totalRevenue: 0 });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      <ActivityLogDialog 
        open={logsOpen}
        onOpenChange={setLogsOpen}
        title="Report Activity History"
        subtitle={activeReport ? (activeReport.type === 'daily' ? activeReport.campaignName : activeReport.clientName) : undefined}
        logs={reportLogs}
        isLoading={isLoadingLogs}
      />

      <Dialog open={!!viewClientReports} onOpenChange={(open) => !open && setViewClientReports(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Client Reports: {clients.find(c => c.id === viewClientReports)?.companyName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {loadingClientReports ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
              </div>
            ) : (
              <div className="space-y-8 p-1">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-800">Daily Reports</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-bold text-slate-700">Date</TableHead>
                          <TableHead className="font-bold text-slate-700">Campaign</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Reach</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Impressions</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Leads</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Spend (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientReportsData.daily.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-slate-400 italic">No daily reports found.</TableCell>
                          </TableRow>
                        ) : (
                          clientReportsData.daily.map(r => (
                            <TableRow key={r.id}>
                              <TableCell>{normalizeDate(r.date)}</TableCell>
                              <TableCell>{r.campaignName}</TableCell>
                              <TableCell className="text-center">{r.reach}</TableCell>
                              <TableCell className="text-center">{r.impression}</TableCell>
                              <TableCell className="text-center">{r.leads}</TableCell>
                              <TableCell className="text-center">{r.spend}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-800">Monthly Reports</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-bold text-slate-700">Month</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Total Spend (₹)</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Total Leads</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Total Sales</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Total Revenue (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientReportsData.monthly.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-slate-400 italic">No monthly reports found.</TableCell>
                          </TableRow>
                        ) : (
                          clientReportsData.monthly.map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.month}</TableCell>
                              <TableCell className="text-center">{r.totalSpend}</TableCell>
                              <TableCell className="text-center">{r.totalLeads}</TableCell>
                              <TableCell className="text-center">{r.totalSales}</TableCell>
                              <TableCell className="text-center">{r.totalRevenue}</TableCell>
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
          <p className="text-slate-500 text-sm mt-1">Track daily performance and monthly ROI metrics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OtherWorkDialog />
        </div>
      </div>

      {/* Tabs & Search */}
      <Tabs defaultValue="daily" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="daily" className="px-6 py-2 rounded-md transition-all">Daily Reports</TabsTrigger>
            <TabsTrigger value="monthly" className="px-6 py-2 rounded-md transition-all">Monthly Reports</TabsTrigger>
            <TabsTrigger value="clients" className="px-6 py-2 rounded-md transition-all">Clients</TabsTrigger>
          </TabsList>
        </div>

        {activeTab !== 'clients' && (
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border shadow-sm mb-6">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label className="text-xs text-slate-500">Search Campaign or Client</Label>
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
            <div className="flex-1 min-w-[150px] space-y-1.5">
              <Label className="text-xs text-slate-500">Filter by Client</Label>
              <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <SelectValue placeholder="All Clients" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px] space-y-1.5">
              <Label className="text-xs text-slate-500">Filter by Date</Label>
              <Input type="date" className="h-9" value={dateFilter} onChange={e => handleDateFilterChange(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[150px] space-y-1.5">
              <Label className="text-xs text-slate-500">Filter by Month</Label>
              <Select value={monthFilter} onValueChange={handleMonthFilterChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end h-9 pt-6">
              {(selectedClientFilter !== "all" || dateFilter !== getLocalDateString() || searchQuery !== "" || monthFilter !== getLocalMonthString()) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-slate-500 hover:text-rose-600"
                  onClick={() => {
                    setSelectedClientFilter("all");
                    setDateFilter(getLocalDateString());
                    setMonthFilter(getLocalMonthString());
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}

        <TabsContent value="clients" className="mt-0 flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Client Campaigns</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search clients..." 
                  className="pl-10 h-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-auto flex-1 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
              {clients.filter(c => c.companyName.toLowerCase().includes(searchQuery.toLowerCase())).map(client => (
                <div 
                  key={client.id} 
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 h-fit cursor-pointer hover:shadow-md hover:border-brand-teal/30 transition-all duration-200 group relative"
                  onClick={() => handleViewClientReports(client.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-base">{client.companyName}</div>
                        <div className="text-sm text-slate-500">{client.campaigns?.filter((c: any) => typeof c === 'string' ? true : c.isActive).length || 0} active campaign(s)</div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-brand-teal flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      View Reports <TrendingUp className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    {client.campaigns?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {client.campaigns.map((campRaw: any) => {
                          const campName = typeof campRaw === 'string' ? campRaw : campRaw.name;
                          const isActive = typeof campRaw === 'string' ? true : campRaw.isActive;
                          return (
                          <div key={campName} className={`flex items-center gap-1.5 border px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                            <span className={`truncate max-w-[140px] ${!isActive && 'line-through decoration-slate-300'}`} title={campName}>{campName}</span>
                            {canEditMarketing && (
                              <div className="flex items-center gap-0.5 ml-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleCampaignStatus(client.id, campName); }} 
                                  className={`p-1 rounded transition-colors ${isActive ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                  title={isActive ? "Deactivate Campaign" : "Activate Campaign"}
                                >
                                  <Power className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRemoveCampaign(client.id, campName); }} 
                                  className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"
                                  title="Remove Campaign"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    ) : (
                      <div className="w-full py-5 border border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                        <span className="text-sm text-slate-400 italic">No campaigns added yet</span>
                      </div>
                    )}
                  </div>

                  {canAddMarketing && (
                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                      <div className="relative flex-1">
                        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="Add new campaign..." 
                          className="h-10 text-sm pl-9 bg-slate-50/50 border-slate-200 focus-visible:ring-brand-teal/30"
                          value={newCampaignName[client.id] || ""}
                          onChange={(e) => setNewCampaignName(prev => ({...prev, [client.id]: e.target.value}))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCampaign(client.id);
                          }}
                        />
                      </div>
                      <Button 
                        size="sm" 
                        className="h-10 px-4 bg-slate-400 hover:bg-slate-500 text-white transition-colors" 
                        onClick={() => handleAddCampaign(client.id)}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="daily" className="mt-0 flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto flex-1 custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-12 text-center font-bold text-slate-700">S.N</TableHead>
                  <TableHead className="font-bold text-slate-700">Date</TableHead>
                  <TableHead className="font-bold text-slate-700">Client</TableHead>
                  <TableHead className="font-bold text-slate-700">Campaign Name</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Reach</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Impressions</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Leads</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Followers</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Spend (₹)</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">CPL (₹)</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Remarks</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                      <p className="mt-2 text-slate-500">Loading daily reports...</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Integrated Quick Add Row */}
                    {canAddMarketing && (
                      <TableRow className="bg-brand-teal/5 border-b-2 border-brand-teal/10">
                        <TableCell className="text-center font-bold text-brand-teal">+</TableCell>
                        <TableCell className="p-1">
                          <Input type="date" className="h-8 text-[10px] bg-white" value={dailyFormData.date} onChange={e => setDailyFormData({...dailyFormData, date: e.target.value})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Select value={dailyFormData.clientId} onValueChange={v => setDailyFormData({...dailyFormData, clientId: v})}>
                            <SelectTrigger className="h-8 text-[10px] bg-white"><SelectValue placeholder="Client" /></SelectTrigger>
                            <SelectContent>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Select 
                            value={dailyFormData.campaignName} 
                            onValueChange={v => setDailyFormData({...dailyFormData, campaignName: v})}
                            disabled={!dailyFormData.clientId}
                          >
                            <SelectTrigger className="h-8 text-[10px] bg-white"><SelectValue placeholder="Campaign" /></SelectTrigger>
                            <SelectContent>
                              {dailyFormData.clientId ? clients.find(c => c.id === dailyFormData.clientId)?.campaigns?.filter((c: any) => (typeof c === 'string' ? true : c.isActive)).map((c: any) => {
                                const name = typeof c === 'string' ? c : c.name;
                                return <SelectItem key={name} value={name}>{name}</SelectItem>
                              }) : null}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={dailyFormData.reach || ""} onChange={e => setDailyFormData({...dailyFormData, reach: parseInt(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={dailyFormData.impression || ""} onChange={e => setDailyFormData({...dailyFormData, impression: parseInt(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={dailyFormData.leads || ""} onChange={e => setDailyFormData({...dailyFormData, leads: parseInt(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={dailyFormData.followers || ""} onChange={e => setDailyFormData({...dailyFormData, followers: parseInt(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={dailyFormData.spend || ""} onChange={e => setDailyFormData({...dailyFormData, spend: parseFloat(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" step="0.01" placeholder="0.00" className="h-8 text-[10px] text-center bg-white" value={dailyFormData.cpl || ""} onChange={e => setDailyFormData({...dailyFormData, cpl: parseFloat(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input placeholder="Remarks..." className="h-8 text-[10px] bg-white" value={dailyFormData.remarks || ""} onChange={e => setDailyFormData({...dailyFormData, remarks: e.target.value})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Button onClick={handleDailySubmit} size="sm" className="h-8 w-full bg-brand-teal hover:bg-brand-teal-light text-white text-[10px]">
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}

                    {filteredDaily.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-20 text-slate-400 italic">
                          No daily reports found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDaily.map((report, idx) => {
                        const globalIdx = (dailyPage - 1) * dailyItemsPerPage + idx + 1;
                        return (
                          <TableRow key={report.id} className="hover:bg-slate-50/50">
                              <TableCell className="text-center text-slate-400">{globalIdx}</TableCell>
                          
                          <TableCell 
                            className={`font-medium ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'date' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'date' ? (
                              <Input 
                                autoFocus
                                type="date" 
                                className="h-8 text-xs outline-none" 
                                defaultValue={normalizeDate(report.date)} 
                                onBlur={e => handleInlineUpdate(report.id, 'date', e.target.value, 'daily')}
                                onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'date', e.currentTarget.value, 'daily')}
                              />
                            ) : normalizeDate(report.date)}
                          </TableCell>

                           <TableCell 
                            className={`font-semibold text-slate-600 ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'client' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'client' ? (
                              <Select 
                                onValueChange={(v) => {
                                  const client = clients.find(c => c.id === v);
                                  handleInlineUpdate(report.id, { clientId: v, clientName: client?.companyName }, null, 'daily');
                                }}
                                defaultValue={report.clientId}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select Client" />
                                </SelectTrigger>
                                <SelectContent>
                                  {clients.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : report.clientName || "N/A"}
                          </TableCell>

                          <TableCell 
                            className={canEditMarketing ? "cursor-text hover:bg-slate-50" : ""}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'campaignName' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'campaignName' ? (
                              <Select 
                                onValueChange={(v) => handleInlineUpdate(report.id, 'campaignName', v, 'daily')}
                                defaultValue={report.campaignName}
                              >
                                <SelectTrigger className="h-8 text-xs outline-none">
                                  <SelectValue placeholder="Select Campaign" />
                                </SelectTrigger>
                                <SelectContent>
                                  {clients.find(c => c.id === report.clientId)?.campaigns?.filter((c: any) => (typeof c === 'string' ? true : c.isActive)).map((c: any) => {
                                    const name = typeof c === 'string' ? c : c.name;
                                    return <SelectItem key={name} value={name}>{name}</SelectItem>
                                  })}
                                </SelectContent>
                              </Select>
                            ) : report.campaignName}
                          </TableCell>

                          <TableCell 
                            className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'reach' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'reach' ? (
                              <Input 
                                autoFocus
                                type="number"
                                className="h-8 text-xs text-center outline-none" 
                                defaultValue={report.reach} 
                                onBlur={e => handleInlineUpdate(report.id, 'reach', parseInt(e.target.value) || 0, 'daily')}
                                onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'reach', parseInt(e.currentTarget.value) || 0, 'daily')}
                              />
                            ) : report.reach.toLocaleString()}
                          </TableCell>

                          <TableCell 
                            className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'impression' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'impression' ? (
                              <Input 
                                autoFocus
                                type="number"
                                className="h-8 text-xs text-center outline-none" 
                                defaultValue={report.impression} 
                                onBlur={e => handleInlineUpdate(report.id, 'impression', parseInt(e.target.value) || 0, 'daily')}
                                onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'impression', parseInt(e.currentTarget.value) || 0, 'daily')}
                              />
                            ) : report.impression.toLocaleString()}
                          </TableCell>

                          <TableCell 
                            className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'leads' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'leads' ? (
                              <Input 
                                autoFocus
                                type="number"
                                className="h-8 text-xs text-center outline-none" 
                                defaultValue={report.leads} 
                                onBlur={e => handleInlineUpdate(report.id, 'leads', parseInt(e.target.value) || 0, 'daily')}
                                onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'leads', parseInt(e.currentTarget.value) || 0, 'daily')}
                              />
                            ) : report.leads}
                          </TableCell>

                          <TableCell 
                            className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'followers' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'followers' ? (
                              <Input 
                                autoFocus
                                type="number"
                                className="h-8 text-xs text-center outline-none" 
                                defaultValue={report.followers} 
                                onBlur={e => handleInlineUpdate(report.id, 'followers', parseInt(e.target.value) || 0, 'daily')}
                                onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'followers', parseInt(e.currentTarget.value) || 0, 'daily')}
                              />
                            ) : report.followers || 0}
                          </TableCell>

                          <TableCell 
                            className={`text-center font-semibold text-brand-teal ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'spend' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'spend' ? (
                              <Input 
                                autoFocus
                                type="number"
                                step="0.01"
                                className="h-8 text-xs text-center outline-none" 
                                defaultValue={report.spend} 
                                onBlur={e => handleInlineUpdate(report.id, 'spend', parseFloat(e.target.value) || 0, 'daily')}
                                onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'spend', parseFloat(e.currentTarget.value) || 0, 'daily')}
                              />
                            ) : `₹${report.spend.toFixed(2)}`}
                          </TableCell>

                          <TableCell 
                            className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'cpl' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'cpl' ? (
                              <Input 
                                autoFocus
                                type="number"
                                step="0.01"
                                className="h-8 text-xs text-center outline-none" 
                                defaultValue={report.cpl} 
                                onBlur={e => handleInlineUpdate(report.id, 'cpl', parseFloat(e.target.value) || 0, 'daily')}
                                onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'cpl', parseFloat(e.currentTarget.value) || 0, 'daily')}
                              />
                            ) : `₹${report.cpl.toFixed(2)}`}
                          </TableCell>

                          <TableCell 
                            className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => {
                              if (canEditMarketing) {
                                setInlineEditing({ id: report.id, field: 'remarks' });
                              }
                            }}
                          >
                            {inlineEditing?.id === report.id && inlineEditing?.field === 'remarks' ? (
                              <Input 
                                autoFocus
                                className="h-8 text-xs text-center outline-none" 
                                defaultValue={report.remarks || ""} 
                                onBlur={e => handleInlineUpdate(report.id, 'remarks', e.target.value, 'daily')}
                                onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'remarks', e.currentTarget.value, 'daily')}
                              />
                            ) : report.remarks || "-"}
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                onClick={() => fetchLogs(report, "daily")}
                              >
                                <History className="w-4 h-4" />
                              </Button>

                              {canDeleteMarketing && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => handleDelete(report.id, "daily")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                            </TableRow>
                        );
                      })
                    )}
                  </>
                )}
              </TableBody>
              {filteredDaily.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2">
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold text-slate-900">Total</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{dailyTotals.reach.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{dailyTotals.impression.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{dailyTotals.leads.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{dailyTotals.followers.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-bold text-brand-teal">₹{dailyTotals.spend.toLocaleString()}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </tfoot>
              )}
              </Table>
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

        <TabsContent value="monthly" className="mt-0 flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto flex-1 custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-12 text-center font-bold text-slate-700">S.N</TableHead>
                  <TableHead className="font-bold text-slate-700">Client Name</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Month</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Total Spend</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Total Leads</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 whitespace-nowrap">Total Sales(Customer)</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Avg CPR</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Avg CPP</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Total Revenue</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Overall ROAS</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Conclusion</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                      <p className="mt-2 text-slate-500">Loading monthly reports...</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Integrated Quick Add Row Monthly */}
                    {canAddMarketing && (
                      <TableRow className="bg-brand-teal/5 border-b-2 border-brand-teal/10">
                        <TableCell className="text-center font-bold text-brand-teal">+</TableCell>
                        <TableCell className="p-1">
                          <Select value={monthlyFormData.clientId} onValueChange={v => {
                            const client = clients.find(c => c.id === v);
                            setMonthlyFormData({...monthlyFormData, clientId: v, clientName: client?.companyName || ""});
                          }}>
                            <SelectTrigger className="h-8 text-[10px] bg-white"><SelectValue placeholder="Client" /></SelectTrigger>
                            <SelectContent>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Select value={monthlyFormData.month} onValueChange={v => setMonthlyFormData({...monthlyFormData, month: v})}>
                            <SelectTrigger className="h-8 text-[10px] bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={monthlyFormData.totalSpend || ""} onChange={e => setMonthlyFormData({...monthlyFormData, totalSpend: parseFloat(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={monthlyFormData.totalLeads || ""} onChange={e => setMonthlyFormData({...monthlyFormData, totalLeads: parseInt(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={monthlyFormData.totalSales || ""} onChange={e => setMonthlyFormData({...monthlyFormData, totalSales: parseInt(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={monthlyFormData.avgCPR || ""} onChange={e => setMonthlyFormData({...monthlyFormData, avgCPR: parseFloat(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={monthlyFormData.avgCPP || ""} onChange={e => setMonthlyFormData({...monthlyFormData, avgCPP: parseFloat(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={monthlyFormData.totalRevenue || ""} onChange={e => setMonthlyFormData({...monthlyFormData, totalRevenue: parseFloat(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={monthlyFormData.overallROAS || ""} onChange={e => setMonthlyFormData({...monthlyFormData, overallROAS: parseFloat(e.target.value) || 0})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input placeholder="Conclusion..." className="h-8 text-[10px] bg-white" value={monthlyFormData.conclusion || ""} onChange={e => setMonthlyFormData({...monthlyFormData, conclusion: e.target.value})} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Button onClick={handleMonthlySubmit} size="sm" className="h-8 w-full bg-brand-teal hover:bg-brand-teal-light text-white text-[10px]">
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}

                    {filteredMonthly.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-20 text-slate-400 italic">
                          No monthly reports found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMonthly.map((report, idx) => (
                    <TableRow key={report.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-center text-slate-400">{(monthlyPage - 1) * monthlyItemsPerPage + idx + 1}</TableCell>

                      {/* Client Name Field */}
                      <TableCell 
                        className={`font-bold text-slate-700 ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'clientName' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'clientName' ? (
                          <Select 
                            onValueChange={(v) => {
                              const client = clients.find(c => c.id === v);
                              handleInlineUpdate(report.id, { clientId: v, clientName: client?.companyName }, null, 'monthly');
                            }}
                            defaultValue={report.clientId}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select Client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : report.clientName || "N/A"}
                      </TableCell>

                      {/* Month Field */}
                      <TableCell 
                        className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'month' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'month' ? (
                          <div className="flex justify-center">
                            <select 
                              autoFocus
                              className="h-8 text-xs border rounded px-1 outline-none"
                              defaultValue={report.month}
                              onBlur={e => handleInlineUpdate(report.id, 'month', e.target.value, 'monthly')}
                              onChange={e => handleInlineUpdate(report.id, 'month', e.target.value, 'monthly')}
                            >
                              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        ) : report.month}
                      </TableCell>

                      {/* Total Spend Field */}
                      <TableCell 
                        className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'totalSpend' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'totalSpend' ? (
                          <Input 
                            autoFocus
                            type="number"
                            className="h-8 text-xs text-center outline-none" 
                            defaultValue={report.totalSpend} 
                            onBlur={e => handleInlineUpdate(report.id, 'totalSpend', parseFloat(e.target.value) || 0, 'monthly')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'totalSpend', parseFloat(e.currentTarget.value) || 0, 'monthly')}
                          />
                        ) : `₹${report.totalSpend.toLocaleString()}`}
                      </TableCell>

                      {/* Total Leads Field */}
                      <TableCell 
                        className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'totalLeads' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'totalLeads' ? (
                          <Input 
                            autoFocus
                            type="number"
                            className="h-8 text-xs text-center outline-none" 
                            defaultValue={report.totalLeads} 
                            onBlur={e => handleInlineUpdate(report.id, 'totalLeads', parseInt(e.target.value) || 0, 'monthly')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'totalLeads', parseInt(e.currentTarget.value) || 0, 'monthly')}
                          />
                        ) : report.totalLeads}
                      </TableCell>

                      {/* Total Sales Field */}
                      <TableCell 
                        className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'totalSales' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'totalSales' ? (
                          <Input 
                            autoFocus
                            type="number"
                            className="h-8 text-xs text-center outline-none" 
                            defaultValue={report.totalSales} 
                            onBlur={e => handleInlineUpdate(report.id, 'totalSales', parseInt(e.target.value) || 0, 'monthly')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'totalSales', parseInt(e.currentTarget.value) || 0, 'monthly')}
                          />
                        ) : report.totalSales}
                      </TableCell>

                      {/* Avg CPR Field */}
                      <TableCell 
                        className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'avgCPR' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'avgCPR' ? (
                          <Input 
                            autoFocus
                            type="number"
                            className="h-8 text-xs text-center outline-none" 
                            defaultValue={report.avgCPR} 
                            onBlur={e => handleInlineUpdate(report.id, 'avgCPR', parseFloat(e.target.value) || 0, 'monthly')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'avgCPR', parseFloat(e.currentTarget.value) || 0, 'monthly')}
                          />
                        ) : `₹${report.avgCPR.toFixed(2)}`}
                      </TableCell>

                      {/* Avg CPP Field */}
                      <TableCell 
                        className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'avgCPP' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'avgCPP' ? (
                          <Input 
                            autoFocus
                            type="number"
                            className="h-8 text-xs text-center outline-none" 
                            defaultValue={report.avgCPP} 
                            onBlur={e => handleInlineUpdate(report.id, 'avgCPP', parseFloat(e.target.value) || 0, 'monthly')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'avgCPP', parseFloat(e.currentTarget.value) || 0, 'monthly')}
                          />
                        ) : `₹${report.avgCPP.toFixed(2)}`}
                      </TableCell>

                      {/* Total Revenue Field */}
                      <TableCell 
                        className={`text-center font-bold text-brand-teal ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'totalRevenue' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'totalRevenue' ? (
                          <Input 
                            autoFocus
                            type="number"
                            className="h-8 text-xs text-center outline-none" 
                            defaultValue={report.totalRevenue} 
                            onBlur={e => handleInlineUpdate(report.id, 'totalRevenue', parseFloat(e.target.value) || 0, 'monthly')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'totalRevenue', parseFloat(e.currentTarget.value) || 0, 'monthly')}
                          />
                        ) : `₹${report.totalRevenue.toLocaleString()}`}
                      </TableCell>

                      {/* ROAS Field */}
                      <TableCell 
                        className={`text-center ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'overallROAS' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'overallROAS' ? (
                          <Input 
                            autoFocus
                            type="number"
                            className="h-8 text-xs text-center outline-none" 
                            defaultValue={report.overallROAS} 
                            onBlur={e => handleInlineUpdate(report.id, 'overallROAS', parseFloat(e.target.value) || 0, 'monthly')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'overallROAS', parseFloat(e.currentTarget.value) || 0, 'monthly')}
                          />
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${report.overallROAS > 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {report.overallROAS.toFixed(2)}x
                          </span>
                        )}
                      </TableCell>

                      {/* Conclusion Field */}
                      <TableCell 
                        className={`text-sm text-slate-500 italic max-w-[200px] truncate ${canEditMarketing ? 'cursor-text hover:bg-slate-50' : ''}`}
                        onClick={() => {
                          if (canEditMarketing) {
                            setInlineEditing({ id: report.id, field: 'conclusion' });
                          }
                        }}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'conclusion' ? (
                          <Input 
                            autoFocus
                            className="h-8 text-xs outline-none" 
                            defaultValue={report.conclusion} 
                            onBlur={e => handleInlineUpdate(report.id, 'conclusion', e.target.value, 'monthly')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'conclusion', e.currentTarget.value, 'monthly')}
                          />
                        ) : report.conclusion || "-"}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                            onClick={() => fetchLogs(report, "monthly")}
                          >
                            <History className="w-4 h-4" />
                          </Button>

                          {canDeleteMarketing && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(report.id, "monthly")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    )))}
                </>
                )}
              </TableBody>
            {filteredMonthly.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2">
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold text-slate-900">Total</TableCell>
                  <TableCell className="text-center font-bold text-slate-900">₹{monthlyTotals.totalSpend.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900">{monthlyTotals.totalLeads.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900">{monthlyTotals.totalSales.toLocaleString()}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                  <TableCell className="text-center font-bold text-brand-teal">₹{monthlyTotals.totalRevenue.toLocaleString()}</TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </tfoot>
            )}
            </Table>
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
            <DialogTitle>{editingReport ? "Edit" : "Add"} Daily Marketing Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDailySubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={dailyFormData.date} onChange={e => setDailyFormData({...dailyFormData, date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Select 
                  value={dailyFormData.clientId} 
                  onValueChange={v => setDailyFormData({...dailyFormData, clientId: v})}
                >
                  <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input placeholder="e.g. Awareness Model View" value={dailyFormData.campaignName} onChange={e => setDailyFormData({...dailyFormData, campaignName: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Reach</Label>
                <Input type="number" value={dailyFormData.reach} onChange={e => setDailyFormData({...dailyFormData, reach: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Impressions</Label>
                <Input type="number" value={dailyFormData.impression} onChange={e => setDailyFormData({...dailyFormData, impression: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Leads</Label>
                <Input type="number" value={dailyFormData.leads} onChange={e => setDailyFormData({...dailyFormData, leads: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Spend (₹)</Label>
                <Input type="number" step="0.01" value={dailyFormData.spend} onChange={e => setDailyFormData({...dailyFormData, spend: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>CPL (₹)</Label>
                <Input type="number" step="0.01" value={dailyFormData.cpl} onChange={e => setDailyFormData({...dailyFormData, cpl: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Followers</Label>
                <Input type="number" value={dailyFormData.followers} onChange={e => setDailyFormData({...dailyFormData, followers: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input placeholder="e.g. High impression campaign" value={dailyFormData.remarks || ""} onChange={e => setDailyFormData({...dailyFormData, remarks: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-brand-teal text-white w-full">Save Daily Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Monthly Report Modal */}
      <Dialog open={isMonthlyModalOpen} onOpenChange={setIsMonthlyModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingReport ? "Edit" : "Add"} Monthly Marketing Summary</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMonthlySubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Select 
                  value={monthlyFormData.clientId} 
                  onValueChange={v => {
                    const client = clients.find(c => c.id === v);
                    setMonthlyFormData({...monthlyFormData, clientId: v, clientName: client?.companyName || ""});
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={monthlyFormData.month} onValueChange={v => setMonthlyFormData({...monthlyFormData, month: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Spend</Label>
                <Input type="number" value={monthlyFormData.totalSpend} onChange={e => setMonthlyFormData({...monthlyFormData, totalSpend: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Total Leads</Label>
                <Input type="number" value={monthlyFormData.totalLeads} onChange={e => setMonthlyFormData({...monthlyFormData, totalLeads: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Total Sales</Label>
                <Input type="number" value={monthlyFormData.totalSales} onChange={e => setMonthlyFormData({...monthlyFormData, totalSales: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Avg CPR</Label>
                <Input type="number" value={monthlyFormData.avgCPR} onChange={e => setMonthlyFormData({...monthlyFormData, avgCPR: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Avg CPP</Label>
                <Input type="number" value={monthlyFormData.avgCPP} onChange={e => setMonthlyFormData({...monthlyFormData, avgCPP: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Total Revenue</Label>
                <Input type="number" value={monthlyFormData.totalRevenue} onChange={e => setMonthlyFormData({...monthlyFormData, totalRevenue: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Overall ROAS</Label>
                <Input type="number" step="0.1" value={monthlyFormData.overallROAS} onChange={e => setMonthlyFormData({...monthlyFormData, overallROAS: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conclusion</Label>
              <Input placeholder="e.g. Good performance, highly profitable" value={monthlyFormData.conclusion || ""} onChange={e => setMonthlyFormData({...monthlyFormData, conclusion: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-brand-teal text-white w-full">Save Monthly Summary</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
