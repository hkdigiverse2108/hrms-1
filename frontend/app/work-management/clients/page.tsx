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
    const isHR = user?.role?.toLowerCase() === 'hr' || user?.designation?.toLowerCase()?.includes('hr') || user?.department?.toLowerCase()?.includes('hr');
    const isTL = user?.designation?.toLowerCase() === 'team leader' || user?.role?.toLowerCase() === 'team leader';
    if (!isAdmin && !isHR && !isTL && user?.department) {
      setActiveTab(user.department.toLowerCase().trim());
    }
  }, [isAdmin, user]);

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

  const allowedClients = clients.filter(c => {
    const isHR = user?.role?.toLowerCase() === 'hr' || user?.designation?.toLowerCase()?.includes('hr') || user?.department?.toLowerCase()?.includes('hr');
    const isTL = user?.designation?.toLowerCase() === 'team leader' || user?.role?.toLowerCase() === 'team leader';
    if (isAdmin || isHR || isTL) return true;
    if (!user?.department) return true;
    const uDept = user.department.toLowerCase().trim();
    return c.department && c.department.toLowerCase().includes(uDept);
  });

  const filteredClients = allowedClients.filter(c => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = (c.name && c.name.toLowerCase().includes(searchLower)) || 
                          (c.companyName && c.companyName.toLowerCase().includes(searchLower)) ||
                          (c.industry && c.industry.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    
    const activeTabLower = activeTab.toLowerCase().trim();
    const matchesDept = activeTab === "all" || 
      (c.department && c.department.toLowerCase().split(',').map((d:string) => d.trim()).includes(activeTabLower));

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
        {isAdmin && (
          <TabsList className="bg-white border mb-4 self-start">
            <TabsTrigger value="all" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white">All Clients</TabsTrigger>
            {departments.map(dept => (
              <TabsTrigger key={dept} value={dept.toLowerCase()} className="data-[state=active]:bg-brand-teal data-[state=active]:text-white uppercase text-[10px] font-bold">
                {dept}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

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
