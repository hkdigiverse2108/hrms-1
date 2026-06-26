"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Plus, ArrowLeft, ChevronRight, User, Calendar, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from "@/hooks/useUser";

export default function ModulesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePhase, setActivePhase] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    dueDate: "",
    assignedToId: "",
    stage: "todo",
    priority: "medium"
  });

  // Module Details / Edit State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    dueDate: "",
    assignedToId: "",
    stage: "todo",
    priority: "medium"
  });

  // Filters State
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  useEffect(() => {
    setFilterPhase("all");
    setFilterAssignee("all");
  }, [selectedProjectId]);

  const fetchData = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`${API_URL}/projects?department=Development`),
        fetch(`${API_URL}/employees`)
      ]);
      
      if (pRes.ok) {
        const data = await pRes.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      }
      
      if (eRes.ok) {
        const emps = await eRes.json();
        setEmployees(emps.filter((e: any) => e.department === "Development"));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = (phase: any = null) => {
    setActivePhase(phase);
    setFormData({ title: "", dueDate: "", assignedToId: "", stage: "todo", priority: "medium" });
    setIsModalOpen(true);
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    if (project.phases && project.phases.length > 0 && !activePhase) {
      toast.error("Please select a phase for this module");
      return;
    }

    // Validation: Module deadline should not exceed Phase deadline or Project deadline
    if (formData.dueDate) {
      const moduleDate = new Date(formData.dueDate);
      if (project.endDate) {
        const projectDate = new Date(project.endDate);
        if (moduleDate > projectDate) {
          toast.error("Module deadline cannot exceed Project deadline");
          return;
        }
      }
      if (activePhase && activePhase.endDate) {
        const phaseDate = new Date(activePhase.endDate);
        if (moduleDate > phaseDate) {
          toast.error("Module deadline cannot exceed Phase deadline");
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const assignee = employees.find(emp => emp.id === formData.assignedToId);
      
      const newModule = { 
        name: formData.title.trim(), 
        phaseName: activePhase ? activePhase.name : null,
        dueDate: formData.dueDate,
        assignedToId: formData.assignedToId,
        assignedToName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
        stage: formData.stage,
        priority: formData.priority
      };
      
      const updatedModules = [...(project.modules || []), newModule];

      const res = await fetch(`${API_URL}/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, modules: updatedModules })
      });

      if (res.ok) {
        toast.success("Module added successfully!");
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to add module");
      }
    } catch (err) {
      console.error("Error adding module:", err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModuleDetails = (module: any, phase: any) => {
    setSelectedModule({ ...module, phase });
    setIsEditMode(false);
    setIsDetailsOpen(true);
  };

  const handleEditMode = () => {
    setEditFormData({
      title: selectedModule.name,
      dueDate: selectedModule.dueDate || "",
      assignedToId: selectedModule.assignedToId || "unassigned",
      stage: selectedModule.stage || "todo",
      priority: selectedModule.priority || "medium"
    });
    setIsEditMode(true);
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.title.trim() || !selectedModule) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    // Validation
    if (editFormData.dueDate) {
      const moduleDate = new Date(editFormData.dueDate);
      if (project.endDate) {
        const projectDate = new Date(project.endDate);
        if (moduleDate > projectDate) {
          toast.error("Module deadline cannot exceed Project deadline");
          return;
        }
      }
      if (selectedModule.phase && selectedModule.phase.endDate) {
        const phaseDate = new Date(selectedModule.phase.endDate);
        if (moduleDate > phaseDate) {
          toast.error("Module deadline cannot exceed Phase deadline");
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const assignee = employees.find(emp => emp.id === editFormData.assignedToId);
      
      const updatedModule = { 
        name: editFormData.title.trim(), 
        phaseName: selectedModule.phase ? selectedModule.phase.name : null,
        dueDate: editFormData.dueDate,
        assignedToId: editFormData.assignedToId === "unassigned" ? "" : editFormData.assignedToId,
        assignedToName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
        stage: editFormData.stage,
        priority: editFormData.priority
      };
      
      const updatedModules = (project.modules || []).map((m: any) => 
        (m.name === selectedModule.name && m.phaseName === (selectedModule.phase?.name || null)) 
          ? updatedModule 
          : m
      );

      const res = await fetch(`${API_URL}/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, modules: updatedModules })
      });

      if (res.ok) {
        toast.success("Module updated successfully!");
        setIsDetailsOpen(false);
        fetchData();
      } else {
        toast.error("Failed to update module");
      }
    } catch (err) {
      console.error("Error updating module:", err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      <PageHeader
        title="Project Modules"
        description="Manage phase-wise modules for all Development projects."
      >
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex items-center justify-center flex-1 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <p className="text-slate-500 font-medium">No development projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Left Side: Project List */}
          <div className="md:col-span-1 border border-slate-200 rounded-xl bg-white flex flex-col shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-teal" />
                Projects
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {projects.map(project => {
                  const isSelected = project.id === selectedProjectId;
                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between transition-all ${
                        isSelected 
                          ? "bg-brand-teal text-white shadow-sm" 
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className={`font-semibold text-sm truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                          {project.title}
                        </div>
                        <div className={`text-xs truncate mt-0.5 ${isSelected ? "text-teal-100" : "text-slate-500"}`}>
                          {project.clientName}
                        </div>
                      </div>
                      {isSelected && <ChevronRight className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right Side: Modules Details */}
          <div className="md:col-span-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col shadow-sm overflow-hidden">
            {selectedProject ? (
              <>
                <div className="p-5 border-b border-slate-200 bg-white flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedProject.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">{selectedProject.clientName} • {selectedProject.department}</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 mr-1">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">Filters:</span>
                    </div>
                    
                    {selectedProject?.phases?.length > 0 && (
                      <Select value={filterPhase} onValueChange={setFilterPhase}>
                        <SelectTrigger className="w-[160px] h-9 text-sm bg-white border-slate-200">
                          <SelectValue placeholder="All Phases" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Phases</SelectItem>
                          {selectedProject.phases.map((p: any) => (
                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                      <SelectTrigger className="w-[160px] h-9 text-sm bg-white border-slate-200">
                        <SelectValue placeholder="All Assignees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    <Button 
                      onClick={() => openAddModal(null)}
                      className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-9"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Module
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 bg-slate-50/30">
                  {(selectedProject.modules && selectedProject.modules.length > 0) ? (
                    <div className="p-6 pt-4">
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <Table>
                          <TableHeader className="bg-slate-50/80">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="font-bold text-slate-700 h-12">Module Name</TableHead>
                              {selectedProject.phases?.length > 0 && (
                                <TableHead className="font-bold text-slate-700 h-12">Phase</TableHead>
                              )}
                              <TableHead className="font-bold text-slate-700 h-12">Stage</TableHead>
                              <TableHead className="font-bold text-slate-700 h-12">Priority</TableHead>
                              <TableHead className="font-bold text-slate-700 h-12">Assigned To</TableHead>
                              <TableHead className="font-bold text-slate-700 h-12">Due Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const filteredModules = selectedProject.modules.filter((m: any) => {
                                const matchPhase = filterPhase === "all" || m.phaseName === filterPhase;
                                const matchAssignee = filterAssignee === "all" || 
                                  (filterAssignee === "unassigned" ? !m.assignedToId : m.assignedToId === filterAssignee);
                                return matchPhase && matchAssignee;
                              });

                              if (filteredModules.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={selectedProject.phases?.length > 0 ? 6 : 5} className="h-24 text-center text-slate-500">
                                      No modules match the selected filters.
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              return filteredModules.map((m: any, i: number) => {
                                const phase = selectedProject.phases?.find((p: any) => p.name === m.phaseName);
                                return (
                                  <TableRow 
                                    key={i}
                                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                                    onClick={() => openModuleDetails(m, phase || null)}
                                  >
                                    <TableCell className="font-semibold text-slate-800 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
                                      {m.name}
                                    </div>
                                  </TableCell>
                                  {selectedProject.phases?.length > 0 && (
                                    <TableCell className="text-slate-600 font-medium py-3">{m.phaseName || "—"}</TableCell>
                                  )}
                                  <TableCell className="py-3">
                                    <span className="capitalize text-[11px] font-bold tracking-wide bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                                      {m.stage || "To Do"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <span className={`capitalize text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-md border ${
                                      m.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                                      m.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                      m.priority === 'low' ? 'bg-green-50 text-green-700 border-green-200' :
                                      'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                      {m.priority || "Medium"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-slate-600 py-3">
                                    {m.assignedToName ? (
                                      <div className="flex items-center gap-1.5 text-sm font-medium"><User className="w-3.5 h-3.5 text-slate-400" /> {m.assignedToName}</div>
                                    ) : (
                                      <span className="text-slate-400 text-sm italic">Unassigned</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-slate-600 py-3">
                                    {m.dueDate ? (
                                      <div className="flex items-center gap-1.5 text-sm font-medium"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {m.dueDate}</div>
                                    ) : (
                                      <span className="text-slate-400 text-sm italic">Not set</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                                )
                              });
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16">
                      <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center max-w-md text-center">
                        <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No Modules Found</h3>
                        <p className="text-sm text-slate-500 mb-6">This project does not have any modules set up yet. Get started by adding your first module.</p>
                        <Button 
                          onClick={() => openAddModal(null)}
                          className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-11 px-6"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Add First Module
                        </Button>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500 font-medium">Select a project from the left to view modules</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-brand-teal" />
              Assign New Module
            </DialogTitle>
          </DialogHeader>

          {activePhase && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <p><span className="font-semibold text-slate-700">Project:</span> {selectedProject?.title}</p>
              <p><span className="font-semibold text-slate-700">Phase:</span> {activePhase.name} <span className="text-slate-500">({activePhase.startDate} to {activePhase.endDate})</span></p>
            </div>
          )}
          {!activePhase && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <p><span className="font-semibold text-slate-700">Project:</span> {selectedProject?.title}</p>
            </div>
          )}

          <form onSubmit={handleAddModule} className="space-y-4 mt-4">
            {selectedProject?.phases?.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="phaseName">Phase <span className="text-red-500">*</span></Label>
                <Select 
                  value={activePhase?.name || ""} 
                  onValueChange={(val) => {
                    const phase = selectedProject.phases.find((p: any) => p.name === val);
                    setActivePhase(phase);
                  }}
                >
                  <SelectTrigger id="phaseName">
                    <SelectValue placeholder="Select Phase" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProject.phases.map((p: any) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Module Name <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="e.g. User Authentication"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedToId">Assign To (Optional)</Label>
              <Select 
                value={formData.assignedToId} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, assignedToId: val === "unassigned" ? "" : val }))}
              >
                <SelectTrigger id="assignedToId">
                  <SelectValue placeholder="Select Member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select 
                  value={formData.stage} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, stage: val }))}
                >
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="bugs">Bugs</SelectItem>
                    <SelectItem value="onhold">On Hold</SelectItem>
                    <SelectItem value="fix-bugs">Fix Bugs</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select Priority" />
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

            <div className="space-y-2">
              <Label htmlFor="dueDate">Module Deadline (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                max={activePhase?.endDate || selectedProject?.endDate || undefined}
              />
              {activePhase ? (
                <p className="text-xs text-slate-500">Deadline cannot exceed phase deadline: {activePhase.endDate || "N/A"}</p>
              ) : (
                <p className="text-xs text-slate-500">Deadline cannot exceed project deadline: {selectedProject?.endDate || "N/A"}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Module
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Module Details & Edit Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-[450px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isEditMode ? "Edit Module" : "Module Details"}
            </SheetTitle>
            <SheetDescription>
              {selectedModule?.phase ? `${selectedModule.phase.name} Phase` : 'General Module'}
            </SheetDescription>
          </SheetHeader>

          {selectedModule && !isEditMode && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedModule.name}</h3>
                <p className="text-sm text-slate-500">Project: {selectedProject?.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-medium uppercase">Stage</span>
                  <p className="text-sm font-semibold capitalize">{selectedModule.stage || 'To Do'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-medium uppercase">Priority</span>
                  <p className="text-sm font-semibold capitalize">{selectedModule.priority || 'Medium'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-medium uppercase">Due Date</span>
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {selectedModule.dueDate || 'Not set'}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-medium uppercase">Assigned To</span>
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <User className="w-4 h-4 text-slate-400" />
                    {selectedModule.assignedToName || 'Unassigned'}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-3">
                <Button className="flex-1 bg-brand-teal hover:bg-brand-teal-light text-white" onClick={handleEditMode}>
                  Edit Module
                </Button>
              </div>
            </div>
          )}

          {selectedModule && isEditMode && (
            <form onSubmit={handleUpdateModule} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Module Name <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-title"
                  placeholder="e.g. User Authentication"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-assignedToId">Assign To (Optional)</Label>
                <Select 
                  value={editFormData.assignedToId} 
                  onValueChange={(val) => setEditFormData(prev => ({ ...prev, assignedToId: val === "unassigned" ? "" : val }))}
                >
                  <SelectTrigger id="edit-assignedToId">
                    <SelectValue placeholder="Select Member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-stage">Stage</Label>
                  <Select 
                    value={editFormData.stage} 
                    onValueChange={(val) => setEditFormData(prev => ({ ...prev, stage: val }))}
                  >
                    <SelectTrigger id="edit-stage">
                      <SelectValue placeholder="Select Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="bugs">Bugs</SelectItem>
                      <SelectItem value="onhold">On Hold</SelectItem>
                      <SelectItem value="fix-bugs">Fix Bugs</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select 
                    value={editFormData.priority} 
                    onValueChange={(val) => setEditFormData(prev => ({ ...prev, priority: val }))}
                  >
                    <SelectTrigger id="edit-priority">
                      <SelectValue placeholder="Select Priority" />
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

              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Module Deadline (Optional)</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  max={selectedModule.phase?.endDate || selectedProject?.endDate || undefined}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
