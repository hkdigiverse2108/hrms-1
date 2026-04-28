"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Briefcase, Plus, Pencil, Trash2, Calendar, Clock, Building2, Loader2, Search, Users, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectForm, ProjectFormData } from "@/components/hrms/ProjectForm";
import { API_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingProject 
        ? `${API_URL}/projects/${editingProject.id}` 
        : `${API_URL}/projects`;
      const method = editingProject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget) || 0
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchProjects();
        setEditingProject(null);
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail || "Failed to save project"}`);
      }
    } catch (err) {
      console.error("Error saving project:", err);
      alert("Failed to connect to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "in-progress": return "warning";
      case "on-hold": return "destructive";
      default: return "secondary";
    }
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage and track all company projects and their progress."
      >
        <Dialog open={modalOpen} onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingProject(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingProject ? "Edit Project Details" : "Create New Project"}
              </DialogTitle>
            </DialogHeader>
            <ProjectForm 
              initialData={editingProject} 
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
            placeholder="Search projects by title, client or department..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-brand-teal animate-spin" />
          <p className="text-muted-foreground font-medium">Loading projects...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="group hover:shadow-md transition-shadow border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <div className="flex gap-2 items-center mb-2">
                      <Badge variant={getStatusColor(project.status)} className="capitalize">
                        {project.status.replace('-', ' ')}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                        {project.department || "No Dept"}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg text-foreground leading-tight">{project.title}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setEditingProject(project);
                      setModalOpen(true);
                    }}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(project.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand-teal border border-brand-teal/10">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold leading-none">Team Leader</p>
                    <p className="font-bold text-foreground leading-tight">{project.teamLeaderName || "Unassigned"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Building2 className="w-4 h-4 text-brand-teal" />
                      {project.clientName || "Unknown Client"}
                    </div>
                    <div className="text-muted-foreground font-mono font-bold">
                      ${project.budget?.toLocaleString() || '0'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Progress</span>
                      <span>{project.status === 'completed' ? '100%' : '25%'}</span>
                    </div>
                    <Progress value={project.status === 'completed' ? 100 : 25} className="h-1.5" />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[12px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {project.startDate}
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${
                      project.priority === 'high' ? 'border-red-200 text-red-600 bg-red-50' : 
                      project.priority === 'medium' ? 'border-amber-200 text-amber-600 bg-amber-50' : 
                      'border-green-200 text-green-600 bg-green-50'
                    }`}>
                      {project.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl p-20 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center text-brand-teal">
            <Briefcase className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">No Projects Found</h2>
            <p className="text-muted-foreground max-w-md">
              {searchTerm ? `No projects matching "${searchTerm}"` : "Start managing your work by creating your first project and linking it to a client."}
            </p>
          </div>
          {!searchTerm && (
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
