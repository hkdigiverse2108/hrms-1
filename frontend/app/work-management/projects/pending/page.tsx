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
import { toast } from "sonner";

export default function PendingProjectsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const canViewProjects = isAdmin || checkPermission('projects', 'canView');
  const canAddProjects = isAdmin || checkPermission('projects', 'canAdd');

  const [projects, setProjects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

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

  const handleCreateFromClient = (pendingItem: any) => {
    setEditingProject({
      title: `${pendingItem.company} - ${pendingItem.department} Project`,
      clientId: pendingItem.clientId,
      department: pendingItem.department,
    });
    setModalOpen(true);
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
      ) : pendingProjects.length > 0 ? (
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
                {pendingProjects.map((item) => (
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
                      <Button 
                        size="sm"
                        className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold"
                        onClick={() => handleCreateFromClient(item)}
                        disabled={!canAddProjects}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">No Pending Projects</h2>
          <p className="text-slate-500 mt-2 text-center max-w-md">All your won leads have successfully been converted into projects! Great job.</p>
          <Button variant="outline" className="mt-6 font-bold" onClick={() => router.push('/work-management/projects')}>
            Return to Projects
          </Button>
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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
