"use client";

import React, { useState, useMemo } from "react";
import { User, ChevronLeft, CheckCircle2, Clock, AlertCircle, Calendar, Briefcase, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EmployeeAnalytics({
  employees,
  tasks,
  onBack,
}: {
  employees: any[];
  tasks: any[];
  onBack: () => void;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  const devEmployees = useMemo(() => {
    return employees.filter(e => e.department?.toLowerCase() === 'development');
  }, [employees]);

  const employee = useMemo(() => {
    return devEmployees.find((e) => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, devEmployees]);

  const employeeTasks = useMemo(() => {
    if (!selectedEmployeeId) return [];
    let filtered = tasks.filter((t) => t.assignedToId === selectedEmployeeId || t.performedBy === selectedEmployeeId);
    
    if (dateFilter) {
      filtered = filtered.filter(t => {
        const taskDate = t.dueDate || t.postingDate || (t.createdDate ? t.createdDate.split('T')[0] : "");
        return taskDate === dateFilter || (t.dueDate && t.dueDate.startsWith(dateFilter));
      });
    }
    
    return filtered;
  }, [selectedEmployeeId, tasks, dateFilter]);

  const stats = useMemo(() => {
    if (!employeeTasks.length) {
      return { total: 0, completed: 0, inProgress: 0, overdue: 0, totalHours: 0 };
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let totalHours = 0;

    employeeTasks.forEach((t) => {
      if (t.status === "completed") completed++;
      if (t.status === "in_progress" || t.status === "in-progress" || t.status === "todo") inProgress++;
      
      const taskDate = t.dueDate || t.postingDate;
      if (taskDate && taskDate < todayStr && t.status !== "completed") {
        overdue++;
      }

      if (t.estimatedHours) {
        totalHours += parseFloat(t.estimatedHours);
      }
    });

    return {
      total: employeeTasks.length,
      completed,
      inProgress,
      overdue,
      totalHours: totalHours.toFixed(1),
    };
  }, [employeeTasks]);

  const recentTasks = useMemo(() => {
    return [...employeeTasks]
      .sort((a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime())
      .slice(0, 10);
  }, [employeeTasks]);

  const projectModules = useMemo(() => {
    const modulesMap = new Map();
    employeeTasks.forEach(t => {
      if (t.projectName && t.moduleName) {
        const key = `${t.projectName}-${t.moduleName}`;
        if (!modulesMap.has(key)) {
          modulesMap.set(key, {
            project: t.projectName,
            module: t.moduleName,
            tasks: 1,
            completed: t.status === "completed" ? 1 : 0
          });
        } else {
          const m = modulesMap.get(key);
          m.tasks += 1;
          if (t.status === "completed") m.completed += 1;
        }
      }
    });
    return Array.from(modulesMap.values());
  }, [employeeTasks]);


  return (
    <div className="space-y-6 flex-1 flex flex-col h-full bg-slate-50/50 p-6 -m-4 sm:-m-6 md:-m-8 rounded-xl">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full h-9 w-9 border-slate-200 shrink-0 bg-white"
            onClick={onBack}
            title="Back to Board"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Employee Analytics</h2>
            <p className="text-sm text-slate-500">Detailed performance and task analysis.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white border-slate-200 shadow-sm h-10 rounded-xl font-medium w-40"
            title="Filter by Date"
          />
          <div className="w-72">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="bg-white border-slate-200 shadow-sm h-10 rounded-xl font-medium">
                <SelectValue placeholder="Select an Employee" />
              </SelectTrigger>
              <SelectContent>
                {devEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!selectedEmployeeId ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300 p-8 shadow-sm">
          <div className="w-16 h-16 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Select an Employee</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md text-center">
            Choose an employee from the dropdown above to view their detailed task analysis, performance metrics, and active modules.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-6 pb-6">
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Total Tasks</p>
                    <h4 className="text-2xl font-black text-slate-800">{stats.total}</h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Completed</p>
                    <h4 className="text-2xl font-black text-slate-800">{stats.completed}</h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Pending</p>
                    <h4 className="text-2xl font-black text-slate-800">{stats.inProgress}</h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Overdue</p>
                    <h4 className="text-2xl font-black text-slate-800">{stats.overdue}</h4>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Recent Tasks */}
              <Card className="col-span-2 border-slate-200 shadow-sm overflow-hidden flex flex-col rounded-xl bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal" /> 
                    Recent Tasks
                  </CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-auto">
                  {recentTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No tasks assigned yet.</div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0">
                        <TableRow>
                          <TableHead className="py-2.5 text-xs font-bold text-slate-600">Task Title</TableHead>
                          <TableHead className="py-2.5 text-xs font-bold text-slate-600">Project</TableHead>
                          <TableHead className="py-2.5 text-xs font-bold text-slate-600 text-center">Stage</TableHead>
                          <TableHead className="py-2.5 text-xs font-bold text-slate-600 text-right">Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTasks.map((t, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/50 border-b border-slate-100">
                            <TableCell className="font-semibold text-xs text-slate-800 max-w-[200px] truncate" title={t.title}>
                              {t.title}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 truncate max-w-[150px]">
                              {t.projectName || "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${
                                t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                t.status === 'in_progress' || t.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {(t.status || "todo").replace("_", " ")}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 text-right">
                              {t.dueDate || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>

              {/* Right Column: Active Modules & Stats */}
              <div className="space-y-6 flex flex-col">
                <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-1 text-center">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Estimated Hours</p>
                      <div className="flex items-baseline justify-center gap-2 mt-2">
                        <h4 className="text-5xl font-black text-brand-teal">{stats.totalHours}</h4>
                        <span className="text-base font-bold text-slate-400">hrs</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-3 font-medium">
                        Based on all assigned tasks
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden rounded-xl bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-brand-teal" /> 
                      Assigned Modules
                    </CardTitle>
                  </CardHeader>
                  <div className="flex-1 overflow-auto">
                    {projectModules.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">No modules assigned yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {projectModules.map((m, idx) => (
                          <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors">
                            <h5 className="text-xs font-bold text-slate-800 truncate mb-1">{m.module}</h5>
                            <p className="text-[10px] font-bold text-slate-400 truncate mb-2">{m.project}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {m.tasks} Tasks
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600">
                                {m.completed} Done
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="bg-brand-teal h-full rounded-full transition-all duration-500" 
                                style={{ width: `${(m.completed / m.tasks) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
