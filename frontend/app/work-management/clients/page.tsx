"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { Users, Plus, Pencil, Trash2, Mail, Phone, Building2, Loader2, Search, History, ClipboardList, Briefcase, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientForm, ClientFormData } from "@/components/hrms/ClientForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { TablePagination } from "@/components/common/TablePagination";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";
import { INDIAN_STATES } from "@/lib/constants";

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
  const { confirm } = useConfirm();
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const canViewClients = isAdmin || checkPermission('clients', 'canView');
  const canAddClients = isAdmin || checkPermission('clients', 'canAdd');
  const canEditClients = isAdmin || checkPermission('clients', 'canEdit');
  const canDeleteClients = isAdmin || checkPermission('clients', 'canDelete');

  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inlineEditing, setInlineEditing] = useState<{id: string, field: string} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, activeTab]);
  
  // Logs state
  const [logsOpen, setLogsOpen] = useState(false);
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeClient, setActiveClient] = useState<any>(null);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewClients) {
      router.push("/");
      return;
    }
    
    fetchEmployees();
    fetchClients();
  }, [user, router, permissionsLoading, canViewClients]);

  // Departments are hardcoded as per user request
  useEffect(() => {
    setDepartments(["Development", "Creative", "Digital Marketing"]);
  }, [clients]);

  
  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
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
        fetchEmployees();
    fetchClients();
        setEditingClient(null);
      } else {
        const error = await res.json();
        toast.error(`Error: ${error.detail || "Failed to save client"}`);
      }
    } catch (err) {
      console.error("Error saving client:", err);
      toast.error("Failed to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this client?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/clients/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchEmployees();
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
    
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    
    const matchesDept = activeTab === "all" || 
      (c.department && c.department.toLowerCase().split(',').map((d:string) => d.trim()).includes(activeTab.toLowerCase()));

    return matchesSearch && matchesStatus && matchesDept;
  });

  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleInlineUpdate = async (clientId: string, field: string, value: any) => {
    try {
      let payload: any = { 
        [field]: value,
        performedBy: user?.id,
        userName: user?.name || `${user?.firstName} ${user?.lastName}`,
      };
      
      let newName = "";
      if (field === 'assignedEmployeeId') {
        const emp = employees.find(e => e.id === value);
        if (emp) {
            newName = `${emp.firstName} ${emp.lastName}`;
            payload.assignedEmployeeName = newName;
        }
      }

      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setClients(prev => prev.map(c => {
            if (c.id === clientId) {
                const updated = { ...c, [field]: value };
                if (field === 'assignedEmployeeId' && newName) {
                    updated.assignedEmployeeName = newName;
                }
                return updated;
            }
            return c;
        }));
      }
    } catch (err) {
      console.error("Error updating client field:", err);
    }
    setInlineEditing(null);
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)] pb-4">
      <PageHeader
        title="Clients"
        description="Maintain a database of all clients and their associated projects."
      >
        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingClient(null);
        }}>
          {canAddClients && (
            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-0">
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

      <ActivityLogDialog 
        open={logsOpen}
        onOpenChange={setLogsOpen}
        title="Client Relationship History"
        subtitle={activeClient?.companyName}
        logs={clientLogs}
        isLoading={isLoadingLogs}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
        <TabsList className="bg-white border mb-4 self-start">
          <TabsTrigger value="all" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">All Clients</TabsTrigger>
          {departments.map(dept => (
            <TabsTrigger key={dept} value={dept.toLowerCase()} className="data-[state=active]:bg-brand-teal data-[state=active]:text-white uppercase text-[10px] font-bold">
              {dept}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm mb-6">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={`Search ${activeTab === 'all' ? '' : activeTab} clients...`} 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0 flex-1 flex flex-col data-[state=active]:flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
              <p className="text-muted-foreground font-medium">Loading clients...</p>
            </div>
          ) : activeTab === "creative" || activeTab === "development" || departments.map(d=>d.toLowerCase()).includes(activeTab) ? (
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
                      ) : activeTab === "digital marketing" ? (
                        <>
                          <TableHead className="min-w-[150px] text-left font-bold text-slate-700">Client Name</TableHead>
                          <TableHead className="min-w-[150px] text-left font-bold text-slate-700">Services</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Sales Focused</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Daily Budget</TableHead>
                          <TableHead className="min-w-[200px] text-left font-bold text-slate-700">Remarks</TableHead>
                          <TableHead className="text-center font-bold text-slate-700">Active/Inactive</TableHead>
                          <TableHead className="min-w-[200px] text-left font-bold text-slate-700">Assigned Employee</TableHead>
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
                    {paginatedClients.map((client, index) => (
                      <TableRow key={client.id} className="group border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-center text-slate-400">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        
                        {/* Inline Editable Fields based on Dept */}
                        {(activeTab === "development" ? [
                          { key: 'companyName', type: 'text', font: 'bold', align: 'left' },
                          { key: 'name', type: 'text', align: 'left' },
                          { key: 'email', type: 'text', align: 'left' },
                          { key: 'phone', type: 'text', align: 'left' },
                          { key: 'status', type: 'select', options: ['active', 'inactive', 'on-hold'], align: 'center' },
                        ] : activeTab === "digital marketing" ? [
                          { key: 'name', type: 'text', font: 'bold', align: 'left' },
                          { key: 'services', type: 'text', align: 'left' },
                          { key: 'salesFocused', type: 'text', align: 'left' },
                          { key: 'dailyBudget', type: 'number', align: 'center' },
                          { key: 'remarks', type: 'text', align: 'left' },
                          { key: 'status', type: 'select', options: ['active', 'inactive', 'on-hold'], align: 'center' },
                          { key: 'assignedEmployeeId', labelKey: 'assignedEmployeeName', type: 'select', options: employees.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })), align: 'left' },
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
                          { key: 'status', type: 'select', options: ['active', 'inactive', 'on-hold'], align: 'center' },
                        ]).map(col => (
                          <TableCell 
                            key={col.key as string} 
                            className={`${col.type !== 'readonly' && canEditClients ? 'cursor-text hover:bg-slate-50' : ''}`}
                            onClick={() => col.type !== 'readonly' && canEditClients && setInlineEditing({ id: client.id, field: col.key })}
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
                                    {col.options?.filter((o: any) => {
                                      if (col.key !== 'assignedEmployeeId' || !client.department) return true;
                                      if (typeof o !== 'object' || o === null) return true;
                                      const emp = employees.find(e => e.id === o.value);
                                      if (!emp) return true;
                                      const selectedDepts = client.department.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean);
                                      return selectedDepts.includes(emp.department?.toLowerCase() || '');
                                    }).map((o: any) => typeof o === 'object' && o !== null ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o as string} value={o as string}>{o as string}</option>)}
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
                                  col.key === 'assignedEmployeeId' ? (
                                    <span className="font-medium text-slate-700">{client.assignedEmployeeName || "Unassigned"}</span>
                                  ) : (
                                  <Badge variant={
                                    client[col.key] === "Yes" || client[col.key] === "active" 
                                      ? "success" 
                                      : client[col.key] === "on-hold"
                                        ? "warning"
                                        : "secondary"
                                  }>
                                    {client[col.key] === "on-hold" ? "On Hold" : client[col.key] || (col.key === 'status' ? 'active' : 'No')}
                                  </Badge>
                                  )
                                ) : col.key === 'phone' ? (
                                  <div className="flex flex-col">
                                    <span>{client[col.key] || "-"}</span>
                                    {client.state && (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-slate-50 text-slate-600 border-slate-200 mt-0.5 w-fit">
                                        State: {client.state}
                                      </Badge>
                                    )}
                                  </div>
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
                            {canEditClients && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingClient(client); setModalOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                            )}
                            {canDeleteClients && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(client.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                            )}
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
              {paginatedClients.map((client) => (
                <Card key={client.id} className="group hover:shadow-md transition-shadow border-border">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-brand-light rounded-lg flex items-center justify-center text-brand-teal shrink-0">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchLogs(client)} title="View History">
                          <History className="w-4 h-4 text-brand-teal" />
                        </Button>
                        {canEditClients && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditingClient(client);
                            setModalOpen(true);
                          }}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                        {canDeleteClients && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(client.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground leading-tight">{client.name || "Unknown Client"}</h3>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                          <Building2 className="w-4 h-4 text-brand-teal" />
                          {client.companyName || "Unknown Company"}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Briefcase className="w-4 h-4 text-brand-teal" />
                          <span className="uppercase text-[11px] font-bold tracking-tight">{client.department || "No Department"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {client.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {client.phone}
                        </div>
                        {client.state && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-semibold text-brand-teal text-[11px] uppercase tracking-wide">State:</span>
                            <span className="text-slate-700 font-bold">
                              {INDIAN_STATES.find(s => s.code === client.state)?.name || client.state}
                            </span>
                          </div>
                        )}
                        
                        {/* Additional Details */}
                        {(client.services || client.assignedEmployeeName || Number(client.post) > 0 || Number(client.reel) > 0 || Number(client.dailyBudget) > 0 || client.festivalPost === "Yes" || client.salesFocused) && (
                          <div className="pt-3 mt-3 border-t border-dashed border-border/60 space-y-2">
                            {client.services && (
                              <div className="flex flex-col gap-0.5 text-xs">
                                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Services</span>
                                <span className="text-slate-700 font-medium">{client.services}</span>
                              </div>
                            )}
                            {client.assignedEmployeeName && (
                              <div className="flex flex-col gap-0.5 text-xs">
                                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Assigned Employee / Team Leader</span>
                                <span className="text-brand-teal font-semibold">{client.assignedEmployeeName}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              {Number(client.post) > 0 && (
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Posts</span>
                                  <span className="text-slate-700 font-medium">{client.post}</span>
                                </div>
                              )}
                              {Number(client.reel) > 0 && (
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Reels</span>
                                  <span className="text-slate-700 font-medium">{client.reel}</span>
                                </div>
                              )}
                              {Number(client.dailyBudget) > 0 && (
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Daily Budget</span>
                                  <span className="text-slate-700 font-medium">₹{client.dailyBudget}</span>
                                </div>
                              )}
                              {client.salesFocused && (
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Sales Focused</span>
                                  <span className="text-slate-700 font-medium">{client.salesFocused}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {client.festivalPost === "Yes" && (
                                <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200">Festival Post</Badge>
                              )}
                              {client.graphicsRequired === "Yes" && (
                                <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">Graphics Req</Badge>
                              )}
                              {client.dailyFollowup === "Yes" && (
                                <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200">Daily Follow-up</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <Badge variant={client.status === "active" ? "success" : client.status === "on-hold" ? "warning" : "secondary"} className="capitalize">
                          {client.status?.replace('-', ' ')}
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
              {!searchTerm && canAddClients && (
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Client
                </Button>
              )}
            </div>
          )}
          {filteredClients.length > 0 && (
            <div className="mt-4">
              <TablePagination 
                totalItems={filteredClients.length} 
                itemsPerPage={itemsPerPage} 
                currentPage={currentPage} 
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
                itemName="clients"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
