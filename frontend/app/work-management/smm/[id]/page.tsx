"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, History, Building2, MapPin, Mail, Phone, Link as LinkIcon, Loader2, ClipboardList, Calendar, Palette, Layout, Film, Hash, Activity } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm, ClientFormData } from "@/components/hrms/ClientForm";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { ContentCalendarTable } from "@/components/hrms/ContentCalendarTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [creativeProjects, setCreativeProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logs State
  const [logsOpen, setLogsOpen] = useState(false);
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchClient();
    }
  }, [params.id]);

  const fetchClient = async () => {
    setIsLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`${API_URL}/clients/${params.id}`),
        fetch(`${API_URL}/projects`)
      ]);
      if (cRes.ok) {
        setClient(await cRes.json());
      } else {
        toast.error("Client not found");
        router.push("/work-management/smm");
      }
      if (pRes.ok) {
        const projs = await pRes.json();
        const clientCreativeProjs = projs.filter((p: any) => p.clientId === params.id && p.department === "Creative" && p.status !== "completed");
        setCreativeProjects(clientCreativeProjs);
        
        const qProjectId = searchParams.get("projectId");
        const creativeProj = qProjectId 
          ? clientCreativeProjs.find((p: any) => p.id === qProjectId)
          : clientCreativeProjs[0];
          
        if (creativeProj) setProject(creativeProj);
      }
    } catch (err) {
      console.error("Error fetching client:", err);
      toast.error("Failed to load client details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!client) return;
    setIsLoadingLogs(true);
    setLogsOpen(true);
    try {
      const res = await fetch(`${API_URL}/task-logs?clientId=${client.id}`);
      if (res.ok) {
        setClientLogs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleUpdateClient = async (formData: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      const res = await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Client details updated!");
        setModalOpen(false);
        fetchClient();
      } else {
        toast.error("Failed to update client");
      }
    } catch (err) {
      console.error("Error updating client:", err);
      toast.error("Connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-3">
        <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading client details...</p>
      </div>
    );
  }

  if (!client) return null;

  return (
    <>
      <style>{noScrollbarStyle}</style>
      <div className="space-y-6 w-full max-w-full px-2 md:px-6 mx-auto pb-10">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="text-slate-600 bg-white hover:bg-slate-50 h-9 w-9 shadow-sm shrink-0 rounded-full" title="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-brand-teal" />
                {project ? (project.title || project.name || `Project ${project.id.substring(0, 6)}`) : client.companyName}
              </h1>
              <p className="text-slate-500 text-sm mt-1">{project ? `${client.companyName} • ${client.name || ''}`.replace(/ • $/, '') : client.name}</p>
            </div>
          </div>


        </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center justify-center gap-1.5 hover:shadow-md hover:border-brand-teal/30 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Festival Post</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${(project ? project.festivalPost : client.festivalPost) === "Yes" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`}>{(project ? project.festivalPost : client.festivalPost) || "No"}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center justify-center gap-1.5 hover:shadow-md hover:border-brand-teal/30 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-fuchsia-50 flex items-center justify-center text-fuchsia-500 group-hover:scale-110 transition-transform">
            <Palette className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Graph Req</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${(project ? project.graphicsRequired : client.graphicsRequired) === "Yes" || (!project && client.graphics === "Required") ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`}>{(project ? project.graphicsRequired : client.graphicsRequired) || (client.graphics === "Required" ? "Yes" : "No")}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center justify-center gap-1.5 hover:shadow-md hover:border-brand-teal/30 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
            <Layout className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Post Req</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${(project ? project.postRequired : client.postRequired) === "Yes" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`}>{(project ? project.postRequired : client.postRequired) || "No"}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center justify-center gap-1.5 hover:shadow-md hover:border-brand-teal/30 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
            <Hash className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Post Count</span>
            <span className="text-lg font-black text-slate-700">{(project ? project.post : client.post) || 0}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center justify-center gap-1.5 hover:shadow-md hover:border-brand-teal/30 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
            <Film className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Reel Req</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${(project ? project.reelRequired : client.reelRequired) === "Yes" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"}`}>{(project ? project.reelRequired : client.reelRequired) || "No"}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center justify-center gap-1.5 hover:shadow-md hover:border-brand-teal/30 transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
            <Hash className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Reel Count</span>
            <span className="text-lg font-black text-slate-700">{(project ? project.reel : client.reel) || 0}</span>
          </div>
        </div>
      </div>

      {(() => {
        const oldestProject = creativeProjects.reduce((oldest: any, p: any) => {
          if (!oldest) return p;
          return (p._id || p.id) < (oldest._id || oldest.id) ? p : oldest;
        }, null);
        const isOldestProject = !project || (oldestProject?.id === project?.id);
        
        return (
          <ContentCalendarTable 
            clientId={params.id as string} 
            clientName={client.companyName} 
            projectId={project?.id} 
            projectName={project?.name} 
            isOldestProject={isOldestProject}
          />
        );
      })()}

      <ActivityLogDialog 
        open={logsOpen} 
        onOpenChange={setLogsOpen}
        title={`Activity Logs: ${client.companyName}`}
        logs={clientLogs}
        isLoading={isLoadingLogs}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            initialData={client}
            onSubmit={handleUpdateClient}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <span className="block text-sm font-medium text-slate-800">{value || "N/A"}</span>
    </div>
  );
}
