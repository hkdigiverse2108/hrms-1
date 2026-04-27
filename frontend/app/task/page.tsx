"use client";

import React, { useState } from "react";
import { 
  Filter, 
  Plus, 
  X, 
  Calendar as CalendarIcon,
  Flag,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";

// Mock Data
const tasks = [
  {
    id: "T1",
    title: "Finalize offer letters",
    desc: "Review salary details and upload signed copies",
    assignee: "Sarah Jenkins",
    avatar: "/avatars/sarah.jpg",
    status: "In progress",
    priority: "High",
    dueDate: "Today, 4:30 PM",
  },
  {
    id: "T2",
    title: "Collect attendance exceptions",
    desc: "HR needs to confirm missing punch reports",
    assignee: "Mia Clark",
    avatar: "/avatars/mia.jpg",
    status: "Pending",
    priority: "Medium",
    dueDate: "Apr 19, 2026",
  },
  {
    id: "T3",
    title: "Prepare onboarding checklist",
    desc: "Set laptop, documents, and workspace tasks for new joiners",
    assignee: "Aisha Rahman",
    avatar: "/avatars/aisha.jpg",
    status: "To do",
    priority: "High",
    dueDate: "Apr 20, 2026",
  },
  {
    id: "T4",
    title: "Submit monthly policy notes",
    desc: "Send the monthly task summary to leadership",
    assignee: "Sarah Jenkins",
    avatar: "/avatars/sarah.jpg",
    status: "In progress",
    priority: "Medium",
    dueDate: "Apr 21, 2026",
  },
  {
    id: "T5",
    title: "Approve leave balance update",
    desc: "Close request after payroll confirms adjustment",
    assignee: "Jason Reed",
    avatar: "/avatars/jason.jpg",
    status: "Complete",
    priority: "Low",
    dueDate: "Completed",
  },
  {
    id: "T6",
    title: "Arrange interview panel",
    desc: "Confirm availability with finance and product leads",
    assignee: "Elena Torres",
    avatar: "/avatars/elena.jpg",
    status: "Pending",
    priority: "High",
    dueDate: "Apr 22, 2026",
  }
];

// Helper to get status pill style
const getStatusBadge = (status: string) => {
  switch (status) {
    case "In progress": return "bg-brand-light/50 text-brand-teal border-brand-teal/20";
    case "Pending": return "bg-amber-100/50 text-amber-700 border-amber-200";
    case "To do": return "bg-gray-100 text-gray-700 border-gray-200";
    case "Complete": return "bg-emerald-50 text-emerald-600 border-emerald-200";
    default: return "bg-gray-100 text-gray-700";
  }
};

const getStatusDot = (status: string) => {
  switch (status) {
    case "In progress": return "bg-brand-teal";
    case "Pending": return "bg-amber-500";
    case "To do": return "bg-slate-400";
    case "Complete": return "bg-emerald-500";
    default: return "bg-slate-400";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High": return "text-red-500";
    case "Medium": return "text-amber-500";
    case "Low": return "text-slate-500";
    default: return "text-slate-500";
  }
};

export default function TaskManagementPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

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

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Task Management" 
        description="Track and manage all tasks in one simple task page."
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          
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
                        <AvatarImage src="/avatars/sarah.jpg" />
                      </Avatar>
                      Sarah Jenkins
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-pointer ml-0.5" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-md text-xs font-medium text-foreground">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src="/avatars/aisha.jpg" />
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
                  <label className="text-sm font-semibold text-foreground">Task name</label>
                  <Input placeholder="e.g. Finalize offer letters" className="bg-white" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Description</label>
                  <Textarea 
                    placeholder="Add details, instructions, or context..." 
                    className="h-28 resize-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Assignee</label>
                    <Select defaultValue="sarah">
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sarah">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src="/avatars/sarah.jpg" />
                            </Avatar>
                            Sarah Jenkins
                          </div>
                        </SelectItem>
                        <SelectItem value="mia">Mia Clark</SelectItem>
                        <SelectItem value="aisha">Aisha Rahman</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Due date</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9 bg-white" placeholder="Select date" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Status</label>
                    <Select defaultValue="todo">
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inprogress">In progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Priority</label>
                    <Select defaultValue="medium">
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
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
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setCreateModalOpen(false)}>
                  Create task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "To do", count: "18", desc: "New tasks waiting to be picked up and scheduled.", dot: "bg-slate-400" },
          { title: "Pending", count: "09", desc: "Tasks paused for approval, documents, or feedback.", dot: "bg-amber-400" },
          { title: "In progress", count: "14", desc: "Active work items currently being handled this week.", dot: "bg-brand-teal" },
          { title: "Complete task", count: "31", desc: "Completed tasks that have been reviewed and closed.", dot: "bg-emerald-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-sm">{stat.title}</h3>
              <div className={`w-2 h-2 rounded-full ${stat.dot}`}></div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-3">{stat.count}</div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-auto">{stat.desc}</p>
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
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium w-[40%]">Task</th>
                <th className="px-6 py-4 font-medium">Assignee</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Priority</th>
                <th className="px-6 py-4 font-medium">Due date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 whitespace-normal min-w-[250px]">
                    <div className="font-semibold text-foreground mb-1">{task.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{task.desc}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={task.avatar} />
                        <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                          {task.assignee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground text-sm">{task.assignee}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusBadge(task.status)}`}>
                      {task.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`font-semibold text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {task.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
