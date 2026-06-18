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
  CalendarClock,
  Banknote,
  CreditCard,
  Star,
  UserPlus,
  SlidersHorizontal,
  Video,
  Image as ImageIcon,
  PenTool,
  ChevronDown,
  ChevronsUpDown,
  Check,
  MoreHorizontal
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
import { PendingWorkEmbedded } from "@/components/hrms/PendingWorkEmbedded";
import { FeedbackReviewsEmbedded } from "@/components/hrms/FeedbackReviewsEmbedded";
import { ClientReviewDialog } from "@/components/hrms/ClientReviewDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SearchableEmployeeSelect = ({ value, onChange, placeholder, employees }: { value: string, onChange: (val: string) => void, placeholder: string, employees: any[] }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedEmp = employees.find((e: any) => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10 border-slate-200">
          {selectedEmp ? (selectedEmp.name || `${selectedEmp.firstName} ${selectedEmp.lastName}`) : (value === "none" ? <span className="italic text-slate-500">None</span> : <span className="text-slate-500">{placeholder}</span>)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 bg-slate-50/50">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
          <input 
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          <div
             className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-slate-100 transition-colors ${value === "none" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600"}`}
             onClick={() => { onChange("none"); setOpen(false); setSearch(""); }}
          >
            <Check className={`mr-2 h-4 w-4 text-brand-teal ${value === "none" ? "opacity-100" : "opacity-0"}`} />
            <span className="italic">None</span>
          </div>
          {employees.filter((e: any) => {
            const term = search.toLowerCase();
            const name = (e.name || `${e.firstName} ${e.lastName}`).toLowerCase();
            const dept = (e.department || "").toLowerCase();
            return name.includes(term) || dept.includes(term);
          }).map((emp: any) => (
             <div 
               key={emp.id}
               className={`relative flex justify-between cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-slate-100 transition-colors ${value === emp.id ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700"}`}
               onClick={() => { onChange(emp.id); setOpen(false); setSearch(""); }}
             >
               <div className="flex items-center truncate">
                 <Check className={`mr-2 h-4 w-4 shrink-0 text-brand-teal ${value === emp.id ? "opacity-100" : "opacity-0"}`} />
                 <span className="truncate">{emp.name || `${emp.firstName} ${emp.lastName}`}</span>
               </div>
               {emp.department && <span className="ml-2 shrink-0 text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md truncate max-w-[100px]">{emp.department}</span>}
             </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

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
  const [masterFilter, setMasterFilter] = useState("all");
  const [inlineEditing, setInlineEditing] = useState<{id: string, field: string} | null>(null);

  // Advanced Filters
  const [creativeFilter, setCreativeFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  
  // Creative Team Assignment
  const [creativeEmployees, setCreativeEmployees] = useState<any[]>([]);
  const [assignTeamClient, setAssignTeamClient] = useState<any>(null);
  const [assignTeamOpen, setAssignTeamOpen] = useState(false);
  const [scriptwriterId, setScriptwriterId] = useState("");
  const [reelEditorId, setReelEditorId] = useState("");
  const [postDesignerId, setPostDesignerId] = useState("");

  const [logsOpen, setLogsOpen] = useState(false);
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeClient, setActiveClient] = useState<any>(null);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waClient, setWaClient] = useState<any>(null);

  const [followupConfigOpen, setFollowupConfigOpen] = useState(false);
  const [greetingsLogsOpen, setGreetingsLogsOpen] = useState(false);
  const [greetingsLogsClient, setGreetingsLogsClient] = useState<any>(null);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewClient, setReviewClient] = useState<any>(null);

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
  
  const [paymentConfigOpen, setPaymentConfigOpen] = useState(false);
  const [paymentConfigClient, setPaymentConfigClient] = useState<any>(null);
  const [paymentFrequencyInput, setPaymentFrequencyInput] = useState("One-Time");
  const [paymentCustomDaysInput, setPaymentCustomDaysInput] = useState("");
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentDatesInput, setPaymentDatesInput] = useState<number[]>([]);
  const [paymentLastDateInput, setPaymentLastDateInput] = useState("");
  const [paymentNextDateInput, setPaymentNextDateInput] = useState("");
  
  const [feedbackConfigOpen, setFeedbackConfigOpen] = useState(false);
  const [feedbackConfigProject, setFeedbackConfigProject] = useState<any>(null);
  const [feedbackTypeInput, setFeedbackTypeInput] = useState("Interval");
  const [feedbackIntervalInput, setFeedbackIntervalInput] = useState("");
  const [feedbackDaysOfWeekInput, setFeedbackDaysOfWeekInput] = useState<number[]>([]);
  const [feedbackDatesOfMonthInput, setFeedbackDatesOfMonthInput] = useState<number[]>([]);
  const [feedbackLastDateInput, setFeedbackLastDateInput] = useState("");
  const [feedbackNextDateInput, setFeedbackNextDateInput] = useState("");
  
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
        
        const today = new Date().toISOString().split('T')[0];
        const projectId = clientProjects[followupConfigClient.id]?.id;
        
        if (projectId) {
          await fetch(`${API_URL}/projects/${projectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              lastFollowupDate: today,
              performedBy: user?.id,
              userName: user?.name || `${user?.firstName} ${user?.lastName}`,
            }),
          });
          fetchClients();
        }
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

  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [clientProjects, setClientProjects] = useState<Record<string, any>>({});
  const [calendarSettings, setCalendarSettings] = useState<Record<string, any>>({});
  const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const [res, ccRes, pRes, settingsRes, empRes] = await Promise.all([
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/content-calendar/all`),
        fetch(`${API_URL}/projects${user ? `?userId=${user.id}&role=${user.role}` : ''}`),
        fetch(`${API_URL}/content-calendar-settings/all?monthYear=${currentMonthYear}`),
        fetch(`${API_URL}/employees`)
      ]);
      
      let clientsData = [];
      if (res.ok) {
        clientsData = await res.json();
      }

      if (ccRes.ok) {
        const entries = await ccRes.json();
        const counts: Record<string, number> = {};
        entries.forEach((entry: any) => {
          let pending = 0;
          if (entry.scriptDate && !entry.scriptLink) pending++;
          if (entry.shootDate && !entry.shootLink) pending++;
          if (entry.editingStart && !entry.finalReelLink) pending++;
          if (entry.approval && entry.isApproved !== 'Yes') pending++;
          if (entry.postingDate && !entry.postingLinkOfIg) pending++;

          if (pending > 0) {
            counts[entry.clientId] = (counts[entry.clientId] || 0) + pending;
          }
        });
        setPendingCounts(counts);
      }
      
      if (settingsRes && settingsRes.ok) {
        const settingsList = await settingsRes.json();
        const settingsMap: Record<string, any> = {};
        settingsList.forEach((s: any) => {
          settingsMap[s.clientId] = s;
        });
        setCalendarSettings(settingsMap);
      }

      if (pRes.ok) {
        const projects = await pRes.json();
        const projectMap: Record<string, any> = {};
        projects.forEach((p: any) => {
          if (p.clientId && p.department === 'Creative') {
            projectMap[p.clientId] = p;
          }
        });
        setClientProjects(projectMap);
        
        // Filter for Creative department AND must have a creative project
        const validClientIds = new Set(Object.keys(projectMap));
        setClients(clientsData.filter((c: any) => c.department?.includes("Creative") && validClientIds.has(c.id)));
      } else {
        setClients(clientsData.filter((c: any) => c.department?.includes("Creative")));
      }

      if (empRes.ok) {
        const emps = await empRes.json();
        setCreativeEmployees(emps); // No longer filtering, user requested all employees
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
      const projectId = clientProjects[followupRemarkClient.id]?.id;
      
      if (projectId) {
        const res = await fetch(`${API_URL}/projects/${projectId}`, {
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
      } else {
        toast.error("No active project found for this client to mark follow-up.");
      }
    } catch (err) {
      console.error("Error updating follow-up:", err);
      toast.error("An error occurred");
    }
  };

  const handleSavePaymentConfig = async () => {
    if (!paymentConfigClient) return;
    try {
      const res = await fetch(`${API_URL}/clients/${paymentConfigClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentFrequency: paymentFrequencyInput,
          paymentCustomDays: parseInt(paymentCustomDaysInput) || null,
          paymentAmount: parseFloat(paymentAmountInput) || 0,
          paymentDatesOfMonth: paymentDatesInput,
          lastPaymentDate: paymentLastDateInput || null,
          nextPaymentDueDate: paymentNextDateInput || null,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (res.ok) {
        toast.success("Payment configuration saved");
        setPaymentConfigOpen(false);
        fetchClients();
      } else {
        toast.error("Failed to save payment configuration");
      }
    } catch (err) {
      console.error("Error saving payment config:", err);
      toast.error("An error occurred");
    }
  };

  const handleSaveTeamAssignment = async () => {
    if (!assignTeamClient) return;
    const project = clientProjects[assignTeamClient.id];
    if (!project) {
      toast.error("No creative project found for this client");
      return;
    }
    
    const scriptwriter = creativeEmployees.find(e => e.id === scriptwriterId);
    const reelEditor = creativeEmployees.find(e => e.id === reelEditorId);
    const postDesigner = creativeEmployees.find(e => e.id === postDesignerId);
    
    try {
      const res = await fetch(`${API_URL}/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assignedScriptwriterId: scriptwriterId === "none" ? null : scriptwriterId || null,
          assignedScriptwriterName: scriptwriterId === "none" ? null : scriptwriter?.name || null,
          assignedReelEditorId: reelEditorId === "none" ? null : reelEditorId || null,
          assignedReelEditorName: reelEditorId === "none" ? null : reelEditor?.name || null,
          assignedPostDesignerId: postDesignerId === "none" ? null : postDesignerId || null,
          assignedPostDesignerName: postDesignerId === "none" ? null : postDesigner?.name || null,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (res.ok) {
        toast.success("Team assigned successfully");
        setAssignTeamOpen(false);
        fetchClients();
      } else {
        toast.error("Failed to assign team");
      }
    } catch (err) {
      console.error("Error assigning team:", err);
      toast.error("An error occurred");
    }
  };

  const handleMarkPaymentDone = async (client: any) => {
    const today = new Date().toISOString().split('T')[0];
    let nextDate = null;
    
    if (client.paymentFrequency === "Monthly" && client.paymentDatesOfMonth?.length > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      d.setDate(client.paymentDatesOfMonth[0]);
      nextDate = d.toISOString().split('T')[0];
    } else if (client.paymentFrequency === "Half-Monthly" && client.paymentDatesOfMonth?.length > 0) {
       const d = new Date();
       d.setDate(d.getDate() + 15);
       nextDate = d.toISOString().split('T')[0];
    } else if (client.paymentFrequency === "Quarterly" && client.paymentDatesOfMonth?.length > 0) {
       const d = new Date();
       d.setMonth(d.getMonth() + 3);
       d.setDate(client.paymentDatesOfMonth[0]);
       nextDate = d.toISOString().split('T')[0];
    } else if (client.paymentFrequency === "Yearly" && client.paymentDatesOfMonth?.length > 0) {
       const d = new Date();
       d.setFullYear(d.getFullYear() + 1);
       d.setDate(client.paymentDatesOfMonth[0]);
       nextDate = d.toISOString().split('T')[0];
    } else if (client.paymentFrequency === "Custom" && client.paymentCustomDays) {
       const d = new Date();
       d.setDate(d.getDate() + client.paymentCustomDays);
       nextDate = d.toISOString().split('T')[0];
    }

    try {
      const res = await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lastPaymentDate: today,
          nextPaymentDueDate: nextDate,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (res.ok) {
        toast.success("Payment marked as done");
        
        await fetch(`${API_URL}/task-logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Payment Logged",
            details: `Payment recorded on ${today}.`,
            clientId: client.id,
            performedBy: user?.id,
            userName: user?.name || `${user?.firstName} ${user?.lastName}`,
          })
        });

        fetchClients();
      } else {
        toast.error("Failed to update payment");
      }
    } catch (err) {
      console.error("Error marking payment done:", err);
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

  const handleSaveFeedbackConfig = async () => {
    if (!feedbackConfigProject) return;
    try {
      const res = await fetch(`${API_URL}/projects/${feedbackConfigProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          feedbackType: feedbackTypeInput,
          feedbackIntervalDays: parseInt(feedbackIntervalInput) || null,
          feedbackDaysOfWeek: feedbackDaysOfWeekInput,
          feedbackDatesOfMonth: feedbackDatesOfMonthInput,
          lastFeedbackDate: feedbackLastDateInput || null,
          nextFeedbackDate: feedbackNextDateInput || null,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (res.ok) {
        toast.success("Feedback configuration saved");
        setFeedbackConfigOpen(false);
        fetchClients();
      } else {
        toast.error("Failed to save feedback configuration");
      }
    } catch (err) {
      console.error("Error saving feedback config:", err);
      toast.error("An error occurred");
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;

    const projectStatus = clientProjects[c.id]?.status || "";
    const isOnHold = projectStatus.toLowerCase() === "on-hold";
    const isFollowupDue = clientProjects[c.id]?.nextFollowupDate && new Date(clientProjects[c.id].nextFollowupDate) <= new Date();
    const isPaymentDue = c.nextPaymentDueDate && new Date(c.nextPaymentDueDate) <= new Date();
    const hasPendingWork = pendingCounts[c.id] > 0;

    switch(masterFilter) {
      case 'whatsapp-submitted': return !!c.whatsappGroup;
      case 'whatsapp-pending': return !c.whatsappGroup;
      case 'greetings-sent': return !!c.greetingsMsgSent;
      case 'greetings-pending': return !c.greetingsMsgSent;
      case 'payment-due': return !!isPaymentDue;
      case 'followup-due': return !!isFollowupDue;
      case 'active': return !isOnHold;
      case 'on-hold': return isOnHold;
      case 'festival-post': return (clientProjects[c.id]?.festivalPost === "Yes") || c.festivalPost === "Yes";
      case 'pending-work': return hasPendingWork;
      case 'meeting-done': return c.meetings && c.meetings.length > 0;
      case 'meeting-not-done': return !c.meetings || c.meetings.length === 0;
      default: return true;
    }
  }).filter(c => {
    if (creativeFilter !== "all") {
      const p = clientProjects[c.id] || {};
      const isAssigned = (p.assignedScriptwriterId || c.assignedScriptwriterId) === creativeFilter || 
                         (p.assignedReelEditorId || c.assignedReelEditorId) === creativeFilter ||
                         (p.assignedPostDesignerId || c.assignedPostDesignerId) === creativeFilter;
      if (!isAssigned) return false;
    }

    if (serviceFilter !== "all") {
      const p = clientProjects[c.id] || {};
      if (serviceFilter === "reel" && p.reelRequired !== "Yes" && (p.reel || 0) <= 0 && c.reelRequired !== "Yes" && (c.reel || 0) <= 0) return false;
      if (serviceFilter === "post" && p.postRequired !== "Yes" && (p.post || 0) <= 0 && c.postRequired !== "Yes" && (c.post || 0) <= 0) return false;
      if (serviceFilter === "graphics" && p.graphicsRequired !== "Yes" && c.graphicsRequired !== "Yes" && !c.graphics) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: noScrollbarStyle }} />
      <PageHeader
        title="Social Media Management"
        description="Streamline client deliverables, track campaign progress, and centralize SMM communications."
      />

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by client name, email..." 
              className="pl-10 h-10 border-slate-200 focus:border-brand-teal focus:ring-brand-teal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={`h-10 shrink-0 gap-2 border-slate-200 ${creativeFilter !== 'all' || serviceFilter !== 'all' ? 'bg-brand-teal/5 text-brand-teal border-brand-teal/30' : ''}`}>
                <SlidersHorizontal className="w-4 h-4" />
                Advanced Filters
                {(creativeFilter !== 'all' || serviceFilter !== 'all') && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-brand-teal text-white">Active</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-xl border-slate-200" align="start">
              <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-semibold text-slate-700 text-sm">Master Filters</h4>
                {(creativeFilter !== 'all' || serviceFilter !== 'all') && (
                  <button onClick={() => { setCreativeFilter('all'); setServiceFilter('all'); }} className="text-xs text-slate-400 hover:text-rose-500 font-medium">Clear All</button>
                )}
              </div>
              <div className="p-4 space-y-5">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Required</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setServiceFilter(serviceFilter === 'reel' ? 'all' : 'reel')}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all ${serviceFilter === 'reel' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Video className="w-4 h-4" />
                      <span className="text-[11px] font-medium">Reels</span>
                    </button>
                    <button 
                      onClick={() => setServiceFilter(serviceFilter === 'post' ? 'all' : 'post')}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all ${serviceFilter === 'post' ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <PenTool className="w-4 h-4" />
                      <span className="text-[11px] font-medium">Posts</span>
                    </button>
                    <button 
                      onClick={() => setServiceFilter(serviceFilter === 'graphics' ? 'all' : 'graphics')}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all ${serviceFilter === 'graphics' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-[11px] font-medium">Graphics</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Team Member</Label>
                  <Select value={creativeFilter} onValueChange={setCreativeFilter}>
                    <SelectTrigger className="w-full h-10 border-slate-200">
                      <SelectValue placeholder="All Creative Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-medium">All Team Members</SelectItem>
                      {creativeEmployees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-[9px] bg-brand-teal/10 text-brand-teal">{emp.name?.substring(0,2).toUpperCase() || emp.firstName?.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span>{emp.name || `${emp.firstName} ${emp.lastName}`}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>


        <Button onClick={() => router.push('/feedback-builder/common')} className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 w-full md:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          Create Feedback Form
        </Button>
        <Button onClick={() => router.push('/work-management/smm/common/feedback')} className="h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 gap-2 w-full md:w-auto shrink-0 border border-slate-200">
          <ClipboardList className="w-4 h-4" />
          View Common Forms
        </Button>
      </div>

      <div className="w-full mb-6 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex items-center gap-2 w-max">
          {[
            { value: "all", label: "All Clients" },
            { value: "active", label: "Active Projects" },
            { value: "pending-work", label: "Pending Work" },
            { value: "reviews", label: "Client Reviews" },
            { value: "payment-due", label: "Payment Due" },
            { value: "followup-due", label: "Follow-up Due" },
            { value: "on-hold", label: "On Hold Projects" },
            { value: "festival-post", label: "Festival Post" },
            { value: "whatsapp-submitted", label: "WA Submitted" },
            { value: "whatsapp-pending", label: "WA Pending" },
            { value: "greetings-sent", label: "Greetings Sent" },
            { value: "greetings-pending", label: "Greetings Pending" },
            { value: "meeting-done", label: "Meeting Done" },
            { value: "meeting-not-done", label: "Meeting Not Done" },
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setMasterFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                masterFilter === filter.value 
                  ? "bg-brand-teal text-white shadow-md shadow-brand-teal/20" 
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-brand-teal hover:border-brand-teal/30"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Fetching dashboard...</p>
        </div>
      ) : masterFilter === 'pending-work' ? (
        <PendingWorkEmbedded />
      ) : masterFilter === 'reviews' ? (
        <FeedbackReviewsEmbedded />
      ) : filteredClients.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md min-h-[calc(100vh-260px)]" data-slot="table-container">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Company</th>
                  <th className="px-6 py-4 whitespace-nowrap">Project</th>
                  <th className="px-6 py-4 whitespace-nowrap">Contact Name</th>
                  <th className="px-6 py-4 whitespace-nowrap">Phone</th>
                  <th className="px-6 py-4 whitespace-nowrap">Email</th>
                  <th className="px-6 py-4 whitespace-nowrap">Services</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div 
                          className="font-semibold text-brand-teal text-base underline underline-offset-2 hover:text-brand-teal/80 transition-colors cursor-pointer pl-2"
                          onClick={() => router.push(`/work-management/smm/${client.id}`)}
                        >
                          {client.companyName || "N/A"}
                        </div>
                        {pendingCounts[client.id] > 0 && (
                          <Badge 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/work-management/smm/pending?client=${client.id}`);
                            }}
                            className="bg-rose-700 hover:bg-rose-800 text-[10px] px-1.5 py-0 cursor-pointer"
                          >
                            {pendingCounts[client.id]} Pending
                          </Badge>
                        )}
                      </div>
                      {calendarSettings[client.id] && calendarSettings[client.id].approvalStatus && calendarSettings[client.id].approvalStatus !== "Approved by Client" && calendarSettings[client.id].approvalStatus !== "Pending" && (
                        <div className="mt-2 text-[10px] font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 inline-block w-full max-w-full">
                          <span className="font-semibold">{calendarSettings[client.id].approvalStatus}</span>
                          {calendarSettings[client.id].statusLogs && calendarSettings[client.id].statusLogs.length > 0 && calendarSettings[client.id].statusLogs[calendarSettings[client.id].statusLogs.length - 1].reason && (
                            <div className="text-rose-500 font-normal truncate mt-0.5" title={calendarSettings[client.id].statusLogs[calendarSettings[client.id].statusLogs.length - 1].reason}>
                              Reason: {calendarSettings[client.id].statusLogs[calendarSettings[client.id].statusLogs.length - 1].reason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-700 text-sm font-medium">
                        {clientProjects[client.id]?.title || <span className="text-slate-400 italic font-normal">No active project</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-700">
                        <div className="bg-slate-100 p-1 rounded-md text-slate-500">
                          <User className="w-3.5 h-3.5" /> 
                        </div>
                        <span 
                          className="cursor-pointer hover:text-brand-teal font-medium"
                          onClick={() => setInlineEditing({ id: client.id, field: 'name' })}
                        >
                          {client.name || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <div className="bg-slate-100 p-1 rounded-md text-slate-500">
                          <Phone className="w-3 h-3" /> 
                        </div>
                        <span 
                          className="cursor-pointer hover:text-brand-teal transition-colors"
                          onClick={() => setInlineEditing({ id: client.id, field: 'phone' })}
                        >
                          {client.phone || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <div className="bg-slate-100 p-1 rounded-md text-slate-500">
                          <Mail className="w-3 h-3" /> 
                        </div>
                        <span 
                          className="cursor-pointer hover:text-brand-teal transition-colors truncate max-w-[180px]"
                          onClick={() => setInlineEditing({ id: client.id, field: 'email' })}
                        >
                          {client.email || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div 
                          className="cursor-pointer hover:text-brand-teal transition-colors line-clamp-2 max-w-[220px] font-medium text-slate-700"
                          onClick={() => setInlineEditing({ id: client.id, field: 'services' })}
                        >
                          {clientProjects[client.id]?.services || client.services || "N/A"}
                        </div>
                        {(clientProjects[client.id]?.festivalPost === "Yes" || client.festivalPost === "Yes") && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200/60 font-medium px-2 py-0.5 shadow-sm">
                            Festival Post
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2.5">
                        {(() => {
                          const projectStatus = clientProjects[client.id]?.status || "";
                          const isOnHold = projectStatus.toLowerCase() === "on-hold";
                          const displayText = isOnHold ? "ON HOLD" : "ACTIVE";
                          return (
                            <Badge className={!isOnHold ? "bg-emerald-50 text-emerald-600 border-emerald-200/60 shadow-sm font-semibold" : "bg-red-50 text-red-600 border-red-200/60 shadow-sm font-semibold"}>
                              {displayText}
                            </Badge>
                          );
                        })()}
                        {clientProjects[client.id]?.nextFollowupDate && new Date(clientProjects[client.id].nextFollowupDate) <= new Date() && (
                          <Badge 
                            className="bg-rose-50 text-rose-600 border-rose-200/60 animate-pulse flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-rose-100 hover:text-rose-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFollowupRemarkClient(client);
                              setFollowupRemarkText("");
                              setFollowupRemarkOpen(true);
                            }}
                          >
                            <AlertCircle className="w-3 h-3" />
                            Follow-up Due
                          </Badge>
                        )}
                        {client.nextPaymentDueDate && new Date(client.nextPaymentDueDate) <= new Date() && (
                          <Badge 
                            className="bg-orange-50 text-orange-600 border-orange-200/60 flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-orange-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkPaymentDone(client);
                            }}
                            title="Click to mark as Paid"
                          >
                            <Banknote className="w-3 h-3" />
                            Payment Due
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-100 transition-all duration-200">
                        <SmmMeetingDialog 
                          client={client} 
                          onUpdate={fetchClients} 
                          userId={user?.userId} 
                          userName={user?.name} 
                        />
                        <Button 
                          variant="ghost"  
                          size="icon" 
                          className={`h-9 w-9 rounded-full ${client.whatsappGroup ? 'text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10' : 'text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10'}`}
                          title={client.whatsappGroup ? "Manage WhatsApp Group" : "Add WhatsApp Group"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setWaClient(client);
                            setWaDialogOpen(true);
                          }}
                        >
                          <WhatsAppIcon className="w-4.5 h-4.5" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-slate-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4.5 h-4.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel className="text-xs text-slate-500 font-normal">Manage Client</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setAssignTeamClient(client);
                              const p = clientProjects[client.id] || {};
                              setScriptwriterId(p.assignedScriptwriterId || client.assignedScriptwriterId || "none");
                              setReelEditorId(p.assignedReelEditorId || client.assignedReelEditorId || "none");
                              setPostDesignerId(p.assignedPostDesignerId || client.assignedPostDesignerId || "none");
                              setAssignTeamOpen(true);
                            }}>
                              <UserPlus className="w-4 h-4 mr-2" /> Assign Creative Team
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setPaymentConfigClient(client);
                              setPaymentFrequencyInput(client.paymentFrequency || "One-Time");
                              setPaymentCustomDaysInput(client.paymentCustomDays ? String(client.paymentCustomDays) : "");
                              setPaymentAmountInput(client.paymentAmount ? String(client.paymentAmount) : "");
                              setPaymentDatesInput(client.paymentDatesOfMonth || []);
                              setPaymentLastDateInput(client.lastPaymentDate || "");
                              setPaymentNextDateInput(client.nextPaymentDueDate || "");
                              setPaymentConfigOpen(true);
                            }}>
                              <CreditCard className="w-4 h-4 mr-2" /> Payment Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setFollowupConfigClient(client);
                              setFollowupTypeInput(client.followupType || "Interval");
                              setFollowupIntervalInput(client.followupIntervalDays ? String(client.followupIntervalDays) : "");
                              setFollowupDaysOfWeekInput(client.followupDaysOfWeek || []);
                              setFollowupDatesOfMonthInput(client.followupDatesOfMonth || []);
                              setFollowupLastDateInput(client.lastFollowupDate || "");
                              setFollowupConfigOpen(true);
                              fetchFollowupHistory(client);
                            }}>
                              <CalendarClock className="w-4 h-4 mr-2" /> Follow-up Rules
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              const p = clientProjects[client.id];
                              if (p) {
                                setFeedbackConfigProject(p);
                                setFeedbackTypeInput(p.feedbackType || "Interval");
                                setFeedbackIntervalInput(p.feedbackIntervalDays ? String(p.feedbackIntervalDays) : "");
                                setFeedbackDaysOfWeekInput(p.feedbackDaysOfWeek || []);
                                setFeedbackDatesOfMonthInput(p.feedbackDatesOfMonth || []);
                                setFeedbackLastDateInput(p.lastFeedbackDate || "");
                                setFeedbackNextDateInput(p.nextFeedbackDate || "");
                                setFeedbackConfigOpen(true);
                              } else {
                                toast.error("No active project found for this client.");
                              }
                            }}>
                              <History className="w-4 h-4 mr-2 text-emerald-600" /> Feedback Collection
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setReviewClient(client);
                              setReviewDialogOpen(true);
                            }}>
                              <Star className="w-4 h-4 mr-2 text-amber-500" /> Client Reviews
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/work-management/smm/${client.id}/feedback`);
                            }}>
                              <ClipboardList className="w-4 h-4 mr-2 text-indigo-600" /> View Forms & Feedback
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              fetchLogs(client);
                            }}>
                              <History className="w-4 h-4 mr-2" /> Activity Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:bg-red-50 focus:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(client.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
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
            <div className="pt-2">
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

      {/* Feedback Config Dialog */}
      <Dialog open={feedbackConfigOpen} onOpenChange={setFeedbackConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback Reminder Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reminder Frequency</Label>
              <Select value={feedbackTypeInput} onValueChange={setFeedbackTypeInput}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interval">Every X Days</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {feedbackTypeInput === "Interval" && (
              <div className="space-y-2">
                <Label>Interval (Days)</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 15" 
                  value={feedbackIntervalInput} 
                  onChange={(e) => setFeedbackIntervalInput(e.target.value)} 
                />
              </div>
            )}

            {feedbackTypeInput === "Weekly" && (
              <div className="space-y-2">
                <Label>Days of the week</Label>
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => {
                    const isSelected = feedbackDaysOfWeekInput.includes(idx);
                    return (
                      <Badge 
                        key={day} 
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer ${isSelected ? 'bg-brand-teal text-white border-brand-teal hover:bg-brand-teal/90' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                        onClick={() => {
                          if (isSelected) setFeedbackDaysOfWeekInput(prev => prev.filter(d => d !== idx));
                          else setFeedbackDaysOfWeekInput(prev => [...prev, idx]);
                        }}
                      >
                        {day}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {feedbackTypeInput === "Monthly" && (
              <div className="space-y-2">
                <Label>Dates of the month (1-31)</Label>
                <Input 
                  placeholder="e.g. 1, 15" 
                  value={feedbackDatesOfMonthInput.join(", ")}
                  onChange={(e) => {
                    const parts = e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                    setFeedbackDatesOfMonthInput(parts);
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Last Feedback Collected</Label>
                <Input 
                  type="date" 
                  value={feedbackLastDateInput} 
                  onChange={(e) => setFeedbackLastDateInput(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Next Reminder Date</Label>
                <Input 
                  type="date" 
                  value={feedbackNextDateInput} 
                  onChange={(e) => setFeedbackNextDateInput(e.target.value)} 
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFeedbackConfigOpen(false)}>Cancel</Button>
              <Button className="bg-brand-teal text-white hover:bg-brand-teal/90" onClick={handleSaveFeedbackConfig}>Save Configuration</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Config Dialog */}
      <Dialog open={paymentConfigOpen} onOpenChange={setPaymentConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Schedule Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Frequency</Label>
              <Select value={paymentFrequencyInput} onValueChange={setPaymentFrequencyInput}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="One-Time">One-Time</SelectItem>
                  <SelectItem value="Half-Monthly">Half-Monthly (Every 15 Days)</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                  <SelectItem value="Custom">Custom (Interval)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Amount (Expected)</Label>
              <Input 
                type="number" 
                placeholder="e.g. 5000" 
                value={paymentAmountInput} 
                onChange={(e) => setPaymentAmountInput(e.target.value)} 
              />
            </div>
            
            {paymentFrequencyInput === "Custom" && (
              <div className="space-y-2">
                <Label>Custom Interval (Days)</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 45" 
                  value={paymentCustomDaysInput} 
                  onChange={(e) => setPaymentCustomDaysInput(e.target.value)} 
                />
              </div>
            )}
            
            {["Monthly", "Half-Monthly", "Quarterly", "Yearly"].includes(paymentFrequencyInput) && (
              <div className="space-y-2">
                <Label>Select Dates of Month (1-31) {paymentFrequencyInput === 'Half-Monthly' && "(Pick 2 dates)"}</Label>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length: 31}, (_, i) => i + 1).map(date => (
                    <div 
                      key={date}
                      className={`text-xs text-center p-1 cursor-pointer rounded ${paymentDatesInput.includes(date) ? 'bg-orange-500 text-white' : 'hover:bg-slate-100'}`}
                      onClick={() => {
                        if (paymentDatesInput.includes(date)) {
                          setPaymentDatesInput(paymentDatesInput.filter(d => d !== date));
                        } else {
                          setPaymentDatesInput([...paymentDatesInput, date]);
                        }
                      }}
                    >
                      {date}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Last Payment Date</Label>
                <Input 
                  type="date" 
                  value={paymentLastDateInput} 
                  onChange={(e) => setPaymentLastDateInput(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Next Due Date</Label>
                <Input 
                  type="date" 
                  value={paymentNextDateInput} 
                  onChange={(e) => setPaymentNextDateInput(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-2 border-t mt-4">
              <Button variant="outline" onClick={() => setPaymentConfigOpen(false)}>Cancel</Button>
              <Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={handleSavePaymentConfig}>Save Configuration</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Assign Team Dialog */}
      <Dialog open={assignTeamOpen} onOpenChange={setAssignTeamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Creative Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Scripting</Label>
              <SearchableEmployeeSelect 
                value={scriptwriterId} 
                onChange={setScriptwriterId} 
                placeholder="Select scriptwriter..." 
                employees={creativeEmployees} 
              />
            </div>
            <div className="space-y-2">
              <Label>Reel / Editing</Label>
              <SearchableEmployeeSelect 
                value={reelEditorId} 
                onChange={setReelEditorId} 
                placeholder="Select editor..." 
                employees={creativeEmployees} 
              />
            </div>
            <div className="space-y-2">
              <Label>Post / Graphics</Label>
              <SearchableEmployeeSelect 
                value={postDesignerId} 
                onChange={setPostDesignerId} 
                placeholder="Select designer..." 
                employees={creativeEmployees} 
              />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignTeamOpen(false)}>Cancel</Button>
              <Button className="bg-brand-teal text-white hover:bg-brand-teal-light" onClick={handleSaveTeamAssignment}>
                Save Assignments
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ClientReviewDialog 
        open={reviewDialogOpen} 
        onOpenChange={setReviewDialogOpen} 
        client={reviewClient} 
        onSaved={fetchClients} 
      />
    </div>
  );
}
