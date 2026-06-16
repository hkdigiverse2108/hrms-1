"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { 
  Users,
  User, 
  Plus, 
  Pencil, 
  Trash2, 
  Mail, 
  Phone, 
  Search, 
  Loader2, 
  LayoutGrid,
  History,
  ClipboardList,
  Filter,
  AlertCircle,
  CheckCircle2,
  CalendarClock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClientForm, ClientFormData } from "@/components/hrms/ClientForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { WhatsAppSmmDialog } from "@/components/hrms/WhatsAppSmmDialog";
import { WhatsAppIcon } from "@/components/hrms/WhatsAppIcon";
import { SmmMeetingDialog } from "@/components/hrms/SmmMeetingDialog";

const noScrollbarStyle = `
  .no-scrollbar::-webkit-scrollbar,
  [data-slot="table-container"]::-webkit-scrollbar {
    display: none !important;
  }
  .no-scrollbar,
  [data-slot="table-container"] {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }
`;

function EditableCell({ client, field, type = "text", options = [], value, render, align = "left", handleInlineUpdate, inlineEditing, setInlineEditing }: any) {
  const isEditing = inlineEditing?.id === client.id && inlineEditing?.field === field;
  return (
    <td 
      className={`px-4 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors ${align === 'center' ? 'text-center' : ''}`}
      onClick={() => setInlineEditing({ id: client.id, field })}
    >
      {isEditing ? (
        type === 'select' ? (
          <select 
            autoFocus
            className="w-full border rounded px-1 py-0.5 outline-none text-xs"
            defaultValue={client[field]}
            onBlur={(e) => handleInlineUpdate(client.id, field, e.target.value)}
            onChange={(e) => handleInlineUpdate(client.id, field, e.target.value)}
          >
            {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input 
            autoFocus
            type={type}
            className={`w-full border rounded px-2 py-1 outline-none text-sm ${align === 'center' ? 'text-center' : ''}`}
            defaultValue={client[field]}
            onBlur={(e) => handleInlineUpdate(client.id, field, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(client.id, field, e.currentTarget.value)}
          />
        )
      ) : render(client[field])}
    </td>
  );
}

export default function CreativeClientsPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { user } = useUser();
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [inlineEditing, setInlineEditing] = useState<{id: string, field: string} | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeClient, setActiveClient] = useState<any>(null);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waClient, setWaClient] = useState<any>(null);

  const [followupConfigOpen, setFollowupConfigOpen] = useState(false);
  const [followupConfigClient, setFollowupConfigClient] = useState<any>(null);
  const [followupTypeInput, setFollowupTypeInput] = useState("Interval");
  const [followupIntervalInput, setFollowupIntervalInput] = useState("");
  const [followupDaysOfWeekInput, setFollowupDaysOfWeekInput] = useState<number[]>([]);
  const [followupDatesOfMonthInput, setFollowupDatesOfMonthInput] = useState<number[]>([]);
  const [followupLastDateInput, setFollowupLastDateInput] = useState("");

  const [followupRemarkOpen, setFollowupRemarkOpen] = useState(false);
  const [followupRemarkClient, setFollowupRemarkClient] = useState<any>(null);
  const [followupRemarkText, setFollowupRemarkText] = useState("");

  const [followupHistoryLogs, setFollowupHistoryLogs] = useState<any[]>([]);
  const [isLoadingFollowupHistory, setIsLoadingFollowupHistory] = useState(false);
  
  const [newRemarkText, setNewRemarkText] = useState("");
  const [isAddingRemark, setIsAddingRemark] = useState(false);

  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingRemarkText, setEditingRemarkText] = useState("");

  const fetchFollowupHistory = async (client: any) => {
    setIsLoadingFollowupHistory(true);
    try {
      const res = await fetch(`${API_URL}/task-logs?clientId=${client.id}`);
      if (res.ok) {
        const data = await res.json();
        setFollowupHistoryLogs(data.filter((l: any) => l.action === "Follow-up Completed"));
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setIsLoadingFollowupHistory(false);
    }
  };

  const handleAddRemark = async () => {
    if (!followupConfigClient || !newRemarkText.trim()) return;
    setIsAddingRemark(true);
    try {
      const res = await fetch(`${API_URL}/task-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "Follow-up Completed",
          details: `Remark: ${newRemarkText}`,
          clientId: followupConfigClient.id,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        })
      });
      if (res.ok) {
        toast.success("Remark added");
        setNewRemarkText("");
        fetchFollowupHistory(followupConfigClient);
      } else {
        toast.error("Failed to add remark");
      }
    } catch (err) {
      console.error("Error adding remark:", err);
      toast.error("An error occurred");
    } finally {
      setIsAddingRemark(false);
    }
  };

  const handleUpdateRemark = async (logId: string) => {
    if (!editingRemarkText.trim() || !followupConfigClient) return;
    try {
      const res = await fetch(`${API_URL}/task-logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ details: `Remark: ${editingRemarkText}` })
      });
      if (res.ok) {
        toast.success("Remark updated");
        setEditingRemarkId(null);
        fetchFollowupHistory(followupConfigClient);
      } else {
        toast.error("Failed to update remark");
      }
    } catch (err) {
      console.error("Error updating remark:", err);
    }
  };

  const handleDeleteRemark = async (logId: string) => {
    if (!followupConfigClient || !window.confirm("Delete this remark?")) return;
    try {
      const res = await fetch(`${API_URL}/task-logs/${logId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Remark deleted");
        fetchFollowupHistory(followupConfigClient);
      } else {
        toast.error("Failed to delete remark");
      }
    } catch (err) {
      console.error("Error deleting remark:", err);
    }
  };

  const fetchLogs = async (client: any) => {
    setIsLoadingLogs(true);
    setLogsOpen(true);
    setActiveClient(client);
    try {
      const res = await fetch(`${API_URL}/task-logs?clientId=${client.id}`);
      if (res.ok) {
        setClientLogs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching client logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleInlineUpdate = async (clientId: string, field: string, value: any) => {
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          [field]: value,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (res.ok) {
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, [field]: value } : c));
      } else {
        toast.error("Failed to update field");
      }
    } catch (err) {
      console.error("Error updating client field:", err);
      toast.error("Connection error");
    }
    setInlineEditing(null);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients`);
      if (res.ok) {
        const data = await res.json();
        // Filter for Creative department only
        setClients(data.filter((c: any) => c.department === "Creative"));
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
      toast.error("Failed to load creative clients");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingClient 
        ? `${API_URL}/clients/${editingClient.id}` 
        : `${API_URL}/clients`;
      const method = editingClient ? "PUT" : "POST";

      const payload = {
        ...formData,
        department: "Creative", // Ensure department is set
        performedBy: user?.id,
        userName: user?.name || `${user?.firstName} ${user?.lastName}`,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchClients();
        setEditingClient(null);
        toast.success(editingClient ? "Client updated successfully" : "Client added successfully");
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to save client");
      }
    } catch (err) {
      console.error("Error saving client:", err);
      toast.error("Connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this creative client?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/clients/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchClients();
        toast.success("Client deleted");
      }
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  const handleFollowupCompleteWithRemark = async () => {
    if (!followupRemarkClient) return;
    try {
      if (followupRemarkText.trim()) {
        await fetch(`${API_URL}/task-logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Follow-up Completed",
            details: `Remark: ${followupRemarkText}`,
            clientId: followupRemarkClient.id,
            performedBy: user?.id,
            userName: user?.name || `${user?.firstName} ${user?.lastName}`,
          })
        });
      }
      
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/clients/${followupRemarkClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lastFollowupDate: today,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (res.ok) {
        toast.success("Follow-up completed");
        setFollowupRemarkOpen(false);
        fetchClients();
      } else {
        toast.error("Failed to mark follow-up");
      }
    } catch (err) {
      console.error("Error updating follow-up:", err);
      toast.error("An error occurred");
    }
  };

  const handleSaveFollowupConfig = async () => {
    if (!followupConfigClient) return;
    try {
      const res = await fetch(`${API_URL}/clients/${followupConfigClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          followupType: followupTypeInput,
          followupIntervalDays: parseInt(followupIntervalInput) || null,
          followupDaysOfWeek: followupDaysOfWeekInput,
          followupDatesOfMonth: followupDatesOfMonthInput,
          lastFollowupDate: followupLastDateInput || null,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (res.ok) {
        toast.success("Follow-up configuration saved");
        setFollowupConfigOpen(false);
        fetchClients();
      } else {
        toast.error("Failed to save follow-up configuration");
      }
    } catch (err) {
      console.error("Error saving follow-up config:", err);
      toast.error("An error occurred");
    }
  };

  const filteredClients = clients.filter(c => 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: noScrollbarStyle }} />
      <PageHeader
        title="Clients"
        description="Manage SMM specific deliverables and client requirements."
      />

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by client name, email..." 
            className="pl-10 h-10 border-slate-200 focus:border-brand-teal focus:ring-brand-teal"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-10 text-slate-600 gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Fetching dashboard...</p>
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className="border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group bg-white overflow-hidden flex flex-col"
              onClick={() => {
                router.push(`/work-management/smm/${client.id}`);
              }}
            >
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-brand-teal transition-colors">
                      {client.companyName}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                      <User className="w-4 h-4" /> {client.name || "N/A"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge className={client.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                      {client.status?.toUpperCase() || "ACTIVE"}
                    </Badge>
                    {client.nextFollowupDate && new Date(client.nextFollowupDate) <= new Date() && (
                      <div className="flex flex-col items-end gap-1.5 mt-1">
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 animate-pulse flex items-center gap-1 shadow-sm">
                          <AlertCircle className="w-3 h-3" />
                          Follow-up Due
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs px-2.5 bg-white text-rose-600 border-rose-200 hover:bg-rose-50 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFollowupRemarkClient(client);
                            setFollowupRemarkText("");
                            setFollowupRemarkOpen(true);
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Mark Done
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mt-2 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">Services:</span>
                    <span className="truncate">{client.services || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">Phone:</span>
                    <span>{client.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">Email:</span>
                    <span className="truncate">{client.email || "N/A"}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-slate-50 text-slate-500 font-medium border-slate-200">
                      {client.department || "Creative"}
                    </Badge>
                    {client.festivalPost === "Yes" && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                        Festival Post
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 z-10 text-slate-400 hover:text-brand-teal hover:bg-brand-teal/10"
                      title="Set Follow-up Rules"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFollowupConfigClient(client);
                        setFollowupTypeInput(client.followupType || "Interval");
                        setFollowupIntervalInput(client.followupIntervalDays ? String(client.followupIntervalDays) : "");
                        setFollowupDaysOfWeekInput(client.followupDaysOfWeek || []);
                        setFollowupDatesOfMonthInput(client.followupDatesOfMonth || []);
                        setFollowupLastDateInput(client.lastFollowupDate || "");
                        setFollowupConfigOpen(true);
                        fetchFollowupHistory(client);
                      }}
                    >
                      <CalendarClock className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost"  
                      size="icon" 
                      className={`h-8 w-8 z-10 ${client.whatsappGroup ? 'text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10' : 'text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10'}`}
                      title={client.whatsappGroup ? "Manage WhatsApp Group" : "Add WhatsApp Group"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setWaClient(client);
                        setWaDialogOpen(true);
                      }}
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                    </Button>
                    <SmmMeetingDialog 
                      client={client} 
                      onUpdate={fetchClients} 
                      userId={user?.userId} 
                      userName={user?.name} 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 z-10"
                      title="View Forms & Feedback"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/work-management/smm/${client.id}/feedback`);
                      }}
                    >
                      <ClipboardList className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-brand-teal hover:bg-teal-50 z-10"
                      title="Create Feedback Form"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/feedback-builder/${client.id}`);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10 z-10" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(client.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="text-slate-500 font-medium">No client found.</p>
        </div>
      )}
      
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
          </DialogHeader>
          <ClientForm
            initialData={editingClient || undefined}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <ActivityLogDialog 
        open={logsOpen} 
        onOpenChange={setLogsOpen}
        clientName={activeClient?.companyName || "Client"}
        logs={clientLogs}
        isLoading={isLoadingLogs}
      />

      {/* WhatsApp Dialog */}
      <WhatsAppSmmDialog
        open={waDialogOpen}
        onOpenChange={setWaDialogOpen}
        client={waClient}
        onSaved={fetchClients}
      />

      {/* Follow-up Config Dialog */}
      <Dialog open={followupConfigOpen} onOpenChange={setFollowupConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Follow-up Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <Select value={followupTypeInput} onValueChange={setFollowupTypeInput}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interval">Fixed Interval (Days)</SelectItem>
                  <SelectItem value="Weekly">Weekly (Specific Days)</SelectItem>
                  <SelectItem value="Monthly">Monthly (Specific Dates)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {followupTypeInput === "Interval" && (
              <div className="space-y-2">
                <Label>Follow-up Interval (Days)</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 7 for weekly" 
                  value={followupIntervalInput} 
                  onChange={(e) => setFollowupIntervalInput(e.target.value)} 
                />
              </div>
            )}
            
            {followupTypeInput === "Weekly" && (
              <div className="space-y-2">
                <Label>Select Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Mon", val: 0 },
                    { label: "Tue", val: 1 },
                    { label: "Wed", val: 2 },
                    { label: "Thu", val: 3 },
                    { label: "Fri", val: 4 },
                    { label: "Sat", val: 5 }
                  ].map(day => (
                    <Badge 
                      key={day.val}
                      variant={followupDaysOfWeekInput.includes(day.val) ? "default" : "outline"}
                      className={`cursor-pointer ${followupDaysOfWeekInput.includes(day.val) ? 'bg-brand-teal' : ''}`}
                      onClick={() => {
                        if (followupDaysOfWeekInput.includes(day.val)) {
                          setFollowupDaysOfWeekInput(followupDaysOfWeekInput.filter(d => d !== day.val));
                        } else {
                          setFollowupDaysOfWeekInput([...followupDaysOfWeekInput, day.val]);
                        }
                      }}
                    >
                      {day.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {followupTypeInput === "Monthly" && (
              <div className="space-y-2">
                <Label>Select Dates of Month (1-31)</Label>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length: 31}, (_, i) => i + 1).map(date => (
                    <div 
                      key={date}
                      className={`text-xs text-center p-1 cursor-pointer rounded ${followupDatesOfMonthInput.includes(date) ? 'bg-brand-teal text-white' : 'hover:bg-slate-100'}`}
                      onClick={() => {
                        if (followupDatesOfMonthInput.includes(date)) {
                          setFollowupDatesOfMonthInput(followupDatesOfMonthInput.filter(d => d !== date));
                        } else {
                          setFollowupDatesOfMonthInput([...followupDatesOfMonthInput, date]);
                        }
                      }}
                    >
                      {date}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 italic">Skips Sundays & Public Holidays automatically.</p>
            
            <div className="space-y-2">
              <Label>Last Follow-up Date</Label>
              <Input 
                type="date" 
                value={followupLastDateInput} 
                onChange={(e) => setFollowupLastDateInput(e.target.value)} 
              />
            </div>
            <div className="pt-4 flex justify-end gap-2 border-t mt-4">
              <Button variant="outline" onClick={() => setFollowupConfigOpen(false)}>Cancel</Button>
              <Button className="bg-brand-teal text-white hover:bg-brand-teal-light" onClick={handleSaveFollowupConfig}>Save Configuration</Button>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Label className="text-sm font-semibold mb-3 block text-slate-700">Past Follow-up Remarks</Label>
              
              <div className="flex gap-2 mb-4">
                <Input 
                  placeholder="Add a new remark..." 
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  size="icon" 
                  className="bg-brand-teal text-white hover:bg-brand-teal-light shrink-0"
                  onClick={handleAddRemark}
                  disabled={isAddingRemark || !newRemarkText.trim()}
                >
                  {isAddingRemark ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {isLoadingFollowupHistory ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-brand-teal" /></div>
                ) : followupHistoryLogs.length > 0 ? (
                  followupHistoryLogs.map((log: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 group">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                          <span className="text-[10px] text-slate-400">{log.userName}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-brand-teal" onClick={() => {
                            setEditingRemarkId(log.id);
                            setEditingRemarkText(log.details.replace('Remark: ', ''));
                          }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-rose-600" onClick={() => handleDeleteRemark(log.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {editingRemarkId === log.id ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <textarea 
                            value={editingRemarkText} 
                            onChange={e => setEditingRemarkText(e.target.value)} 
                            className="w-full text-xs p-2 border border-brand-teal/50 rounded resize-none focus:outline-none focus:ring-1 focus:ring-brand-teal" 
                            rows={2} 
                            autoFocus 
                          />
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setEditingRemarkId(null)}>Cancel</Button>
                            <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleUpdateRemark(log.id)}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{log.details.replace('Remark: ', '')}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-4 bg-slate-50 rounded border border-slate-100">No past follow-ups found.</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up Remark Dialog */}
      <Dialog open={followupRemarkOpen} onOpenChange={setFollowupRemarkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Follow-up Remark (Optional)</Label>
              <textarea 
                className="w-full min-h-[100px] border border-slate-200 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"
                placeholder="Enter notes about this follow-up..."
                value={followupRemarkText}
                onChange={(e) => setFollowupRemarkText(e.target.value)}
              />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFollowupRemarkOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleFollowupCompleteWithRemark}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
