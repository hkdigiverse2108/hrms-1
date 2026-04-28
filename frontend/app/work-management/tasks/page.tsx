"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ClipboardList, Plus, Pencil, Trash2, Calendar, User, Loader2, Search, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WMTaskForm, WMTaskFormData } from "@/components/hrms/WMTaskForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/wm-tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: WMTaskFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingTask 
        ? `${API_URL}/wm-tasks/${editingTask.id}` 
        : `${API_URL}/wm-tasks`;
      const method = editingTask ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchTasks();
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
        fetchTasks();
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-50 border-red-100";
      case "high": return "text-orange-600 bg-orange-50 border-orange-100";
      case "medium": return "text-blue-600 bg-blue-50 border-blue-100";
      default: return "text-gray-600 bg-gray-50 border-gray-100";
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.assignedToName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Assign, track and manage daily tasks for your team members."
      >
        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingTask(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
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
      </PageHeader>
      
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks, projects or assignees..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
          <p className="text-muted-foreground font-medium">Loading tasks...</p>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="group hover:shadow-md transition-shadow border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className={`text-[10px] font-bold ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setEditingTask(task);
                      setModalOpen(true);
                    }}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-bold text-base text-foreground leading-snug mb-2 line-clamp-2">
                  {task.title}
                </h3>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Briefcase className="w-4 h-4 text-brand-teal" />
                    <span className="font-medium text-foreground truncate">{task.projectName || "No Project"}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-[10px] font-bold text-brand-teal border border-brand-teal/20">
                        {task.assignedToName?.split(' ').map((n:any) => n[0]).join('') || '?'}
                      </div>
                      <span className="text-[13px] font-medium text-foreground">{task.assignedToName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Due {task.dueDate || "N/A"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl p-20 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center text-brand-teal">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">No Tasks Assigned</h2>
            <p className="text-muted-foreground max-w-md">
              {searchTerm ? `No tasks matching "${searchTerm}"` : "Assign your first task to a team member and start tracking progress."}
            </p>
          </div>
          {!searchTerm && (
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign New Task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
