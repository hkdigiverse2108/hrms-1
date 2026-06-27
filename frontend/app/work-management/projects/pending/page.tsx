"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectForm, ProjectFormData } from "@/components/hrms/ProjectForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export default function PendingProjectsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const { confirm } = useConfirm();

  const canViewProjects = isAdmin || checkPermission('projects', 'canView');
  const canAddProjects = isAdmin || checkPermission('projects', 'canAdd');

  const [projects, setProjects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewProjects) {
      router.push("/");
    }
  }, [router, permissionsLoading, canViewProjects]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [pRes, lRes, cRes] = await Promise.all([
        fetch(`${API_URL}/projects?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/leads`),
        fetch(`${API_URL}/clients`)
      ]);
      
      if (pRes.ok) setProjects(await pRes.json());
      if (lRes.ok) setLeads(await lRes.json());
      if (cRes.ok) setClients(await cRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingProjects = clients.flatMap(client => {
    const depts = client.department ? client.department.split(',').map((d: string) => d.trim()).filter(Boolean) : ["Development"]; // fallback
    const missing = [];
    for (const dept of depts) {
      const projectExists = projects.some(p => p.clientId === client.id && p.department?.toLowerCase() === dept.toLowerCase());
      if (!projectExists) {
        missing.push({
          id: `${client.id}-${dept}`,
          clientId: client.id,
          company: client.companyName || "",
          department: dept,
          contact: client.name,
          assignedTo: client.responsibility || "-",
          budget: client.dailyBudget ? `₹${client.dailyBudget}` : "-",
          originalClient: client
        });
      }
    }
    return missing;
  });

  const filteredProjects = pendingProjects.filter(item => {
    const matchesSearch = item.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "all" || item.department.toLowerCase() === selectedDept.toLowerCase();
    
    return matchesSearch && matchesDept;
  });

  const handleCreateFromClient = (pendingItem: any) => {
    setEditingProject({
      title: `${pendingItem.company} - ${pendingItem.department} Project`,
      clientId: pendingItem.clientId,
      department: pendingItem.department,
    });
    setModalOpen(true);
  };

  const handleDeletePending = async (item: any) => {
    if (!canAddProjects) return; // Need some permission, using add projects or we could check delete
    
    const isConfirmed = await confirm({
      title: "Remove Pending Project",
      message: `Are you sure you want to remove the pending project for ${item.company} (${item.department})? This will remove the department from the client.`,
      destructive: true,
      confirmText: "Remove",
    });
    
    if (!isConfirmed) return;

    try {
      const currentDepts = item.originalClient.department 
        ? item.originalClient.department.split(',').map((d: string) => d.trim()).filter(Boolean) 
        : ["Development"];
        
      const newDepts = currentDepts.filter((d: string) => d.toLowerCase() !== item.department.toLowerCase());
      const newDeptString = newDepts.join(', ');
      
      const res = await fetch(`${API_URL}/clients/${item.clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: newDeptString })
      });
      
      if (res.ok) {
        toast.success("Pending project removed successfully");
        fetchData();
      } else {
        toast.error("Failed to remove pending project");
      }
    } catch (err) {
      console.error("Error removing pending project:", err);
      toast.error("An error occurred while removing");
    }
  };

  const handleSubmit = async (formData: ProjectFormData) => {
    if (!canAddProjects) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        performedBy: user?.id,
        userName: user?.name || `${user?.firstName} ${user?.lastName}`,
      };

      const res = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setModalOpen(false);
        fetchData();
        setEditingProject(null);
      } else {
        const errorData = await res.json();
        toast.error(`Error: ${errorData.detail || "Failed to save project"}`);
      }
    } catch (err: any) {
      console.error("Error saving project:", err);
      toast.error(`Error: ${err.message || "Failed to connect to server"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-4 mb-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push('/work-management/projects')} 
          className="mt-1 shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </Button>
        <PageHeader 
          title="Pending Project Creations" 
          description="These clients have been created but do not have a project set up for their respective departments yet."
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
          <p className="text-muted-foreground font-medium">Loading pending projects...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search pending projects..." 
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[180px] h-10 font-medium">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Creative">Creative</SelectItem>
                  <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                </SelectContent>
              </Select>

              {(selectedDept !== "all" || searchTerm !== "") && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSelectedDept("all");
                    setSearchTerm("");
                  }}
                  className="text-xs text-muted-foreground hover:text-rose-600 font-bold h-10 px-3"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-border text-slate-500 font-medium">
                    <tr>
                      <th className="px-6 py-4">Company Name</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProjects.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-base">{item.company}</div>
                      <div className="text-xs font-medium text-brand-teal bg-brand-light inline-flex items-center px-2 py-0.5 rounded-md mt-1">
                        Client
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {item.department}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm"
                          className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold"
                          onClick={() => handleCreateFromClient(item)}
                          disabled={!canAddProjects}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Project
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600 h-9 w-9"
                          onClick={() => handleDeletePending(item)}
                          disabled={!canAddProjects}
                          title="Remove Pending Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">No Pending Projects Found</h2>
          <p className="text-slate-500 mt-2 text-center max-w-md">
            {searchTerm || selectedDept !== 'all' 
              ? "No pending projects match your current filters." 
              : "All your won leads have successfully been converted into projects! Great job."}
          </p>
          {(searchTerm || selectedDept !== 'all') ? (
            <Button variant="outline" className="mt-6 font-bold" onClick={() => {
              setSearchTerm("");
              setSelectedDept("all");
            }}>
              Clear Filters
            </Button>
          ) : (
            <Button variant="outline" className="mt-6 font-bold" onClick={() => router.push('/work-management/projects')}>
              Return to Projects
            </Button>
          )}
        </div>
      )}
      </div>
    )}

      <Dialog open={modalOpen} onOpenChange={(open) => {
        setModalOpen(open);
        if (!open) setEditingProject(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Convert Lead to Project
            </DialogTitle>
          </DialogHeader>
          <ProjectForm 
            initialData={editingProject} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting}
            isAdmin={isAdmin}
            currentUser={user}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
