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
  Filter
} from "lucide-react";
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
                  <Badge className={client.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                    {client.status?.toUpperCase() || "ACTIVE"}
                  </Badge>
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
    </div>
  );
}
