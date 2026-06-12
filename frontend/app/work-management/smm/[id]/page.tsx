"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, History, Building2, MapPin, Mail, Phone, Link as LinkIcon, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm, ClientFormData } from "@/components/hrms/ClientForm";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
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
  const [client, setClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
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
      const res = await fetch(`${API_URL}/clients/${params.id}`);
      if (res.ok) {
        setClient(await res.json());
      } else {
        toast.error("Client not found");
        router.push("/work-management/smm");
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

  const handleEditSubmit = async (formData: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const payload = { ...formData, department: "Graphics" }; // Ensure department
      const res = await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Client details updated!");
        setEditModalOpen(false);
        fetchClient(); // Refresh data
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
        <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/work-management/smm")} className="text-slate-600 bg-white hover:bg-slate-50 h-9 w-9 shadow-sm shrink-0 rounded-full">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-teal" />
            {client.companyName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{client.name}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={fetchLogs} className="bg-white hover:bg-slate-50 text-slate-700">
            <History className="w-4 h-4 mr-2" />
            History Logs
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[200px]">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">S.N</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Brand Name</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Department</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Person</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Services</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Festival Post</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Graph Req</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Post Req</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Post Count</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Reel Req</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Reel Count</th>
                <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-4 text-center">
                  <span className="text-slate-400 text-sm">1</span>
                </td>
                <td className="px-4 py-4">
                  <span className="font-bold text-slate-900">{client.companyName}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none font-medium">{client.department || "Graphics"}</Badge>
                </td>
                <td className="px-4 py-4">
                  <span className="text-slate-700 text-sm">{client.contactPerson || client.name || "N/A"}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-slate-700 text-sm">{client.email || "N/A"}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-slate-700 text-sm">{client.phone || "N/A"}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-slate-700 text-sm">{client.services || "N/A"}</span>
                </td>
                
                <td className="px-4 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${client.festivalPost === "Yes" ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>{client.festivalPost || "No"}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${client.graphicsRequired === "Yes" || client.graphics === "Required" ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>{client.graphicsRequired || (client.graphics === "Required" ? "Yes" : "No")}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${client.postRequired === "Yes" ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>{client.postRequired || "No"}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-slate-700 text-sm">{client.post || 0}</span>
                </td>
                
                <td className="px-4 py-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${client.reelRequired === "Yes" ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>{client.reelRequired || "No"}</span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-slate-700 text-sm">{client.reel || 0}</span>
                </td>
                
                <td className="px-4 py-4 text-center">
                  <Badge variant="outline" className={`border-none ${client.status === "active" ? "bg-emerald-100 text-emerald-600 font-medium" : "bg-slate-100 text-slate-500 font-medium"}`}>{client.status || "active"}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>



      {/* Activity Log Dialog */}
      <ActivityLogDialog 
        open={logsOpen} 
        onOpenChange={setLogsOpen}
        clientName={client.companyName}
        logs={clientLogs}
        isLoading={isLoadingLogs}
      />
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
