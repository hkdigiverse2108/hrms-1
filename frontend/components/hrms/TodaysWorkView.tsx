import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Search, Users, ArrowRight, ClipboardList, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TodaysWorkViewProps {
  projects: any[];
  allEmployees: any[];
  clients: any[];
  taskFilterType: "all" | "my";
  currentUser: any;
  dailyReports?: any[];
  projectRemarks?: any[];
  timeFilter?: string;
  onTaskActionClick?: (client: any, project: any, taskId: string, dateStr: string) => void;
  onSaveRemark?: (taskId: string, projectId: string, clientId: string, dateStr: string, remark: string) => Promise<boolean>;
}

export function TodaysWorkView({
  projects,
  allEmployees,
  clients,
  taskFilterType,
  currentUser,
  dailyReports = [],
  projectRemarks = [],
  timeFilter = "all",
  onTaskActionClick,
  onSaveRemark,
}: TodaysWorkViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingRemarkValue, setEditingRemarkValue] = useState("");
  const [editingIsClientIssue, setEditingIsClientIssue] = useState(false);

  const getEmpName = (id?: string) => {
    if (!id) return "Unassigned";
    const emp = allEmployees.find((e) => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unassigned";
  };

  const getEmpInitials = (name: string) => {
    if (name === "Unassigned") return "?";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const getPastDates = (maxDays = 6) => {
    const dates = [];
    for (let i = -2; i <= maxDays; i++) { // Include some upcoming dates just in case
      const d = new Date();
      d.setDate(d.getDate() - 1 - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  // Group projects by client
  const clientData = clients.map((client) => {
    const clientProjects = projects.filter((p) => p.clientId === client.id && p.department?.toLowerCase() === "digital marketing" && p.status !== "on-hold" && p.status !== "onhold" && p.status?.toLowerCase() !== "on-hold");
    const proj = clientProjects[0];

    const normalizeDate = (d: string) => d ? d.split(" ")[0].split("T")[0] : "";

    let allMissingTasks: any[] = [];
    if (proj) {
      const dates = getPastDates(6); // Today + past 6 days
      dates.forEach(dateStr => {
        const report = dailyReports.find(r => r.clientId === client.id && normalizeDate(r.date) === dateStr);
        const isFilled = (val: any) => val !== undefined && val !== null && val !== 0 && val !== "" && val !== "0" && val !== 0.0;
        const isClientIssue = report?.remarks && report.remarks.toString().includes("[CLIENT ISSUE]");

        const metricsRecord = projectRemarks.find(r => r.projectId === proj.id && normalizeDate(r.date) === dateStr);
        const hasMetrics = !!metricsRecord && (!metricsRecord.userRemark?.includes("[CLIENT ISSUE]") && !metricsRecord.clientRemark?.includes("[CLIENT ISSUE]") && !metricsRecord.remark?.includes("[CLIENT ISSUE]"));

        let dayTasks = [
          { id: "reach", name: "Reach", assigneeId: proj.assignedEmployeeId, date: dateStr, existingRemark: report?.remarks },
          { id: "impression", name: "Impressions", assigneeId: proj.assignedEmployeeId, date: dateStr, existingRemark: report?.remarks },
          { id: "leads", name: "Leads", assigneeId: proj.assignedEmployeeId, date: dateStr, existingRemark: report?.remarks },
          { id: "spend", name: "Spend", assigneeId: proj.assignedEmployeeId, date: dateStr, existingRemark: report?.remarks },
          { id: "cpl", name: "Cost Metric", assigneeId: proj.assignedEmployeeId, date: dateStr, existingRemark: report?.remarks },
          { id: "revenue", name: "Revenue", assigneeId: proj.revenueAssigneeId, date: dateStr, existingRemark: metricsRecord?.remark },
          { id: "follower", name: "Follower", assigneeId: proj.followerAssigneeId, date: dateStr, existingRemark: metricsRecord?.remark },
        ].filter(t => t.assigneeId);

        if (report && !isClientIssue) {
          if (isFilled(report.reach)) dayTasks = dayTasks.filter(t => t.id !== "reach");
          if (isFilled(report.impression)) dayTasks = dayTasks.filter(t => t.id !== "impression");
          if (isFilled(report.leads)) dayTasks = dayTasks.filter(t => t.id !== "leads");
          if (isFilled(report.spend)) dayTasks = dayTasks.filter(t => t.id !== "spend");
          if (isFilled(report.cpl)) dayTasks = dayTasks.filter(t => t.id !== "cpl");
        }
        
        if (hasMetrics) {
          dayTasks = dayTasks.filter(t => !["revenue", "follower"].includes(t.id));
        }

        allMissingTasks = [...allMissingTasks, ...dayTasks];
      });
    }

    const isMyTask = allMissingTasks.some(t => t.assigneeId === (currentUser?.id || currentUser?._id));

    return {
      client,
      project: proj,
      tasks: allMissingTasks,
      isMyTask,
      matchesSearch: client.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    };
  }).filter(data => data.project && data.tasks.length > 0); 

  // Flatten all tasks into a single array
  const allTasks = clientData.reduce((acc: any[], data) => {
    const tasksWithClient = data.tasks.map((t: any) => ({
      ...t,
      clientName: data.client.companyName || data.client.name,
      clientId: data.client.id,
      project: data.project,
    }));
    return [...acc, ...tasksWithClient];
  }, []);

  const isFullAuthority = (() => {
    if (!currentUser) return false;
    const r = (currentUser.role || "").toLowerCase().trim();
    const d = (currentUser.designation || "").toLowerCase().trim();
    const n = (currentUser.name || "").toLowerCase().trim();
    if (n === "admin admin") return true;

    const fullRoles = ["admin", "super admin", "superadmin", "hr", "manager", "director", "sub admin", "sub-admin", "head", "team leader", "tl"];
    if (fullRoles.includes(r) || fullRoles.includes(d)) return true;
    if (r.includes("head") || d.includes("head") || r.includes("team leader") || d.includes("team leader") || r.includes("tl") || d.includes("tl")) return true;
    return false;
  })();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const filteredTasks = allTasks.filter(task => {
    if (!isFullAuthority || taskFilterType === "my") {
      const uId = String(currentUser?.id || currentUser?._id || "");
      const isMyTask = String(task.assigneeId) === uId || 
                       String(task.project?.assignedEmployeeId) === uId ||
                       String(task.project?.assignedToId) === uId ||
                       String(task.project?.teamLeaderId) === uId ||
                       String(task.project?.createdBy) === uId ||
                       String(task.project?.createdById) === uId ||
                       String(task.project?.assignedById) === uId ||
                       String(task.project?.assignedBy) === uId ||
                       (Array.isArray(task.project?.assignedEmployeeIds) && task.project.assignedEmployeeIds.map(String).includes(uId)) ||
                       (Array.isArray(task.project?.assignedToIds) && task.project.assignedToIds.map(String).includes(uId));
      if (!isMyTask) return false;
    }
    
    const isClientIssue = task.existingRemark && task.existingRemark.includes('[CLIENT ISSUE]');

    if (timeFilter === "today") {
      if (task.date > yesterdayStr) return false; // keep yesterday and older
      if (isClientIssue) return false; // exclude client issues from today
    } else if (timeFilter === "pending") {
      if (!isClientIssue) return false; // ONLY show client issues in pending
    } else if (timeFilter === "upcoming") {
      if (task.date <= yesterdayStr) return false; // newer than yesterday
      if (isClientIssue) return false; // usually upcoming wouldn't have issues, but just in case
    }

    if (brandFilter !== "all" && String(task.clientId) !== String(brandFilter)) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.clientName?.toLowerCase().includes(query) ||
        task.name?.toLowerCase().includes(query) ||
        getEmpName(task.assigneeId).toLowerCase().includes(query)
      );
    }
    return true;
  });

  const sortedTasks = filteredTasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Unique clients for brand filter
  const uniqueClients = Array.from(new Set(allTasks.map(t => t.clientId))).map(id => {
    const task = allTasks.find(t => t.clientId === id);
    return { id, name: task.clientName };
  }).filter(c => {
    if (isFullAuthority) return true;
    const clientTasks = allTasks.filter(t => t.clientId === c.id);
    const uId = String(currentUser?.id || currentUser?._id || "");
    return clientTasks.some(t => 
      String(t.assigneeId) === uId || 
      String(t.project?.assignedEmployeeId) === uId ||
      String(t.project?.assignedToId) === uId ||
      (Array.isArray(t.project?.assignedEmployeeIds) && t.project.assignedEmployeeIds.map(String).includes(uId))
    );
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Filters Bar */}
      <div className="flex flex-col border-b border-slate-200 bg-slate-50/50">
        {/* Top Header Row */}
        <div className="p-4 pb-3 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand-teal" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Work Tasks
              </h2>
            </div>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search clients, tasks, assignees..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-white border-slate-200 shadow-sm rounded-full focus-visible:ring-brand-teal"
            />
          </div>
        </div>

        {/* Bottom Filters Row */}
        <div className="px-4 pb-4 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[180px] h-8 bg-white border-slate-200 text-xs font-semibold rounded-md shadow-sm focus:ring-brand-teal">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {uniqueClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-slate-50/30 custom-scrollbar">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 shadow-sm z-10 border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px] font-semibold text-slate-500 pl-6">Date</TableHead>
              <TableHead className="font-semibold text-slate-500 min-w-[200px]">Brand</TableHead>
              <TableHead className="font-semibold text-slate-500 min-w-[150px]">Task</TableHead>
              <TableHead className="font-semibold text-slate-500 min-w-[150px]">Assign To</TableHead>
              <TableHead className="font-semibold text-slate-500 min-w-[200px]">Remark</TableHead>
              <TableHead className="w-[60px] pr-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  No tasks found.
                </TableCell>
              </TableRow>
            ) : (
              sortedTasks.map((task: any, idx: number) => {
                const empName = getEmpName(task.assigneeId);
                const isAssignedToMe = task.assigneeId === (currentUser?.id || currentUser?._id);
                const isUnassigned = task.assigneeId == null || task.assigneeId === "";
                const isToday = task.date === yesterdayStr;
                const displayDate = new Date(task.date).toLocaleDateString('en-GB');
                
                return (
                  <TableRow key={`${task.id}-${task.clientId}-${idx}`} className={`hover:bg-slate-50 transition-colors ${isAssignedToMe ? 'bg-brand-teal/[0.02]' : ''}`}>
                    <TableCell className="pl-6 whitespace-nowrap">
                      <Badge variant={isToday ? "default" : "destructive"} className={`font-medium ${isToday ? 'bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 shadow-none border-0' : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-none border-0'}`}>
                        {displayDate}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">
                        {task.project?.title || task.clientName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {task.clientName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        {task.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!isUnassigned && (
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-600 uppercase">
                              {getEmpInitials(empName)}
                            </span>
                          </div>
                        )}
                        <span className={`text-sm ${isUnassigned ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
                          {empName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingRemarkId === `${task.clientId}-${task.project?.id}-${task.id}-${task.date}` ? (
                        <div className="flex flex-col gap-1.5 min-w-[150px]">
                          <div className="flex items-center gap-1.5">
                            <Input 
                              value={editingRemarkValue}
                              onChange={(e) => setEditingRemarkValue(e.target.value)}
                              className="h-8 text-xs px-2 py-1 w-full focus-visible:ring-brand-teal"
                              autoFocus
                              placeholder="Type reason..."
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && onSaveRemark) {
                                  const finalRemark = editingIsClientIssue ? `[CLIENT ISSUE] ${editingRemarkValue}` : editingRemarkValue;
                                  const success = await onSaveRemark(task.id, task.project?.id, task.clientId, task.date, finalRemark);
                                  if (success) setEditingRemarkId(null);
                                }
                                if (e.key === 'Escape') setEditingRemarkId(null);
                              }}
                            />
                            <button 
                              onClick={async () => {
                                if (onSaveRemark) {
                                  const finalRemark = editingIsClientIssue ? `[CLIENT ISSUE] ${editingRemarkValue}` : editingRemarkValue;
                                  const success = await onSaveRemark(task.id, task.project?.id, task.clientId, task.date, finalRemark);
                                  if (success) setEditingRemarkId(null);
                                }
                              }} 
                              className="text-green-600 hover:bg-green-50 p-1.5 rounded transition-colors" title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingRemarkId(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer mt-0.5">
                            <input 
                              type="checkbox" 
                              className="w-3 h-3 text-red-500 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                              checked={editingIsClientIssue}
                              onChange={(e) => setEditingIsClientIssue(e.target.checked)}
                            />
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Issue from client</span>
                          </label>
                        </div>
                      ) : task.existingRemark ? (
                        <div className="group relative flex items-center gap-2">
                          <span className="text-xs text-slate-700 truncate max-w-[120px] font-medium" title={task.existingRemark}>
                            {task.existingRemark.replace('[CLIENT ISSUE] ', '').replace('[CLIENT ISSUE]', '')}
                          </span>
                          {task.existingRemark.includes('[CLIENT ISSUE]') && (
                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider border border-red-200 bg-red-50 px-1 rounded">Issue</span>
                          )}
                          <button 
                            onClick={() => {
                              setEditingRemarkId(`${task.clientId}-${task.project?.id}-${task.id}-${task.date}`);
                              setEditingRemarkValue(task.existingRemark.replace('[CLIENT ISSUE] ', '').replace('[CLIENT ISSUE]', '').trim());
                              setEditingIsClientIssue(task.existingRemark.includes('[CLIENT ISSUE]'));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-teal p-1 rounded-md transition-all ml-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingRemarkId(`${task.clientId}-${task.project?.id}-${task.id}-${task.date}`);
                            setEditingRemarkValue("");
                            setEditingIsClientIssue(false);
                          }}
                          className="text-xs font-semibold text-brand-teal hover:text-brand-teal/80 bg-brand-teal/5 hover:bg-brand-teal/10 px-3 py-1.5 rounded-md transition-colors border border-brand-teal/20"
                        >
                          + Add Remark
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {onTaskActionClick ? (
                        <button 
                          onClick={() => onTaskActionClick({ id: task.clientId, companyName: task.clientName, name: task.clientName }, task.project, task.id, task.date)}
                          className="p-2 hover:bg-brand-teal/10 rounded-md transition-colors text-brand-teal"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <ArrowRight className="w-4 h-4 opacity-50 text-slate-400" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
