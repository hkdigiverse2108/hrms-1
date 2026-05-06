"use client";

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { PageHeader } from "@/components/common/PageHeader";
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
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
  History as HistoryIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_URL } from "@/lib/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadForm, LeadFormData } from "@/components/hrms/LeadForm";
import { FollowUpDialog } from "@/components/hrms/FollowUpDialog";
import { toast } from "sonner";
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

export default function SalesPage() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState("all");
  const [reportDateFilter, setReportDateFilter] = useState("");
  const [selectedLeadForLogs, setSelectedLeadForLogs] = useState<any>(null);
  const [leadLogs, setLeadLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);

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

  useEffect(() => {
    fetchLeads();
    fetchEmployees();
  }, []);

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
        setLeads(data);
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
          userName: user?.name
        }),
      });

      if (res.ok) {
        toast.success("Lead added successfully");
        setIsDialogOpen(false);
        fetchLeads();
      } else {
        toast.error("Failed to add lead");
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
          userName: user?.name
        }),
      });

      if (res.ok) {
        toast.success("Lead updated successfully");
        setEditingRowId(null);
        setEditFormData(null);
        fetchLeads();
      } else {
        toast.error("Failed to update lead");
      }
    } catch (err) {
      console.error("Error updating lead:", err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          performedBy: user?.id,
          userName: user?.name
        }),
      });

      if (res.ok) {
        toast.success(`Lead status updated to ${newStatus}`);
        fetchLeads();
      }
    } catch (err) {
      console.error("Error updating lead:", err);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      const res = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Lead deleted");
        fetchLeads();
      }
    } catch (err) {
      console.error("Error deleting lead:", err);
      toast.error("Failed to delete lead");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Client Won": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Client Won</Badge>;
      case "Client Loss": return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">Client Loss</Badge>;
      case "Proposal Sent": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Proposal Sent</Badge>;
      case "Contacted": return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">Contacted</Badge>;
      default: return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">{status}</Badge>;
    }
  };

  const activeLeads = leads.filter(l => l.status !== "Client Won");
  const convertedLeads = leads.filter(l => l.status === "Client Won");

  const totalRevenue = convertedLeads.reduce((acc, l) => {
    const val = parseFloat(l.expectedIncome?.replace(/[^0-9.]/g, "") || "0");
    return acc + val;
  }, 0);

  const stats = [
    { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, trend: "+12.5%", trendUp: true, icon: <DollarSign className="w-5 h-5" />, color: "text-emerald-600" },
    { title: "Active Leads", value: activeLeads.length.toString(), trend: "+5", trendUp: true, icon: <Users className="w-5 h-5" />, color: "text-blue-600" },
    { title: "Converted", value: convertedLeads.length.toString(), trend: "+2", trendUp: true, icon: <Target className="w-5 h-5" />, color: "text-amber-600" },
    { title: "Lead Source", value: "8 Active", trend: "High Qual", trendUp: true, icon: <TrendingUp className="w-5 h-5" />, color: "text-brand-teal" },
  ];

  const LeadTable = ({ data, type }: { data: any[], type: 'active' | 'converted' }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead Info</th>
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
          {data.filter(l => 
            l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
          ).map((lead) => {
            const isEditing = editingRowId === lead.id;
            return (
              <tr 
                key={lead.id} 
                className={`hover:bg-slate-50/80 transition-colors group ${isEditing ? 'bg-slate-50' : ''}`}
                onClick={() => {
                  if (!isEditing) {
                    setEditingRowId(lead.id);
                    setEditFormData(lead);
                  }
                }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col flex-1">
                      {isEditing ? (
                        <Input 
                          className="h-8 text-sm font-bold" 
                          value={editFormData.company} 
                          onChange={(e) => setEditFormData({...editFormData, company: e.target.value})} 
                        />
                      ) : (
                        <span className="font-bold text-slate-800 text-sm">{lead.company}</span>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                        <Calendar className="w-3 h-3" />
                        {isEditing ? (
                          <Input 
                            className="h-6 text-[10px] w-24 py-0" 
                            value={editFormData.date} 
                            onChange={(e) => setEditFormData({...editFormData, date: e.target.value})} 
                          />
                        ) : (
                          <>Created: {lead.date}</>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    {isEditing ? (
                      <Input 
                        className="h-8 text-[13px] font-bold" 
                        value={editFormData.contact} 
                        onChange={(e) => setEditFormData({...editFormData, contact: e.target.value})} 
                      />
                    ) : (
                      <span className="text-[13px] font-bold text-slate-700">{lead.contact}</span>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <Input 
                              className="h-6 text-[10px] w-full py-0" 
                              value={editFormData.email || ''} 
                              onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} 
                              placeholder="Email"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <Input 
                              className="h-6 text-[10px] w-full py-0" 
                              value={editFormData.phone || ''} 
                              onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} 
                              placeholder="Phone"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <a href={`mailto:${lead.email}`} className="text-slate-400 hover:text-brand-teal transition-colors">
                            <Mail className="w-3 h-3" />
                          </a>
                          <a href={`tel:${lead.phone}`} className="text-slate-400 hover:text-brand-teal transition-colors">
                            <Phone className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isEditing ? (
                    <Input 
                      className="h-8 text-[12px]" 
                      value={editFormData.source} 
                      onChange={(e) => setEditFormData({...editFormData, source: e.target.value})} 
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-teal/40" />
                      <span className="text-[12px] font-medium text-slate-600">{lead.source}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isEditing ? (
                    <Select value={editFormData.status} onValueChange={(val) => setEditFormData({...editFormData, status: val})}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                        <SelectItem value="Client Won">Client Won</SelectItem>
                        <SelectItem value="Client Loss">Client Loss</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getStatusBadge(lead.status)
                  )}
                </td>
                <td className="px-6 py-4">
                  {isEditing ? (
                    <Select value={editFormData.assignedTo || ""} onValueChange={(val) => setEditFormData({...editFormData, assignedTo: val})}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.name || emp.firstName}>{emp.name || emp.firstName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-[12px] font-bold text-brand-teal">{lead.assignedTo || "--"}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    {isEditing ? (
                      <Input 
                        className="h-8 text-sm font-bold" 
                        value={editFormData.expectedIncome} 
                        onChange={(e) => setEditFormData({...editFormData, expectedIncome: e.target.value})} 
                      />
                    ) : (
                      <span className="font-bold text-slate-900 text-sm">{lead.expectedIncome}</span>
                    )}
                    {type === 'converted' && !isEditing && (
                      <span className="text-[10px] text-emerald-600 font-bold uppercase mt-0.5">Won on {lead.closedDate}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isEditing ? (
                    <Input 
                      className="h-8 text-[12px]" 
                      value={editFormData.remarks} 
                      onChange={(e) => setEditFormData({...editFormData, remarks: e.target.value})} 
                    />
                  ) : (
                    <p className="text-[12px] text-slate-500 italic max-w-[120px] truncate" title={lead.remarks}>
                      "{lead.remarks || 'No remarks'}"
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  {!isEditing && (
                    <FollowUpDialog 
                      lead={lead} 
                      onUpdate={fetchLeads} 
                      userId={user?.id} 
                      userName={user?.name} 
                    />
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button 
                          size="sm" 
                          className="h-8 px-3 bg-brand-teal hover:bg-brand-teal-light text-white text-[10px] font-bold"
                          onClick={handleEditLead}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "..." : "Save"}
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm" 
                          className="h-8 px-3 text-[10px] font-bold text-slate-500"
                          onClick={() => {
                            setEditingRowId(null);
                            setEditFormData(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
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
                            <div className="h-px bg-slate-100 my-1" />
                            <DropdownMenuItem onClick={() => handleDeleteLead(lead.id)} className="text-red-600 focus:text-red-600 cursor-pointer font-medium">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Lead
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Management"
        description="Track leads, manage your sales pipeline, and monitor revenue growth in real-time."
      >
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
            <TabsTrigger value="converted" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold">
              Converted Successes ({convertedLeads.length})
            </TabsTrigger>
            {user?.role === "Admin" && (
              <TabsTrigger value="reports" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold">
                Performance Reports
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex items-center gap-2 mr-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-9 w-[200px] border-slate-200 focus-visible:ring-brand-teal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 border-slate-200 text-slate-600" onClick={fetchLeads}>
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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

            <TabsContent value="converted">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                  <LeadTable data={convertedLeads} type="converted" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-bold text-slate-700">Sales Performance Report</CardTitle>
                  <div className="flex items-center gap-3">
                    <Select value={reportEmployeeFilter} onValueChange={setReportEmployeeFilter}>
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue placeholder="Filter Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.name || emp.firstName}>{emp.name || emp.firstName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <Input 
                        type="date" 
                        className="h-8 pl-8 text-xs w-[140px]" 
                        value={reportDateFilter}
                        onChange={(e) => setReportDateFilter(e.target.value)}
                      />
                    </div>
                    {(reportEmployeeFilter !== "all" || reportDateFilter) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-[10px] text-slate-400 hover:text-slate-600"
                        onClick={() => {
                          setReportEmployeeFilter("all");
                          setReportDateFilter("");
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee Name</th>
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead (Company)</th>
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Income</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leads.filter(l => l.status === "Client Won")
                          .filter(l => reportEmployeeFilter === "all" || l.assignedTo === reportEmployeeFilter)
                          .filter(l => {
                            if (!reportDateFilter) return true;
                            const targetDate = dayjs(reportDateFilter).format('YYYY-MM-DD');
                            const leadClosedDate = l.closedDate ? dayjs(l.closedDate).format('YYYY-MM-DD') : null;
                            const leadDate = dayjs(l.date).format('YYYY-MM-DD');
                            
                            // Match either closed date or creation date if closed date is missing
                            return leadClosedDate === targetDate || (!leadClosedDate && leadDate === targetDate);
                          })
                          .sort((a, b) => new Date(b.closedDate || 0).getTime() - new Date(a.closedDate || 0).getTime())
                          .map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3 text-emerald-500" />
                                  {lead.closedDate || lead.date}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center text-[10px] font-bold uppercase">
                                    {(lead.assignedTo || "??").substring(0, 2)}
                                  </div>
                                  <span className="font-bold text-slate-700 text-sm">{lead.assignedTo || "Unassigned"}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-900 text-sm">{lead.company}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Converted</Badge>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm text-emerald-600">
                                {lead.expectedIncome}
                              </td>
                            </tr>
                          ))}
                        {leads.filter(l => l.status === "Client Won").length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                              No converted leads found for reporting.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 bg-brand-teal text-white">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <div className="p-2 bg-white/20 rounded-xl">
                <HistoryIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold opacity-80 uppercase tracking-widest leading-none mb-1">Lead History</div>
                <div className="leading-tight">{selectedLeadForLogs?.company}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50">
            {isLogsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                <p className="text-xs font-bold uppercase tracking-widest">Loading history...</p>
              </div>
            ) : leadLogs.length > 0 ? (
              <div className="space-y-4 relative">
                {leadLogs.map((log, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm mb-4 hover:border-brand-teal/30 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                       <span className="font-bold text-slate-900 text-[13px]">{log.userName}</span>
                       <span className="text-[11px] text-slate-400 font-semibold">{log.timestamp}</span>
                    </div>
                    
                    <div className="mb-4">
                       <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-[9px] font-black uppercase tracking-wider">
                         {log.action}
                       </span>
                    </div>

                    <div className="pl-4 border-l-[3px] border-slate-100 group-hover:border-brand-teal/20 transition-all text-[12.5px] text-slate-600 font-medium leading-relaxed">
                       {log.details}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <div className="p-4 bg-slate-100 rounded-full">
                   <HistoryIcon className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest italic">No activity logs found for this lead.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
            <Button 
              onClick={() => setIsLogsDialogOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] uppercase tracking-widest px-8 rounded-xl h-10"
            >
              Close History
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
