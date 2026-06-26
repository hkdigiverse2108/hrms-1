"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ClipboardList, Plus, Pencil, Trash2, Calendar, User, Loader2, Search, Briefcase, CheckCircle2, Circle, History, AlertTriangle, MoreHorizontal, X, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WMTaskForm, WMTaskFormData } from "@/components/hrms/WMTaskForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityLogDialog } from "@/components/common/ActivityLogDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { TablePagination } from "@/components/common/TablePagination";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";

const STAGES = [
  { id: "todo", label: "To Do", color: "text-slate-700 bg-transparent", lineColor: "bg-slate-400" },
  { id: "in-progress", label: "In Progress", color: "text-blue-700 bg-transparent", lineColor: "bg-blue-500" },
  { id: "bugs", label: "Bugs", color: "text-red-700 bg-transparent", lineColor: "bg-red-500" },
  { id: "onhold", label: "On Hold", color: "text-amber-700 bg-transparent", lineColor: "bg-amber-500" },
  { id: "fix-bugs", label: "Fix Bugs", color: "text-orange-700 bg-transparent", lineColor: "bg-orange-500" },
  { id: "completed", label: "Completed", color: "text-green-700 bg-transparent", lineColor: "bg-emerald-500" },
];

export default function TasksPage() {
  const { confirm } = useConfirm();
  const { user } = useUser();
  const router = useRouter();
  const { checkPermission, isAdmin: isUserAdmin, loading: permissionsLoading } = usePermissions();

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const canViewTasks = isUserAdmin || checkPermission('tasks', 'canView');
  const isTeamLeader = projects.some(p => p.teamLeaderId === user?.id);
  const canAddTask = isUserAdmin || checkPermission('tasks', 'canAdd') || isTeamLeader;
  const canEditTask = isUserAdmin || checkPermission('tasks', 'canEdit') || isTeamLeader;
  const canDeleteTask = isUserAdmin || checkPermission('tasks', 'canDelete');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskLogs, setTaskLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<{taskId?: string, taskTitle?: string}>({});
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [quickAddStage, setQuickAddStage] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDepartment, dateFilter, showAllTasks]);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewTasks) {
      router.push("/");
    }
  }, [router, permissionsLoading, canViewTasks]);

  const hasFullTasksAccess = React.useMemo(() => {
    if (!user) return false;
    const r = (user.role || "").toLowerCase();
    const d = (user.designation || "").toLowerCase();
    const fullRoles = ["admin", "manager", "social media manager", "smm", "director", "head", "super admin", "digital marketer", "digital marketing"];
    if (fullRoles.includes(r) || fullRoles.includes(d) || r.includes("social media") || d.includes("social media") || r.includes("digital marketing") || d.includes("digital marketing")) {
      return true;
    }
    const perms = (user as any).permissions || [];
    const smmPerms = ["projects", "smm", "clients", "digital-marketing", "work-management", "tasks"];
    return perms.some((p: any) => smmPerms.includes(p.moduleName) && (p.canView || p.canEdit || p.canAdd));
  }, [user]);

  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.name === "Admin Admin" || hasFullTasksAccess;

  useEffect(() => {
    if (user && !isAdmin && user.department) {
      setSelectedDepartment(user.department);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, pRes, eRes] = await Promise.all([
        fetch(`${API_URL}/wm-tasks`, { cache: 'no-store' }),
        fetch(`${API_URL}/projects`, { cache: 'no-store' }),
        fetch(`${API_URL}/employees`, { cache: 'no-store' })
      ]);
      
      if (tRes.ok) setTasks(await tRes.json());
      if (pRes.ok) setProjects(await pRes.json());
      if (eRes.ok) {
        let emps = await eRes.json();
        if (user && !emps.some((e: any) => e.id === user.id)) {
          emps.unshift({
            id: user.id,
            firstName: user.firstName || user.name?.split(' ')[0] || 'Me',
            lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            name: user.name,
            email: user.email,
            designation: user.designation,
            department: user.department
          });
        }
        setEmployees(emps);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async (taskId?: string, taskTitle?: string) => {
    setIsLoadingLogs(true);
    setLogsOpen(true);
    setLogFilter({ taskId, taskTitle });
    try {
      const url = taskId ? `${API_URL}/task-logs?taskId=${taskId}` : `${API_URL}/task-logs`;
      const res = await fetch(url);
      if (res.ok) {
        setTaskLogs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleQuickAdd = async (stageId: string) => {
    if (!quickAddTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        title: quickAddTitle.trim(),
        status: stageId,
        projectId: "",
        dueDate: dateFilter,
        postingDate: dateFilter,
        performedBy: user?.id,
        userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        department: selectedDepartment === 'all' && user?.department ? user.department : (selectedDepartment !== 'all' ? selectedDepartment : 'Development'),
        assignedToId: "",
      };

      const res = await fetch(`${API_URL}/wm-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask]);
        setQuickAddTitle("");
      } else {
        const error = await res.json();
        toast.error(`Error: ${error.detail || "Failed to add task"}`);
      }
    } catch (err) {
      console.error("Error quick adding task:", err);
      toast.error("Failed to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (formData: WMTaskFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingTask 
        ? `${API_URL}/wm-tasks/${editingTask.id}` 
        : `${API_URL}/wm-tasks`;
      const method = editingTask ? "PUT" : "POST";

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
        setEditingTask(null);
      } else {
        const error = await res.json();
        toast.error(`Error: ${error.detail || "Failed to save task"}`);
      }
    } catch (err) {
      console.error("Error saving task:", err);
      toast.error("Failed to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this task?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/wm-tasks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!canEditTask) {
      toast.error("You do not have permission to edit tasks");
      return;
    }
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = draggableId;
    const newStatus = destination.droppableId;
    
    const prevTasks = [...tasks];
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    try {
      const res = await fetch(`${API_URL}/wm-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (!res.ok) {
        setTasks(prevTasks);
        toast.error("Failed to update task stage");
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      setTasks(prevTasks);
    }
  };

  const handleInlineUpdate = async (taskId: string, field: string, value: any) => {
    try {
      const payload: any = { 
        [field]: value,
        performedBy: user?.id,
        userName: user?.name || `${user?.firstName} ${user?.lastName}`,
      };

      // Special handling for derived fields
      if (field === 'projectId') {
        const p = projects.find(proj => proj.id === value);
        payload.projectName = p?.title;
      }
      if (field === 'assignedToId') {
        const e = employees.find(emp => emp.id === value);
        payload.assignedToName = `${e?.firstName} ${e?.lastName}`;
      }
      if (field === 'postingDate' && value) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        payload.postingDay = days[new Date(value).getDay()];
      }

      const res = await fetch(`${API_URL}/wm-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            const updated = { ...t, ...payload };
            return updated;
          }
          return t;
        }));
      }
    } catch (err) {
      console.error("Error updating field:", err);
    }
    setEditingCell(null);
  };

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)))
    .filter((d: any) => !["sales", "admin", "hr"].includes(d.toLowerCase()));
  const showTableView = selectedDepartment.toLowerCase() === "creative" || (selectedDepartment === "all" && user?.department?.toLowerCase() === "creative");

  const filteredTasks = tasks.filter(t => {
    const assignee = employees.find(e => e.id === t.assignedToId);
    const taskDept = assignee?.department;

    // Strict Department Isolation for non-Admins
    if (!isAdmin) {
      if (taskDept && user?.department && taskDept.toLowerCase() !== user.department.toLowerCase()) {
        return false;
      }
    }

    let isVisible = false;
    if (isAdmin) {
      isVisible = true;
    } else if (user?.role === "Team Leader") {
      const project = projects.find(p => p.id === t.projectId);
      isVisible = project?.teamLeaderId === user?.id || t.assignedToId === user?.id || !t.assignedToId;
    } else {
      isVisible = t.assignedToId === user?.id || !t.assignedToId;
    }

    if (!isVisible) return false;

    // Department Filter
    if (selectedDepartment !== "all") {
      const assignee = employees.find(e => e.id === t.assignedToId);
      const dept = assignee?.department || t.department;
      if (dept !== selectedDepartment) return false;
    }

    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.assignedToName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Date Filtering
    if (!showAllTasks) {
      const taskDate = showTableView ? t.postingDate : t.dueDate;
      if (taskDate !== dateFilter) return false;
    }

    return true;
  });

  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );




  const isOverdue = (dateString: string, status: string) => {
    if (!dateString || status === "completed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateString.split('-');
    const dueDate = new Date(Number(y), Number(m) - 1, Number(d));
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)]">
      <PageHeader
        title="Development Board"
        description="Manage software & web development sprints. Click any card to update details."
      >
        <div className="flex gap-2">
          {canAddTask && (
            <Button onClick={() => { setEditingTask(null); setModalOpen(true); }} className="bg-brand-teal text-white hover:bg-brand-teal-light font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Assign Module
            </Button>
          )}

          <Dialog open={modalOpen} onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setEditingTask(null);
          }}>

            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {editingTask ? "Edit Module / Task" : "Assign New Module"}
                </DialogTitle>
              </DialogHeader>
              <WMTaskForm 
                initialData={editingTask} 
                onSubmit={handleSubmit} 
                isSubmitting={isSubmitting} 
                userDepartment={user?.department}
              />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <ActivityLogDialog 
        open={logsOpen}
        onOpenChange={setLogsOpen}
        title={logFilter.taskId ? "Task History" : "Company Activity Logs"}
        subtitle={logFilter.taskTitle}
        logs={taskLogs}
        isLoading={isLoadingLogs}
      />
      
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-3 bg-white p-2 px-4 rounded-xl border border-slate-200 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search tasks, projects or members..." 
            className="h-8 text-[13px] border-none focus-visible:ring-0 shadow-none p-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <Button 
              variant={!showAllTasks ? "secondary" : "ghost"} 
              size="sm" 
              className={`h-7 text-[11px] font-bold px-3 ${!showAllTasks ? 'bg-brand-teal text-white' : 'text-slate-500'}`}
              onClick={() => setShowAllTasks(false)}
            >
              Today
            </Button>
            <Button 
              variant={showAllTasks ? "secondary" : "ghost"} 
              size="sm" 
              className={`h-7 text-[11px] font-bold px-3 ${showAllTasks ? 'bg-brand-teal text-white' : 'text-slate-500'}`}
              onClick={() => setShowAllTasks(true)}
            >
              All Tasks
            </Button>
          </div>

          {!showAllTasks && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 h-9">
              <Calendar className="w-3.5 h-3.5 text-brand-teal" />
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none border-none p-0"
              />
            </div>
          )}

          {isAdmin && (
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="h-9 w-[180px] text-xs font-bold bg-white">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-brand-teal" />
                  <SelectValue placeholder="All Departments" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {showTableView ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[2000px]">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 w-16 text-center">S.No.</th>
                    <th className="px-4 py-3 min-w-[200px]">Task Title</th>
                    <th className="px-4 py-3 min-w-[150px]">Project</th>
                    <th className="px-4 py-3 min-w-[120px]">Assignee</th>
                    <th className="px-4 py-3 min-w-[120px]">Department</th>
                    <th className="px-4 py-3 min-w-[120px]">Stage</th>
                    <th className="px-4 py-3 min-w-[125px]">Created Date</th>
                    <th className="px-4 py-3">Posting Date</th>
                    <th className="px-4 py-3">Posting Day</th>
                    <th className="px-4 py-3">Reel/Post</th>
                    <th className="px-4 py-3">Concept</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Script Link</th>
                    <th className="px-4 py-3">Script Date</th>
                    <th className="px-4 py-3">Shooting Link</th>
                    <th className="px-4 py-3">Shoot Date</th>
                    <th className="px-4 py-3">Editing Link</th>
                    <th className="px-4 py-3">Edit Date</th>
                    <th className="px-4 py-3">Review By TL</th>
                    <th className="px-4 py-3">Final Link</th>
                    <th className="px-4 py-3 min-w-[200px]">Remarks</th>
                    <th className="px-4 py-3">Posted</th>
                    <th className="px-4 py-3 w-24 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[12px] divide-y divide-slate-100">
                  {paginatedTasks.map((task, index) => (
                    <tr 
                      key={task.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-4 py-3 text-center text-slate-400 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      
                      {/* Inline Editable Fields */}
                      {[
                        { key: 'title', type: 'text', minWidth: '200px' },
                        { key: 'projectId', labelKey: 'projectName', type: 'select', options: projects.map(p => ({ value: p.id, label: p.title })), minWidth: '150px' },
                        { key: 'assignedToId', labelKey: 'assignedToName', type: 'select', options: employees.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })), minWidth: '150px' },
                        { key: 'department', type: 'select', options: ['Development', 'Creative', 'Marketing'].map(d => ({ value: d, label: d })), minWidth: '120px' },
                        { key: 'status', type: 'select', options: STAGES.map(s => ({ value: s.id, label: s.label })), minWidth: '120px' },
                        { key: 'createdDate', type: 'readonly', minWidth: '125px' },
                        { key: 'postingDate', type: 'date' },
                        { key: 'postingDay', type: 'readonly' },
                        { key: 'reelPost', type: 'select', options: ['Post', 'Reel', 'Video'].map(v => ({ value: v, label: v })) },
                        { key: 'concept', type: 'text' },
                        { key: 'reference', type: 'text' },
                        { key: 'scriptLink', type: 'text' },
                        { key: 'scriptDate', type: 'date' },
                        { key: 'shootingLink', type: 'text' },
                        { key: 'shootDate', type: 'date' },
                        { key: 'editingLink', type: 'text' },
                        { key: 'editingDate', type: 'date' },
                        { key: 'reviewByTL', type: 'text' },
                        { key: 'finalLink', type: 'text' },
                        { key: 'remarks', type: 'text', minWidth: '200px' },
                        { key: 'postingStatus', type: 'select', options: ['Yes', 'No'].map(v => ({ value: v, label: v })) },
                      ].map((col) => (
                        <td 
                          key={col.key} 
                          className={`px-4 py-3 ${col.type !== 'readonly' && canEditTask ? 'cursor-text hover:bg-brand-teal/5 transition-colors' : ''}`}
                          style={{ minWidth: col.minWidth }}
                          onClick={() => col.type !== 'readonly' && canEditTask && setEditingCell({ id: task.id, field: col.key })}
                        >
                          {editingCell?.id === task.id && editingCell?.field === col.key ? (
                            col.type === 'select' ? (
                              <select 
                                autoFocus
                                className="w-full bg-white border border-brand-teal rounded px-1 py-0.5 outline-none"
                                defaultValue={task[col.key]}
                                onBlur={(e) => handleInlineUpdate(task.id, col.key, e.target.value)}
                                onChange={(e) => handleInlineUpdate(task.id, col.key, e.target.value)}
                              >
                                <option value="">Select...</option>
                                {col.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            ) : (
                              <input 
                                autoFocus
                                type={col.type}
                                className="w-full bg-white border border-brand-teal rounded px-2 py-1 outline-none"
                                defaultValue={task[col.key]}
                                onBlur={(e) => handleInlineUpdate(task.id, col.key, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineUpdate(task.id, col.key, e.currentTarget.value);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                              />
                            )
                          ) : (
                            <div className="flex items-center gap-2 min-h-[20px]">
                              {col.key === 'title' ? (
                                <span className="font-bold text-slate-800">{task[col.key]}</span>
                              ) : col.key === 'projectId' || col.key === 'assignedToId' ? (
                                <span className={`${col.key === 'projectId' ? 'text-brand-teal' : 'text-slate-600'} font-medium`}>
                                  {task[col.labelKey || col.key]}
                                </span>
                              ) : col.key === 'department' ? (
                                <span className="font-extrabold text-brand-teal uppercase text-[9px] tracking-wider px-2 py-0.5 bg-brand-teal/5 border border-brand-teal/10 rounded-md">
                                  {task[col.key] || "Unassigned"}
                                </span>
                              ) : col.key === 'status' ? (
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${STAGES.find(s => s.id === task.status)?.color}`}>
                                  {STAGES.find(s => s.id === task.status)?.label}
                                </span>
                              ) : (col.key.includes('Link') || col.key === 'reference') && task[col.key] ? (
                                <div className="flex items-center gap-2">
                                  <span className="truncate max-w-[100px] text-slate-500 italic">Edit...</span>
                                  <a 
                                    href={task[col.key]} 
                                    target="_blank" 
                                    className="text-blue-500 hover:underline font-bold"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Link
                                  </a>
                                </div>
                              ) : col.key === 'postingStatus' ? (
                                <Badge className={task[col.key] === "Yes" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                                  {task[col.key] || "No"}
                                </Badge>
                              ) : (
                                <span>{task[col.key] || "-"}</span>
                              )}
                            </div>
                          )}
                        </td>
                      ))}

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); fetchLogs(task.id, task.title); }} 
                            className="p-1.5 hover:bg-brand-teal/10 rounded-md text-brand-teal transition-colors"
                            title="View History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {canEditTask && (
                            <button 
                              onClick={() => { setEditingTask(task); setModalOpen(true); }} 
                              className="p-1.5 hover:bg-slate-100 rounded-md text-blue-600 transition-colors"
                              title="Edit Task"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDeleteTask && (
                            <button 
                              onClick={() => handleDelete(task.id)} 
                              className="p-1.5 hover:bg-red-50 rounded-md text-red-500 transition-colors"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={20} className="px-4 py-20 text-center text-slate-400 italic">No creative tasks found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredTasks.length > 0 && (
              <div className="mt-auto border-t border-slate-200">
                <TablePagination 
                  totalItems={filteredTasks.length} 
                  itemsPerPage={itemsPerPage} 
                  currentPage={currentPage} 
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
                  itemName="tasks"
                />
              </div>
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full overflow-x-auto pb-4 items-start px-2">
              {STAGES.map(stage => (
                <div key={stage.id} className="flex flex-col flex-1 min-w-[250px] h-full bg-slate-50/80 rounded-[20px] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-4 pb-3">
                    <h3 className={`font-semibold text-[15px] ${stage.color}`}>{stage.label}</h3>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span className="text-[13px] font-bold bg-slate-200/80 px-2 py-0.5 rounded-full text-slate-600">
                        {filteredTasks.filter(t => t.status === stage.id).length}
                      </span>
                      <MoreHorizontal className="w-5 h-5 cursor-pointer hover:text-slate-700 transition-colors" />
                    </div>
                  </div>
                  
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 overflow-y-auto p-3 pt-1 transition-colors custom-scrollbar ${
                          snapshot.isDraggingOver ? "bg-slate-200/30" : ""
                        }`}
                      >
                        <div className="space-y-2.5">
                          {filteredTasks
                            .filter(t => t.status === stage.id)
                            .map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="group"
                                    onClick={() => {
                                      if (canEditTask) {
                                        setEditingTask(task);
                                        setModalOpen(true);
                                      }
                                    }}
                                  >
                                    <div className={`p-4 rounded-xl transition-all cursor-pointer relative overflow-hidden ${
                                      snapshot.isDragging ? "opacity-90 scale-[1.02] shadow-xl ring-2 ring-brand-teal/20 bg-white" : 
                                      "bg-white hover:bg-slate-50 shadow-sm hover:shadow-md border border-slate-200 hover:border-brand-teal/30"
                                    }`}>
                                      
                                      <div className="min-h-[24px] relative">
                                        <div className="float-right ml-2 -mt-1 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={(e) => { e.stopPropagation(); fetchLogs(task.id, task.title); }} className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-brand-teal" title="View Logs"><History className="w-3.5 h-3.5" /></button>
                                          {canDeleteTask && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="p-1 hover:bg-red-50 rounded-md text-red-400 hover:text-red-500" title="Delete Task"><Trash2 className="w-3.5 h-3.5" /></button>
                                          )}
                                        </div>
                                        <h4 className="font-medium text-[14.5px] text-slate-800 leading-snug break-words whitespace-pre-wrap">
                                          {task.title}
                                        </h4>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                          {canAddTask && (
                            <div className="pt-2">
                              {quickAddStage === stage.id ? (
                                <div className="bg-white p-3 rounded-xl border border-brand-teal/30 shadow-sm space-y-3">
                                  <textarea
                                    autoFocus
                                    placeholder="Enter task title..."
                                    className="w-full text-[14px] bg-transparent font-medium outline-none resize-none min-h-[50px] text-slate-800 placeholder:text-slate-400"
                                    value={quickAddTitle}
                                    onChange={(e) => setQuickAddTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleQuickAdd(stage.id);
                                      } else if (e.key === 'Escape') {
                                        setQuickAddStage(null);
                                        setQuickAddTitle("");
                                      }
                                    }}
                                  />
                                  <div className="flex items-center justify-between">
                                    <Button 
                                      size="sm" 
                                      className="h-8 text-xs bg-brand-teal text-white hover:bg-brand-teal-light px-4 font-semibold rounded-lg"
                                      onClick={() => handleQuickAdd(stage.id)}
                                      disabled={!quickAddTitle.trim() || isSubmitting}
                                    >
                                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                                      Add
                                    </Button>
                                    <button 
                                      onClick={() => {
                                        setQuickAddStage(null);
                                        setQuickAddTitle("");
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                  <button
                                    onClick={() => {
                                      setQuickAddStage(stage.id);
                                      setQuickAddTitle("");
                                    }}
                                    className="flex items-center justify-between w-full p-2 mt-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors group"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-brand-teal transition-colors" />
                                      <span className="text-[14.5px] font-medium">Add a module</span>
                                    </div>
                                  </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
