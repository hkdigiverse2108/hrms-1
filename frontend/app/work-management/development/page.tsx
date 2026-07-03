"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ClipboardList, Plus, Pencil, Trash2, Calendar, User, Loader2, Search, Briefcase, CheckCircle2, Circle, History, AlertTriangle, MoreHorizontal, X, FilePlus, Check, ChevronsUpDown, ChevronLeft, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyProgressView } from "@/components/hrms/DailyProgressView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  { id: "pending", label: "Pending", color: "text-purple-700 bg-transparent", lineColor: "bg-purple-500" },
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

  const isTeamLeader = projects.some(p => p.teamLeaderId === user?.id) || user?.role?.toLowerCase() === "team leader" || user?.designation?.toLowerCase() === "team leader";
  const canViewTasks = isUserAdmin || checkPermission('tasks', 'canView') || isTeamLeader;
  const canAddTask = isUserAdmin || checkPermission('tasks', 'canAdd') || isTeamLeader;
  const canEditTask = isUserAdmin || checkPermission('tasks', 'canEdit') || isTeamLeader;
  const canDeleteTask = isUserAdmin || checkPermission('tasks', 'canDelete') || isTeamLeader;
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [employeeFilterOpen, setEmployeeFilterOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [projectFilterOpen, setProjectFilterOpen] = useState(false);
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
  const [taskScope, setTaskScope] = useState<"my" | "all">("all");
  const [showOnlyToday, setShowOnlyToday] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [pendingReasonOpen, setPendingReasonOpen] = useState(false);
  const [pendingReasonText, setPendingReasonText] = useState("");
  const [pendingReasonCallback, setPendingReasonCallback] = useState<{
    resolve: (reason: string | null) => void;
  } | null>(null);

  const getPendingReason = () => {
    return new Promise<string | null>((resolve) => {
      setPendingReasonText("");
      setPendingReasonCallback({ resolve });
      setPendingReasonOpen(true);
    });
  };
  const [quickAddStage, setQuickAddStage] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddProjectId, setQuickAddProjectId] = useState<string>("");
  const [quickAddPhase, setQuickAddPhase] = useState<string>("");
  const [viewMode, setViewMode] = useState<"board" | "table" | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [viewingTransferRequests, setViewingTransferRequests] = useState(false);
  const [requestsTab, setRequestsTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferringTask, setTransferringTask] = useState<any>(null);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<"tasks" | "progress">("tasks");
  const isRealAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDepartment, selectedEmployeeId, selectedProjectId, dateFilter, taskScope, showOnlyToday]);

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
  const isRegularEmployee = !isAdmin && !isTeamLeader;

  useEffect(() => {
    if (user && !isAdmin && user.department) {
      setSelectedDepartment(user.department);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchData();
    if (user?.id) {
      fetchTransferRequests();
    }
  }, [user?.id]);

  const fetchTransferRequests = async () => {
    if (!user?.id) return;
    try {
      const isUserAdminOrTL = isUserAdmin || isTeamLeader || user.role === 'Team Leader' || user.role === 'HR' || user.role?.toLowerCase() === 'admin' || user.name === 'Admin Admin';
      if (isUserAdminOrTL) {
        const [allRes, outgoingRes] = await Promise.all([
          fetch(`${API_URL}/work-transfer-requests?taskType=wm-task`),
          fetch(`${API_URL}/work-transfer-requests/outgoing/${user.id}?taskType=wm-task`)
        ]);
        if (allRes.ok) {
          const reqs = await allRes.json();
          setIncomingRequests(reqs.filter((r: any) => r.taskType === 'wm-task' || r.taskType === 'wm-tasks'));
        }
        if (outgoingRes.ok) {
          const out = await outgoingRes.json();
          setOutgoingRequests(out.filter((r: any) => r.taskType === 'wm-task' || r.taskType === 'wm-tasks'));
        }
      } else {
        const [incomingRes, outgoingRes] = await Promise.all([
          fetch(`${API_URL}/work-transfer-requests/incoming/${user.id}?taskType=wm-task`),
          fetch(`${API_URL}/work-transfer-requests/outgoing/${user.id}?taskType=wm-task`)
        ]);
        if (incomingRes.ok) {
          const inc = await incomingRes.json();
          setIncomingRequests(inc.filter((r: any) => r.taskType === 'wm-task' || r.taskType === 'wm-tasks'));
        }
        if (outgoingRes.ok) {
          const out = await outgoingRes.json();
          setOutgoingRequests(out.filter((r: any) => r.taskType === 'wm-task' || r.taskType === 'wm-tasks'));
        }
      }
    } catch (e) {
      console.error("Error fetching transfer requests:", e);
    }
  };

  const getPendingTransferRequest = (item: any) => {
    return outgoingRequests.find(r => r.taskId === item.id && r.status === 'Pending');
  };

  const getAcceptedTransferRequest = (item: any) => {
    return incomingRequests.find(r => r.taskId === item.id && r.status === 'Accepted');
  };

  const handleOpenTransferModal = (task: any) => {
    setTransferringTask(task);
    setSelectedReceiverId('');
    setIsTransferModalOpen(true);
  };

  const handleSendTransferRequest = async () => {
    if (!transferringTask || !selectedReceiverId) return;
    const receiver = employees.find(e => e.id === selectedReceiverId);
    const receiverName = receiver ? `${receiver.firstName} ${receiver.lastName || ''}`.trim() : 'Unknown';
    try {
      const payload = {
        taskId: transferringTask.id,
        taskType: 'wm-task',
        taskName: transferringTask.title,
        stage: transferringTask.status || 'todo',
        senderId: user?.id,
        senderName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown',
        receiverId: selectedReceiverId,
        receiverName: receiverName
      };

      const res = await fetch(`${API_URL}/work-transfer-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Transfer request sent to ${receiverName}`);
        setIsTransferModalOpen(false);
        setTransferringTask(null);
        setSelectedReceiverId('');
        fetchTransferRequests();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to send transfer request");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to server");
    }
  };

  const handleRespondRequest = async (requestId: string, status: 'Accepted' | 'Rejected') => {
    try {
      const res = await fetch(`${API_URL}/work-transfer-requests/${requestId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Task transfer request ${status.toLowerCase()} successfully`);
        fetchTransferRequests();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || `Failed to respond to request`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to the server");
    }
  };

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
      if (user?.id) {
        fetchTransferRequests();
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
        projectId: quickAddProjectId,
        phase: quickAddPhase,
        dueDate: dateFilter,
        postingDate: dateFilter,
        performedBy: user?.id,
        userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        department: selectedDepartment === 'all' && user?.department ? user.department : (selectedDepartment !== 'all' ? selectedDepartment : 'Development'),
        assignedToId: user?.id || "",
        assignedToName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "Unassigned",
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
        setQuickAddPhase("");
        setQuickAddProjectId("");
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

  const handleSubmit = async (formData: WMTaskFormData | any) => {
    setIsSubmitting(true);
    try {
      if (formData.isBatchDistribution && Array.isArray(formData.distributedTasks)) {
        const batch = formData.distributedTasks;
        await Promise.all(batch.map((t: any) => 
          fetch(`${API_URL}/wm-tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...t,
              performedBy: user?.id,
              userName: user?.name || `${user?.firstName} ${user?.lastName}`,
            })
          })
        ));
        toast.success(`${batch.length} tasks assigned and distributed across team successfully!`);
        setModalOpen(false);
        fetchData();
        setEditingTask(null);
        setIsSubmitting(false);
        return;
      }

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
    const draggedTask = tasks.find(t => t.id === taskId);
    
    const isTLOrAdmin = isUserAdmin || isTeamLeader;
    const isAssignedToSelf = draggedTask && (draggedTask.assignedToId === user?.id || (user && draggedTask.assignedToId === (user as any).employeeId));
    
    if (!isTLOrAdmin && !isAssignedToSelf) {
      toast.error("You cannot move others' tasks");
      return;
    }

    const newStatus = destination.droppableId;
    
    await handleStatusChange(taskId, newStatus);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const draggedTask = tasks.find(t => t.id === taskId);
    const assigneeId = draggedTask?.assignedToId;
    
    let reason = "";
    if (newStatus === "pending") {
      const inputReason = await getPendingReason();
      if (inputReason === null) {
        return; // User cancelled
      }
      if (!inputReason.trim()) {
        toast.error("A reason is required to mark a task as Pending.");
        return;
      }
      reason = inputReason.trim();
    }

    if (newStatus === "in-progress" && assigneeId) {
      const hasOtherInProgress = tasks.some(t => t.id !== taskId && t.assignedToId === assigneeId && t.status === "in-progress");
      if (hasOtherInProgress) {
        toast.error("already a task in progress");
        return;
      }
    }

    const prevTasks = [...tasks];
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) return { ...t, status: newStatus, reasonForPending: reason || t.reasonForPending };
      return t;
    });
    setTasks(updatedTasks);

    try {
      const payload: any = { 
        status: newStatus,
        performedBy: user?.id,
        userName: user?.name || `${user?.firstName} ${user?.lastName}`,
      };
      if (reason) {
        payload.reasonForPending = reason;
      }
      const res = await fetch(`${API_URL}/wm-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      if (field === 'status' && value === 'pending') {
        const inputReason = await getPendingReason();
        if (inputReason === null) {
          setEditingCell(null);
          return; // User cancelled
        }
        if (!inputReason.trim()) {
          toast.error("A reason is required to mark a task as Pending.");
          setEditingCell(null);
          return;
        }
        payload.reasonForPending = inputReason.trim();
      }

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
        const targetTask = tasks.find(t => t.id === taskId);
        const targetAssignee = payload.assignedToId || targetTask?.assignedToId;
        const hasOtherInProgress = field === 'status' && value === 'in-progress' && tasks.some(t => t.id !== taskId && t.assignedToId === targetAssignee && t.status === 'in-progress');

        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return { ...t, ...payload };
          }
          if (field === 'status' && value === 'in-progress' && targetAssignee && t.assignedToId === targetAssignee && t.status === 'in-progress') {
            return { ...t, status: 'todo' };
          }
          return t;
        }));
        if (hasOtherInProgress) {
          toast.info("Previous in-progress task moved to To Do (only 1 task allowed in progress)");
          fetchData();
        }
      }
    } catch (err) {
      console.error("Error updating field:", err);
    }
    setEditingCell(null);
  };

  const handleToggleApproveTask = async (taskId: string, approveState: boolean) => {
    const prevTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isApproved: approveState } : t));
    try {
      const res = await fetch(`${API_URL}/wm-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isApproved: approveState,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        }),
      });
      if (!res.ok) {
        setTasks(prevTasks);
        toast.error(`Failed to ${approveState ? "approve" : "disapprove"} task`);
      } else {
        toast.success(`Task ${approveState ? "approved" : "disapproved"} successfully`);
        fetchData();
      }
    } catch (err) {
      console.error("Error toggling task approval:", err);
      setTasks(prevTasks);
      toast.error(`An error occurred while ${approveState ? "approving" : "disapproving"} task`);
    }
  };

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)))
    .filter((d: any) => !["sales", "admin", "hr"].includes(d.toLowerCase()));
  const isCreativeDefault = selectedDepartment.toLowerCase() === "creative" || (selectedDepartment === "all" && user?.department?.toLowerCase() === "creative");
  const showTableView = viewMode !== null ? viewMode === "table" : isCreativeDefault;

  const isDueTask = (t: any) => {
    if (!t.assignedToId || t.status === "completed") return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const taskDate = showTableView ? t.postingDate : t.dueDate;
    if (!taskDate) return false;
    if (taskDate <= todayStr || taskDate <= dateFilter) return true;
    return false;
  };

  const filteredTasks = tasks.filter(t => {
    const assignee = employees.find(e => e.id === t.assignedToId);
    const taskDept = assignee?.department || t.department;
    const isProjectTL = projects.some(p => p.id === t.projectId && p.teamLeaderId === user?.id);

    // Strict Department Isolation for non-Admins
    if (!isAdmin && !isProjectTL) {
      if (taskDept && user?.department && taskDept.toLowerCase() !== user.department.toLowerCase()) {
        return false;
      }
    }

    let isVisible = false;
    if (isAdmin) {
      isVisible = true;
    } else if (isTeamLeader) {
      isVisible = isProjectTL || t.assignedToId === user?.id || t.performedBy === user?.id;
    } else {
      isVisible = t.assignedToId === user?.id || t.performedBy === user?.id;
    }

    if (!isVisible) return false;

    // Department Filter
    if (selectedDepartment !== "all") {
      const assignee = employees.find(e => e.id === t.assignedToId);
      const dept = assignee?.department || t.department;
      if (dept !== selectedDepartment) return false;
    }

    // Employee Filter (for Admin)
    if (selectedEmployeeId !== "all") {
      if (t.assignedToId !== selectedEmployeeId) return false;
    }

    // Project Filter
    if (selectedProjectId !== "all") {
      if (t.projectId !== selectedProjectId) return false;
    }

    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.assignedToName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Scope Filter
    if ((taskScope === "my" || isRegularEmployee) && user?.id) {
      if (t.assignedToId !== user.id && t.performedBy !== user.id) return false;
    }

    // Date Filtering
    if (showOnlyToday) {
      const taskDate = showTableView ? t.postingDate : t.dueDate;
      if (taskDate !== dateFilter && !isDueTask(t)) return false;
    }

    return true;
  }).sort((a, b) => {
    const pA = a.projectName || "";
    const pB = b.projectName || "";
    if (pA !== pB) return pA.localeCompare(pB);
    const phA = a.phase || "";
    const phB = b.phase || "";
    if (phA !== phB) return phA.localeCompare(phB);
    return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
  });

  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );






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
          {activeTab === "tasks" && !isRealAdmin && (
            <Button 
              variant="default" 
              className="gap-2 bg-brand-teal text-white hover:bg-brand-teal-light font-bold"
              onClick={() => setActiveTab('progress')}
            >
              Daily Progress
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setViewingTransferRequests(true)}
            className="gap-2 border-brand-teal text-brand-teal hover:bg-brand-teal/10 font-bold"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transfer Requests
            {incomingRequests.filter(r => r.status === 'Pending').length > 0 && (
              <span className="bg-brand-teal text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                {incomingRequests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </Button>

          <Button variant="outline" onClick={() => router.push('/work-management/modules')} className="gap-2 border-brand-teal text-brand-teal hover:bg-brand-teal-light hover:text-white font-bold">
            <Briefcase className="w-4 h-4" />
            Project Modules
          </Button>

          {canAddTask && activeTab === "tasks" && (
            <Button onClick={() => { setEditingTask(null); setModalOpen(true); }} className="bg-brand-teal text-white hover:bg-brand-teal-light font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Assign Task
            </Button>
          )}

          <Dialog open={modalOpen} onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setEditingTask(null);
          }}>

            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {editingTask ? "Edit Task" : "Assign New Task"}
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

          <Dialog open={pendingReasonOpen} onOpenChange={(open) => {
            if (!open) {
              if (pendingReasonCallback) {
                pendingReasonCallback.resolve(null);
                setPendingReasonCallback(null);
              }
              setPendingReasonOpen(false);
            }
          }}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Reason for Pending</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="customReasonForPending" className="text-sm font-semibold text-slate-700">
                    Please provide a reason why this task is pending (Client Side):
                  </Label>
                  <textarea
                    id="customReasonForPending"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="e.g. Waiting for client response on design feedback"
                    value={pendingReasonText}
                    onChange={(e) => setPendingReasonText(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (pendingReasonCallback) {
                        pendingReasonCallback.resolve(null);
                        setPendingReasonCallback(null);
                      }
                      setPendingReasonOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-brand-teal text-white hover:bg-brand-teal-light"
                    onClick={() => {
                      if (!pendingReasonText.trim()) {
                        toast.error("Reason is required");
                        return;
                      }
                      if (pendingReasonCallback) {
                        pendingReasonCallback.resolve(pendingReasonText.trim());
                        setPendingReasonCallback(null);
                      }
                      setPendingReasonOpen(false);
                    }}
                  >
                    Submit
                  </Button>
                </div>
              </div>
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
      
      {activeTab === "progress" ? (
        <div className="space-y-4 flex-1 flex flex-col">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="gap-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold"
              onClick={() => setActiveTab('tasks')}
            >
              <ChevronLeft className="w-4 h-4" /> Back to Board
            </Button>
          </div>
          <DailyProgressView defaultDepartment={user?.department || "Development"} />
        </div>
      ) : (
        viewingTransferRequests ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[500px]">
            {/* Header / Back button */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setViewingTransferRequests(false)}
                  className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 h-8 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Tasks
                </Button>
                <div className="h-4 w-px bg-slate-200" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-brand-teal" />
                  Task Transfer Requests
                </h3>
              </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
              <button
                onClick={() => setRequestsTab('incoming')}
                className={`py-3 px-4 text-xs font-bold border-b-2 -mb-px transition-all ${
                  requestsTab === 'incoming'
                    ? 'border-brand-teal text-brand-teal'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {(isUserAdmin || isTeamLeader || user?.role === 'Team Leader' || user?.role === 'HR' || user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin') ? 'All Requests' : 'Received Requests'} ({incomingRequests.length})
              </button>
              <button
                onClick={() => setRequestsTab('outgoing')}
                className={`py-3 px-4 text-xs font-bold border-b-2 -mb-px transition-all ${
                  requestsTab === 'outgoing'
                    ? 'border-brand-teal text-brand-teal'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {(isUserAdmin || isTeamLeader || user?.role === 'Team Leader' || user?.role === 'HR' || user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin') ? 'My Sent Requests' : 'Sent Requests'} ({outgoingRequests.length})
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-x-auto bg-white">
              {requestsTab === 'incoming' ? (
                incomingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <ArrowLeftRight className="w-8 h-8 text-slate-300 animate-pulse" />
                    <p className="text-sm font-medium">No transfer requests.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-6 py-4 whitespace-nowrap">Date</th>
                        <th className="px-6 py-4 whitespace-nowrap">Task Name</th>
                        <th className="px-6 py-4 whitespace-nowrap">Stage</th>
                        <th className="px-6 py-4 whitespace-nowrap">From</th>
                        {(isUserAdmin || isTeamLeader || user?.role === 'Team Leader' || user?.role === 'HR' || user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin') && <th className="px-6 py-4 whitespace-nowrap">To</th>}
                        <th className="px-6 py-4 whitespace-nowrap">Status</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {incomingRequests.map(req => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                            {new Date(req.createdDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {req.taskName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline" className="text-xs text-brand-teal border-brand-teal/30 bg-brand-teal/5">
                              {STAGES.find(s => s.id === req.stage)?.label || req.stage}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                            {req.senderName}
                          </td>
                          {(isUserAdmin || isTeamLeader || user?.role === 'Team Leader' || user?.role === 'HR' || user?.role?.toLowerCase() === 'admin' || user?.name === 'Admin Admin') && (
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                              {req.receiverName}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant="secondary"
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                req.status === 'Pending' 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : req.status === 'Accepted'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {req.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {req.status === 'Pending' ? (
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-7 px-3 text-slate-600 border-slate-200 hover:bg-slate-100 rounded-lg font-medium"
                                  onClick={() => handleRespondRequest(req.id, 'Rejected')}
                                >
                                  Reject
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="text-xs h-7 px-3 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-lg font-semibold shadow-xs"
                                  onClick={() => handleRespondRequest(req.id, 'Accepted')}
                                >
                                  Accept
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium italic">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                outgoingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <ArrowLeftRight className="w-8 h-8 text-slate-300 animate-pulse" />
                    <p className="text-sm font-medium">No sent transfer requests.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-6 py-4 whitespace-nowrap">Date</th>
                        <th className="px-6 py-4 whitespace-nowrap">Task Name</th>
                        <th className="px-6 py-4 whitespace-nowrap">Stage</th>
                        <th className="px-6 py-4 whitespace-nowrap">To</th>
                        <th className="px-6 py-4 whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {outgoingRequests.map(req => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                            {new Date(req.createdDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {req.taskName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline" className="text-xs text-brand-teal border-brand-teal/30 bg-brand-teal/5">
                              {STAGES.find(s => s.id === req.stage)?.label || req.stage}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                            {req.receiverName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant="secondary"
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                req.status === 'Pending' 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : req.status === 'Accepted'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {req.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        ) : (
          <>
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
          {(() => {
            const activeProjects = projects.filter(p => {
              const isNotCompleted = p.status?.toLowerCase() !== "completed" && p.status?.toLowerCase() !== "cancelled";
              if (!isNotCompleted) return false;
              if (selectedDepartment !== "all") {
                return p.department?.toLowerCase() === selectedDepartment.toLowerCase();
              }
              return true;
            });
            const selectedProj = projects.find(p => p.id === selectedProjectId);
            return (
              <Popover open={projectFilterOpen} onOpenChange={setProjectFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectFilterOpen}
                    className="h-9 text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 outline-none text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all justify-between min-w-[150px] max-w-[200px] truncate"
                  >
                    <span className="truncate">
                      {selectedProjectId === "all"
                        ? "All Active Projects"
                        : selectedProj
                        ? selectedProj.title
                        : "Select Project"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search active project..." className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty>No project found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="All Active Projects"
                          onSelect={() => {
                            setSelectedProjectId("all");
                            setProjectFilterOpen(false);
                          }}
                          className="text-xs cursor-pointer font-medium"
                        >
                          <Check
                            className={`mr-2 h-3.5 w-3.5 text-brand-teal ${
                              selectedProjectId === "all" ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          All Active Projects
                        </CommandItem>
                        {activeProjects.map((proj) => (
                          <CommandItem
                            key={proj.id}
                            value={proj.title}
                            onSelect={() => {
                              setSelectedProjectId(proj.id);
                              setProjectFilterOpen(false);
                            }}
                            className="text-xs cursor-pointer font-medium"
                          >
                            <Check
                              className={`mr-2 h-3.5 w-3.5 text-brand-teal ${
                                selectedProjectId === proj.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span className="truncate">{proj.title}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            );
          })()}
          {isAdmin && (() => {
            const selectedEmp = employees.find(e => e.id === selectedEmployeeId);
            return (
              <Popover open={employeeFilterOpen} onOpenChange={setEmployeeFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeFilterOpen}
                    className="h-9 text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 outline-none text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-all justify-between min-w-[160px] max-w-[220px] truncate"
                  >
                    <span className="truncate">
                      {selectedEmployeeId === "all"
                        ? "All Employees"
                        : selectedEmp
                        ? `${selectedEmp.firstName} ${selectedEmp.lastName}`
                        : "Select Employee"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employee..." className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="All Employees"
                          onSelect={() => {
                            setSelectedEmployeeId("all");
                            setEmployeeFilterOpen(false);
                          }}
                          className="text-xs cursor-pointer font-medium"
                        >
                          <Check
                            className={`mr-2 h-3.5 w-3.5 text-brand-teal ${
                              selectedEmployeeId === "all" ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          All Employees
                        </CommandItem>
                        {employees.map((emp) => {
                          const fullName = `${emp.firstName} ${emp.lastName}`;
                          return (
                            <CommandItem
                              key={emp.id}
                              value={fullName}
                              onSelect={() => {
                                setSelectedEmployeeId(emp.id);
                                setEmployeeFilterOpen(false);
                              }}
                              className="text-xs cursor-pointer font-medium"
                            >
                              <Check
                                className={`mr-2 h-3.5 w-3.5 text-brand-teal ${
                                  selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {fullName}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            );
          })()}
          {user && (['admin', 'super admin', 'superadmin', 'team leader'].includes(user.role?.toLowerCase() || '') || user.designation?.toLowerCase() === 'team leader') && (
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 gap-1">
              <button 
                type="button"
                className={`h-7 text-xs font-extrabold px-3 rounded-md transition-all ${taskScope === 'my' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                onClick={() => setTaskScope('my')}
              >
                My Tasks
              </button>
              <button 
                type="button"
                className={`h-7 text-xs font-extrabold px-3 rounded-md transition-all ${taskScope === 'all' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                onClick={() => setTaskScope('all')}
              >
                All Tasks
              </button>
            </div>
          )}

          <button 
            type="button"
            className={`h-9 px-4 text-xs font-extrabold rounded-lg border transition-all ${showOnlyToday ? 'bg-brand-teal text-white border-brand-teal shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            onClick={() => setShowOnlyToday(!showOnlyToday)}
          >
            📅 Today
          </button>

          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 gap-1">
            <button 
              type="button"
              className={`h-7 text-xs font-extrabold px-3 rounded-md transition-all ${!showTableView ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
              onClick={() => setViewMode("board")}
            >
              📊 Board
            </button>
            <button 
              type="button"
              className={`h-7 text-xs font-extrabold px-3 rounded-md transition-all ${showTableView ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
              onClick={() => setViewMode("table")}
            >
              📋 Table
            </button>
          </div>

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
                    <th className="px-4 py-3 min-w-[120px]">Phase</th>
                    <th className="px-4 py-3 min-w-[120px]">Assignee</th>
                    <th className="px-4 py-3 min-w-[80px]">Hours</th>
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
                  {(() => {
                    let currentGroup = "";
                    return paginatedTasks.map((task, index) => {
                      const groupKey = `${task.projectName || "Unknown Project"} ${task.phase ? `- ${task.phase}` : ''}`;
                      const showHeader = groupKey !== currentGroup;
                      if (showHeader) currentGroup = groupKey;

                      return (
                        <React.Fragment key={task.id}>
                          {showHeader && (
                            <tr className="bg-brand-teal/5">
                              <td colSpan={24} className="px-4 py-2 font-bold text-brand-teal border-y border-brand-teal/10">
                                {groupKey}
                              </td>
                            </tr>
                          )}
                          <tr 
                      key={task.id} 
                      className={`hover:bg-slate-50/50 transition-colors group ${isDueTask(task) ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : ''}`}
                    >
                      <td className="px-4 py-3 text-center text-slate-400 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      
                      {/* Inline Editable Fields */}
                      {[
                        { key: 'title', type: 'text', minWidth: '200px' },
                        { key: 'projectId', labelKey: 'projectName', type: 'select', options: projects.filter(p => p.department?.toLowerCase() === 'development').map(p => ({ value: p.id, label: p.title })), minWidth: '150px' },
                        { key: 'phase', type: 'text', minWidth: '120px' },
                        { key: 'assignedToId', labelKey: 'assignedToName', type: 'select', options: employees.filter(e => e.department?.toLowerCase() === 'development').map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })), minWidth: '150px' },
                        { key: 'estimatedHours', type: 'number', minWidth: '80px' },
                        { key: 'department', type: 'select', options: ['Development'].map(d => ({ value: d, label: d })), minWidth: '120px' },
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
                          className={`px-4 py-3 ${col.type !== 'readonly' && canEditTask && (col.key !== 'assignedToId' || !isRegularEmployee) ? 'cursor-text hover:bg-brand-teal/5 transition-colors' : ''}`}
                          style={{ minWidth: col.minWidth }}
                          onClick={() => col.type !== 'readonly' && canEditTask && (col.key !== 'assignedToId' || !isRegularEmployee) && setEditingCell({ id: task.id, field: col.key })}
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
                                <div className="flex items-center gap-1.5">
                                  {isDueTask(task) && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white uppercase tracking-wider shrink-0 shadow-sm">
                                      Due
                                    </span>
                                  )}
                                  <span className="font-bold text-slate-800">{task[col.key]}</span>
                                  {getPendingTransferRequest(task) && (
                                    <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                      Pending Transfer to {getPendingTransferRequest(task)?.receiverName}
                                    </span>
                                  )}
                                  {getAcceptedTransferRequest(task) && (
                                    <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                      Transferred from {getAcceptedTransferRequest(task)?.senderName}
                                    </span>
                                  )}
                                </div>
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
                                <button onClick={(e) => { e.stopPropagation(); fetchLogs(task.id, task.title); }} className="p-1.5 hover:bg-brand-teal/10 rounded-md text-brand-teal transition-colors" title="View History"><History className="w-3.5 h-3.5" /></button>
                                {(!isRegularEmployee || task.assignedToId === user?.id) && !getPendingTransferRequest(task) && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenTransferModal(task); }} 
                                    className="p-1.5 hover:bg-indigo-50 rounded-md text-indigo-600 hover:text-indigo-700 transition-colors" 
                                    title="Transfer Task"
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canEditTask && <button onClick={() => { setEditingTask(task); setModalOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded-md text-blue-600 transition-colors" title="Edit Task"><Pencil className="w-3.5 h-3.5" /></button>}
                                {canDeleteTask && <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-500 transition-colors" title="Delete Task"><Trash2 className="w-3.5 h-3.5" /></button>}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={24} className="px-4 py-20 text-center text-slate-400 italic">No creative tasks found.</td>
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
      <div className="flex gap-4 h-full overflow-x-auto pb-4 items-start px-2 custom-scrollbar">
        {STAGES.map(stage => (
          <div key={stage.id} className="flex flex-col flex-1 min-w-[230px] h-full bg-slate-50/80 rounded-[20px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 pb-3">
              <h3 className={`font-semibold text-[15px] ${stage.color}`}>{stage.label}</h3>
              <div className="flex items-center gap-3 text-slate-500">
                <span className="text-[13px] font-bold bg-slate-200/80 px-2 py-0.5 rounded-full text-slate-600">
                  {filteredTasks.filter(t => t.status === stage.id).length}
                </span>
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
                    {(() => {
                      const stageTasks = filteredTasks.filter(t => t.status === stage.id);
                      const priorityWeight: Record<string, number> = {
                        urgent: 4,
                        high: 3,
                        medium: 2,
                        low: 1
                      };
                      stageTasks.sort((a, b) => {
                        if (stage.id === "completed") {
                          const aApproved = a.isApproved ? 1 : 0;
                          const bApproved = b.isApproved ? 1 : 0;
                          if (aApproved !== bApproved) {
                            return aApproved - bApproved;
                          }
                        }
                        const aDue = isDueTask(a) ? 1 : 0;
                        const bDue = isDueTask(b) ? 1 : 0;
                        if (aDue !== bDue) {
                          return bDue - aDue;
                        }

                        const parseTaskDate = (dateStr: any) => {
                          if (!dateStr || String(dateStr).trim() === "" || String(dateStr).toLowerCase() === "none") {
                            return Infinity;
                          }
                          const time = new Date(dateStr).getTime();
                          return isNaN(time) ? Infinity : time;
                        };

                        const aDate = parseTaskDate(a.dueDate);
                        const bDate = parseTaskDate(b.dueDate);
                        
                        if (aDate !== bDate) {
                          return aDate - bDate;
                        }
                        const aPriority = priorityWeight[a.priority || "medium"] || 2;
                        const bPriority = priorityWeight[b.priority || "medium"] || 2;
                        return bPriority - aPriority;
                      });
                      return stageTasks.map((task, index) => (
                        <Draggable 
                          key={task.id} 
                          draggableId={task.id} 
                          index={index}
                        >
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
                                isDueTask(task) ? "bg-rose-50/40 hover:bg-rose-50/70 shadow-sm hover:shadow-md border-2 border-rose-400/80" :
                                "bg-white hover:bg-slate-50 shadow-sm hover:shadow-md border border-slate-200 hover:border-brand-teal/30"
                              }`}>
                                
                                <div className="min-h-[24px] relative">
                                  <div className="float-right ml-2 -mt-1 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); fetchLogs(task.id, task.title); }} className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-brand-teal" title="View Logs"><History className="w-3.5 h-3.5" /></button>
                                    {(!isRegularEmployee || task.assignedToId === user?.id) && !getPendingTransferRequest(task) && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenTransferModal(task); }} 
                                        className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-indigo-600" 
                                        title="Transfer Task"
                                      >
                                        <ArrowLeftRight className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {canDeleteTask && (
                                      <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="p-1 hover:bg-red-50 rounded-md text-red-400 hover:text-red-500" title="Delete Task"><Trash2 className="w-3.5 h-3.5" /></button>
                                    )}
                                  </div>
                                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                    {isDueTask(task) && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider shadow-sm animate-pulse">
                                        <AlertTriangle className="w-3 h-3" /> Due
                                      </span>
                                    )}
                                    {isDueTask(task) && (task.dueDate || task.postingDate) && (
                                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                        Due: {task.dueDate || task.postingDate}
                                      </span>
                                    )}
                                    {task.isApproved && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-white uppercase tracking-wider shadow-sm">
                                        Approved
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-medium text-[14.5px] text-slate-800 leading-snug break-words whitespace-pre-wrap">
                                    {task.title}
                                  </h4>
                                  {(getPendingTransferRequest(task) || getAcceptedTransferRequest(task)) && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {getPendingTransferRequest(task) && (
                                        <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                          Pending Transfer to {getPendingTransferRequest(task)?.receiverName}
                                        </span>
                                      )}
                                      {getAcceptedTransferRequest(task) && (
                                        <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                          Transferred from {getAcceptedTransferRequest(task)?.senderName}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {task.projectName && (
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-bold text-brand-teal bg-brand-teal/5 px-1.5 py-0.5 rounded border border-brand-teal/10 truncate max-w-full">
                                        {task.projectName}
                                      </span>
                                      {task.phase && (
                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                          {task.phase}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold truncate">
                                      <div className="w-4 h-4 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center text-[9px] font-black shrink-0">
                                        {(task.assignedToName || "U")[0].toUpperCase()}
                                      </div>
                                      <span className="truncate text-[12px]">{task.assignedToName || "Unassigned"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {task.status === "completed" && (isUserAdmin || isTeamLeader) && (
                                        <Button
                                          size="sm"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await handleToggleApproveTask(task.id, !task.isApproved);
                                          }}
                                          className={`h-6 px-2 text-[10px] font-bold rounded-md ${
                                            task.isApproved 
                                              ? "bg-amber-600 hover:bg-amber-700 text-white" 
                                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                          }`}
                                        >
                                          {task.isApproved ? "Disapprove" : "Approve"}
                                        </Button>
                                      )}
                                      {task.estimatedHours > 0 && (
                                        <span className="shrink-0 text-[10px] font-black text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded-md border border-brand-teal/20 flex items-center gap-1">
                                          ⏱️ {task.estimatedHours} hrs
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ));
                    })()}
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
                                  setQuickAddProjectId("");
                                  setQuickAddPhase("");
                                }
                              }}
                            />
                            <div className="flex flex-col gap-2 border-t border-slate-100 pt-2">
                              <select 
                                className="w-full text-[12px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none font-medium text-slate-600"
                                value={quickAddProjectId}
                                onChange={(e) => {
                                  setQuickAddProjectId(e.target.value);
                                  setQuickAddPhase("");
                                }}
                              >
                                <option value="">Select Project</option>
                                {projects.filter(p => p.department?.toLowerCase() === 'development').map(p => (
                                  <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                              </select>
                              
                              {quickAddProjectId && projects.find(p => p.id === quickAddProjectId)?.isPhaseWise && projects.find(p => p.id === quickAddProjectId)?.phases?.length > 0 && (
                                <select 
                                  className="w-full text-[12px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none font-medium text-slate-600"
                                  value={quickAddPhase}
                                  onChange={(e) => setQuickAddPhase(e.target.value)}
                                >
                                  <option value="">Select Phase</option>
                                  {projects.find(p => p.id === quickAddProjectId)?.phases.map((ph: any) => (
                                    <option key={ph.name} value={ph.name}>{ph.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
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
                                  setQuickAddProjectId("");
                                  setQuickAddPhase("");
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
                              setQuickAddProjectId("");
                              setQuickAddPhase("");
                            }}
                            className="flex items-center justify-between w-full p-2 mt-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <Plus className="w-5 h-5 text-slate-400 group-hover:text-brand-teal transition-colors" />
                              <span className="text-[14.5px] font-medium">Add a task</span>
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
          </>
        )
      )}

      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-brand-teal" />
              Transfer Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1.5">
              <div>Task Name: <span className="font-semibold text-slate-800">{transferringTask?.title}</span></div>
              <div>Stage: <span className="font-semibold text-slate-800">{STAGES.find(s => s.id === transferringTask?.status)?.label || transferringTask?.status}</span></div>
              <div>Project: <span className="font-semibold text-slate-800">{transferringTask?.projectName}</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Select Employee to Transfer To</label>
              <Select value={selectedReceiverId} onValueChange={setSelectedReceiverId}>
                <SelectTrigger className="w-full focus:ring-brand-teal focus:border-brand-teal">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((emp: any) => {
                      if (emp.id === user?.id) return false;
                      return emp.department?.toLowerCase() === 'development';
                    })
                    .map((emp: any) => {
                      const name = `${emp.firstName} ${emp.lastName || ''}`.trim();
                      return (
                        <SelectItem key={emp.id} value={emp.id}>
                          {name} ({emp.role || 'Employee'})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-brand-teal hover:bg-brand-teal/90 text-white font-semibold"
              onClick={handleSendTransferRequest}
            >
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
