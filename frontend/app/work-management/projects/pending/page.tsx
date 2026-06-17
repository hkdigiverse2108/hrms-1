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

export default function PendingProjectsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const canViewProjects = isAdmin || checkPermission('projects', 'canView');
  const canAddProjects = isAdmin || checkPermission('projects', 'canAdd');

  const [projects, setProjects] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
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
      const [pRes, lRes] = await Promise.all([
        fetch(`${API_URL}/projects?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/leads`)
      ]);
      
      if (pRes.ok) setProjects(await pRes.json());
      if (lRes.ok) setLeads(await lRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingProjects = leads.filter(l => {
    if (l.status !== 'Client Won') return false;
    const projectExists = projects.some(p => p.leadId === l.id);
    return !projectExists;
  });

  const handleCreateFromLead = (lead: any) => {
    setEditingProject({
      title: `${lead.company || lead.contact || 'New Client'} - Project`,
      leadId: lead.id,
      budget: lead.expectedIncome || "0",
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
        setEditingProject(null);
        router.push('/work-management/projects');
      } else {
        console.error("Error saving project");
      }
    } catch (err) {
      console.error("Error saving project:", err);
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
          description="These leads have been marked as 'Client Won' but do not have a project created for them yet."
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
                  <th className="px-6 py-4">Lead Name</th>
                  <th className="px-6 py-4">Expected Revenue</th>
                  <th className="px-6 py-4">Sales Rep</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingProjects.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-base">{lead.company || lead.contact}</div>
                      <div className="text-xs font-medium text-brand-teal bg-brand-light inline-flex items-center px-2 py-0.5 rounded-md mt-1">
                        Won Lead
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      {lead.expectedIncome ? `₹${Number(lead.expectedIncome).toLocaleString()}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {lead.assignedTo ? (Array.isArray(lead.assignedTo) ? lead.assignedTo.map((a:any) => typeof a === 'string' ? a : (a.name || a.employeeName)).join(', ') : lead.assignedTo) : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        size="sm"
                        className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold"
                        onClick={() => handleCreateFromLead(lead)}
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
