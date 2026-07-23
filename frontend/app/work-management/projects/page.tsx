"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Building2, Plus, Pencil, Trash2, Calendar, Shield, Loader2, Search, AlertTriangle, History, ClipboardList, Filter, CalendarClock, Key, Link2, ExternalLink, Banknote } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";

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
  const [selectedCompany, setSelectedCompany] = useState("all");

  useEffect(() => {
    if (!isAdmin && user?.department) {
      setSelectedDept(user.department.toLowerCase().trim());
    }
  }, [isAdmin, user]);

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

  // Credentials & Links State
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [credModalProject, setCredModalProject] = useState<any>(null);
  const [credFrontendLink, setCredFrontendLink] = useState("");
  const [credIntegrations, setCredIntegrations] = useState<any[]>([]);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  const handleSaveCreds = async () => {
    if (!credModalProject) return;
    setIsSavingCreds(true);
    try {
      const res = await fetch(`${API_URL}/projects/${credModalProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credModalProject,
          frontendLink: credFrontendLink,
          thirdPartyIntegrations: credIntegrations,
          performedBy: user?.id || "Unknown",
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown User"
        })
      });
      if (res.ok) {
        toast.success("Links & Credentials updated successfully!");
        setCredModalOpen(false);
        fetchData(false);
      } else {
        toast.error("Failed to update credentials");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSavingCreds(false);
    }
  };

  // Shift to Testing State
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftModalProject, setShiftModalProject] = useState<any>(null);
  const [shiftTestingLinks, setShiftTestingLinks] = useState<any[]>([]);
  const [isShifting, setIsShifting] = useState(false);

  // Testing & Bug Tracker State
  const [testingModalOpen, setTestingModalOpen] = useState(false);
  const [testingModalProject, setTestingModalProject] = useState<any>(null);
  const [newBugTitle, setNewBugTitle] = useState("");
  const [newBugDesc, setNewBugDesc] = useState("");
  const [newBugSeverity, setNewBugSeverity] = useState("Medium");
  const [newBugAssignee, setNewBugAssignee] = useState("none");
  const [employees, setEmployees] = useState<any[]>([]);
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);
  const [newTestLinkTitle, setNewTestLinkTitle] = useState("");
  const [newTestLinkUrl, setNewTestLinkUrl] = useState("");

  const handleConfirmShiftToTesting = async () => {
    if (!shiftModalProject) return;
    setIsShifting(true);
    try {
      const validLinks = shiftTestingLinks.filter(l => l.url?.trim());
      const res = await fetch(`${API_URL}/projects/${shiftModalProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shiftModalProject,
          status: "testing",
          testingLinks: validLinks,
          performedBy: user?.id,
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown"
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
        toast.success("Project shifted to Testing Phase!");
        setShiftModalOpen(false);
      } else {
        toast.error("Failed to update project status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error shifting project");
    } finally {
      setIsShifting(false);
    }
  };

  const handleAddBug = async () => {
    if (!testingModalProject || !newBugTitle.trim()) {
      toast.error("Please enter a bug title");
      return;
    }
    setIsSubmittingBug(true);
    try {
      const emp = employees.find(e => String(e.id) === newBugAssignee);
      const empName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name : "";
      const currentBugs = testingModalProject.testingBugs || [];
      const newBug = {
        id: "bug_" + Date.now(),
        title: newBugTitle.trim(),
        description: newBugDesc.trim(),
        severity: newBugSeverity,
        assignedToId: newBugAssignee === "none" ? "" : newBugAssignee,
        assignedToName: newBugAssignee === "none" ? "" : empName,
        reportedBy: user?.id || "anon",
        reportedByName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Employee",
        date: new Date().toISOString().split('T')[0],
        status: "open"
      };
      const updatedBugs = [newBug, ...currentBugs];
      const res = await fetch(`${API_URL}/projects/${testingModalProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testingModalProject,
          testingBugs: updatedBugs,
          performedBy: user?.id,
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown"
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
        setTestingModalProject(updated);
        setNewBugTitle("");
        setNewBugDesc("");
        setNewBugAssignee("none");
        toast.success("Bug reported successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to report bug");
    } finally {
      setIsSubmittingBug(false);
    }
  };

  const handleAssignBug = async (bugId: string, empId: string) => {
    if (!testingModalProject) return;
    try {
      const emp = employees.find(e => String(e.id) === empId);
      const empName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name : "";
      const currentBugs = testingModalProject.testingBugs || [];
      const updatedBugs = currentBugs.map((b: any) => 
        b.id === bugId ? { ...b, assignedToId: empId === "none" ? "" : empId, assignedToName: empId === "none" ? "" : empName } : b
      );
      const res = await fetch(`${API_URL}/projects/${testingModalProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testingModalProject,
          testingBugs: updatedBugs,
          performedBy: user?.id,
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown"
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
        setTestingModalProject(updated);
        toast.success("Bug assignee updated!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBugStatus = async (bugId: string) => {
    if (!testingModalProject) return;
    try {
      const currentBugs = testingModalProject.testingBugs || [];
      const updatedBugs = currentBugs.map((b: any) => 
        b.id === bugId ? { ...b, status: b.status === "open" ? "fixed" : "open" } : b
      );
      const res = await fetch(`${API_URL}/projects/${testingModalProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testingModalProject,
          testingBugs: updatedBugs,
          performedBy: user?.id,
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown"
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
        setTestingModalProject(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTestingLink = async () => {
    if (!testingModalProject || !newTestLinkUrl.trim()) return;
    try {
      const currentLinks = testingModalProject.testingLinks || [];
      const updatedLinks = [...currentLinks, { title: newTestLinkTitle.trim() || "Testing Link", url: newTestLinkUrl.trim() }];
      const res = await fetch(`${API_URL}/projects/${testingModalProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testingModalProject,
          testingLinks: updatedLinks,
          performedBy: user?.id,
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown"
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
        setTestingModalProject(updated);
        setNewTestLinkTitle("");
        setNewTestLinkUrl("");
        toast.success("Link added!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [user]);

  const fetchData = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setIsLoading(true);
    try {
      const [pRes, tRes, lRes, cRes, eRes] = await Promise.all([
        fetch(`${API_URL}/projects?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/wm-tasks?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/leads`),
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/employees`)
      ]);
      
      if (pRes.ok) setProjects(await pRes.json());
      if (tRes.ok) setTasks(await tRes.json());
      if (lRes.ok) setLeads(await lRes.json());
      if (cRes.ok) setClients(await cRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
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

  const getProjectStats = (project: any) => {
    if (project.modules && project.modules.length > 0) {
      const completedModulesCount = project.modules.filter((m: any) => m.stage === "completed").length;
      const inProgressModules = project.modules.filter((m: any) => m.stage === "in_progress" || m.stage === "in-progress" || m.stage === "testing" || m.stage === "bugs");
      const percent = Math.round((completedModulesCount / project.modules.length) * 100);
      
      const assignedTeamIds = project.assignedTeamIds || [];
      const teamMembersStats = assignedTeamIds.map((empId: string) => {
        const emp = employees.find(e => String(e.id) === empId);
        const empName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name : "Unknown";
        const memberModules = inProgressModules.filter((m: any) => m.assignedToId === empId).map((m: any) => m.name);
        return { id: empId, name: empName, items: memberModules };
      });

      return { percent, inProgressNames: inProgressModules.map((m: any) => m.name), teamMembersStats, isTaskFallback: false };
    }

    const projectTasks = tasks.filter(t => t.projectId === project.id);
    if (projectTasks.length === 0) return { percent: 0, inProgressNames: [], teamMembersStats: [], isTaskFallback: false };
    
    const completedTasks = projectTasks.filter(t => t.status === "completed").length;
    const inProgressTasks = projectTasks.filter(t => t.status === "in_progress" || t.status === "in-progress" || t.status === "testing" || t.status === "bugs");
    const percent = Math.round((completedTasks / projectTasks.length) * 100);

    const assignedTeamIds = project.assignedTeamIds || [];
    const teamMembersStats = assignedTeamIds.map((empId: string) => {
      const emp = employees.find(e => String(e.id) === empId);
      const empName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name : "Unknown";
      const memberTasks = inProgressTasks.filter((t: any) => t.assignedToId === empId).map((t: any) => t.title);
      return { id: empId, name: empName, items: memberTasks };
    });

    return { percent, inProgressNames: inProgressTasks.map(t => t.title), teamMembersStats, isTaskFallback: true };
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

  const allowedProjects = projects.filter(p => {
    if (isAdmin) return true;
    if (!user?.department) return true;
    const userDept = user.department.toLowerCase().trim();
    return p.department && p.department.toLowerCase().includes(userDept);
  });

  const filteredProjects = allowedProjects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const selectedDeptTrimmed = selectedDept.toLowerCase().trim();
    const matchesDept = selectedDept === "all" || (p.department && p.department.toLowerCase().includes(selectedDeptTrimmed));
    const matchesStatus = selectedStatus === "all" || p.status?.toLowerCase() === selectedStatus.toLowerCase();
    const matchesPriority = selectedPriority === "all" || p.priority?.toLowerCase() === selectedPriority.toLowerCase();
    const matchesCompany = selectedCompany === "all" || p.clientName === selectedCompany;

    return matchesSearch && matchesDept && matchesStatus && matchesPriority && matchesCompany;
  }).sort((a, b) => {
    const isDev = selectedDept.toLowerCase() === "development" || selectedDept.toLowerCase().includes("dev");
    if (isDev) {
      const statusOrder: Record<string, number> = {
        "in-progress": 1,
        "on-hold": 2,
        "completed": 3,
      };
      
      const statusA = a.status?.toLowerCase() || "";
      const statusB = b.status?.toLowerCase() || "";
      
      const orderA = statusOrder[statusA] || 99;
      const orderB = statusOrder[statusB] || 99;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      const progressA = getProjectStats(a).percent;
      const progressB = getProjectStats(b).percent;
      
      return progressB - progressA;
    }
    return 0;
  });

  const uniqueCompanies = Array.from(new Set(projects.map(p => p.clientName).filter(Boolean))).sort();

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
                isAdmin={isAdmin}
                currentUser={user}
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
            <DialogTitle>Follow-ups</DialogTitle>
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

      {/* Links & Credentials Dialog */}
      <Dialog open={credModalOpen} onOpenChange={setCredModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Key className="w-5 h-5 text-brand-teal" /> Frontend Link & Third-Party Credentials
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 custom-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Frontend Link</Label>
              <Input
                placeholder="e.g. https://staging.myapp.vercel.app or repo link"
                value={credFrontendLink}
                onChange={(e) => setCredFrontendLink(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Third-Party Integrations & API Keys</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCredIntegrations(prev => [...prev, { name: "", credentials: "", notes: "" }])}
                  className="h-7 text-xs font-bold border-brand-teal text-brand-teal hover:bg-brand-teal/5"
                >
                  + Add Integration
                </Button>
              </div>
              {credIntegrations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No third-party integrations added yet.</p>
              ) : (
                <div className="space-y-3">
                  {credIntegrations.map((intg, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative shadow-2xs">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setCredIntegrations(prev => prev.filter((_, i) => i !== idx))}
                        className="h-6 w-6 absolute top-2 right-2 text-red-500 hover:bg-red-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-7">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Service / Integration</Label>
                          <Input
                            placeholder="e.g. Stripe API, AWS S3, Firebase"
                            value={intg.name || ""}
                            onChange={(e) => {
                              const arr = [...credIntegrations];
                              arr[idx] = { ...arr[idx], name: e.target.value };
                              setCredIntegrations(arr);
                            }}
                            className="h-8 text-xs font-semibold bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Credentials / Secret Key</Label>
                          <Input
                            placeholder="e.g. sk_live_xxx / API key"
                            value={intg.credentials || ""}
                            onChange={(e) => {
                              const arr = [...credIntegrations];
                              arr[idx] = { ...arr[idx], credentials: e.target.value };
                              setCredIntegrations(arr);
                            }}
                            className="h-8 text-xs font-mono bg-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Purpose / Scope Notes</Label>
                        <Input
                          placeholder="e.g. Payment gateway integration for checkout flow"
                          value={intg.notes || ""}
                          onChange={(e) => {
                            const arr = [...credIntegrations];
                            arr[idx] = { ...arr[idx], notes: e.target.value };
                            setCredIntegrations(arr);
                          }}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setCredModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveCreds} disabled={isSavingCreds} className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold">
              {isSavingCreds && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Save Links & Credentials
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shift to Testing Dialog */}
      <Dialog open={shiftModalOpen} onOpenChange={setShiftModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-purple-700">
              🧪 Shift to Testing Phase
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-600">
              All tasks for <strong className="text-slate-900">{shiftModalProject?.title}</strong> are completed. Add testing / staging environment links below before shifting the project to Testing Phase.
            </p>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {shiftTestingLinks.map((link, idx) => (
                <div key={idx} className="p-2.5 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2 relative">
                  {shiftTestingLinks.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setShiftTestingLinks(prev => prev.filter((_, i) => i !== idx))}
                      className="h-6 w-6 absolute top-1.5 right-1.5 text-red-500 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">Environment Name</Label>
                    <Input
                      placeholder="e.g. Staging App / Test Server"
                      value={link.title || ""}
                      onChange={(e) => {
                        const arr = [...shiftTestingLinks];
                        arr[idx] = { ...arr[idx], title: e.target.value };
                        setShiftTestingLinks(arr);
                      }}
                      className="h-8 text-xs font-bold bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-500">URL Link</Label>
                    <Input
                      placeholder="https://staging.company.com"
                      value={link.url || ""}
                      onChange={(e) => {
                        const arr = [...shiftTestingLinks];
                        arr[idx] = { ...arr[idx], url: e.target.value };
                        setShiftTestingLinks(arr);
                      }}
                      className="h-8 text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShiftTestingLinks(prev => [...prev, { title: "Testing Link", url: "" }])}
              className="w-full text-xs font-bold border-dashed border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Another Link
            </Button>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShiftModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleConfirmShiftToTesting} disabled={isShifting} className="bg-purple-600 hover:bg-purple-700 text-white font-black">
              {isShifting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Confirm & Start Testing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Testing & Bug Tracker Dialog */}
      <Dialog open={testingModalOpen} onOpenChange={setTestingModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-lg font-black text-indigo-700 pr-8 sm:pr-10">
              <span>🐞 Testing & Bug Board: {testingModalProject?.title}</span>
              {(isAdmin || user?.role?.toLowerCase() === 'cto') ? (
                <Button
                  size="sm"
                  onClick={async () => {
                    const openCount = testingModalProject?.testingBugs?.filter((b:any)=>b.status==='open').length || 0;
                    if (openCount > 0 && !window.confirm(`There are still ${openCount} open bugs. Mark project as completed anyway?`)) return;
                    try {
                      const res = await fetch(`${API_URL}/projects/${testingModalProject?.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...testingModalProject, status: "completed", performedBy: user?.id })
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                        setTestingModalOpen(false);
                        toast.success("Project marked as Completed!");
                      }
                    } catch(e) { console.error(e); }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-8 px-3 shadow-sm animate-pulse"
                >
                  ✅ Approve & Mark Completed
                </Button>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  🔒 Final Approval by CTO/Admin Only
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-3 px-1 custom-scrollbar">
            {/* Section 1: Testing Links */}
            <div className="space-y-2 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
              <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                🔗 Environment & Testing Links
              </h4>
              {testingModalProject?.testingLinks?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {testingModalProject.testingLinks.map((l: any, idx: number) => (
                    <a key={idx} href={l.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-indigo-200/80 rounded-xl hover:shadow-sm transition-all flex items-center justify-between gap-2 group">
                      <div className="truncate">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{l.title || "Staging"}</p>
                        <p className="text-xs font-semibold text-indigo-600 truncate group-hover:underline">{l.url}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No testing links added yet.</p>
              )}
              
              {(isAdmin || user?.role?.toLowerCase() === 'cto' || testingModalProject?.teamLeaderId === user?.id) && (
                <div className="pt-2 flex items-center gap-2">
                  <Input placeholder="Link Title (e.g. Test iOS App)" value={newTestLinkTitle} onChange={e=>setNewTestLinkTitle(e.target.value)} className="h-8 text-xs bg-white w-1/3 font-semibold" />
                  <Input placeholder="https://..." value={newTestLinkUrl} onChange={e=>setNewTestLinkUrl(e.target.value)} className="h-8 text-xs font-mono bg-white flex-1" />
                  <Button size="sm" type="button" onClick={handleAddTestingLink} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">Add Link</Button>
                </div>
              )}
            </div>

            {/* Section 2: Report Bug */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                🐞 Report New Bug (Open to All Employees)
              </h4>
              <div className="space-y-2.5">
                <div className="flex gap-2 flex-wrap">
                  <Input placeholder="Bug Summary / Title..." value={newBugTitle} onChange={e=>setNewBugTitle(e.target.value)} className="h-9 text-xs font-bold bg-white flex-1 min-w-[200px]" />
                  <Select value={newBugSeverity} onValueChange={setNewBugSeverity}>
                    <SelectTrigger className="w-[110px] h-9 bg-white text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  {(isAdmin || user?.role?.toLowerCase() === 'cto' || testingModalProject?.teamLeaderId === user?.id) && (
                    <Select value={newBugAssignee} onValueChange={setNewBugAssignee}>
                      <SelectTrigger className="w-[150px] h-9 bg-white text-xs font-semibold text-slate-700">
                        <SelectValue placeholder="Assign To..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">👤 Unassigned</SelectItem>
                        {employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Input placeholder="Steps to reproduce / description..." value={newBugDesc} onChange={e=>setNewBugDesc(e.target.value)} className="h-9 text-xs bg-white" />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddBug} disabled={isSubmittingBug} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 h-8">
                    {isSubmittingBug ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                    Submit Bug Report
                  </Button>
                </div>
              </div>
            </div>

            {/* Section 3: Reported Bugs List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center justify-between">
                <span>📋 Reported Bugs ({testingModalProject?.testingBugs?.length || 0})</span>
                <span className="text-[10px] text-slate-500 font-normal">Click checkbox to toggle Fixed status</span>
              </h4>
              <div className="space-y-2">
                {testingModalProject?.testingBugs?.length > 0 ? (
                  testingModalProject.testingBugs.map((bug: any) => (
                    <div key={bug.id} className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${bug.status==='fixed' ? 'bg-emerald-50/40 border-emerald-200 opacity-75' : 'bg-white border-slate-200 shadow-2xs'}`}>
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={bug.status === 'fixed'}
                          onChange={() => handleToggleBugStatus(bug.id)}
                          className="mt-1 w-4 h-4 text-emerald-600 rounded cursor-pointer shrink-0"
                        />
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${bug.severity==='Critical'||bug.severity==='High' ? 'bg-red-100 text-red-700' : bug.severity==='Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{bug.severity}</span>
                            <span className={`text-[10px] font-extrabold ${bug.status==='fixed' ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>{bug.title}</span>
                          </div>
                          {bug.description && <p className="text-xs text-slate-600 break-words">{bug.description}</p>}
                          <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] text-slate-400 pt-0.5">
                            <span>Reported by <strong className="text-slate-600">{bug.reportedByName}</strong> on {bug.date}</span>
                            
                            {/* Assignee Control / Badge */}
                            {(isAdmin || user?.role?.toLowerCase() === 'cto' || testingModalProject?.teamLeaderId === user?.id) ? (
                              <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200">
                                <span className="font-bold text-slate-500">Assignee:</span>
                                <Select value={bug.assignedToId ? String(bug.assignedToId) : "none"} onValueChange={(val) => handleAssignBug(bug.id, val)}>
                                  <SelectTrigger className="h-6 text-[10px] font-bold border-0 bg-transparent px-1 focus:ring-0 w-[130px] shadow-none text-indigo-700">
                                    <SelectValue placeholder="Unassigned" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">👤 Unassigned</SelectItem>
                                    {employees.map((emp: any) => (
                                      <SelectItem key={emp.id} value={String(emp.id)}>
                                        {emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : emp.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : bug.assignedToName ? (
                              <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100">
                                👤 Assigned to: {bug.assignedToName}
                              </span>
                            ) : (
                              <span className="italic text-slate-400">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant={bug.status==='fixed' ? 'success' : 'destructive'} className="text-[10px] font-bold shrink-0 uppercase">{bug.status}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
                    🎉 No bugs reported yet!
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
            <Button variant="outline" size="sm" onClick={() => setTestingModalOpen(false)}>Close Bug Board</Button>
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
          {isAdmin && (
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-[160px] h-10 font-medium">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {["Development", "Creative", "Digital Marketing"].map(dept => (
                  <SelectItem key={dept} value={dept.toLowerCase()}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px] h-10 font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(selectedDept.toLowerCase() === "development" || selectedDept.toLowerCase().includes("dev")) ? (
                <>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="testing">Testing Phase</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </>
              )}
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

          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[180px] h-10 font-medium">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {uniqueCompanies.map((company: any) => (
                <SelectItem key={company} value={company}>{company}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(selectedDept !== "all" || selectedStatus !== "all" || selectedPriority !== "all" || selectedCompany !== "all" || searchTerm !== "") && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSelectedDept("all");
                setSelectedStatus("all");
                setSelectedPriority("all");
                setSelectedCompany("all");
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
            const stats = getProjectStats(project);
            const progress = stats.percent;
            const isDevProject = !project.department || project.department.toLowerCase() === "development" || project.department.toLowerCase().includes("dev");
            const overdue = isOverdue(project.endDate, project.status, progress);
            const isManagementOrTL = isAdmin || user?.role === "HR" || project.teamLeaderId === user?.id;
            
            const getDaysLeftText = (dateString: string) => {
              if (!dateString || project.status === "completed" || progress === 100) return null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const target = new Date(dateString);
              target.setHours(0, 0, 0, 0);
              const diffTime = target.getTime() - today.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 0) return `(${Math.abs(diffDays)} days overdue)`;
              if (diffDays === 0) return "(Due today)";
              if (diffDays === 1) return "(1 day left)";
              return `(${diffDays} days left)`;
            };
            const clientDaysLeftText = getDaysLeftText(project.endDate);

            return (
              <Card key={project.id} className={`group hover:shadow-md transition-shadow border-border ${
                overdue ? "border-red-300 bg-red-50/20" : ""
              }`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <div className="flex gap-2 items-center mb-2">
                        <Badge variant={getStatusColor(project.status, progress)} className="capitalize">
                          {project.status === 'testing' ? 'Testing Phase' : project.status.replace('-', ' ')}
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
                          {project.department?.toLowerCase() === 'development' && (isManagementOrTL || canEditProjects) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-brand-teal hover:text-indigo-600" onClick={() => {
                              setCredModalProject(project);
                              setCredFrontendLink(project.frontendLink || "");
                              setCredIntegrations(project.thirdPartyIntegrations || []);
                              setCredModalOpen(true);
                            }} title="Frontend Link & Third-Party Credentials">
                              <Key className="w-4 h-4 text-brand-teal" />
                            </Button>
                          )}
                          {(!project.department || project.department.toLowerCase() !== 'development') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => {
                              setFollowupConfigProject(project);
                              setFollowupTypeInput(project.followupType || "Interval");
                              setFollowupIntervalInput(project.followupIntervalDays ? String(project.followupIntervalDays) : "");
                              setFollowupDaysOfWeekInput(project.followupDaysOfWeek || []);
                              setFollowupDatesOfMonthInput(project.followupDatesOfMonth || []);
                              setFollowupLastDateInput(project.lastFollowupDate || "");
                              setFollowupConfigOpen(true);
                            }} title="Follow-ups">
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
                      <div className="text-xs uppercase font-bold tracking-tight text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {project.department || "No Department"}
                      </div>
                    </div>

                    {/* Additional Details */}
                    {(project.services || Number(project.post) > 0 || Number(project.reel) > 0 || Number(project.dailyBudget) > 0 || project.festivalPost === "Yes" || project.salesFocused) && (
                      <div className="pt-3 border-t border-dashed border-border/60 space-y-2">
                        {project.services && (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Services</span>
                            <span className="text-slate-700 font-medium">{project.services}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {Number(project.post) > 0 && (
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Posts</span>
                              <span className="text-slate-700 font-medium">{project.post}</span>
                            </div>
                          )}
                          {Number(project.reel) > 0 && (
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Reels</span>
                              <span className="text-slate-700 font-medium">{project.reel}</span>
                            </div>
                          )}
                          {Number(project.dailyBudget) > 0 && (
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Daily Budget</span>
                              <span className="text-slate-700 font-medium">₹{project.dailyBudget}</span>
                            </div>
                          )}
                          {project.salesFocused && (
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Sales Focused</span>
                              <span className="text-slate-700 font-medium">{project.salesFocused}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {project.festivalPost === "Yes" && (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200">Festival Post</Badge>
                          )}
                          {project.graphicsRequired === "Yes" && (
                            <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">Graphics Req</Badge>
                          )}
                          {project.dailyFollowup === "Yes" && (
                            <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-600 border-purple-200">Daily Follow-up</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Development Details & Progress */}
                    {isDevProject && (
                      <div className="pt-3 border-t border-dashed border-border/60 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Overall Progress</span>
                          <span className="font-bold text-brand-teal">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-slate-100" />
                        {stats.inProgressNames.length > 0 && (
                          <div className="pt-1">
                            <p className="text-[10px] text-slate-500 italic mb-1">{stats.isTaskFallback ? "In-Progress Tasks:" : "In-Progress Modules:"}</p>
                            <div className="flex flex-wrap gap-1">
                              {stats.inProgressNames.map((name, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 shadow-none font-bold">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {stats.teamMembersStats && stats.teamMembersStats.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 mt-2">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                              Assigned Team Members
                            </p>
                            <div className="flex flex-wrap gap-4">
                              {stats.teamMembersStats.map((member: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-1.5 min-w-[120px]">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700 shadow-sm">
                                      {member.name !== 'Unknown' ? member.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700">
                                      {member.name}
                                    </span>
                                  </div>
                                  {member.items.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pl-6">
                                      {member.items.map((itemName: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 shadow-none font-bold py-0.5 px-1.5">
                                          {itemName}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {project.department?.toLowerCase() === 'development' && (project.frontendLink || (project.thirdPartyIntegrations && project.thirdPartyIntegrations.length > 0)) && (
                      <div className="pt-3 border-t border-dashed border-border/60 space-y-2">
                        {project.frontendLink && (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Frontend Link</span>
                            <a href={project.frontendLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-brand-teal font-medium hover:underline truncate">{project.frontendLink}</a>
                          </div>
                        )}
                        {project.thirdPartyIntegrations && project.thirdPartyIntegrations.length > 0 && (
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[9px]">Third-Party Integrations ({project.thirdPartyIntegrations.length})</span>
                            <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                              {project.thirdPartyIntegrations.map((intg: any, i: number) => (
                                <div key={i} className="p-1.5 bg-slate-50 border border-slate-100 rounded text-[11px] space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-700">{intg.name}:</span>
                                    <span className="font-mono bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-800 select-all">{intg.credentials}</span>
                                  </div>
                                  {intg.notes && <p className="text-[10px] text-slate-500">{intg.notes}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Testing Phase / Shift to Testing Action - Only for Development Projects */}
                    {isDevProject && (project.status === "testing" ? (
                      <div className="pt-3 border-t border-dashed border-indigo-200">
                        <Button 
                          type="button"
                          variant="outline"
                          className="w-full bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-extrabold border-indigo-300 flex items-center justify-center gap-2 text-xs h-9 shadow-xs transition-all"
                          onClick={() => {
                            setTestingModalProject(project);
                            setTestingModalOpen(true);
                          }}
                        >
                          🐞 Testing Environment & Bug Tracker ({project.testingBugs?.filter((b:any)=>b.status==='open').length || 0} Open Bugs)
                        </Button>
                      </div>
                    ) : progress === 100 && project.status !== "completed" ? (
                      <div className="pt-3 border-t border-dashed border-purple-200">
                        {(isAdmin || user?.role?.toLowerCase() === 'cto' || project.teamLeaderId === user?.id) ? (
                          <Button 
                            type="button"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black flex items-center justify-center gap-2 text-xs h-9 shadow-md transition-all animate-pulse"
                            onClick={() => {
                              setShiftModalProject(project);
                              setShiftTestingLinks([{ title: "Staging URL", url: project.frontendLink || "" }]);
                              setShiftModalOpen(true);
                            }}
                          >
                            🚀 Shift Project to Testing Phase
                          </Button>
                        ) : (
                          <div className="w-full text-center py-1.5 text-[11px] font-bold text-slate-500 bg-purple-50/50 rounded-lg border border-purple-100">
                            ⏳ 100% Tasks Done · Awaiting TL/CTO to Shift to Testing
                          </div>
                        )}
                      </div>
                    ) : null)}

                    {/* Finance & Feedback Details */}
                    {(isAdmin || project.teamLeaderId === user?.id || project.assignedFinanceManagerId === user?.id) && (project.amountReceived !== undefined || project.projectFeedback) && (
                      <div className="pt-3 border-t border-dashed border-emerald-200/60 bg-emerald-50/30 p-3 rounded-lg space-y-2 mt-2 mb-2">
                        <div className="flex items-center gap-1.5 mb-1 text-emerald-700">
                          <Banknote className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Finance & Feedback</span>
                        </div>
                        {project.assignedFinanceManagerName && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">Finance Manager:</span>
                            <span className="font-bold text-slate-700">{project.assignedFinanceManagerName}</span>
                          </div>
                        )}
                        {project.amountReceived !== undefined && project.amountReceived > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">Amount Received:</span>
                            <span className="font-bold text-emerald-600">₹{project.amountReceived}</span>
                          </div>
                        )}
                        {project.projectFeedback && (
                          <div className="flex flex-col gap-0.5 text-xs mt-1">
                            <span className="text-slate-500 font-medium">Feedback / Notes:</span>
                            <span className="text-slate-700 italic bg-white p-1.5 rounded border border-emerald-100">{project.projectFeedback}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-start justify-between pt-2 border-t border-border/50 text-[12px] text-muted-foreground">
                      {isAdmin ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px] flex-wrap">
                            <Calendar className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                            <span>Start: <strong className="text-slate-800 font-semibold">{project.startDate || "-"}</strong></span>
                            <span className="text-slate-300">|</span>
                            <span className={overdue ? "text-red-600 font-bold" : ""}>Client Deadline: <strong className={overdue ? "text-red-600 font-bold" : "text-slate-800 font-semibold"}>{project.endDate || "-"}</strong></span>
                          </div>
                          {project.teamDeadline && (
                            <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[11px]">
                              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                              Team Deadline: {project.teamDeadline}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                            <span>Start: <strong className="text-slate-800 font-semibold">{project.startDate || "-"}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[11px]">
                            <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                            Team Deadline: {project.teamDeadline || project.endDate || project.startDate || "-"}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] ${
                          project.priority === 'high' ? 'border-red-200 text-red-600 bg-red-50' : 
                          project.priority === 'medium' ? 'border-amber-200 text-amber-600 bg-amber-50' : 
                          'border-green-200 text-green-600 bg-green-50'
                        }`}>
                          {project.priority.toUpperCase()}
                        </Badge>
                        {isAdmin && clientDaysLeftText && (
                          <span className={`text-[11px] font-bold ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                            {clientDaysLeftText}
                          </span>
                        )}
                      </div>
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
