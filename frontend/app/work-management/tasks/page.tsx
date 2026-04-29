"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ClipboardList, Plus, Pencil, Trash2, Calendar, User, Loader2, Search, Briefcase, CheckCircle2, History, AlertTriangle, MoreHorizontal } from "lucide-react";
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

const STAGES = [
  { id: "todo", label: "To Do", color: "text-slate-700 bg-transparent" },
  { id: "in-progress", label: "In Progress", color: "text-blue-700 bg-transparent" },
  { id: "review", label: "Review", color: "text-amber-700 bg-transparent" },
  { id: "completed", label: "Completed", color: "text-green-700 bg-transparent" },
];

export default function TasksPage() {
  const { user } = useUser();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
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
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && user.department?.toLowerCase() === "sales" && user.role?.toLowerCase() !== "admin") {
        router.replace("/work-management/sales");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, pRes, eRes] = await Promise.all([
        fetch(`${API_URL}/wm-tasks`),
        fetch(`${API_URL}/projects`),
        fetch(`${API_URL}/employees`)
      ]);
      
      if (tRes.ok) setTasks(await tRes.json());
      if (pRes.ok) setProjects(await pRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
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
        alert(`Error: ${error.detail || "Failed to save task"}`);
      }
    } catch (err) {
      console.error("Error saving task:", err);
      alert("Failed to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

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
        alert("Failed to update task stage");
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      setTasks(prevTasks);
    }
  };

  const filteredTasks = tasks.filter(t => {
    let isVisible = false;
    if (user?.role === "Admin") {
      isVisible = true;
    } else if (user?.role === "Team Leader") {
      const project = projects.find(p => p.id === t.projectId);
      isVisible = project?.teamLeaderId === user.id || t.assignedToId === user.id;
    } else {
      isVisible = t.assignedToId === user.id;
    }

    if (!isVisible) return false;

    // Department Filter
    if (selectedDepartment !== "all") {
      const assignee = employees.find(e => e.id === t.assignedToId);
      if (assignee?.department !== selectedDepartment) return false;
    }

    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.assignedToName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));


  const isOverdue = (dateString: string, status: string) => {
    if (!dateString || status === "completed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    return dueDate < today;
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)]">
      <PageHeader
        title="Tasks Board"
        description="Manage your team's workflow. Click any task card to update details."
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchLogs()} className="border-slate-300 text-slate-600 h-9 px-4 text-[12px] rounded-lg">
            <History className="w-4 h-4 mr-2" />
            Activity Logs
          </Button>

          <Dialog open={modalOpen} onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setEditingTask(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-brand-teal hover:bg-brand-teal-light text-white h-9 px-4 text-[12px] rounded-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {editingTask ? "Edit Task Details" : "Create New Task"}
                </DialogTitle>
              </DialogHeader>
              <WMTaskForm 
                initialData={editingTask} 
                onSubmit={handleSubmit} 
                isSubmitting={isSubmitting} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex flex-col gap-1 text-base">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-teal" />
                {logFilter.taskId ? "Task History" : "Company Activity Logs"}
              </div>
              {logFilter.taskTitle && <p className="text-xs text-muted-foreground italic">"{logFilter.taskTitle}"</p>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 custom-scrollbar">
            {isLoadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-teal" />
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            ) : taskLogs.length > 0 ? (
              <div className="space-y-3">
                {taskLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1 text-[11px]">
                      <span className="font-bold">{log.userName}</span>
                      <span className="text-muted-foreground">{log.timestamp}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 mb-1 uppercase font-bold">{log.action}</Badge>
                    <p className="text-[12px] text-slate-600 border-l-2 border-slate-100 pl-2 mt-1">{log.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-xs text-muted-foreground">No history.</div>
            )}
          </div>
          <div className="p-3 border-t flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setLogsOpen(false)} className="flex-1 text-xs h-8">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      
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
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full overflow-x-auto pb-4 items-start">
            {STAGES.map(stage => (
              <div key={stage.id} className="flex flex-col w-[300px] shrink-0 h-full bg-slate-50/50 rounded-2xl border border-slate-100/50">
                <div className="flex items-center justify-between p-4 pb-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className={`font-bold text-[14px] ${stage.color}`}>{stage.label}</h3>
                    <span className="bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      {filteredTasks.filter(t => t.status === stage.id).length}
                    </span>
                  </div>
                  <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
                </div>
                
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 overflow-y-auto p-3 pt-2 transition-colors custom-scrollbar ${
                        snapshot.isDraggingOver ? "bg-slate-100/50" : ""
                      }`}
                    >
                      <div className="space-y-3">
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
                                    setEditingTask(task);
                                    setModalOpen(true);
                                  }}
                                >
                                  <div className={`p-4 rounded-xl transition-all cursor-pointer border ${
                                    snapshot.isDragging ? "opacity-90 scale-[1.02] shadow-xl border-brand-teal ring-4 ring-brand-teal/5" : 
                                    "bg-white hover:border-brand-teal/30 border-slate-200 shadow-sm hover:shadow-md"
                                  } ${isOverdue(task.dueDate, task.status) ? "border-red-200 bg-red-50/20" : ""}`}>
                                    
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                                            task.priority === 'urgent' ? 'bg-red-500' :
                                            task.priority === 'high' ? 'bg-orange-500' :
                                            task.priority === 'medium' ? 'bg-blue-500' :
                                            'bg-slate-300'
                                          }`} />
                                          <h4 className="font-bold text-[13px] text-slate-800 leading-snug line-clamp-2">
                                            {task.title}
                                          </h4>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); fetchLogs(task.id, task.title); }} className="p-1 hover:bg-brand-teal/10 rounded-md text-brand-teal" title="View History"><History className="w-3.5 h-3.5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="p-1 hover:bg-red-50 rounded-md text-red-500" title="Delete Task"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 min-w-0">
                                        <Briefcase className="w-3 h-3 text-brand-teal shrink-0" />
                                        <span className="text-[11px] font-bold text-slate-600 truncate">
                                          {task.projectName || "General"}
                                        </span>
                                      </div>

                                      {employees.find(e => e.id === task.assignedToId)?.department && (
                                        <div className="px-2 py-0.5 bg-brand-teal/5 text-brand-teal border border-brand-teal/10 rounded-md text-[9px] font-extrabold uppercase tracking-tighter">
                                          {employees.find(e => e.id === task.assignedToId).department}
                                        </div>
                                      )}
                                      
                                      {isOverdue(task.dueDate, task.status) && (
                                        <div className="flex items-center gap-1 text-red-600">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                          <span className="text-[10px] font-bold uppercase">Overdue</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
