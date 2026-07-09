"use client";

import React, { useState, useEffect } from "react";
import { 
  Filter, 
  Plus, 
  X, 
  Calendar as CalendarIcon,
  Flag,
  MoreHorizontal,
  Loader2,
  Trash2,
  History,
  ChevronDown
} from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";
import { useAppEvent } from "@/hooks/useAppEvent";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/hooks/useUser";
import { usePermissions } from "@/hooks/usePermissions";
import { API_URL } from "@/lib/config";

// Helper to get status pill style
const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "in-progress": 
    case "in progress": return "bg-brand-light/50 text-brand-teal border-brand-teal/20";
    case "on-hold":
    case "on hold":
    case "pending": 
    case "review": return "bg-amber-100/50 text-amber-700 border-amber-200";
    case "to do": 
    case "todo": return "bg-gray-100 text-gray-700 border-gray-200";
    case "complete": 
    case "completed": return "bg-emerald-50 text-emerald-600 border-emerald-200";
    default: return "bg-gray-100 text-gray-700";
  }
};

const getStatusDot = (status: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "in-progress": 
    case "in progress": return "bg-brand-teal";
    case "on-hold":
    case "on hold":
    case "pending": 
    case "review": return "bg-amber-500";
    case "to do": 
    case "todo": return "bg-slate-400";
    case "complete": 
    case "completed": return "bg-emerald-500";
    default: return "bg-slate-400";
  }
};

const getPriorityColor = (priority: string) => {
  const p = priority?.toLowerCase();
  switch (p) {
    case "high": 
    case "urgent": return "text-red-500";
    case "medium": return "text-amber-500";
    case "low": return "text-slate-500";
    default: return "text-slate-500";
  }
};

export default function TaskManagementPage() {
  const { user } = useUser();
  const { checkPermission, isAdmin } = usePermissions();
  const canAdd = isAdmin || checkPermission('personal-tasks', 'canAdd');
  const canEdit = isAdmin || checkPermission('personal-tasks', 'canEdit');
  const canDeletePerm = isAdmin || checkPermission('personal-tasks', 'canDelete');
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedTaskLogs, setSelectedTaskLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [adminViewAllUsers, setAdminViewAllUsers] = useState(false);

  // Form State
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    assignedToIds: string[];
    dueDate: string;
    status: string;
    priority: string;
    department?: string;
  }>({
    title: "",
    description: "",
    assignedToIds: [],
    dueDate: "",
    status: "todo",
    priority: "medium",
    department: ""
  });

  // Get today's date in YYYY-MM-DD format for local timezone
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    setIsMounted(true);
    fetchTasks();
  }, [user]);

  useAppEvent("task_update", () => {
    fetchTasks();
  });

  const fetchTasks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [tRes, eRes, dRes] = await Promise.all([
        fetch(`${API_URL}/tasks?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/departments`)
      ]);
      
      if (tRes.ok) setTasks(await tRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
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

  const handleCreateTask = async () => {
    if (!newTask.title) return;
    setIsSubmitting(true);
    try {
      const idsToAssign = newTask.assignedToIds.length > 0 ? newTask.assignedToIds : [user?.id].filter(Boolean);
      
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          status: newTask.status,
          priority: newTask.priority,
          assignedToIds: idsToAssign,
          performedBy: user?.id,
          userName: user?.name,
          department: newTask.department || undefined
        })
      });

      if (response.ok) {
        setCreateModalOpen(false);
        setNewTask({ title: "", description: "", assignedToIds: [], dueDate: "", status: "todo", priority: "medium", department: "" });
        fetchTasks();
        toast.success(idsToAssign.length > 1 ? `Task successfully assigned to ${idsToAssign.length} user(s)!` : "Task created successfully!");
      } else {
        toast.error("Failed to create task.");
        fetchTasks();
      }
    } catch (err) {
      console.error("Error creating task:", err);
      toast.error("An error occurred while creating task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueDesignations = Array.from(new Set(employees.map((e: any) => e.designation).filter(Boolean)));
  const uniqueDepartments = Array.from(new Set(employees.map((e: any) => e.department).filter(Boolean)));

  const sortedDepartmentsList = [...departments];
  const hasAdminOption = sortedDepartmentsList.some(dept => {
    const name = (typeof dept === 'string' ? dept : dept.name || "").toLowerCase();
    return name === "admin" || name === "administration";
  });
  if (!hasAdminOption) {
    sortedDepartmentsList.push("Admin");
  }

  sortedDepartmentsList.sort((a, b) => {
    const nameA = (typeof a === 'string' ? a : a.name || "").toLowerCase();
    const nameB = (typeof b === 'string' ? b : b.name || "").toLowerCase();
    if (nameA.includes("admin") && !nameB.includes("admin")) return -1;
    if (!nameA.includes("admin") && nameB.includes("admin")) return 1;
    return nameA.localeCompare(nameB);
  });

  const handleQuickSelect = (type: 'designation' | 'department', value: string) => {
    const matchingEmpIds = employees.filter((e: any) => e[type] === value).map((e: any) => e.id);
    setNewTask(prev => {
      const newIds = new Set(prev.assignedToIds);
      matchingEmpIds.forEach((id: string) => newIds.add(id));
      return { ...prev, assignedToIds: Array.from(newIds) };
    });
  };

  const handleUpdateField = async (taskId: string, field: string, value: string) => {
    try {
      const payload: any = { 
        [field]: value,
        performedBy: user?.id,
        userName: user?.name
      };

      if (field === 'status' && value === 'on-hold') {
        payload.dueDate = null;
      }

      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(`Updated successfully!`);
        
        if (field === 'status' && value === 'on-hold') {
          toast.info("Due date cleared since task is on hold.");
        }
        
        if (field === 'status' && value !== 'on-hold' && value !== 'completed') {
          const currentTask = tasks.find(t => t.id === taskId);
          if (currentTask && currentTask.status === 'on-hold' && !currentTask.dueDate) {
            toast.warning("Task resumed! Please set a new due date.");
          }
        }

        // Optimistically update locally
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            const updatedTask = { ...t, [field]: value };
            if (field === 'status' && value === 'on-hold') {
              updatedTask.dueDate = null as any;
            }
            return updatedTask;
          }
          return t;
        }));
      } else {
        toast.error(`Failed to update`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error updating`);
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/tasks/${taskToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Task deleted!");
        setTasks(prev => prev.filter(t => t.id !== taskToDelete));
      } else {
        toast.error("Failed to delete task");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting task");
    } finally {
      setIsSubmitting(false);
      setTaskToDelete(null);
    }
  };

  const fetchTaskLogs = async (taskId: string) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/activities`);
      if (res.ok) {
        setSelectedTaskLogs(await res.json());
        setLogsModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load logs");
    }
  };

  const canDeleteTask = (task: any) => {
    if (!user) return false;
    return isAdmin || canDeletePerm || task.assignedById === user.id;
  };

  const handleUpdateTitle = async (taskId: string) => {
    if (!editTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    const originalTask = tasks.find(t => t.id === taskId);
    if (originalTask && originalTask.title === editTaskTitle) {
      setEditingTaskId(null);
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: editTaskTitle,
          performedBy: user?.id,
          userName: user?.name
        })
      });
      if (res.ok) {
        toast.success("Title updated!");
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: editTaskTitle } : t));
      } else {
        toast.error("Failed to update title");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating title");
    } finally {
      setEditingTaskId(null);
    }
  };

  const handleUpdateDesc = async (taskId: string) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (originalTask && (originalTask.description === editTaskDesc || originalTask.desc === editTaskDesc)) {
      setEditingDescId(null);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          description: editTaskDesc,
          performedBy: user?.id,
          userName: user?.name
        })
      });
      if (res.ok) {
        toast.success("Description updated!");
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, description: editTaskDesc, desc: editTaskDesc } : t));
      } else {
        toast.error("Failed to update description");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating description");
    } finally {
      setEditingDescId(null);
    }
  };

  const handleUpdateAssignees = async (taskId: string, newAssignedToIds: string[]) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assignedToIds: newAssignedToIds,
          performedBy: user?.id,
          userName: user?.name
        })
      });
      if (res.ok) {
        toast.success("Assignees updated!");
        fetchTasks();
      } else {
        toast.error("Failed to update assignees");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating assignees");
    }
  };

  // Filter State
  const [filterMode, setFilterMode] = useState<'all' | 'my_filter'>('all');
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [activePriorities, setActivePriorities] = useState<string[]>([]);
  const [activeDepartments, setActiveDepartments] = useState<string[]>([]);
  const [activeAssignees, setActiveAssignees] = useState<string[]>([]);
  const [activeDateRange, setActiveDateRange] = useState<{from: Date | undefined, to?: Date | undefined} | undefined>();
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [createdByMe, setCreatedByMe] = useState(false);

  const [savedStatuses, setSavedStatuses] = useState<string[]>([]);
  const [showDoubleOwnedOnly, setShowDoubleOwnedOnly] = useState<boolean>(false);

  // Load saved status filters and double owned filter for the current user
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`task_saved_status_filters_${user.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSavedStatuses(parsed);
        } catch (e) {
          console.error(e);
        }
      } else {
        const defaultSaved = [];
        setSavedStatuses(defaultSaved);
        localStorage.setItem(`task_saved_status_filters_${user.id}`, JSON.stringify(defaultSaved));
      }

      const doubleOwnedSaved = localStorage.getItem(`task_double_owned_${user.id}`);
      if (doubleOwnedSaved) {
        setShowDoubleOwnedOnly(doubleOwnedSaved === 'true');
      }

      const savedMode = localStorage.getItem(`task_filter_mode_${user.id}`);
      if (savedMode === 'my_filter') {
        setFilterMode('my_filter');
        if (saved) {
          try {
            setActiveStatuses(JSON.parse(saved));
          } catch(e) {}
        }
      } else {
        setFilterMode('all');
        setActiveStatuses([]);
      }
    }
  }, [user]);

  const handleToggleSavedStatus = (val: string) => {
    let newSaved: string[];
    if (savedStatuses.includes(val)) {
      newSaved = savedStatuses.filter(item => item !== val);
    } else {
      newSaved = [...savedStatuses, val];
    }
    setSavedStatuses(newSaved);
    if (user?.id) {
      localStorage.setItem(`task_saved_status_filters_${user.id}`, JSON.stringify(newSaved));
    }
    // If My Filter is currently active, apply the updates to view immediately
    if (filterMode === 'my_filter') {
      setActiveStatuses(newSaved);
    }
  };

  const handleToggleStatusFilter = (val: string) => {
    let newStatuses: string[];
    if (activeStatuses.includes(val)) {
      newStatuses = activeStatuses.filter(item => item !== val);
    } else {
      newStatuses = [...activeStatuses, val];
    }
    setActiveStatuses(newStatuses);
  };

  const toggleFilter = (state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (state.includes(val)) {
      setState(state.filter(item => item !== val));
    } else {
      setState([...state, val]);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      handleUpdateField(draggableId, 'status', destination.droppableId);
    }
  };

  const columns = [
    { id: "todo", title: "To Do", textColor: "text-slate-800" },
    { id: "in-progress", title: "In Progress", textColor: "text-blue-600" },
    { id: "on-hold", title: "Review", textColor: "text-amber-600" },
    { id: "completed", title: "Completed", textColor: "text-emerald-600" }
  ];

  const statsTasks = tasks.filter(task => {
    const priorityMatch = activePriorities.length === 0 || activePriorities.includes(task.priority?.toLowerCase() || "");
    const assigneeMatch = activeAssignees.length === 0 || 
      (task.assignedToIds && activeAssignees.some(id => task.assignedToIds.includes(id))) || 
      activeAssignees.includes(task.assignedToId);
    
    let dateMatch = true;
    if (activeDateRange?.from && task.dueDate) {
      const [y, m, d] = task.dueDate.split('-');
      const taskDate = new Date(Number(y), Number(m) - 1, Number(d));
      taskDate.setHours(0,0,0,0);
      const from = new Date(activeDateRange.from);
      from.setHours(0,0,0,0);
      if (activeDateRange.to) {
        const to = new Date(activeDateRange.to);
        to.setHours(0,0,0,0);
        dateMatch = taskDate >= from && taskDate <= to;
      } else {
        dateMatch = taskDate.getTime() === from.getTime();
      }
    } else if (activeDateRange?.from && !task.dueDate) {
      dateMatch = false; // Filter out tasks with no due date if a date filter is applied
    }
    
    const isAssignedToMe = task.assignedToId === user?.id || (task.assignedToIds && task.assignedToIds.includes(user?.id));
    const isCreatedByMe = task.assignedById === user?.id || task.createdBy === user?.id;
    
    let ownershipMatch = true;
    
    // Non-admin users: always show only tasks assigned to them or created by them
    if (!isAdmin) {
      ownershipMatch = isAssignedToMe || isCreatedByMe;
    }

    // Admin users: respect the "My Tasks" / "All Users" toggle
    if (isAdmin && !adminViewAllUsers) {
      ownershipMatch = isAssignedToMe || isCreatedByMe;
    }

    // If double owned option is checked AND My Filter is active, restrict ownershipMatch to BOTH assigned to me AND created by me
    if (filterMode === 'my_filter' && showDoubleOwnedOnly) {
      ownershipMatch = isAssignedToMe && isCreatedByMe;
    }

    // Additional quick filters (Assigned to me / Created by me toggles)
    if (assignedToMe && createdByMe) {
      ownershipMatch = ownershipMatch && (isAssignedToMe || isCreatedByMe);
    } else if (assignedToMe) {
      ownershipMatch = ownershipMatch && isAssignedToMe;
    } else if (createdByMe) {
      ownershipMatch = ownershipMatch && isCreatedByMe;
    }

    const departmentMatch = activeDepartments.length === 0 || 
      (activeDepartments.includes("None / Personal") && (!task.department || task.department === "")) ||
      activeDepartments.includes(task.department || "");

    return priorityMatch && assigneeMatch && dateMatch && ownershipMatch && departmentMatch;
  });

  const filteredTasks = statsTasks.filter(task => {
    const statusMatch = activeStatuses.length === 0 || activeStatuses.includes(task.status) || (activeStatuses.includes('on-hold') && task.status === 'pending') || (activeStatuses.includes('pending') && task.status === 'on-hold');
    return statusMatch;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return (pOrder[a.priority as keyof typeof pOrder] ?? 99) - (pOrder[b.priority as keyof typeof pOrder] ?? 99);
  });
  
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / ITEMS_PER_PAGE));
  const currentTasks = sortedTasks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Task Management" 
        description="Track and manage all tasks in one simple task page."
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          
          {/* Combined Filter Settings Box (All | My Filter | Settings Icon) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 text-[12px] font-bold px-3.5 ${filterMode === 'all' ? 'bg-brand-teal text-white hover:bg-brand-teal/90 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => {
                setFilterMode('all');
                setActiveStatuses([]);
                if (user?.id) {
                  localStorage.setItem(`task_filter_mode_${user.id}`, 'all');
                }
              }}
            >
              All
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 text-[12px] font-bold px-3.5 ${filterMode === 'my_filter' ? 'bg-brand-teal text-white hover:bg-brand-teal/90 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => {
                setFilterMode('my_filter');
                if (user?.id) {
                  localStorage.setItem(`task_filter_mode_${user.id}`, 'my_filter');
                  const saved = localStorage.getItem(`task_saved_status_filters_${user.id}`);
                  if (saved) {
                    setActiveStatuses(JSON.parse(saved));
                  } else {
                    const defaultSaved = [];
                    setActiveStatuses(defaultSaved);
                    localStorage.setItem(`task_saved_status_filters_${user.id}`, JSON.stringify(defaultSaved));
                  }
                }
              }}
            >
              My Filter
            </Button>
            
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 bg-transparent border-0" title="Task Settings">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128c.332-.183.582-.495.645-.869L9.594 3.94ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3 bg-white border border-slate-200 shadow-lg rounded-xl z-50">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Default Statuses</h4>
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      {[
                        { value: "todo", label: "To do" },
                        { value: "on-hold", label: "On Hold" },
                        { value: "in-progress", label: "In progress" },
                        { value: "completed", label: "Completed" }
                      ].map(status => {
                        const isChecked = savedStatuses.includes(status.value);
                        return (
                          <label key={status.value} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleToggleSavedStatus(status.value)}
                              className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-3.5 h-3.5"
                            />
                            {status.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Personal Task</h4>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 pt-1">
                      <input 
                        type="checkbox" 
                        checked={showDoubleOwnedOnly}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setShowDoubleOwnedOnly(val);
                          if (user?.id) {
                            localStorage.setItem(`task_double_owned_${user.id}`, val ? 'true' : 'false');
                          }
                        }}
                        className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-3.5 h-3.5"
                      />
                      Personal Tasks Only
                    </label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {isAdmin && (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 text-[12px] font-bold px-4 ${!adminViewAllUsers ? 'bg-brand-teal text-white hover:bg-brand-teal/90 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setAdminViewAllUsers(false)}
              >
                My Tasks
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 text-[12px] font-bold px-4 ${adminViewAllUsers ? 'bg-brand-teal text-white hover:bg-brand-teal/90 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setAdminViewAllUsers(true)}
              >
                All Users
              </Button>
            </div>
          )}

          {/* Create Task Modal */}
          {canAdd && (
          <Dialog open={createModalOpen} onOpenChange={(val) => {
            setCreateModalOpen(val);
            if (!val) {
              setNewTask({ title: "", description: "", assignedToIds: [], dueDate: "", status: "todo", priority: "medium", department: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Create task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create new task</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Add details for the new task and assign it.</p>
              </DialogHeader>
              
              <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Task name <span className="text-red-500">*</span></label>
                  <Input 
                    placeholder="e.g. Finalize offer letters" 
                    className="bg-white" 
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Description</label>
                  <Textarea 
                    placeholder="Add details, instructions, or context..." 
                    className="h-28 resize-none bg-white"
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">Assignees</label>
                      <Select value="" onValueChange={(val) => {
                        if (val.startsWith('dept_')) handleQuickSelect('department', val.replace('dept_', ''));
                        if (val.startsWith('desig_')) handleQuickSelect('designation', val.replace('desig_', ''));
                      }}>
                        <SelectTrigger className="h-6 w-fit text-[10px] bg-brand-light/30 text-brand-teal border-brand-teal/20 font-semibold px-2 py-0 focus:ring-0 rounded-md">
                          <SelectValue placeholder="+ Quick Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">By Team / Dept</div>
                          {uniqueDepartments.map(dept => (
                            <SelectItem key={`dept_${dept}`} value={`dept_${dept}`}>{dept}</SelectItem>
                          ))}
                          <div className="px-2 py-1 mt-2 text-[10px] font-bold text-muted-foreground uppercase border-t pt-2">By Designation</div>
                          {uniqueDesignations.map(desig => (
                            <SelectItem key={`desig_${desig}`} value={`desig_${desig}`}>{desig}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      placeholder="Search assignees by name..."
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="h-8 text-xs bg-white mb-2"
                    />
                    <div className="border border-border rounded-md max-h-[140px] overflow-y-auto bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {employees.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(assigneeSearch.toLowerCase())).map(emp => {
                        const isSelected = newTask.assignedToIds.includes(emp.id);
                        return (
                          <div 
                            key={emp.id} 
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                            onClick={() => {
                              setNewTask(prev => ({
                                ...prev,
                                assignedToIds: isSelected 
                                  ? prev.assignedToIds.filter(id => id !== emp.id)
                                  : [...prev.assignedToIds, emp.id]
                              }));
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal w-4 h-4 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[10px] bg-brand-light text-brand-teal font-medium">
                                  {emp.firstName[0]}{emp.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-foreground">{emp.firstName} {emp.lastName}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {newTask.assignedToIds.length > 0 && (
                      <div className="flex items-center justify-between mt-1 px-1">
                        <p className="text-xs text-brand-teal font-medium">
                          {newTask.assignedToIds.length} user(s) selected
                        </p>
                        <button 
                          className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                          onClick={() => setNewTask({...newTask, assignedToIds: []})}
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Status</label>
                      <Select value={newTask.status} onValueChange={(val) => setNewTask({...newTask, status: val})}>
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                              To do
                            </div>
                          </SelectItem>
                          <SelectItem value="on-hold">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              On Hold
                            </div>
                          </SelectItem>
                          <SelectItem value="in-progress">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-brand-teal"></span>
                              In progress
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Completed
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Due date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal bg-white h-10",
                              !newTask.dueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newTask.dueDate ? format(new Date(newTask.dueDate), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newTask.dueDate ? new Date(newTask.dueDate) : undefined}
                            onSelect={(date) => setNewTask({...newTask, dueDate: date ? format(date, "yyyy-MM-dd") : ""})}
                            initialFocus
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                          />
                          {newTask.dueDate && (
                            <div className="p-2 border-t border-border">
                              <Button 
                                variant="ghost" 
                                className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                onClick={() => setNewTask({...newTask, dueDate: ""})}
                              >
                                Clear date
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Priority</label>
                      <Select value={newTask.priority} onValueChange={(val) => setNewTask({...newTask, priority: val})}>
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">
                            <div className="flex items-center gap-2 text-red-600">
                              <Flag className="w-4 h-4" />
                              <span className="text-foreground">Urgent</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2 text-red-500">
                              <Flag className="w-4 h-4" />
                              <span className="text-foreground">High</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2 text-amber-500">
                              <Flag className="w-4 h-4" />
                              <span className="text-foreground">Medium</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Flag className="w-4 h-4" />
                              <span className="text-foreground">Low</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Department (optional)</label>
                      <Select value={newTask.department || ""} onValueChange={(val) => setNewTask({...newTask, department: val})}>
                        <SelectTrigger className="bg-white w-full">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedDepartmentsList.map((dept: any) => {
                            const deptName = typeof dept === 'string' ? dept : dept.name;
                            return (
                              <SelectItem key={deptName} value={deptName}>
                                {deptName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2 mt-2">
                <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-brand-teal hover:bg-brand-teal-light text-white" 
                  onClick={handleCreateTask}
                  disabled={isSubmitting || !newTask.title}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}

          {/* Logs Modal */}
          <Dialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Task Logs</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">History of actions and updates for this task.</p>
              </DialogHeader>
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 my-2">
                {selectedTaskLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No logs found for this task.</p>
                ) : (
                  selectedTaskLogs.map((log: any, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-teal shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">{log.action}</p>
                        <p className="text-muted-foreground">{log.details}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex gap-2">
                          <span>By: {log.userName}</span>
                          <span>&bull;</span>
                          <span>{log.timestamp}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Modal */}
          <Dialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-red-600">Delete Task</DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2 mt-4">
                <Button variant="outline" onClick={() => setTaskToDelete(null)} disabled={isSubmitting}>Cancel</Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white" 
                  onClick={confirmDeleteTask}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Delete Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: "To do", count: statsTasks.filter(t => t.status === 'todo').length.toString().padStart(2, '0'), desc: "New tasks waiting to be picked up.", dot: "bg-slate-400" },
          { title: "On Hold", count: statsTasks.filter(t => t.status === 'on-hold' || t.status === 'pending').length.toString().padStart(2, '0'), desc: "Tasks paused for approval or feedback.", dot: "bg-amber-400" },
          { title: "In progress", count: statsTasks.filter(t => t.status === 'in-progress').length.toString().padStart(2, '0'), desc: "Active work items currently being handled.", dot: "bg-brand-teal" },
          { title: "Due Tasks", count: statsTasks.filter(t => t.dueDate && t.status !== 'completed' && t.dueDate <= todayStr).length.toString().padStart(2, '0'), desc: "Tasks that are due today or overdue.", dot: "bg-red-500", highlight: true },
          { title: "Completed", count: statsTasks.filter(t => t.status === 'completed').length.toString().padStart(2, '0'), desc: "Completed tasks reviewed and closed.", dot: "bg-emerald-600" },
        ].map((stat, i) => (
          <div key={i} className={`bg-white border ${stat.highlight ? 'border-red-200 bg-red-50/30' : 'border-border'} rounded-xl p-4 shadow-sm flex flex-col h-full`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold text-sm ${stat.highlight ? 'text-red-700' : 'text-foreground'}`}>{stat.title}</h3>
              <div className={`w-2 h-2 rounded-full ${stat.dot}`}></div>
            </div>
            <div className={`text-2xl font-bold mb-2 ${stat.highlight ? 'text-red-700' : 'text-foreground'}`}>{stat.count}</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-auto">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border">
          {/* Inline Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-2">
            {/* Status Filter */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: "todo", label: "To do", dot: "bg-slate-400" },
                    { value: "on-hold", label: "On Hold", dot: "bg-amber-400" },
                    { value: "in-progress", label: "In progress", dot: "bg-brand-teal" },
                    { value: "completed", label: "Completed", dot: "bg-emerald-600" }
                  ].map(status => {
                    const isActive = activeStatuses.includes(status.value);
                    return (
                      <div 
                        key={status.value}
                        onClick={() => handleToggleStatusFilter(status.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border ${
                          isActive 
                            ? 'bg-brand-light/20 border-brand-teal/30 text-brand-teal' 
                            : 'bg-white border-border text-foreground hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                        {status.label}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Priority</label>
                <div className="flex flex-wrap gap-1.5">
                  {["urgent", "high", "medium", "low"].map(priority => {
                    const isActive = activePriorities.includes(priority);
                    return (
                      <div 
                        key={priority}
                        onClick={() => toggleFilter(activePriorities, setActivePriorities, priority)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border capitalize ${
                          isActive 
                            ? 'bg-brand-light/20 border-brand-teal/30 text-brand-teal' 
                            : 'bg-white border-border text-foreground hover:bg-gray-50'
                        }`}
                      >
                        {priority}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Department</label>
                <div className="flex flex-wrap gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-white border-border text-foreground hover:bg-gray-50 flex items-center justify-between gap-1 w-full max-w-[170px]">
                        <span className="truncate">
                          {activeDepartments.length === 0 
                            ? "All Departments" 
                            : activeDepartments.length === 1 
                              ? activeDepartments[0] 
                              : `${activeDepartments.length} Selected`}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-auto flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search departments..." />
                        <CommandList>
                          <CommandEmpty>No department found.</CommandEmpty>
                          <CommandGroup>
                           {sortedDepartmentsList.map((dept: any) => {
                              const deptName = typeof dept === 'string' ? dept : dept.name;
                              const isActive = activeDepartments.includes(deptName);
                              return (
                                <CommandItem 
                                  key={deptName} 
                                  value={deptName}
                                  onSelect={() => {
                                    toggleFilter(activeDepartments, setActiveDepartments, deptName);
                                  }}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={isActive} 
                                    readOnly 
                                    className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-slate-700">{deptName}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2 lg:col-span-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Assignee</label>
                <div className="border border-border rounded-md p-1.5 flex flex-wrap gap-1.5 min-h-[36px] items-center bg-white cursor-text">
                  {activeAssignees.map(id => {
                    const emp = employees.find(e => e.id === id);
                    if (!emp) return null;
                    return (
                      <div key={id} className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-foreground">
                        <Avatar className="w-3.5 h-3.5">
                          <AvatarFallback className="text-[7px] bg-brand-light text-brand-teal font-medium">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
                        </Avatar>
                        {emp.firstName} {emp.lastName}
                        <X 
                          className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground cursor-pointer ml-0.5" 
                          onClick={() => toggleFilter(activeAssignees, setActiveAssignees, id)}
                        />
                      </div>
                    )
                  })}
                  <Popover open={assigneeDropdownOpen} onOpenChange={setAssigneeDropdownOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex-1 min-w-[100px] h-5 border-none bg-transparent shadow-none focus:outline-none p-0 text-xs text-muted-foreground text-left ml-1">
                        Select...
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search names..." />
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            {employees.filter(e => !activeAssignees.includes(e.id)).map(emp => (
                              <CommandItem 
                                key={emp.id} 
                                value={`${emp.firstName} ${emp.lastName}`}
                                onSelect={() => {
                                  setActiveAssignees([...activeAssignees, emp.id]);
                                  setAssigneeDropdownOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Avatar className="w-4 h-4">
                                    <AvatarFallback className="text-[8px] bg-brand-light text-brand-teal font-medium">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
                                  </Avatar>
                                  {emp.firstName} {emp.lastName}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Due Date Filter */}
              <div className="space-y-2 lg:col-span-1 relative">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Due Date</label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white h-9 px-2.5 text-xs",
                          !activeDateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {activeDateRange?.from ? (
                          activeDateRange.to ? (
                            <>
                              {format(activeDateRange.from, "LLL dd")} -{" "}
                              {format(activeDateRange.to, "LLL dd")}
                            </>
                          ) : (
                            format(activeDateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={activeDateRange?.from}
                        selected={activeDateRange}
                        onSelect={setActiveDateRange as any}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Quick Filters</label>
                  {(activeStatuses.length > 0 || activePriorities.length > 0 || activeDepartments.length > 0 || activeAssignees.length > 0 || activeDateRange || assignedToMe || createdByMe) && (
                    <Button 
                      variant="ghost" 
                      className="text-xs text-muted-foreground hover:text-foreground font-medium px-2 h-auto py-0"
                      onClick={() => {
                        setActiveStatuses([]);
                        if (user?.id) {
                          localStorage.setItem(`task_status_filters_${user.id}`, JSON.stringify([]));
                        }
                        setActivePriorities([]);
                        setActiveDepartments([]);
                        setActiveAssignees([]);
                        setActiveDateRange(undefined);
                        setAssignedToMe(false);
                        setCreatedByMe(false);
                      }}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div 
                    onClick={() => setAssignedToMe(!assignedToMe)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border w-max ${
                      assignedToMe 
                        ? 'bg-brand-light/20 border-brand-teal/30 text-brand-teal' 
                        : 'bg-white border-border text-foreground hover:bg-gray-50'
                    }`}
                  >
                    Assigned to me
                  </div>
                  <div 
                    onClick={() => setCreatedByMe(!createdByMe)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border w-max ${
                      createdByMe 
                        ? 'bg-brand-light/20 border-brand-teal/30 text-brand-teal' 
                        : 'bg-white border-border text-foreground hover:bg-gray-50'
                    }`}
                  >
                    Created by me
                  </div>
                </div>
              </div>
            </div>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
              <p className="text-sm text-muted-foreground font-medium">Loading tasks...</p>
            </div>
          ) : tasks.length > 0 ? (
            <>
              <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium w-[30%]">Task</th>
                  <th className="px-6 py-4 font-medium">Assignee</th>
                  <th className="px-6 py-4 font-medium">Created by</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">Due date</th>
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 whitespace-normal min-w-[250px]">
                      {editingTaskId === task.id ? (
                        <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
                          <Input 
                            autoFocus
                            value={editTaskTitle}
                            onChange={(e) => setEditTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateTitle(task.id);
                              if (e.key === 'Escape') setEditingTaskId(null);
                            }}
                            onBlur={() => handleUpdateTitle(task.id)}
                            className="h-8 text-sm font-semibold"
                          />
                        </div>
                      ) : (
                        <div 
                          className={`font-semibold text-foreground mb-1 inline-block ${canEdit ? 'hover:text-brand-teal hover:underline cursor-pointer' : ''}`}
                          title={canEdit ? "Click to edit task name" : ""}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canEdit) return;
                            setEditingTaskId(task.id);
                            setEditTaskTitle(task.title);
                          }}
                        >
                          {task.title}
                        </div>
                      )}
                      
                      {editingDescId === task.id ? (
                        <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                          <Input 
                            autoFocus
                            value={editTaskDesc}
                            onChange={(e) => setEditTaskDesc(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateDesc(task.id);
                              if (e.key === 'Escape') setEditingDescId(null);
                            }}
                            onBlur={() => handleUpdateDesc(task.id)}
                            className="h-7 text-xs"
                          />
                        </div>
                      ) : (
                        <div 
                          className={`text-xs text-muted-foreground line-clamp-1 ${canEdit ? 'hover:text-brand-teal hover:underline cursor-pointer' : ''}`}
                          title={canEdit ? "Click to edit description" : ""}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canEdit) return;
                            setEditingDescId(task.id);
                            setEditTaskDesc(task.description || task.desc || "");
                          }}
                        >
                          {task.description || task.desc || <span className="italic text-gray-400">Add a description...</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md border border-transparent hover:border-border transition-colors w-max">
                              {task.assignedToIds && task.assignedToIds.length > 1 ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-2 overflow-hidden">
                                    {(task.assignedToNames || []).slice(0, 3).map((name: string, i: number) => (
                                      <Avatar key={i} className="w-6 h-6 border-2 border-white">
                                        <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                                          {name.split(' ').map((n:any) => n[0]).join('')}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {(task.assignedToNames?.length || 0) > 3 && (
                                      <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 z-10">
                                        +{(task.assignedToNames?.length || 0) - 3}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs font-medium text-foreground">
                                    {task.assignedToNames?.length || 0} Assignees
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={task.avatar} />
                                    <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                                      {((task.assignedToNames && task.assignedToNames[0]) || task.assignedToName || task.assignee || 'U').split(' ').map((n:any) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-foreground text-sm line-clamp-1">
                                    {(task.assignedToNames && task.assignedToNames[0]) || task.assignedToName || task.assignee || 'Unassigned'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-3" align="start">
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Update Assignees</h4>
                              <Input
                                placeholder="Search employees..."
                                value={assigneeSearch}
                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                className="h-8 text-xs"
                              />
                              <div className="border border-border rounded-md max-h-[160px] overflow-y-auto bg-white p-1 space-y-0.5">
                                {employees.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(assigneeSearch.toLowerCase())).map(emp => {
                                  const currentIds = task.assignedToIds || (task.assignedToId ? [task.assignedToId] : []);
                                  const isSelected = currentIds.includes(emp.id);
                                  return (
                                    <div 
                                      key={emp.id} 
                                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                                      onClick={() => {
                                        const updatedIds = isSelected 
                                          ? currentIds.filter((id: string) => id !== emp.id)
                                          : [...currentIds, emp.id];
                                        handleUpdateAssignees(task.id, updatedIds);
                                        setTasks(prev => prev.map(t => t.id === task.id ? { 
                                          ...t, 
                                          assignedToIds: updatedIds, 
                                          assignedToNames: updatedIds.map((id:string) => employees.find((e:any) => e.id === id)).filter(Boolean).map((e:any) => `${e.firstName} ${e.lastName}`) 
                                        } : t));
                                      }}
                                    >
                                      <input 
                                        type="checkbox"
                                        checked={isSelected}
                                        readOnly
                                        className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal w-4 h-4 cursor-pointer"
                                      />
                                      <div className="flex items-center gap-2">
                                        <Avatar className="w-6 h-6">
                                          <AvatarFallback className="text-[10px] bg-brand-light text-brand-teal font-medium">
                                            {emp.firstName[0]}{emp.lastName[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium text-foreground">{emp.firstName} {emp.lastName}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        task.assignedToIds && task.assignedToIds.length > 1 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <div className="flex -space-x-2 overflow-hidden">
                                  {(task.assignedToNames || []).slice(0, 3).map((name: string, i: number) => (
                                    <Avatar key={i} className="w-6 h-6 border-2 border-white">
                                      <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                                        {name.split(' ').map((n:any) => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {(task.assignedToNames?.length || 0) > 3 && (
                                    <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 z-10">
                                      +{(task.assignedToNames?.length || 0) - 3}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-medium text-foreground hover:underline">
                                  {task.assignedToNames?.length || 0} Assignees
                                </span>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-3" align="start">
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assignees</h4>
                                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                                  {(task.assignedToNames || []).map((name: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <Avatar className="w-6 h-6">
                                        <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                                          {name.split(' ').map((n:any) => n[0]).join('')}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium text-foreground">{name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={task.avatar} />
                              <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                                {((task.assignedToNames && task.assignedToNames[0]) || task.assignedToName || task.assignee || 'U').split(' ').map((n:any) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground text-sm line-clamp-1">
                              {(task.assignedToNames && task.assignedToNames[0]) || task.assignedToName || task.assignee || 'Unassigned'}
                            </span>
                          </div>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold">
                            {(task.assignedByName || 'System').split(' ').map((n:any) => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground text-sm">{task.assignedByName || 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Select 
                        disabled={!canEdit} 
                        value={task.department || ""} 
                        onValueChange={(val) => {
                          handleUpdateField(task.id, 'department', val);
                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, department: val } : t));
                        }}
                      >
                        <SelectTrigger className="h-8 w-[140px] px-2.5 py-1 rounded-md text-xs font-semibold border focus:ring-0 focus:ring-offset-0 bg-white border-border">
                          <SelectValue placeholder="Select dept" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedDepartmentsList.map((dept: any) => {
                            const deptName = typeof dept === 'string' ? dept : dept.name;
                            return (
                              <SelectItem key={deptName} value={deptName}>
                                <span className="text-xs font-semibold text-slate-800">{deptName}</span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Select disabled={!canEdit} defaultValue={task.status} onValueChange={(val) => handleUpdateField(task.id, 'status', val)}>
                        <SelectTrigger className={`h-8 w-[120px] px-2.5 py-1 rounded-md text-xs font-semibold capitalize border focus:ring-0 focus:ring-offset-0 ${getStatusBadge(task.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                              To do
                            </div>
                          </SelectItem>
                          <SelectItem value="on-hold">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              On Hold
                            </div>
                          </SelectItem>
                          <SelectItem value="in-progress">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-brand-teal"></span>
                              In progress
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Completed
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Select disabled={!canEdit} defaultValue={task.priority} onValueChange={(val) => handleUpdateField(task.id, 'priority', val)}>
                        <SelectTrigger className={`h-8 w-[110px] px-2.5 py-1 rounded-md text-xs font-semibold capitalize border focus:ring-0 focus:ring-offset-0 ${getPriorityColor(task.priority)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">
                            <div className="flex items-center gap-2 text-red-600">
                              <Flag className="w-3 h-3" />
                              Urgent
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2 text-red-500">
                              <Flag className="w-3 h-3" />
                              High
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2 text-amber-500">
                              <Flag className="w-3 h-3" />
                              Medium
                            </div>
                          </SelectItem>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Flag className="w-3 h-3" />
                              Low
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md text-sm font-medium w-[130px] border border-transparent hover:border-border transition-colors">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : <span className="text-muted-foreground font-normal">Set date</span>}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={task.dueDate ? new Date(task.dueDate) : undefined}
                              onSelect={(date) => {
                                if (date) handleUpdateField(task.id, 'dueDate', format(date, "yyyy-MM-dd"));
                              }}
                              initialFocus
                              disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            />
                            {task.dueDate && (
                              <div className="p-2 border-t border-border">
                                <Button 
                                  variant="ghost" 
                                  className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                  onClick={() => handleUpdateField(task.id, 'dueDate', "")}
                                >
                                  Clear date
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium w-[130px] border border-transparent">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : <span className="text-muted-foreground font-normal">Set date</span>}
                        </div>
                      )}
                    </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => fetchTaskLogs(task.id)}
                          className="p-1.5 text-muted-foreground hover:text-brand-teal hover:bg-brand-light/20 rounded-md transition-colors inline-flex items-center justify-center mr-1"
                          title="View Logs"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {canDeleteTask(task) && (
                          <button 
                            onClick={() => setTaskToDelete(task.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors inline-flex items-center justify-center"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div className="py-4 border-t border-border mt-auto bg-white/50">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <PaginationItem key={idx}>
                        <PaginationLink 
                          isActive={currentPage === idx + 1}
                          onClick={() => setCurrentPage(idx + 1)}
                          className="cursor-pointer"
                        >
                          {idx + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
            </>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <p className="text-lg font-bold text-slate-800">No Tasks Found</p>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Tasks assigned to you will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

