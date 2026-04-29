"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { 
  Users, 
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

export default function GraphicsClientsPage() {
  const { user } = useUser();
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients`);
      if (res.ok) {
        const data = await res.json();
        // Filter for Graphics department only
        setClients(data.filter((c: any) => c.department === "Graphics"));
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
      toast.error("Failed to load graphics clients");
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
        department: "Graphics", // Ensure department is set
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
    if (!confirm("Are you sure you want to delete this graphics client?")) return;

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
      <PageHeader
        title="Clients"
        description="Manage graphics specific deliverables and client requirements."
      >
        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingClient(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white shadow-sm transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" />
              Add Graphics Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-brand-teal" />
                {editingClient ? "Edit Client Details" : "Add New Client"}
              </DialogTitle>
            </DialogHeader>
            <ClientForm 
              initialData={editingClient || { department: "Graphics" }} 
              onSubmit={handleSubmit} 
              isSubmitting={isSubmitting} 
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

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

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Client Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Services</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Festival</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Active</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Post (Req)</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Graphics (Req)</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Reel (Req)</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
                        <p className="text-sm text-slate-500 font-medium">Fetching dashboard...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{client.companyName}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {client.email}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {client.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-medium">
                          {client.services || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-bold ${client.festivalPost === "Yes" ? "text-emerald-600" : "text-rose-500"}`}>
                          {client.festivalPost || "No"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge className={`uppercase text-[10px] font-bold ${client.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"}`} variant="outline">
                          {client.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-700">{client.post || 0}</span>
                          <span className={`text-[9px] px-1 rounded font-extrabold uppercase ${client.postRequired === "Yes" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {client.postRequired || "No"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-md ${client.graphics === "Required" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"}`}>
                          {client.graphics || "Not Required"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-brand-teal">{client.reel || 0}</span>
                          <span className={`text-[9px] px-1 rounded font-extrabold uppercase ${client.reelRequired === "Yes" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {client.reelRequired || "No"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-brand-teal/10 hover:text-brand-teal" onClick={() => {
                            setEditingClient(client);
                            setModalOpen(true);
                          }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(client.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <ClipboardList className="w-6 h-6" />
                        </div>
                        <p className="text-slate-500 font-medium">No client found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
