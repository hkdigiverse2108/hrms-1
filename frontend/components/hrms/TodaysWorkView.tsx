import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Search, Users, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
interface TodaysWorkViewProps {
  projects: any[];
  allEmployees: any[];
  clients: any[];
  taskFilterType: "all" | "my";
  currentUser: any;
  dailyReports?: any[];
  projectRemarks?: any[];
  onTaskActionClick?: (client: any, project: any, taskId: string, dateStr: string) => void;
}

export function TodaysWorkView({
  projects,
  allEmployees,
  clients,
  taskFilterType,
  currentUser,
  dailyReports = [],
  projectRemarks = [],
  onTaskActionClick,
}: TodaysWorkViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

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
    for (let i = 0; i <= maxDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  // Group projects by client
  const clientData = clients.map((client) => {
    const clientProjects = projects.filter((p) => p.clientId === client.id && p.department?.toLowerCase() === "digital marketing");
    const proj = clientProjects[0];

    const normalizeDate = (d: string) => d ? d.split(" ")[0].split("T")[0] : "";

    let allMissingTasks: any[] = [];
    if (proj) {
      const dates = getPastDates(6); // Today + past 6 days
      dates.forEach(dateStr => {
        const hasDataFill = dailyReports.some(r => r.clientId === client.id && normalizeDate(r.date) === dateStr);
        const hasMetrics = projectRemarks.some(r => r.projectId === proj.id && normalizeDate(r.date) === dateStr);

        let dayTasks = [
          { id: "data_fill", name: "Data Fill", assigneeId: proj.assignedEmployeeId, date: dateStr },
          { id: "revenue", name: "Revenue", assigneeId: proj.revenueAssigneeId, date: dateStr },
          { id: "follower", name: "Follower", assigneeId: proj.followerAssigneeId, date: dateStr },
          { id: "user_remark", name: "User Remark", assigneeId: proj.userRemarkAssigneeId, date: dateStr },
          { id: "client_remark", name: "Client Remark", assigneeId: proj.clientRemarkAssigneeId, date: dateStr },
        ].filter(t => t.assigneeId);

        if (hasDataFill) {
          dayTasks = dayTasks.filter(t => t.id !== "data_fill");
        }
        if (hasMetrics) {
          dayTasks = dayTasks.filter(t => !["revenue", "follower", "user_remark", "client_remark"].includes(t.id));
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

  const filteredData = clientData.filter(d => {
    if (!d.matchesSearch) return false;
    if (taskFilterType === "my") return d.isMyTask;
    return true;
  });

  const selectedData = selectedClientId ? clientData.find(d => d.client.id === selectedClientId) : null;

  return (
    <ResizablePanelGroup direction="horizontal" className="bg-white rounded-xl border shadow-sm overflow-hidden flex-1 min-h-0">
      {/* Left Column: Client List */}
      <ResizablePanel defaultSize={25} minSize={15} maxSize={40} className="border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search clients..."
              className="pl-10 h-9 bg-slate-50 border-transparent focus:bg-white focus:border-brand-teal/30 focus:ring-brand-teal/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-auto flex-1 custom-scrollbar p-3 space-y-2">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400 italic">No clients found</div>
          ) : (
            filteredData.map(({ client, tasks }) => {
              const isSelected = selectedClientId === client.id;
              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${isSelected ? "bg-white border-brand-teal shadow-sm ring-1 ring-brand-teal/20" : "bg-transparent border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-brand-teal text-white shadow-md shadow-brand-teal/20" : "bg-brand-teal/10 text-brand-teal"}`}
                    >
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 truncate text-sm">
                        {client.companyName || client.name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {tasks.length} Tasks Assigned
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right Column: Tasks Content */}
      <ResizablePanel defaultSize={75} className="flex flex-col bg-white">
        {!selectedData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-lg font-medium text-slate-500">No Client Selected</p>
            <p className="text-sm mt-1">Please select a client from the left sidebar to view their assigned tasks.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <h2 className="text-lg font-semibold text-slate-800">
                {selectedData.client.companyName || selectedData.client.name}
              </h2>
            </div>

            <div className="p-0 overflow-auto flex-1 custom-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 shadow-sm z-10">
                  <TableRow>
                    <TableHead className="pl-6 font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Task</TableHead>
                    <TableHead className="font-semibold">Assign To</TableHead>
                    <TableHead className="w-[80px] pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const sortedTasks = [...selectedData.tasks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    const todayStr = new Date().toISOString().split("T")[0];
                    const assignBy = selectedData.project?.teamLeaderName || "Admin";

                    return sortedTasks.map((task: any, idx: number) => {
                      const empName = getEmpName(task.assigneeId);
                      const isAssignedToMe = task.assigneeId === (currentUser?.id || currentUser?._id);
                      const isUnassigned = task.assigneeId == null || task.assigneeId === "";
                      const isToday = task.date === todayStr;
                      const displayDate = new Date(task.date).toLocaleDateString('en-GB');
                      
                      return (
                        <TableRow key={idx} className={`hover:bg-slate-50/50 transition-colors ${isAssignedToMe ? 'bg-brand-teal/5' : ''}`}>
                          <TableCell className="pl-6 whitespace-nowrap">
                            <Badge variant={isToday ? "default" : "destructive"} className={`font-medium ${isToday ? 'bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 shadow-none border-0' : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-none border-0'}`}>
                              {displayDate}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                              {task.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm ${isUnassigned ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
                              {empName}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-right text-slate-400">
                            {onTaskActionClick ? (
                              <button 
                                onClick={() => onTaskActionClick(selectedData.client, selectedData.project, task.id, task.date)}
                                className="p-1.5 hover:bg-brand-teal/10 rounded-md transition-colors text-brand-teal"
                              >
                                <ArrowRight className="w-4 h-4 inline-block" />
                              </button>
                            ) : (
                              <ArrowRight className="w-4 h-4 inline-block opacity-50" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
