"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Building2, Plus, Pencil, Trash2, Calendar, Shield, Loader2, Search, AlertTriangle, History, ClipboardList, Filter, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectForm, ProjectFormData } from "@/components/hrms/ProjectForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/context/ConfirmContext";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function ProjectsPage() {
  const { confirm } = useConfirm();
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const canViewProjects = isAdmin || checkPermission('projects', 'canView');
  const canAddProjects = isAdmin || checkPermission('projects', 'canAdd');
  const canEditProjects = isAdmin || checkPermission('projects', 'canEdit');
  const canDeleteProjects = isAdmin || checkPermission('projects', 'canDelete');

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");

  useEffect(() => {
    if (!permissionsLoading && !canViewProjects) {
      setTimeout(() => {
        router.push("/");
      }, 0);
    }
  }, [router, permissionsLoading, canViewProjects]);
  
  const [logsOpen, setLogsOpen] = useState(false);
  const [projectLogs, setProjectLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeProject, setActiveProject] = useState<any>(null);

  // Follow-up Config State
  const [followupConfigOpen, setFollowupConfigOpen] = useState(false);
  const [followupConfigProject, setFollowupConfigProject] = useState<any>(null);
  const [followupTypeInput, setFollowupTypeInput] = useState("Interval");
  const [followupIntervalInput, setFollowupIntervalInput] = useState("");
  const [followupDaysOfWeekInput, setFollowupDaysOfWeekInput] = useState<number[]>([]);
  const [followupDatesOfMonthInput, setFollowupDatesOfMonthInput] = useState<number[]>([]);
  const [followupLastDateInput, setFollowupLastDateInput] = useState("");

  useEffect(() => {
    fetchData(true);
  }, [user]);

  const fetchData = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setIsLoading(true);
    try {
      const [pRes, tRes, lRes, cRes] = await Promise.all([
        fetch(`${API_URL}/projects?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/wm-tasks?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/leads`),
        fetch(`${API_URL}/clients`)
      ]);
      
      if (pRes.ok) setProjects(await pRes.json());
      if (tRes.ok) setTasks(await tRes.json());
      if (lRes.ok) setLeads(await lRes.json());
      if (cRes.ok) setClients(await cRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleOpenLogs = async (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveProject(project);
    setIsLoadingLogs(true);
    setLogsOpen(true);
    try {
      const res = await fetch(`${API_URL}/task-logs?projectId=${project.id}`);
      if (res.ok) {
        setProjectLogs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
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
        const savedProject = await res.json();
        setProjects(prev => {
          if (editingProject) {
            return prev.map(p => p.id === savedProject.id ? savedProject : p);
          } else {
            return [savedProject, ...prev];
          }
        });
        setModalOpen(false);
        fetchData(false);
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

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this project?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData(false);
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const handleSaveFollowupConfig = async () => {
    if (!followupConfigProject) return;
    try {
      const res = await fetch(`${API_URL}/projects/${followupConfigProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          followupType: followupTypeInput,
          followupIntervalDays: parseInt(followupIntervalInput) || null,
          followupDaysOfWeek: followupDaysOfWeekInput,
          followupDatesOfMonth: followupDatesOfMonthInput,
          lastFollowupDate: followupLastDateInput || null,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (res.ok) {
        toast.success("Follow-up configuration saved");
        setFollowupConfigOpen(false);
        fetchData(false);
      } else {
        toast.error("Failed to save follow-up configuration");
      }
    } catch (err) {
      console.error("Error saving follow-up config:", err);
      toast.error("An error occurred");
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

  // Derived pending clients that need projects
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

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = selectedDept === "all" || p.department?.toLowerCase() === selectedDept.toLowerCase();
    const matchesStatus = selectedStatus === "all" || p.status?.toLowerCase() === selectedStatus.toLowerCase();
    const matchesPriority = selectedPriority === "all" || p.priority?.toLowerCase() === selectedPriority.toLowerCase();

    return matchesSearch && matchesDept && matchesStatus && matchesPriority;
  });

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

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
            {canAddProjects && (
              <DialogTrigger asChild>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
            )}
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

      <ActivityLogDialog 
        open={logsOpen}
        onOpenChange={setLogsOpen}
        title="Project Activity History"
        subtitle={activeProject?.title}
        logs={projectLogs}
        isLoading={isLoadingLogs}
      />
      
      {/* Follow-up Config Dialog */}
      <Dialog open={followupConfigOpen} onOpenChange={setFollowupConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Follow-up Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <Select value={followupTypeInput} onValueChange={setFollowupTypeInput}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interval">Fixed Interval (Days)</SelectItem>
                  <SelectItem value="Weekly">Weekly (Specific Days)</SelectItem>
                  <SelectItem value="Monthly">Monthly (Specific Dates)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {followupTypeInput === "Interval" && (
              <div className="space-y-2">
                <Label>Follow-up Interval (Days)</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 7 for weekly" 
                  value={followupIntervalInput} 
                  onChange={(e) => setFollowupIntervalInput(e.target.value)} 
                />
              </div>
            )}
            
            {followupTypeInput === "Weekly" && (
              <div className="space-y-2">
                <Label>Select Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Mon", val: 0 },
                    { label: "Tue", val: 1 },
                    { label: "Wed", val: 2 },
                    { label: "Thu", val: 3 },
                    { label: "Fri", val: 4 },
                    { label: "Sat", val: 5 }
                  ].map(day => (
                    <Badge 
                      key={day.val}
                      variant={followupDaysOfWeekInput.includes(day.val) ? "default" : "outline"}
                      className={`cursor-pointer ${followupDaysOfWeekInput.includes(day.val) ? 'bg-brand-teal' : ''}`}
                      onClick={() => {
                        if (followupDaysOfWeekInput.includes(day.val)) {
                          setFollowupDaysOfWeekInput(followupDaysOfWeekInput.filter(d => d !== day.val));
                        } else {
                          setFollowupDaysOfWeekInput([...followupDaysOfWeekInput, day.val]);
                        }
                      }}
                    >
                      {day.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {followupTypeInput === "Monthly" && (
              <div className="space-y-2">
                <Label>Select Dates of Month (1-31)</Label>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length: 31}, (_, i) => i + 1).map(date => (
                    <div 
                      key={date}
                      className={`text-xs text-center p-1 cursor-pointer rounded ${followupDatesOfMonthInput.includes(date) ? 'bg-brand-teal text-white' : 'hover:bg-slate-100'}`}
                      onClick={() => {
                        if (followupDatesOfMonthInput.includes(date)) {
                          setFollowupDatesOfMonthInput(followupDatesOfMonthInput.filter(d => d !== date));
                        } else {
                          setFollowupDatesOfMonthInput([...followupDatesOfMonthInput, date]);
                        }
                      }}
                    >
                      {date}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 italic">Skips Sundays & Public Holidays automatically.</p>
            
            <div className="space-y-2">
              <Label>Last Follow-up Date</Label>
              <Input 
                type="date" 
                value={followupLastDateInput} 
                onChange={(e) => setFollowupLastDateInput(e.target.value)} 
              />
            </div>
            <div className="pt-4 flex justify-end gap-2 border-t mt-4">
              <Button variant="outline" onClick={() => setFollowupConfigOpen(false)}>Cancel</Button>
              <Button className="bg-brand-teal text-white hover:bg-brand-teal-light" onClick={handleSaveFollowupConfig}>Save Configuration</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[160px] h-10 font-medium">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="Development">Development</SelectItem>
              <SelectItem value="Creative">Creative</SelectItem>
              <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px] h-10 font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-[140px] h-10 font-medium">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>

          {(selectedDept !== "all" || selectedStatus !== "all" || selectedPriority !== "all" || searchTerm !== "") && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSelectedDept("all");
                setSelectedStatus("all");
                setSelectedPriority("all");
                setSearchTerm("");
              }}
              className="text-xs text-muted-foreground hover:text-rose-600 font-bold h-10 px-3"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {pendingProjects.length > 0 && !isLoading && (
        <div 
          onClick={() => router.push('/work-management/projects/pending')}
          className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between cursor-pointer transition-colors group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-800">
                Action Required: Pending Project Creations ({pendingProjects.length})
              </h3>
              <p className="text-sm text-amber-700/80 mt-0.5">
                You have {pendingProjects.length} client department{pendingProjects.length !== 1 ? 's' : ''} that need projects created. Click here to set them up.
              </p>
            </div>
          </div>
          <div className="text-amber-700 font-bold hover:text-amber-800 flex items-center gap-1">
            <span className="underline underline-offset-2">Review Pending</span>
            <span>&rarr;</span>
          </div>
        </div>
      )}

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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleOpenLogs(project, e)} title="View History">
                        <History className="w-4 h-4 text-brand-teal" />
                      </Button>
                      {user && (
                        <>
                          {(!project.department || project.department.toLowerCase() !== 'development') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => {
                              setFollowupConfigProject(project);
                              setFollowupTypeInput(project.followupType || "Interval");
                              setFollowupIntervalInput(project.followupIntervalDays ? String(project.followupIntervalDays) : "");
                              setFollowupDaysOfWeekInput(project.followupDaysOfWeek || []);
                              setFollowupDatesOfMonthInput(project.followupDatesOfMonth || []);
                              setFollowupLastDateInput(project.lastFollowupDate || "");
                              setFollowupConfigOpen(true);
                            }} title="Follow-up Settings">
                              <CalendarClock className="w-4 h-4 text-slate-500" />
                            </Button>
                          )}
                          {canEditProjects && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setEditingProject(project);
                              setModalOpen(true);
                            }}>
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {canDeleteProjects && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(project.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
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
                        ₹{project.budget?.toLocaleString() || '0'}
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
          {!searchTerm && user && canAddProjects && (
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
