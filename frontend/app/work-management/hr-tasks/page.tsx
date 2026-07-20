"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Check, X, Calendar, User, Loader2, AlertCircle, Edit2, Trash2
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";

export default function HRTasksPage() {
  const { user } = useUser();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState("tasks");
  const [taskSubTab, setTaskSubTab] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [docRequests, setDocRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Task creation/editing state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    assignedToId: "",
    dueDate: "",
    priority: "medium",
    status: "todo",
    department: "HR",
    frequency: "one-time"
  });

  // Leave approval state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [leaveStatusData, setLeaveStatusData] = useState({
    status: "",
    approve_reason: "",
    reject_reason: ""
  });

  const isAdminOrHR = user?.role === "Admin" || user?.role === "Super Admin" || user?.role === "HR" || user?.department?.toLowerCase() === "hr";

  useEffect(() => {
    fetchEmployees();
    fetchTasks();
    fetchLeaves();
    fetchDocRequests();
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const hrTasks = useMemo(() => {
    const hrEmployeeIds = new Set(
      employees
        .filter(e => e.role === "HR" || e.department?.toLowerCase() === "hr" || e.department?.toLowerCase() === "human resources")
        .map(e => e.id || e._id)
    );

    return tasks.filter((t: any) => {
      const isAssignedToHREmployee = (t.assignedToId && hrEmployeeIds.has(t.assignedToId)) || 
                                     (t.assignedToIds && t.assignedToIds.some((id: string) => hrEmployeeIds.has(id)));
      return t.department === "HR" || 
             (t.frequency && t.frequency !== "one-time") || 
             t.assignedToName?.toLowerCase().includes("hr") ||
             isAssignedToHREmployee ||
             (user && (t.assignedToId === user.id || t.assignedToIds?.includes(user.id)));
    });
  }, [tasks, employees, user]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`${API_URL}/tasks`);
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await fetch(`${API_URL}/leaves`);
      if (res.ok) {
        setLeaves(await res.json());
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const fetchDocRequests = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_URL}/document-requests`);
      if (res.ok) {
        setDocRequests(await res.json());
      }
    } catch (err) {
      console.error("Error fetching doc requests:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskFormData.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      const url = editingTask 
        ? `${API_URL}/tasks/${editingTask.id}` 
        : `${API_URL}/tasks`;
      const method = editingTask ? "PUT" : "POST";

      const matchedEmp = employees.find(e => e.id === taskFormData.assignedToId || e._id === taskFormData.assignedToId);
      const assignedToName = matchedEmp ? `${matchedEmp.firstName} ${matchedEmp.lastName}` : "";

      const payload = {
        ...taskFormData,
        assignedToName,
        assignedToIds: taskFormData.assignedToId ? [taskFormData.assignedToId] : [],
        assignedToNames: assignedToName ? [assignedToName] : [],
        performedBy: user?.id || "System",
        userName: user?.name || "System"
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingTask ? "Task updated successfully" : "Task created successfully");
        setIsTaskModalOpen(false);
        setEditingTask(null);
        setTaskFormData({
          title: "",
          description: "",
          assignedToId: "",
          dueDate: "",
          priority: "medium",
          status: "todo",
          department: "HR",
          frequency: "one-time"
        });
        fetchTasks();
      } else {
        toast.error("Failed to save task");
      }
    } catch (err) {
      console.error("Error saving task:", err);
      toast.error("Error saving task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Delete Task",
      message: "Are you sure you want to delete this task?",
      confirmText: "Delete",
      destructive: true
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Task deleted");
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting task");
    }
  };

  const handleCompleteTask = async (task: any) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          performedBy: user?.id || "System",
          userName: user?.name || "System"
        })
      });
      if (res.ok) {
        toast.success("Task marked as completed");
        fetchTasks();
      } else {
        toast.error("Failed to update task status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating task status");
    }
  };

  const handleUpdateLeaveStatus = async () => {
    if (!selectedLeave) return;

    try {
      const res = await fetch(`${API_URL}/leaves/${selectedLeave.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: leaveStatusData.status,
          approved_by: user?.name || "HR Admin",
          approved_by_role: user?.role || "HR",
          approved_by_id: user?.id || "",
          approve_reason: leaveStatusData.approve_reason,
          reject_reason: leaveStatusData.reject_reason
        })
      });

      if (res.ok) {
        toast.success(`Leave request ${leaveStatusData.status.toLowerCase()} successfully`);
        setIsLeaveModalOpen(false);
        setSelectedLeave(null);
        fetchLeaves();
      } else {
        toast.error("Failed to update leave status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating leave status");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader 
          title="HR Tasks & Approvals" 
          description="Manage leaves, document generation requests, and HR department tasks." 
        />
        {isAdminOrHR && (
          <Button 
            className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold"
            onClick={() => {
              setEditingTask(null);
              const hrEmployees = employees.filter(emp => emp.role === "HR" || emp.department?.toLowerCase() === "hr" || emp.department?.toLowerCase() === "human resources");
              const defaultAssigneeId = hrEmployees.length === 1 ? (hrEmployees[0].id || hrEmployees[0]._id) : "";
              setTaskFormData({
                title: "",
                description: "",
                assignedToId: defaultAssigneeId,
                dueDate: "",
                priority: "medium",
                status: "todo",
                department: "HR",
                frequency: "one-time"
              });
              setIsTaskModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Create HR Task
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <TabsTrigger value="tasks" className="font-semibold text-xs px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            HR General Tasks ({hrTasks.length})
          </TabsTrigger>
          <TabsTrigger value="leaves" className="font-semibold text-xs px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Leave Approvals ({leaves.filter(l => l.status === "Pending").length} Pending)
          </TabsTrigger>
          <TabsTrigger value="documents" className="font-semibold text-xs px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Document Requests ({docRequests.filter(d => d.status === "Pending").length} Pending)
          </TabsTrigger>
        </TabsList>

        {/* --- GENERAL TASKS TAB --- */}
        <TabsContent value="tasks" className="mt-6 space-y-4">
          {(() => {
            const todayStr = new Date().toISOString().split("T")[0];
            
            const freqTasks = frequencyFilter === "all" 
              ? hrTasks 
              : hrTasks.filter(t => t.frequency === frequencyFilter);

            const countToday = freqTasks.filter(t => t.status !== "completed" && t.dueDate === todayStr).length;
            const countPending = freqTasks.filter(t => t.status !== "completed" && ((t.dueDate && t.dueDate < todayStr) || !t.dueDate)).length;
            const countUpcoming = freqTasks.filter(t => t.status !== "completed" && t.dueDate && t.dueDate > todayStr).length;
            const countCompleted = freqTasks.filter(t => t.status === "completed").length;

            const filteredTasks = freqTasks.filter((task) => {
              const taskDateStr = task.dueDate ? (task.dueDate.includes("T") ? task.dueDate.split("T")[0] : task.dueDate) : "";
              if (taskSubTab === "today") {
                return task.status !== "completed" && taskDateStr === todayStr;
              }
              if (taskSubTab === "pending") {
                return task.status !== "completed" && (taskDateStr < todayStr || !taskDateStr);
              }
              if (taskSubTab === "upcoming") {
                return task.status !== "completed" && taskDateStr > todayStr;
              }
              if (taskSubTab === "completed") {
                return task.status === "completed";
              }
              return true; // "all"
            });

            filteredTasks.sort((a, b) => {
              const aComp = a.status === "completed";
              const bComp = b.status === "completed";
              if (aComp && !bComp) return 1;
              if (!aComp && bComp) return -1;
              return 0;
            });

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "all", label: "All Tasks", count: freqTasks.length },
                      { id: "today", label: "Today's Tasks", count: countToday },
                      { id: "pending", label: "Pending Tasks", count: countPending },
                      { id: "upcoming", label: "Upcoming Tasks", count: countUpcoming },
                      { id: "completed", label: "Completed", count: countCompleted }
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setTaskSubTab(sub.id)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                          taskSubTab === sub.id 
                            ? "bg-slate-800 text-white" 
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        <span>{sub.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          taskSubTab === sub.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}>{sub.count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-slate-500 whitespace-nowrap">Frequency:</Label>
                    <Select value={frequencyFilter} onValueChange={(val) => setFrequencyFilter(val)}>
                      <SelectTrigger className="w-[150px] h-8 bg-white border-slate-200 text-xs rounded-lg shadow-none">
                        <SelectValue placeholder="Select Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Frequencies</SelectItem>
                        <SelectItem value="one-time">One-Time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="every-2-days">Once in 2 Days</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loadingTasks ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-teal" /></div>
                ) : filteredTasks.length === 0 ? (
                  <Card className="border border-slate-200 shadow-none"><CardContent className="flex flex-col items-center justify-center py-12"><AlertCircle className="w-8 h-8 text-slate-400 mb-2" /><p className="text-sm font-medium text-slate-500">No matching tasks found.</p></CardContent></Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.map((task) => (
                      <Card key={task.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                          <div className="space-y-1">
                            <div className="flex gap-2 items-center">
                              <Badge className={`${
                                task.priority === "urgent" || task.priority === "high" ? "bg-red-50 text-red-600 border-red-200" :
                                task.priority === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                "bg-slate-50 text-slate-600 border-slate-200"
                              } border font-bold text-[9px] uppercase px-2 py-0.5`}>
                                {task.priority}
                              </Badge>
                              {task.frequency && task.frequency !== "one-time" && (
                                <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 border font-bold text-[9px] uppercase px-2 py-0.5">
                                  {task.frequency}
                                </Badge>
                              )}
                            </div>
                            <span className="block text-sm font-black text-slate-800 mt-2">{task.title}</span>
                          </div>
                          {isAdminOrHR && (
                            <div className="flex gap-1">
                              {task.status !== "completed" && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50" 
                                  onClick={() => handleCompleteTask(task)}
                                  title="Mark Completed"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900" onClick={() => {
                                setEditingTask(task);
                                setTaskFormData({
                                  title: task.title,
                                  description: task.description || "",
                                  assignedToId: task.assignedToId || "",
                                  dueDate: task.dueDate || "",
                                  priority: task.priority || "medium",
                                  status: task.status || "todo",
                                  department: task.department || "HR",
                                  frequency: task.frequency || "one-time"
                                });
                                setIsTaskModalOpen(true);
                              }}><Edit2 className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDeleteTask(task.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{task.description || "No description provided."}</p>
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>Assigned: {task.assignedToName || "HR Department"}</span>
                            </div>
                            <div className="flex items-center gap-1 font-semibold text-slate-700">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Due: {task.dueDate || "-"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* --- LEAVE APPROVALS TAB --- */}
        <TabsContent value="leaves" className="mt-6 space-y-4">
          {loadingLeaves ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-teal" /></div>
          ) : leaves.length === 0 ? (
            <Card className="border border-slate-200 shadow-none"><CardContent className="flex flex-col items-center justify-center py-12"><AlertCircle className="w-8 h-8 text-slate-400 mb-2" /><p className="text-sm font-medium text-slate-500">No leave requests found.</p></CardContent></Card>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Leave Type</th>
                    <th className="p-4">Duration / Date</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{leave.employee_name || "Unknown"}</td>
                      <td className="p-4">{leave.type}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-700">{leave.duration || "1 Day"}</div>
                        <div className="text-[10px] text-slate-400">{leave.start_date} to {leave.end_date}</div>
                      </td>
                      <td className="p-4 max-w-[200px] truncate" title={leave.reason}>{leave.reason || "-"}</td>
                      <td className="p-4">
                        <Badge className={`${
                          leave.status === "Approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          leave.status === "Pending" ? "bg-amber-50 text-amber-600 border-amber-200" :
                          "bg-rose-50 text-rose-600 border-rose-200"
                        } border font-bold text-[9px] uppercase`}>
                          {leave.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {leave.status === "Pending" && isAdminOrHR ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-7 px-3" onClick={() => {
                              setSelectedLeave(leave);
                              setLeaveStatusData({ status: "Approved", approve_reason: "", reject_reason: "" });
                              setIsLeaveModalOpen(true);
                            }}><Check className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                            <Button size="sm" variant="destructive" className="font-bold text-[10px] h-7 px-3" onClick={() => {
                              setSelectedLeave(leave);
                              setLeaveStatusData({ status: "Rejected", approve_reason: "", reject_reason: "" });
                              setIsLeaveModalOpen(true);
                            }}><X className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No action required</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* --- DOCUMENT GENERATIONS TAB --- */}
        <TabsContent value="documents" className="mt-6 space-y-4">
          {loadingDocs ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-teal" /></div>
          ) : docRequests.length === 0 ? (
            <Card className="border border-slate-200 shadow-none"><CardContent className="flex flex-col items-center justify-center py-12"><AlertCircle className="w-8 h-8 text-slate-400 mb-2" /><p className="text-sm font-medium text-slate-500">No document requests found.</p></CardContent></Card>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Document Type</th>
                    <th className="p-4">Date Requested</th>
                    <th className="p-4">Needed By</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {docRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{req.employeeName || "Unknown"}</td>
                      <td className="p-4">{req.documentType}</td>
                      <td className="p-4 text-slate-500">{req.requestDate}</td>
                      <td className="p-4 font-semibold text-rose-600">{req.neededByDate || "-"}</td>
                      <td className="p-4 max-w-[200px] truncate" title={req.reason}>{req.reason || "-"}</td>
                      <td className="p-4">
                        <Badge className={`${
                          req.status === "Sent" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          req.status === "Pending" ? "bg-amber-50 text-amber-600 border-amber-200" :
                          "bg-rose-50 text-rose-600 border-rose-200"
                        } border font-bold text-[9px] uppercase`}>
                          {req.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* --- TASK CREATION / EDITING DIALOG --- */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit HR Task" : "Create HR Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input 
                placeholder="e.g. Process payroll, Review candidate resumes"
                value={taskFormData.title}
                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Details of the task..."
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Employee</Label>
                {(() => {
                  const hrEmployees = employees.filter(emp => emp.role === "HR" || emp.department?.toLowerCase() === "hr" || emp.department?.toLowerCase() === "human resources");
                  if (hrEmployees.length === 1) {
                    const singleHR = hrEmployees[0];
                    const fullName = `${singleHR.firstName} ${singleHR.lastName}`;
                    return (
                      <Input 
                        value={fullName} 
                        disabled 
                        className="bg-slate-50 border-slate-200 text-xs text-slate-500 font-medium h-9" 
                      />
                    );
                  }
                  return (
                    <Select 
                      value={taskFormData.assignedToId} 
                      onValueChange={(val) => setTaskFormData({ ...taskFormData, assignedToId: val })}
                    >
                      <SelectTrigger className="bg-white border-slate-200 text-xs h-9">
                        <SelectValue placeholder="Select staff..." />
                      </SelectTrigger>
                      <SelectContent>
                        {hrEmployees.map((emp) => (
                          <SelectItem key={emp.id || emp._id} value={emp.id || emp._id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select 
                  value={taskFormData.frequency} 
                  onValueChange={(val) => setTaskFormData({ ...taskFormData, frequency: val })}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-Time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="every-2-days">Once in 2 Days</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                  type="date"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={taskFormData.priority} 
                  onValueChange={(val) => setTaskFormData({ ...taskFormData, priority: val })}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold" onClick={handleSaveTask}>Save Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- LEAVE APPROVAL RESPONSE DIALOG --- */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{leaveStatusData.status} Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Provide an optional comment or reason for this action.
            </p>
            {leaveStatusData.status === "Approved" ? (
              <div className="space-y-2">
                <Label>Approval Reason</Label>
                <Textarea 
                  placeholder="e.g. Leave is covered under balance"
                  value={leaveStatusData.approve_reason}
                  onChange={(e) => setLeaveStatusData({ ...leaveStatusData, approve_reason: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea 
                  placeholder="e.g. Project deliverable pending"
                  value={leaveStatusData.reject_reason}
                  onChange={(e) => setLeaveStatusData({ ...leaveStatusData, reject_reason: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsLeaveModalOpen(false)}>Cancel</Button>
            <Button 
              className={leaveStatusData.status === "Approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : "bg-red-600 hover:bg-red-700 text-white font-bold"} 
              onClick={handleUpdateLeaveStatus}
            >
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
