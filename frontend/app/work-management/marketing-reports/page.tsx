"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Download, 
  Calendar as CalendarIcon,
  TrendingUp,
  BarChart3,
  FileText,
  Loader2,
  History,
  ClipboardList,
  Edit2,
  Trash2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function MarketingReportsPage() {
  const { user } = useUser();
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

  const [dateFilter, setDateFilter] = useState("");

  // Form States
  const [dailyFormData, setDailyFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    campaignName: "",
    clientId: "",
    reach: 0,
    impression: 0,
    leads: 0,
    spend: 0,
    cpl: 0
  });

  const [monthlyFormData, setMonthlyFormData] = useState({
    clientId: "",
    clientName: "",
    month: new Date().toLocaleString('default', { month: 'long' }),
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
    fetchData();
    fetchClients();
  }, [activeTab, selectedClientFilter, dateFilter]);

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
      if (dateFilter) params.append("date", dateFilter);
      
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
          date: new Date().toISOString().split('T')[0],
          campaignName: "",
          clientId: "",
          reach: 0,
          impression: 0,
          leads: 0,
          spend: 0,
          cpl: 0
        });
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to save daily report");
    }
  };

  const handleMonthlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to save monthly report");
    }
  };

  const handleDelete = async (id: string, type: "daily" | "monthly") => {
    if (!confirm("Are you sure you want to delete this report?")) return;
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
  }, [searchQuery, selectedClientFilter, dateFilter]);

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
    const matchesDate = !dateFilter || r.date === dateFilter;
    return matchesSearch && matchesClient && matchesDate;
  });

  const filteredMonthly = monthlyReports.filter(r => {
    const matchesSearch = r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.month.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = selectedClientFilter === "all" || r.clientId === selectedClientFilter;
    return matchesSearch && matchesClient;
  });

  // Pagination Logic
  const paginatedDaily = filteredDaily.slice((dailyPage - 1) * dailyItemsPerPage, dailyPage * dailyItemsPerPage);
  const paginatedMonthly = filteredMonthly.slice((monthlyPage - 1) * monthlyItemsPerPage, monthlyPage * monthlyItemsPerPage);

  const dailyTotals = filteredDaily.reduce((acc, curr) => ({
    reach: acc.reach + (curr.reach || 0),
    impression: acc.impression + (curr.impression || 0),
    leads: acc.leads + (curr.leads || 0),
    spend: acc.spend + (curr.spend || 0)
  }), { reach: 0, impression: 0, leads: 0, spend: 0 });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* Report Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xl font-bold">
                <History className="w-6 h-6 text-brand-teal" />
                Report Activity History
              </div>
              {activeReport && (
                <p className="text-sm font-medium text-muted-foreground ml-8 italic">
                  Showing updates for: "{activeReport.type === 'daily' ? activeReport.campaignName : activeReport.clientName}"
                </p>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6 custom-scrollbar">
            {isLoadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                <p className="text-sm text-muted-foreground font-medium">Fetching history...</p>
              </div>
            ) : reportLogs.length > 0 ? (
              <div className="space-y-4">
                {reportLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center font-bold text-brand-teal">
                          {log.userName?.split(' ').map((n:any) => n[0]).join('') || '?'}
                        </div>
                        <span className="font-bold text-slate-800">{log.userName}</span>
                      </div>
                      <span className="text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{log.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 border-l-2 border-slate-100 pl-3 leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-slate-800">No History Recorded</p>
                  <p className="text-sm text-muted-foreground max-w-[250px]">
                    Actions performed on this report will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t text-center">
            <Button variant="secondary" onClick={() => setLogsOpen(false)} className="w-full sm:w-auto">
              Close History
            </Button>
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
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => {
              setEditingReport(null);
              if (activeTab === "daily") setIsDailyModalOpen(true);
              else setIsMonthlyModalOpen(true);
            }}
            className="bg-brand-teal hover:bg-brand-teal-light text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === "daily" ? "Daily" : "Monthly"} Report
          </Button>
        </div>
      </div>

      {/* Tabs & Search */}
      <Tabs defaultValue="daily" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="daily" className="px-6 py-2 rounded-md transition-all">Daily Reports</TabsTrigger>
            <TabsTrigger value="monthly" className="px-6 py-2 rounded-md transition-all">Monthly Reports</TabsTrigger>
          </TabsList>
        </div>

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
              <Input type="date" className="h-9" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            </div>
            <div className="flex items-end h-9 pt-6">
              {(selectedClientFilter !== "all" || dateFilter || searchQuery) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-slate-500 hover:text-rose-600"
                  onClick={() => {
                    setSelectedClientFilter("all");
                    setDateFilter("");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

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
                  <TableHead className="text-center font-bold text-slate-700">Spend (₹)</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">CPL (₹)</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                      <p className="mt-2 text-slate-500">Loading daily reports...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredDaily.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20 text-slate-400 italic">
                      No daily reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Integrated Quick Add Row */}
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
                        <Input placeholder="Campaign..." className="h-8 text-[10px] bg-white" value={dailyFormData.campaignName} onChange={e => setDailyFormData({...dailyFormData, campaignName: e.target.value})} />
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
                        <Input type="number" placeholder="0" className="h-8 text-[10px] text-center bg-white" value={dailyFormData.spend || ""} onChange={e => setDailyFormData({...dailyFormData, spend: parseFloat(e.target.value) || 0})} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" step="0.01" placeholder="0.00" className="h-8 text-[10px] text-center bg-white" value={dailyFormData.cpl || ""} onChange={e => setDailyFormData({...dailyFormData, cpl: parseFloat(e.target.value) || 0})} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Button onClick={handleDailySubmit} size="sm" className="h-8 w-full bg-brand-teal hover:bg-brand-teal-light text-white text-[10px]">
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </TableCell>
                    </TableRow>

                    {paginatedDaily.map((report, idx) => {
                      // Calculate global index for S.N
                      const globalIdx = (dailyPage - 1) * dailyItemsPerPage + idx + 1;
                      
                      return (
                        <TableRow key={report.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-center text-slate-400">{globalIdx}</TableCell>
                      
                      <TableCell 
                        className="font-medium cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'date' })}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'date' ? (
                          <Input 
                            autoFocus
                            type="date" 
                            className="h-8 text-xs outline-none" 
                            defaultValue={report.date} 
                            onBlur={e => handleInlineUpdate(report.id, 'date', e.target.value, 'daily')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'date', e.currentTarget.value, 'daily')}
                          />
                        ) : report.date}
                      </TableCell>

                       <TableCell 
                        className="font-semibold text-slate-600 cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'client' })}
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
                        className="cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'campaignName' })}
                      >
                        {inlineEditing?.id === report.id && inlineEditing?.field === 'campaignName' ? (
                          <Input 
                            autoFocus
                            className="h-8 text-xs outline-none" 
                            defaultValue={report.campaignName} 
                            onBlur={e => handleInlineUpdate(report.id, 'campaignName', e.target.value, 'daily')}
                            onKeyDown={e => e.key === 'Enter' && handleInlineUpdate(report.id, 'campaignName', e.currentTarget.value, 'daily')}
                          />
                        ) : report.campaignName}
                      </TableCell>

                      <TableCell 
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'reach' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'impression' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'leads' })}
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
                        className="text-center font-semibold text-brand-teal cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'spend' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'cpl' })}
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

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => handleDelete(report.id, "daily")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                        </TableRow>
                      );
                    })}
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
                    <TableCell className="text-center font-bold text-brand-teal">₹{dailyTotals.spend.toLocaleString()}</TableCell>
                    <TableCell colSpan={2}></TableCell>
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
                    <TableCell colSpan={10} className="text-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                      <p className="mt-2 text-slate-500">Loading monthly reports...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredMonthly.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-20 text-slate-400 italic">
                      No monthly reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Integrated Quick Add Row Monthly */}
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

                    {paginatedMonthly.map((report, idx) => (
                    <TableRow key={report.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-center text-slate-400">{(monthlyPage - 1) * monthlyItemsPerPage + idx + 1}</TableCell>

                      {/* Client Name Field */}
                      <TableCell 
                        className="font-bold text-slate-700 cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'clientName' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'month' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'totalSpend' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'totalLeads' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'totalSales' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'avgCPR' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'avgCPP' })}
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
                        className="text-center font-bold text-brand-teal cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'totalRevenue' })}
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
                        className="text-center cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'overallROAS' })}
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
                        className="text-sm text-slate-500 italic max-w-[200px] truncate cursor-text hover:bg-slate-50"
                        onClick={() => setInlineEditing({ id: report.id, field: 'conclusion' })}
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

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => handleDelete(report.id, "monthly")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={dailyFormData.date} onChange={e => setDailyFormData({...dailyFormData, date: e.target.value})} required />
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
