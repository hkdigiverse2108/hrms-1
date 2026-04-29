"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { Users, Plus, Pencil, Trash2, Mail, Phone, Building2, Loader2, Search, History, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClientForm, ClientFormData } from "@/components/hrms/ClientForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

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

export default function ClientsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [inlineEditing, setInlineEditing] = useState<{id: string, field: string} | null>(null);
  
  // Logs state
  const [logsOpen, setLogsOpen] = useState(false);
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeClient, setActiveClient] = useState<any>(null);

  useEffect(() => {
    // Check if user is admin
    if (user && user.role?.toLowerCase() !== "admin" && user.name !== "Admin Admin") {
      router.push("/");
      return;
    }
    
    fetchClients();
    fetchDepartments();
  }, [user, router]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const data = await res.json();
        const excludedDepts = ["sales"];
        const depts = Array.from(new Set(data.map((e: any) => e.department).filter(Boolean)))
          .filter((d: any) => !excludedDepts.includes(d.toLowerCase())) as string[];
        setDepartments(depts);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setIsLoading(false);
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

  const handleSubmit = async (formData: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingClient 
        ? `${API_URL}/clients/${editingClient.id}` 
        : `${API_URL}/clients`;
      const method = editingClient ? "PUT" : "POST";

      const payload = {
        ...formData,
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
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || "Failed to save client"}`);
      }
    } catch (err) {
      console.error("Error saving client:", err);
      alert("Failed to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;

    try {
      const res = await fetch(`${API_URL}/clients/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchClients();
      }
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && c.department?.toLowerCase() === activeTab.toLowerCase();
  });

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
      }
    } catch (err) {
      console.error("Error updating client field:", err);
    }
    setInlineEditing(null);
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-110px)] pb-4">
      <PageHeader
        title="Clients"
        description="Maintain a database of all clients and their associated projects."
      >
        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingClient(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingClient ? "Edit Client Details" : "Add New Client"}
              </DialogTitle>
            </DialogHeader>
            <ClientForm 
              initialData={editingClient} 
              onSubmit={handleSubmit} 
              isSubmitting={isSubmitting} 
              departments={departments}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Client Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xl font-bold">
                <History className="w-6 h-6 text-brand-teal" />
                Client Relationship History
              </div>
              {activeClient && (
                <p className="text-sm font-medium text-muted-foreground ml-8 italic">
                  Showing updates for: "{activeClient.companyName}"
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
            ) : clientLogs.length > 0 ? (
              <div className="space-y-4">
                {clientLogs.map((log) => (
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
                    <Badge variant="outline" className="text-[10px] uppercase font-bold mb-2">{log.action}</Badge>
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
                    Actions performed on this client profile will appear here.
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
        <TabsList className="bg-white border mb-4 self-start">
          <TabsTrigger value="all" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">All Clients</TabsTrigger>
          {departments.map(dept => (
            <TabsTrigger key={dept} value={dept.toLowerCase()} className="data-[state=active]:bg-brand-teal data-[state=active]:text-white uppercase text-[10px] font-bold">
              {dept}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={`Search ${activeTab === 'all' ? '' : activeTab} clients...`} 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0 flex-1 flex flex-col data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
              <p className="text-muted-foreground font-medium">Loading clients...</p>
            </div>
          ) : activeTab === "graphics" || activeTab === "development" || departments.map(d=>d.toLowerCase()).includes(activeTab) ? (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col flex-1">
              <style dangerouslySetInnerHTML={{ __html: noScrollbarStyle }} />
              <div className="overflow-x-auto flex-1 no-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                      <TableHead className="w-12 text-center font-bold text-slate-700">S.N</TableHead>
                      {activeTab === "development" ? (
                        <>
                          <TableHead className="min-w-[180px] text-left font-bold text-slate-700">Company Name</TableHead>
                          <TableHead className="min-w-[150px] text-left font-bold text-slate-700">Contact Person</TableHead>
                          <TableHead className="min-w-[180px] text-left font-bold text-slate-700">Email Address</TableHead>
                          <TableHead className="min-w-[120px] text-left font-bold text-slate-700">Phone Number</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
                        </>
                      ) : activeTab === "marketing" ? (
                        <>
                          <TableHead className="min-w-[150px] text-left font-bold text-slate-700">Client Name</TableHead>
                          <TableHead className="min-w-[150px] text-left font-bold text-slate-700">Services</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Sales Focused</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Daily Budget</TableHead>
                          <TableHead className="min-w-[200px] text-left font-bold text-slate-700">Remarks</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Active/Inactive</TableHead>
                          <TableHead className="min-w-[150px] text-left font-bold text-slate-700">Responsibility</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Daily Followup</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="min-w-[180px] text-left font-bold text-slate-700">Company Name</TableHead>
                          <TableHead className="min-w-[120px] text-center font-bold text-slate-700">Department</TableHead>
                          <TableHead className="min-w-[150px] text-left font-bold text-slate-700">Contact Person</TableHead>
                          <TableHead className="min-w-[180px] text-left font-bold text-slate-700">Email Address</TableHead>
                          <TableHead className="min-w-[120px] text-left font-bold text-slate-700">Phone Number</TableHead>
                          <TableHead className="min-w-[150px] text-left font-bold text-slate-700">Services</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Festival Post</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Graph Req</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Post Req</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Post Count</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Reel Req</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Reel Count</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
                        </>
                      )}
                      <TableHead className="text-center font-bold text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client, index) => (
                      <TableRow key={client.id} className="group border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-center text-slate-400">{index + 1}</TableCell>
                        
                        {/* Inline Editable Fields based on Dept */}
                        {(activeTab === "development" ? [
                          { key: 'companyName', type: 'text', font: 'bold', align: 'left' },
                          { key: 'name', type: 'text', align: 'left' },
                          { key: 'email', type: 'text', align: 'left' },
                          { key: 'phone', type: 'text', align: 'left' },
                          { key: 'status', type: 'select', options: ['active', 'inactive'], align: 'center' },
                        ] : activeTab === "marketing" ? [
                          { key: 'name', type: 'text', font: 'bold', align: 'left' },
                          { key: 'services', type: 'text', align: 'left' },
                          { key: 'salesFocused', type: 'text', align: 'left' },
                          { key: 'dailyBudget', type: 'number', align: 'center' },
                          { key: 'remarks', type: 'text', align: 'left' },
                          { key: 'status', type: 'select', options: ['active', 'inactive'], align: 'center' },
                          { key: 'responsibility', type: 'text', align: 'left' },
                          { key: 'dailyFollowup', type: 'select', options: ['Yes', 'No'], align: 'center' },
                        ] : [
                          { key: 'companyName', type: 'text', font: 'bold', align: 'left' },
                          { key: 'department', type: 'select', options: departments, align: 'center' },
                          { key: 'name', type: 'text', align: 'left' },
                          { key: 'email', type: 'text', align: 'left' },
                          { key: 'phone', type: 'text', align: 'left' },
                          { key: 'services', type: 'text', align: 'left' },
                          { key: 'festivalPost', type: 'select', options: ['Yes', 'No'], align: 'center' },
                          { key: 'graphicsRequired', type: 'select', options: ['Yes', 'No'], align: 'center' },
                          { key: 'postRequired', type: 'select', options: ['Yes', 'No'], align: 'center' },
                          { key: 'post', type: 'number', align: 'center' },
                          { key: 'reelRequired', type: 'select', options: ['Yes', 'No'], align: 'center' },
                          { key: 'reel', type: 'number', align: 'center' },
                          { key: 'status', type: 'select', options: ['active', 'inactive'], align: 'center' },
                        ]).map(col => (
                          <TableCell 
                            key={col.key} 
                            className={`${col.type !== 'readonly' ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => col.type !== 'readonly' && setInlineEditing({ id: client.id, field: col.key })}
                          >
                            {inlineEditing?.id === client.id && inlineEditing?.field === col.key ? (
                              col.type === 'select' ? (
                                <div className="flex justify-center">
                                  <select 
                                    autoFocus
                                    className="w-full border rounded px-1 py-0.5 outline-none"
                                    defaultValue={client[col.key]}
                                    onBlur={(e) => handleInlineUpdate(client.id, col.key, e.target.value)}
                                    onChange={(e) => handleInlineUpdate(client.id, col.key, e.target.value)}
                                  >
                                    {col.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </div>
                              ) : (
                                <input 
                                  autoFocus
                                  type={col.type}
                                  className={`w-full border rounded px-2 py-1 outline-none ${col.align === 'center' ? 'text-center' : ''}`}
                                  defaultValue={client[col.key]}
                                  onBlur={(e) => handleInlineUpdate(client.id, col.key, e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(client.id, col.key, e.currentTarget.value)}
                                />
                              )
                            ) : (
                              <div className={`text-[12px] ${col.font === 'bold' ? 'font-bold' : ''} ${col.align === 'center' ? 'text-center' : 'text-left'}`}>
                                {col.type === 'select' ? (
                                  <Badge className={
                                    client[col.key] === "Yes" || client[col.key] === "active" 
                                      ? "bg-green-100 text-green-700" 
                                      : "bg-slate-100 text-slate-500"
                                  }>
                                    {client[col.key] || (col.key === 'status' ? 'active' : 'No')}
                                  </Badge>
                                ) : (
                                  client[col.key] || (col.type === 'number' ? '0' : "-")
                                )}
                              </div>
                            )}
                          </TableCell>
                        ))}

                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetchLogs(client)}><History className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingClient(client); setModalOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(client.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredClients.length === 0 && (
                      <TableRow><TableCell colSpan={12} className="h-24 text-center text-muted-foreground">No client found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <Card key={client.id} className="group hover:shadow-md transition-shadow border-border">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-brand-light rounded-lg flex items-center justify-center text-brand-teal shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchLogs(client)} title="View History">
                          <History className="w-4 h-4 text-brand-teal" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingClient(client);
                          setModalOpen(true);
                        }}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(client.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground leading-tight">{client.companyName}</h3>
                        <p className="text-sm text-muted-foreground">{client.industry || "No Industry Specified"}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                          <Users className="w-4 h-4 text-brand-teal" />
                          {client.name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {client.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {client.phone}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <Badge variant={client.status === "active" ? "success" : "secondary"} className="capitalize">
                          {client.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Joined {client.createdDate}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl p-20 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center text-brand-teal">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">No Clients Found</h2>
                <p className="text-muted-foreground max-w-md">
                  {searchTerm ? `No clients matching "${searchTerm}"` : `You haven't added any ${activeTab === 'all' ? '' : activeTab} clients yet.`}
                </p>
              </div>
              {!searchTerm && (
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Client
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
