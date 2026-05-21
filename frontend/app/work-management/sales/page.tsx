"use client";

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
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
  History as HistoryIcon
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
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";

export default function SalesPage() {
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const canViewSales = isAdmin || checkPermission('sales', 'canView');
  const canAddSales = isAdmin || checkPermission('sales', 'canAdd');
  const canEditSales = isAdmin || checkPermission('sales', 'canEdit');
  const canDeleteSales = isAdmin || checkPermission('sales', 'canDelete');

  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineDateFilter, setPipelineDateFilter] = useState("today");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState("all");
  const [reportDateFilter, setReportDateFilter] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedLeadForLogs, setSelectedLeadForLogs] = useState<any>(null);
  const [leadLogs, setLeadLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
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
    targetAmount: 0
  });

  const [slabForm, setSlabForm] = useState({
    minAmount: 0,
    maxAmount: 0,
    percentage: 0
  });
  const [isSlabDialogOpen, setIsSlabDialogOpen] = useState(false);

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
    const existing = targets.find(t => 
      t.employeeId === targetForm.employeeId && 
      t.month === targetForm.month && 
      t.year === targetForm.year &&
      t.type === targetForm.type &&
      (targetForm.type === "Monthly" || t.week === targetForm.week)
    );
    if (existing) {
      setTargetForm(prev => ({ ...prev, targetAmount: existing.targetAmount }));
    } else {
      setTargetForm(prev => ({ ...prev, targetAmount: 0 }));
    }
  }, [targetForm.employeeId, targetForm.month, targetForm.year, targetForm.type, targetForm.week, targets]);

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
        setSlabForm({ minAmount: 0, maxAmount: 0, percentage: 0 });
      }
    } catch (err) {
      toast.error("Failed to create slab");
    }
  };

  const handleDeleteSlab = async (id: string) => {
    if (!confirm("Delete this slab?")) return;
    try {
      const res = await fetch(`${API_URL}/incentive-slabs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Slab deleted");
        fetchIncentiveSlabs();
      }
    } catch (err) {
      toast.error("Failed to delete slab");
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
        toast.error(`Update failed: ${res.status}`);
      }
    } catch (err) {
      toast.error("Network error: Could not reach backend");
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

  const handleUpsertTarget = async () => {
    if (!targetForm.employeeId || targetForm.targetAmount <= 0) {
      toast.error("Please select an employee and set a valid target amount");
      return;
    }
    setIsTargetSubmitting(true);
    try {
      const employee = employees.find(e => e.id === targetForm.employeeId);
      const res = await fetch(`${API_URL}/sales-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetForm,
          employeeName: employee?.name || employee?.firstName
        }),
      });

      if (res.ok) {
        toast.success("Target set successfully");
        fetchTargets();
      } else {
        toast.error("Failed to set target");
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
        toast.error("Failed to award incentive");
      }
    } catch (err) {
      console.error("Error awarding incentive:", err);
      toast.error("An error occurred");
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

  const activeLeads = leads.filter(l => {
    const isNotWon = l.status !== "Client Won";
    if (pipelineDateFilter === "today") {
      const today = dayjs().format('YYYY-MM-DD');
      const leadDate = dayjs(l.date).format('YYYY-MM-DD');
      return isNotWon && leadDate === today;
    }
    return isNotWon;
  });

  const convertedLeads = leads.filter(l => {
    const isWon = l.status === "Client Won";
    if (pipelineDateFilter === "today") {
      const today = dayjs().format('YYYY-MM-DD');
      const leadClosedDate = l.closedDate ? dayjs(l.closedDate).format('YYYY-MM-DD') : dayjs(l.date).format('YYYY-MM-DD');
      return isWon && leadClosedDate === today;
    }
    return isWon;
  });

  const totalRevenue = convertedLeads.reduce((acc, l) => {
    const val = parseFloat(l.expectedIncome?.replace(/[^0-9.]/g, "") || "0");
    return acc + val;
  }, 0);

  const monthlyTargets = targets.filter(t => t.month === selectedMonth && t.year === selectedYear);
  const totalMonthlyTarget = monthlyTargets.reduce((acc, t) => acc + t.targetAmount, 0);
  
  const monthlyAchievement = leads.filter(l => {
    if (l.status !== "Client Won") return false;
    const leadDate = l.closedDate ? dayjs(l.closedDate) : dayjs(l.date);
    return leadDate.format("MMMM") === selectedMonth && leadDate.year() === selectedYear;
  }).reduce((acc, l) => {
    const val = parseFloat(l.expectedIncome?.replace(/[^0-9.]/g, "") || "0");
    return acc + val;
  }, 0);

  const achievementRate = totalMonthlyTarget > 0 ? (monthlyAchievement / totalMonthlyTarget) * 100 : 0;

  const myTarget = targets.find(t => t.employeeName === user?.name && t.month === selectedMonth && t.year === selectedYear);
  const myAchievement = leads.filter(l => {
    if (l.status !== "Client Won" || l.assignedTo === user?.name) {
      const leadDate = l.closedDate ? dayjs(l.closedDate) : dayjs(l.date);
      return l.status === "Client Won" && l.assignedTo === user?.name && leadDate.format("MMMM") === selectedMonth && leadDate.year() === selectedYear;
    }
    return false;
  }).reduce((acc, l) => {
    const val = parseFloat(l.expectedIncome?.replace(/[^0-9.]/g, "") || "0");
    return acc + val;
  }, 0);
  
  const myProgress = myTarget?.targetAmount > 0 ? (myAchievement / myTarget.targetAmount) * 100 : 0;

  const stats = [
    { title: "Monthly Revenue", value: `₹${monthlyAchievement.toLocaleString()}`, trend: "+12.5%", trendUp: true, icon: <IndianRupee className="w-5 h-5" />, color: "text-emerald-600" },
    { title: "Monthly Progress", value: `${achievementRate.toFixed(1)}%`, trend: `₹${monthlyAchievement.toLocaleString()}`, trendUp: achievementRate >= 100, icon: <Target className="w-5 h-5" />, color: "text-indigo-600" },
    { title: "Active Leads", value: activeLeads.length.toString(), trend: "+5", trendUp: true, icon: <Users className="w-5 h-5" />, color: "text-blue-600" },
    { title: "Target (Monthly)", value: `₹${totalMonthlyTarget.toLocaleString()}`, trend: selectedMonth, trendUp: true, icon: <TrendingUp className="w-5 h-5" />, color: "text-brand-teal" },
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
                  if (canEditSales && !isEditing) {
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
                      <span className="font-bold text-slate-900 text-sm">₹{lead.expectedIncome}</span>
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
                  {canEditSales && !isEditing && (
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

          {myTarget && (
            <div className="hidden sm:flex items-center gap-3 bg-white/50 backdrop-blur-sm border border-slate-200/50 rounded-xl px-4 py-2 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">My {selectedMonth} Target</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-800">₹{myAchievement.toLocaleString()} / ₹{myTarget.targetAmount.toLocaleString()}</span>
                  <div className="w-12 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${myProgress >= 100 ? 'bg-emerald-500' : 'bg-brand-teal'} transition-all`} 
                      style={{ width: `${Math.min(myProgress, 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${myProgress >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-teal/10 text-brand-teal'}`}>
                {myProgress.toFixed(0)}%
              </div>
            </div>
          )}

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
            <TabsTrigger value="converted" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold">
              Converted Successes ({convertedLeads.length})
            </TabsTrigger>
            <TabsTrigger value="targets" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold">
              Monthly Targets
            </TabsTrigger>
            {canEditSales && (
              <>
                <TabsTrigger value="reports" className="data-[state=active]:bg-white data-[state=active]:text-brand-teal data-[state=active]:shadow-sm px-6 py-2 text-sm font-bold">
                  Performance Reports
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="flex items-center gap-2 mr-2">
            <Select value={pipelineDateFilter} onValueChange={setPipelineDateFilter}>
              <SelectTrigger className="h-9 w-[130px] border-slate-200 text-slate-600 font-bold text-xs bg-slate-50/50">
                <Calendar className="w-3.5 h-3.5 mr-2 text-brand-teal" />
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today Only</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-9 w-[180px] border-slate-200 focus-visible:ring-brand-teal"
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
                              {employees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.firstName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

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

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            Target Amount (₹) {targets.some(t => t.employeeId === targetForm.employeeId && t.month === targetForm.month && t.year === targetForm.year && t.type === targetForm.type && (targetForm.type === "Monthly" || t.week === targetForm.week)) && <span className="text-brand-teal ml-1">(Existing)</span>}
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
                      <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-bold text-slate-700">Incentive Slabs</CardTitle>
                        <Dialog open={isSlabDialogOpen} onOpenChange={setIsSlabDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold text-brand-teal border-brand-teal/20 hover:bg-brand-teal/5">
                              <Plus className="w-3 h-3 mr-1" /> Add Slab
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Add Incentive Slab</DialogTitle>
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
                              <Button className="w-full bg-brand-teal text-white font-bold" onClick={handleCreateSlab}>Create Slab</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                          {incentiveSlabs.map((slab) => (
                            <div key={slab.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                              <div className="space-y-0.5">
                                <div className="text-sm font-bold text-slate-700">₹{slab.minAmount.toLocaleString()} - ₹{slab.maxAmount.toLocaleString()}</div>
                                <div className="text-[10px] font-black text-brand-teal uppercase tracking-widest">{slab.percentage}% Incentive</div>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleDeleteSlab(slab.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {incentiveSlabs.length === 0 && <div className="p-6 text-center text-xs text-slate-400 italic">No slabs configured</div>}
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
                          {targets.filter(t => canEditSales || t.employeeName === user?.name).length > 0 ? (
                            targets
                              .filter(t => canEditSales || t.employeeName === user?.name)
                              .sort((a,b) => b.year - a.year || (a.type === "Weekly" ? 1 : -1))
                              .map((t, i) => {
                                const achieved = leads.filter(l => {
                                  if (l.status !== "Client Won" || l.assignedTo !== t.employeeName) return false;
                                  const leadDate = l.closedDate ? dayjs(l.closedDate) : dayjs(l.date);
                                  
                                  // Month/Year check
                                  const monthMatch = leadDate.format("MMMM") === t.month && leadDate.year() === t.year;
                                  if (!monthMatch) return false;

                                  // Weekly check
                                  if (t.type === "Weekly") {
                                    const dayOfMonth = leadDate.date();
                                    const weekNum = Math.ceil(dayOfMonth / 7);
                                    return weekNum === t.week;
                                  }
                                  return true;
                                }).reduce((acc, l) => {
                                  const val = parseFloat(l.expectedIncome?.replace(/[^0-9.]/g, "") || "0");
                                  return acc + val;
                                }, 0);
                                
                                const percent = t.targetAmount > 0 ? (achieved / t.targetAmount) * 100 : 0;
                                
                                // Auto-calculate incentive based on slabs if incentiveAmount is 0
                                let earnedIncentive = t.incentiveAmount || 0;
                                if (earnedIncentive === 0 && achieved > 0) {
                                  const applicableSlab = incentiveSlabs.find(s => achieved >= s.minAmount && achieved <= s.maxAmount);
                                  if (applicableSlab) {
                                    earnedIncentive = (achieved * applicableSlab.percentage) / 100;
                                  }
                                }

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
                                      <Badge className={`${t.type === 'Weekly' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'} border-none text-[10px] font-bold`}>
                                        {t.type}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-slate-600">{t.month} {t.year}</span>
                                        {t.type === "Weekly" && <span className="text-[9px] font-black text-brand-teal uppercase">Week {t.week}</span>}
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
                                        {t.incentiveAmount === 0 && earnedIncentive > 0 && <span className="text-[8px] font-black text-slate-400 uppercase italic">Estimated</span>}
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
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-brand-teal hover:text-brand-teal hover:bg-brand-teal/10">
                                                Award
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-sm">
                                              <DialogHeader>
                                                <DialogTitle className="text-sm">Award Performance Incentive</DialogTitle>
                                              </DialogHeader>
                                              <div className="space-y-4 py-4">
                                                <div className="space-y-1.5">
                                                  <Label className="text-[10px] uppercase font-black text-slate-400">Incentive Amount (₹)</Label>
                                                  <Input 
                                                    type="number" 
                                                    defaultValue={earnedIncentive}
                                                    className="h-10 text-sm font-bold"
                                                    id={`incentive-${t.id}`}
                                                  />
                                                </div>
                                                <Button 
                                                  className="w-full bg-brand-teal hover:bg-brand-teal-light text-white font-bold"
                                                  onClick={() => {
                                                    const input = document.getElementById(`incentive-${t.id}`) as HTMLInputElement;
                                                    handleAwardIncentive(t, parseFloat(input.value));
                                                  }}
                                                >
                                                  Confirm Award
                                                </Button>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                          {canDeleteSales && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-rose-500" onClick={async () => {
                                              if (confirm("Delete target?")) {
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

      <ActivityLogDialog 
        open={isLogsDialogOpen}
        onOpenChange={setIsLogsDialogOpen}
        title="Lead History"
        subtitle={selectedLeadForLogs?.company}
        logs={leadLogs}
        isLoading={isLogsLoading}
      />
    </div>
  );
}
