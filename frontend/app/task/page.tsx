"use client";

import React, { useState, useEffect } from "react";
import { 
  Filter, 
  Plus, 
  X, 
  Calendar as CalendarIcon,
  Flag,
  MoreHorizontal,
  Download,
  Loader2,
  Trash2,
  History
} from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";
import { useChatContext } from "@/context/ChatContext";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";

// Helper to get status pill style
const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "in-progress": 
    case "in progress": return "bg-brand-light/50 text-brand-teal border-brand-teal/20";
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
  const { lastEvent } = useChatContext();
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedTaskLogs, setSelectedTaskLogs] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editTaskDesc, setEditTaskDesc] = useState("");

  // Form State
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    assignedToIds: string[];
    dueDate: string;
    status: string;
    priority: string;
  }>({
    title: "",
    description: "",
    assignedToIds: [],
    dueDate: "",
    status: "todo",
    priority: "medium"
  });

  // Get today's date in YYYY-MM-DD format for local timezone
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    fetchTasks();
  }, [user]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (lastEvent?.event === "task_update") {
      fetchTasks();
    }
  }, [lastEvent]);

  const fetchTasks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [tRes, eRes] = await Promise.all([
        fetch(`${API_URL}/tasks?userId=${user.id}&role=${user.role}`),
        fetch(`${API_URL}/employees`)
      ]);
      
      if (tRes.ok) setTasks(await tRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || newTask.assignedToIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const promises = newTask.assignedToIds.map(assigneeId => {
        return fetch(`${API_URL}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTask.title,
            description: newTask.description,
            dueDate: newTask.dueDate,
            status: newTask.status,
            priority: newTask.priority,
            assignedToId: assigneeId,
            performedBy: user?.id,
            userName: user?.name
          })
        });
      });

      const results = await Promise.all(promises);
      const allSuccess = results.every(res => res.ok);

      if (allSuccess) {
        setCreateModalOpen(false);
        setNewTask({ title: "", description: "", assignedToIds: [], dueDate: "", status: "todo", priority: "medium" });
        fetchTasks();
        toast.success(`Task successfully assigned to ${newTask.assignedToIds.length} user(s)!`);
      } else {
        toast.error("Failed to create some tasks.");
        fetchTasks();
      }
    } catch (err) {
      console.error("Error creating tasks:", err);
      toast.error("An error occurred while creating tasks.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueDesignations = Array.from(new Set(employees.map((e: any) => e.designation).filter(Boolean)));
  const uniqueDepartments = Array.from(new Set(employees.map((e: any) => e.department).filter(Boolean)));

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
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          [field]: value,
          performedBy: user?.id,
          userName: user?.name
        })
      });
      if (res.ok) {
        toast.success(`Updated successfully!`);
        // Optimistically update locally
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
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
    return user.role === 'Admin' || user.role === 'HR' || task.assignedById === user.id;
  };

  const handleUpdateTitle = async (taskId: string) => {
    if (!editTaskTitle.trim()) {
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

  // Filter State
  const [activeStatuses, setActiveStatuses] = useState<string[]>(["To do", "Pending", "In progress"]);
  const [activePriorities, setActivePriorities] = useState<string[]>(["High", "Medium"]);

  const toggleFilter = (state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (state.includes(val)) {
      setState(state.filter(item => item !== val));
    } else {
      setState([...state, val]);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
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
          <Button variant="outline" className="shadow-sm font-medium" onClick={() => exportToCSV(tasks, 'tasks')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>

          
          {/* Filters Modal */}
          <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shadow-sm font-medium">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Filter tasks</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Status Filter */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {["To do", "Pending", "In progress", "Complete"].map(status => {
                      const isActive = activeStatuses.includes(status);
                      return (
                        <div 
                          key={status}
                          onClick={() => toggleFilter(activeStatuses, setActiveStatuses, status)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors border ${
                            isActive 
                              ? 'bg-brand-light/20 border-brand-teal/30 text-brand-teal' 
                              : 'bg-white border-border text-foreground hover:bg-gray-50'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(status)}`}></span>
                          {status}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Priority Filter */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {["High", "Medium", "Low"].map(priority => {
                      const isActive = activePriorities.includes(priority);
                      return (
                        <div 
                          key={priority}
                          onClick={() => toggleFilter(activePriorities, setActivePriorities, priority)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors border ${
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

                {/* Assignee Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Assignee</label>
                  <div className="border border-border rounded-md p-2 flex flex-wrap gap-2 min-h-[42px] items-center bg-white cursor-text">
                    <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md text-xs font-medium text-foreground">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src="/placeholder-user.jpg" />
                      </Avatar>
                      Sarah Jenkins
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer ml-0.5" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md text-xs font-medium text-foreground">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src="/placeholder-user.jpg" />
                      </Avatar>
                      Aisha Rahman
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer ml-0.5" />
                    </div>
                    <input type="text" placeholder="Select assignees..." className="flex-1 outline-none text-sm min-w-[120px] bg-transparent" />
                  </div>
                </div>

                {/* Due Date Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Due Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9 bg-white" placeholder="Apr 19, 2026 - Apr 30, 2026" defaultValue="Apr 19, 2026 - Apr 30, 2026" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium px-2">Clear all</Button>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setFilterModalOpen(false)}>
                  Apply filters
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Task Modal */}
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
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
              
              <div className="space-y-5 py-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">Assignees <span className="text-red-500">*</span></label>
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
                    <div className="border border-border rounded-md max-h-[140px] overflow-y-auto bg-white p-2 space-y-1">
                      {employees.map(emp => {
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
                      <p className="text-xs text-brand-teal font-medium mt-1">
                        {newTask.assignedToIds.length} user(s) selected
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Due date</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="date"
                        min={todayStr}
                        className="pl-9 bg-white" 
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Status</label>
                    <Select value={newTask.status} onValueChange={(val) => setNewTask({...newTask, status: val})}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            To do
                          </div>
                        </SelectItem>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Pending
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
                    <label className="text-sm font-semibold text-foreground">Priority</label>
                    <Select value={newTask.priority} onValueChange={(val) => setNewTask({...newTask, priority: val})}>
                      <SelectTrigger className="bg-white">
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
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2 mt-2">
                <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-brand-teal hover:bg-brand-teal-light text-white" 
                  onClick={handleCreateTask}
                  disabled={isSubmitting || !newTask.title || newTask.assignedToIds.length === 0}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
          { title: "To do", count: tasks.filter(t => t.status === 'todo').length.toString().padStart(2, '0'), desc: "New tasks waiting to be picked up.", dot: "bg-slate-400" },
          { title: "Pending", count: tasks.filter(t => t.status === 'pending').length.toString().padStart(2, '0'), desc: "Tasks paused for approval or feedback.", dot: "bg-amber-400" },
          { title: "In progress", count: tasks.filter(t => t.status === 'in-progress').length.toString().padStart(2, '0'), desc: "Active work items currently being handled.", dot: "bg-brand-teal" },
          { title: "Due Tasks", count: tasks.filter(t => t.dueDate && t.status !== 'completed' && t.dueDate <= todayStr).length.toString().padStart(2, '0'), desc: "Tasks that are due today or overdue.", dot: "bg-red-500", highlight: true },
          { title: "Completed", count: tasks.filter(t => t.status === 'completed').length.toString().padStart(2, '0'), desc: "Completed tasks reviewed and closed.", dot: "bg-emerald-600" },
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
          <h2 className="text-lg font-bold text-foreground mb-1">Task overview</h2>
          <p className="text-sm text-muted-foreground">A single list of all tasks with assignee, status, priority, and due date.</p>
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
                  <th className="px-6 py-4 font-medium w-[40%]">Task</th>
                  <th className="px-6 py-4 font-medium">Assignee</th>
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
                          className="font-semibold text-foreground mb-1 hover:text-brand-teal hover:underline cursor-pointer inline-block"
                          title="Click to edit task name"
                          onClick={(e) => {
                            e.stopPropagation();
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
                          className="text-xs text-muted-foreground line-clamp-1 hover:text-brand-teal hover:underline cursor-pointer"
                          title="Click to edit description"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDescId(task.id);
                            setEditTaskDesc(task.description || task.desc || "");
                          }}
                        >
                          {task.description || task.desc || <span className="italic text-gray-400">Add a description...</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={task.avatar} />
                          <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                            {(task.assignedToName || task.assignee || 'U').split(' ').map((n:any) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground text-sm">{task.assignedToName || task.assignee}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Select defaultValue={task.status} onValueChange={(val) => handleUpdateField(task.id, 'status', val)}>
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
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              Pending
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
                      <Select defaultValue={task.priority} onValueChange={(val) => handleUpdateField(task.id, 'priority', val)}>
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
                      <Input 
                        type="date"
                        min={todayStr}
                        className="h-8 w-[130px] border-transparent bg-transparent hover:bg-gray-50 text-sm font-medium text-foreground p-1 focus:ring-0 shadow-none cursor-pointer"
                        value={task.dueDate || ''}
                        onChange={(e) => handleUpdateField(task.id, 'dueDate', e.target.value)}
                      />
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
