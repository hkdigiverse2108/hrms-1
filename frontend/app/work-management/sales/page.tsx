"use client";

import React, { useState, useEffect } from "react";
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
  Trash2
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

export default function SalesPage() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

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
      case "Closed Won": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Closed Won</Badge>;
      case "Negotiation": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Negotiation</Badge>;
      case "Proposal Sent": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Proposal Sent</Badge>;
      case "Contacted": return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">Contacted</Badge>;
      default: return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">{status}</Badge>;
    }
  };

  const activeLeads = leads.filter(l => l.status !== "Closed Won");
  const convertedLeads = leads.filter(l => l.status === "Closed Won");

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
          ).map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200/50">
                    {lead.company.substring(0, 1)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{lead.company}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <Calendar className="w-3 h-3" />
                      Created: {lead.date}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-slate-700">{lead.contact}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <a href={`mailto:${lead.email}`} className="text-slate-400 hover:text-brand-teal transition-colors">
                      <Mail className="w-3 h-3" />
                    </a>
                    <a href={`tel:${lead.phone}`} className="text-slate-400 hover:text-brand-teal transition-colors">
                      <Phone className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-teal/40" />
                  <span className="text-[12px] font-medium text-slate-600">{lead.source}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                {getStatusBadge(lead.status)}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-sm">{lead.expectedIncome}</span>
                  {type === 'converted' && (
                    <span className="text-[10px] text-emerald-600 font-bold uppercase mt-0.5">Won on {lead.closedDate}</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-[12px] text-slate-500 italic max-w-[120px] truncate" title={lead.remarks}>
                  "{lead.remarks || 'No remarks'}"
                </p>
              </td>
              <td className="px-6 py-4">
                <FollowUpDialog 
                  lead={lead} 
                  onUpdate={fetchLeads} 
                  userId={user?.id} 
                  userName={user?.name} 
                />
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {type === 'active' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] font-extrabold border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white uppercase tracking-tighter"
                      onClick={() => handleUpdateStatus(lead.id, "Closed Won")}
                    >
                      Win Lead
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeleteLead(lead.id)} className="text-red-600 focus:text-red-600 cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Lead
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
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
          </>
        )}
      </Tabs>
    </div>
  );
}
