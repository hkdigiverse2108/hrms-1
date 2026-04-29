"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Building2, Plus, Pencil, Trash2, Calendar, Shield, Loader2, Search, AlertTriangle, History, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectForm, ProjectFormData } from "@/components/hrms/ProjectForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
  const { user } = useUser();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && user.role?.toLowerCase() !== "admin") {
        const dept = user.department?.toLowerCase();
        if (dept === "sales") {
          router.replace("/work-management/sales");
        } else if (dept === "marketing") {
          router.replace("/work-management/marketing-reports");
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user, router]);
  
  // Logs state
  const [logsOpen, setLogsOpen] = useState(false);
  const [projectLogs, setProjectLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeProject, setActiveProject] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`${API_URL}/projects?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/wm-tasks`)
      ]);
      
      if (pRes.ok) setProjects(await pRes.json());
      if (tRes.ok) setTasks(await tRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async (project: any) => {
    setIsLoadingLogs(true);
    setLogsOpen(true);
    setActiveProject(project);
    try {
      const res = await fetch(`${API_URL}/task-logs?projectId=${project.id}`);
      if (res.ok) {
        setProjectLogs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching project logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSubmit = async (formData: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingProject 
        ? `${API_URL}/projects/${editingProject.id}` 
        : `${API_URL}/projects`;
      const method = editingProject ? "PUT" : "POST";

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
        fetchData();
        setEditingProject(null);
      }
    } catch (err) {
      console.error("Error saving project:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const calculateProgress = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    
    const completedTasks = projectTasks.filter(t => t.status === "completed").length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  const getStatusColor = (status: string, progress: number) => {
    if (progress === 100) return "info";
    switch (status) {
      case "active": return "success";
      case "on-hold": return "warning";
      case "completed": return "info";
      default: return "secondary";
    }
  };

  const isOverdue = (dateString: string, status: string, progress: number) => {
    if (!dateString || status === "completed" || progress === 100) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(dateString);
    return endDate < today;
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.department?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage company projects, assign team leaders, and track real-time progress."
      >
        {user && (
          <Dialog open={modalOpen} onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setEditingProject(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {editingProject ? "Edit Project Details" : "Create New Project"}
                </DialogTitle>
              </DialogHeader>
              <ProjectForm 
                initialData={editingProject} 
                onSubmit={handleSubmit} 
                isSubmitting={isSubmitting} 
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Project Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xl font-bold">
                <History className="w-6 h-6 text-brand-teal" />
                Project Activity History
              </div>
              {activeProject && (
                <p className="text-sm font-medium text-muted-foreground ml-8 italic">
                  Showing updates for: "{activeProject.title}"
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
            ) : projectLogs.length > 0 ? (
              <div className="space-y-4">
                {projectLogs.map((log) => (
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
                    Actions performed on this project will appear here.
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
      
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
          <p className="text-muted-foreground font-medium">Loading projects...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const progress = calculateProgress(project.id);
            const overdue = isOverdue(project.endDate, project.status, progress);
            
            return (
              <Card key={project.id} className={`group hover:shadow-md transition-shadow border-border ${
                overdue ? "border-red-300 bg-red-50/20" : ""
              }`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <div className="flex gap-2 items-center mb-2">
                        <Badge variant={getStatusColor(project.status, progress)} className="capitalize">
                          {progress === 100 ? 'Completed' : project.status.replace('-', ' ')}
                        </Badge>
                        {overdue && (
                          <Badge variant="destructive" className="text-[10px] font-bold h-5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            OVERDUE
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-foreground leading-tight">{project.title}</h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchLogs(project)} title="View History">
                        <History className="w-4 h-4 text-brand-teal" />
                      </Button>
                      {user && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditingProject(project);
                            setModalOpen(true);
                          }}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(project.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand-teal border border-brand-teal/10">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground text-[10px] uppercase font-bold leading-none">Team Leader</p>
                      <p className="font-bold text-foreground leading-tight">{project.teamLeaderName || "Unassigned"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Building2 className="w-4 h-4 text-brand-teal" />
                        {project.clientName || "Unknown Client"}
                      </div>
                      <div className="text-muted-foreground font-mono font-bold">
                        ${project.budget?.toLocaleString() || '0'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Project Progress</span>
                        <span className={progress === 100 ? "text-brand-teal font-bold" : ""}>{progress}%</span>
                      </div>
                      <Progress value={progress} className={`h-1.5 ${
                        overdue ? "bg-red-100" : ""
                      }`} />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium italic">
                        <span>{tasks.filter(t => t.projectId === project.id).length} Total Tasks</span>
                        <span>{tasks.filter(t => t.projectId === project.id && t.status === "completed").length} Done</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[12px] text-muted-foreground">
                      <div className={`flex items-center gap-1.5 ${overdue ? "text-red-600 font-bold" : ""}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        Ends: {project.endDate || project.startDate}
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${
                        project.priority === 'high' ? 'border-red-200 text-red-600 bg-red-50' : 
                        project.priority === 'medium' ? 'border-amber-200 text-amber-600 bg-amber-50' : 
                        'border-green-200 text-green-600 bg-green-50'
                      }`}>
                        {project.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl p-20 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center text-brand-teal">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">No Projects Found</h2>
            <p className="text-muted-foreground max-w-md">
              {searchTerm ? `No projects matching "${searchTerm}"` : "You don't have any projects assigned to you yet."}
            </p>
          </div>
          {!searchTerm && user && (
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
