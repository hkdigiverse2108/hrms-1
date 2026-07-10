"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Plus, Loader2, Link as LinkIcon, BookOpen, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_URL } from "@/lib/config";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfirm } from "@/context/ConfirmContext";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LiveTimer } from "@/components/common/LiveTimer";

export default function ResearchPage() {
  const { confirm } = useConfirm();
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const canView = isAdmin || checkPermission('research', 'canView');
  const canAdd = isAdmin || checkPermission('research', 'canAdd');
  const canEdit = isAdmin || checkPermission('research', 'canEdit');
  const canDelete = isAdmin || checkPermission('research', 'canDelete');

  const [researchList, setResearchList] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResearch, setEditingResearch] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canView && !isAdmin) {
      router.push("/");
    }
  }, [permissionsLoading, canView, isAdmin, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resData, empData, projData, attData] = await Promise.all([
        fetch(`${API_URL}/research`, {
          headers: {
            "user-id": (user?.id || user?._id) || "",
            "role": user?.role || "",
          }
        }),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/projects`),
        fetch(`${API_URL}/attendance/status/${user?.id || user?._id}`)
      ]);

      if (resData.ok) {
        setResearchList(await resData.json());
      }
      if (empData.ok) {
        setEmployees(await empData.json());
      }
      if (projData.ok) {
        let allProjects = await projData.json();
        if (!isAdmin && user?.department) {
          allProjects = allProjects.filter((p: any) => p.department === user.department);
        }
        setProjects(allProjects);
      }
      if (attData.ok) {
        setAttendanceStatus(await attData.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch research data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ((user?.id || user?._id)) fetchData();
  }, [user]);

  const handleOpenModal = (research: any = null) => {
    if (research) {
      setEditingResearch(research);
      setTitle(research.title || "");
      setDescription(research.description || "");
      setLink(research.link || "");
      setSharedWith(research.sharedWith || []);
      setProjectId(research.projectId || "");
    } else {
      setEditingResearch(null);
      setTitle("");
      setDescription("");
      setLink("");
      setSharedWith([]);
      setProjectId("");
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please fill in the title");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        description,
        link,
        sharedWith,
        projectId,
        ...(editingResearch ? {} : {
          createdBy: (user?.id || user?._id),
          createdByName: `${user?.firstName} ${user?.lastName}`
        })
      };

      const url = editingResearch ? `${API_URL}/research/${editingResearch.id}` : `${API_URL}/research`;
      const method = editingResearch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save research");

      toast.success(editingResearch ? "Research updated" : "Research created");
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to save research");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Research",
      message: "Are you sure you want to delete this research? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/research/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Research deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete research");
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => (e.id || e._id) === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : id;
  };

  if (permissionsLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  const employeeOptions = employees.map(emp => ({
    label: `${emp.firstName} ${emp.lastName}`,
    value: emp.id || emp._id
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Research"
        description="Manage and share research documents and links"
      >
        {canAdd && (
          <Button onClick={() => handleOpenModal()} className="bg-brand-teal hover:bg-brand-teal/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Research
          </Button>
        )}
      </PageHeader>

      {researchList.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50/50 border-dashed">
          <BookOpen className="w-12 h-12 mb-4 text-slate-300" />
          <p>No research found.</p>
          {canAdd && <Button variant="link" onClick={() => handleOpenModal()}>Add your first research</Button>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {researchList.map((research) => (
            <Card key={research.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg text-brand-dark-blue flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-brand-teal" />
                      {research.title}
                    </CardTitle>
                    {attendanceStatus?.isPunchedIn && attendanceStatus?.record?.punchInActivityType === 'Research' && attendanceStatus?.record?.punchInActivityValue === research.title && (
                      <LiveTimer startTime={attendanceStatus.record.lastPunchIn} />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    By {research.createdByName} • {new Date(research.createdAt).toLocaleDateString()}
                    {research.projectId && projects.find(p => p.id === research.projectId) && (
                      <span className="ml-2 text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded">
                        Project: {projects.find(p => p.id === research.projectId)?.title}
                      </span>
                    )}
                  </p>
                </div>
                {(canEdit || canDelete) && (isAdmin || research.createdBy === (user?.id || user?._id)) && (
                  <div className="flex gap-2">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-brand-teal" onClick={() => handleOpenModal(research)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleDelete(research.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{research.description}</p>
                
                {research.link && (
                  <div className="flex items-center gap-2 text-sm">
                    <LinkIcon className="w-4 h-4 text-brand-teal" />
                    <a href={research.link.startsWith('http') ? research.link : `https://${research.link}`} target="_blank" rel="noopener noreferrer" className="text-brand-teal hover:underline truncate">
                      {research.link}
                    </a>
                  </div>
                )}

                {research.sharedWith && research.sharedWith.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-slate-400 mb-1.5">Shared With:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {research.sharedWith.map((id: string) => (
                        <Badge key={id} variant="secondary" className="text-[10px] font-normal bg-slate-100 text-slate-600 hover:bg-slate-200">
                          {getEmployeeName(id)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResearch ? "Edit Research" : "Add Research"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Competitor Analysis Q3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about the research..."
                className="min-h-[300px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Link / Reference URL</Label>
              <Input 
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Share With (Employees)</Label>
              <MultiSelect
                options={employeeOptions}
                selected={sharedWith}
                onChange={setSharedWith}
                placeholder="Select employees to share with"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-brand-teal hover:bg-brand-teal/90">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingResearch ? "Save Changes" : "Create Research"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
