"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Plus, ArrowLeft, ChevronRight, User, Calendar, Filter, Pencil, Trash2, BookOpen, MessageSquare, Send, Eye, SlidersHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from "@/hooks/useUser";
import { useConfirm } from "@/context/ConfirmContext";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new');
    const { Quill } = await import('react-quill-new');
    if (typeof window !== 'undefined') {
      (window as any).Quill = Quill;
      if (!(window as any).__QUILL_MODULES_REGISTERED__) {
        // @ts-ignore
        const ImageResize = (await import('quill-image-resize-module-react')).default;
        Quill.register('modules/imageResize', ImageResize);
        
        const Parchment = Quill.import('parchment');
        const StyleAttributor: any = Parchment.StyleAttributor || (Quill as any).import('attributors/style/align').constructor;
        const BlockScope: any = Parchment.Scope ? Parchment.Scope.BLOCK : 2;

        const LineHeightStyle = new StyleAttributor('lineHeight', 'line-height', {
          scope: BlockScope,
          whitelist: ['0.5', '1.0', '1.15', '1.5', '2.0', '2.5', '3.0']
        });
        Quill.register(LineHeightStyle, true);
        (window as any).__QUILL_MODULES_REGISTERED__ = true;
      }
    }
    return function ForwardedQuill(props: any) {
      return <RQ {...props} />;
    };
  },
  { ssr: false, loading: () => <div className="h-[200px] flex items-center justify-center text-slate-400 font-medium text-xs">Loading editor...</div> }
);
import 'react-quill-new/dist/quill.snow.css';

const quillModules = {
  toolbar: [
    [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'lineHeight': ['0.5', '1.0', '1.15', '1.5', '2.0', '2.5', '3.0'] }],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
  imageResize: {
    parchment: typeof window !== 'undefined' ? (window as any).Quill?.import('parchment') : null,
    modules: ['Resize', 'DisplaySize']
  }
};

export default function ModulesPage() {
  const router = useRouter();
  const { user } = useUser();
  const { confirm } = useConfirm();
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

  // Notebook & Comments State
  const [isEditingNotebook, setIsEditingNotebook] = useState(false);
  const [notebookContent, setNotebookContent] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSavingNotebook, setIsSavingNotebook] = useState(false);

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
      
      if (activePhase && activePhase.endDate) {
        const phaseDate = new Date(activePhase.endDate);
        if (moduleDate > phaseDate) {
          toast.error("Module deadline cannot exceed Phase deadline");
          return;
        }
      } else {
        const referenceDeadlineStr = project.teamDeadline || project.endDate;
        if (referenceDeadlineStr) {
          const projectDate = new Date(referenceDeadlineStr);
          if (moduleDate > projectDate) {
            toast.error(`Module deadline cannot exceed Project ${project.teamDeadline ? 'Team' : 'Client'} deadline`);
            return;
          }
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
        priority: formData.priority,
        researchWork: "",
        comments: []
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

  const openEditModule = (module: any, phase: any) => {
    setSelectedModule({ ...module, phase });
    setEditFormData({
      title: module.name,
      dueDate: module.dueDate || "",
      assignedToId: module.assignedToId || "unassigned",
      stage: module.stage || "todo",
      priority: module.priority || "medium"
    });
    setNotebookContent(module.researchWork || "");
    setIsEditingNotebook(false);
    setNewCommentText("");
    setIsEditMode(true);
    setIsDetailsOpen(true);
  };

  const handleDeleteModule = async (e: React.MouseEvent, module: any) => {
    e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Delete Module",
      message: "Are you sure you want to delete this module? This action cannot be undone.",
      destructive: true,
      confirmText: "Delete"
    });
    if (!isConfirmed) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    setIsSubmitting(true);
    try {
      const updatedModules = (project.modules || []).filter((m: any) => 
        !(m.name === module.name && m.phaseName === module.phaseName)
      );

      const res = await fetch(`${API_URL}/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, modules: updatedModules })
      });

      if (res.ok) {
        toast.success("Module deleted successfully!");
        fetchData();
        if (selectedModule?.name === module.name) setIsDetailsOpen(false);
      } else {
        toast.error("Failed to delete module");
      }
    } catch (err) {
      console.error("Error deleting module:", err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.title.trim() || !selectedModule) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    // Validation
    if (editFormData.dueDate) {
      const moduleDate = new Date(editFormData.dueDate);
      
      if (selectedModule.phase && selectedModule.phase.endDate) {
        const phaseDate = new Date(selectedModule.phase.endDate);
        if (moduleDate > phaseDate) {
          toast.error("Module deadline cannot exceed Phase deadline");
          return;
        }
      } else {
        const referenceDeadlineStr = project.teamDeadline || project.endDate;
        if (referenceDeadlineStr) {
          const projectDate = new Date(referenceDeadlineStr);
          if (moduleDate > projectDate) {
            toast.error(`Module deadline cannot exceed Project ${project.teamDeadline ? 'Team' : 'Client'} deadline`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      const assignee = employees.find(emp => emp.id === editFormData.assignedToId);
      
      const updatedModule = { 
        ...selectedModule,
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

  const handleSaveNotebook = async () => {
    if (!selectedModule || !selectedProjectId) return;
    setIsSavingNotebook(true);
    try {
      const res = await fetch(`${API_URL}/projects/${selectedProjectId}/modules/notebook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleName: selectedModule.name,
          phaseName: selectedModule.phaseName || null,
          researchWork: notebookContent,
          performedBy: user?.id || (user as any)?.employeeId || "Unknown",
          userName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "User"
        })
      });
      if (res.ok) {
        toast.success("Research notebook updated!");
        setSelectedModule((prev: any) => ({ ...prev, researchWork: notebookContent }));
        setIsEditingNotebook(false);
        fetchData();
      } else {
        toast.error("Failed to update notebook");
      }
    } catch (err) {
      console.error("Error updating notebook:", err);
      toast.error("An error occurred");
    } finally {
      setIsSavingNotebook(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedModule || !selectedProjectId) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/projects/${selectedProjectId}/modules/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleName: selectedModule.name,
          phaseName: selectedModule.phaseName || null,
          content: newCommentText.trim(),
          userId: user?.id || (user as any)?.employeeId || "Unknown",
          userName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "User",
          userRole: user?.role || "Employee"
        })
      });
      if (res.ok) {
        toast.success("Comment added!");
        const newCommentObj = {
          id: Date.now().toString(),
          userId: user?.id || (user as any)?.employeeId || "Unknown",
          userName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "User",
          userRole: user?.role || "Employee",
          content: newCommentText.trim(),
          createdAt: "Just now"
        };
        setSelectedModule((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), newCommentObj]
        }));
        setNewCommentText("");
        fetchData();
      } else {
        toast.error("Failed to add comment");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error("An error occurred");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      <PageHeader
        title="Project Modules"
        description="Manage phase-wise modules for all Development projects."
        backButton={
          <Button variant="outline" size="icon" onClick={() => router.back()} className="w-9 h-9 shrink-0" title="Back to Tasks">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex items-center justify-center flex-1 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <p className="text-slate-500 font-medium">No development projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 min-h-0 h-[calc(100vh-160px)]">
          {/* Left Side: Project List */}
          <div className="md:col-span-1 border border-slate-200 rounded-xl bg-white flex flex-col shadow-sm overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-teal" />
                Projects
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
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
            </div>
          </div>

          {/* Right Side: Modules Details */}
          <div className="md:col-span-3 border border-slate-200 rounded-xl bg-slate-50 flex flex-col shadow-sm overflow-hidden h-full">
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

                <div className="flex-1 bg-slate-50/30 overflow-y-auto min-h-0">
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
                              <TableHead className="font-bold text-slate-700 h-12 w-24 text-center">Actions</TableHead>
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
                                    <TableCell colSpan={selectedProject.phases?.length > 0 ? 7 : 6} className="h-24 text-center text-slate-500">
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
                                    className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                                    onClick={() => openEditModule(m, phase || null)}
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
                                  <TableCell className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => openEditModule(m, phase || null)} className="p-1.5 hover:bg-slate-200 rounded-md text-blue-600 transition-colors" title="Edit Module"><Pencil className="w-4 h-4" /></button>
                                      <button onClick={(e) => handleDeleteModule(e, m)} className="p-1.5 hover:bg-red-100 rounded-md text-red-500 transition-colors" title="Delete Module"><Trash2 className="w-4 h-4" /></button>
                                    </div>
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
                </div>
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
                max={activePhase?.endDate || selectedProject?.teamDeadline || selectedProject?.endDate || undefined}
              />
              {activePhase ? (
                <p className="text-xs text-slate-500">Deadline cannot exceed phase deadline: {activePhase.endDate || "N/A"}</p>
              ) : (
                <p className="text-xs text-slate-500">Deadline cannot exceed project deadline: {selectedProject?.teamDeadline || selectedProject?.endDate || "N/A"}</p>
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

      {/* Module Edit & Notebook Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[1050px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-slate-50 border-slate-200 shadow-2xl">
          <div className="p-6 pb-4 bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-brand-teal shrink-0 animate-pulse shadow-xs" />
                  <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">{selectedModule?.name}</DialogTitle>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2 font-medium">
                  <span>Project: <strong className="text-slate-700">{selectedProject?.title}</strong></span>
                  {selectedModule?.phaseName && <span>• Phase: <strong className="text-slate-700">{selectedModule.phaseName}</strong></span>}
                  {selectedModule?.assignedToName && <span>• Assigned to: <strong className="text-slate-700">{selectedModule.assignedToName}</strong></span>}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 capitalize border border-slate-200 shadow-2xs">
                  {selectedModule?.stage || "todo"}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize border shadow-2xs ${
                  selectedModule?.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                  selectedModule?.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  selectedModule?.priority === 'low' ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {selectedModule?.priority || "medium"}
                </span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="notebook" className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 pt-3 bg-white border-b border-slate-200/80 shrink-0">
              <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 h-10 inline-flex">
                <TabsTrigger value="notebook" className="flex items-center gap-2 font-bold text-xs px-4 h-8 rounded-lg data-[state=active]:bg-brand-teal data-[state=active]:text-white data-[state=active]:shadow-sm transition-all cursor-pointer">
                  <BookOpen className="w-3.5 h-3.5" /> Research Notebook
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 font-bold text-xs px-4 h-8 rounded-lg data-[state=active]:bg-brand-teal data-[state=active]:text-white data-[state=active]:shadow-sm transition-all cursor-pointer">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Stage & Details
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="notebook" className="flex-1 min-h-0 p-6 m-0 overflow-hidden focus-visible:outline-none focus-visible:ring-0">
              {(() => {
                const isAssignee = user && selectedModule && (
                  selectedModule.assignedToId === user.id || 
                  selectedModule.assignedToId === (user as any).employeeId
                );
                const isUnassigned = selectedModule && !selectedModule.assignedToId;
                const isAdminOrTL = user && ['admin', 'super admin', 'superadmin', 'team leader'].includes(user.role?.toLowerCase() || '');
                const canEditResearch = Boolean(isAssignee || isUnassigned || isAdminOrTL);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-full min-h-0">
                    {/* Left Side: Research Notebook */}
                    <div className="md:col-span-3 flex flex-col min-h-0 h-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      <div className="p-4 px-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-brand-teal" />
                          <h3 className="font-bold text-sm text-slate-800">Research Work & Notes</h3>
                        </div>
                        {canEditResearch && !isEditingNotebook && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setIsEditingNotebook(true)}
                            className="h-8 text-xs font-bold text-brand-teal border-brand-teal/30 hover:bg-brand-teal/5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 mr-1.5" />
                            {selectedModule?.researchWork ? "Edit Notes" : "Add Notes"}
                          </Button>
                        )}
                        {isEditingNotebook && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { setIsEditingNotebook(false); setNotebookContent(selectedModule?.researchWork || ""); }} className="h-8 text-xs font-semibold text-slate-500 cursor-pointer">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveNotebook} disabled={isSavingNotebook} className="h-8 text-xs font-bold bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm cursor-pointer">
                              {isSavingNotebook && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                              Save Notes
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto p-5 min-h-0 custom-scrollbar relative">
                        {!canEditResearch && (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs mb-4 shadow-2xs">
                            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>You have <strong>view-only access</strong> to this research work. You can collaborate by adding comments on the right.</span>
                          </div>
                        )}

                        {isEditingNotebook ? (
                          <div className="h-full flex flex-col -mx-2">
                            <style>{`
                              .notebook-editor .ql-container { border: none !important; font-family: inherit !important; font-size: 13px !important; }
                              .notebook-editor .ql-toolbar { border: none !important; border-bottom: 1px solid #e2e8f0 !important; background: #f8fafc; border-radius: 8px 8px 0 0; padding: 8px !important; }
                              .notebook-editor .ql-editor { min-height: 280px; padding: 16px !important; line-height: 1.6; }
                            `}</style>
                            <ReactQuill
                              theme="snow"
                              modules={quillModules}
                              value={notebookContent}
                              onChange={setNotebookContent}
                              placeholder="Document your research findings, architectures, reference links, and code snippets here..."
                              className="flex-1 flex flex-col notebook-editor"
                            />
                          </div>
                        ) : selectedModule?.researchWork ? (
                          <div className="ql-container ql-snow border-none !font-sans">
                            <div 
                              className="ql-editor !p-0 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap select-text"
                              dangerouslySetInnerHTML={{ __html: selectedModule.researchWork }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                            <BookOpen className="w-12 h-12 stroke-1 mb-3 opacity-40 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">No Research Work Added</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">Research notes, links, and documentation will appear here once added.</p>
                            {canEditResearch && (
                              <Button 
                                size="sm" 
                                onClick={() => setIsEditingNotebook(true)}
                                className="mt-5 bg-brand-teal hover:bg-brand-teal/90 text-white font-bold text-xs h-9 px-4 shadow-sm cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Start Research Work
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Comments & Feedback */}
                    <div className="md:col-span-2 flex flex-col min-h-0 h-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      <div className="p-4 px-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-brand-teal" />
                          <h3 className="font-bold text-sm text-slate-800">Discussion ({selectedModule?.comments?.length || 0})</h3>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">Visible to team</span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-3 custom-scrollbar bg-slate-50/30">
                        {selectedModule?.comments && selectedModule.comments.length > 0 ? (
                          selectedModule.comments.map((comment: any, idx: number) => (
                            <div key={comment.id || idx} className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs transition-all hover:border-slate-300">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                    {comment.userName ? comment.userName[0] : 'U'}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-800">{comment.userName}</span>
                                    {comment.userRole && (
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/60">
                                        {comment.userRole}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">{comment.createdAt}</span>
                              </div>
                              <p className="text-xs text-slate-700 pl-8 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-400">
                            <MessageSquare className="w-10 h-10 stroke-1 mb-2 opacity-40 text-slate-300" />
                            <p className="text-xs font-semibold text-slate-500">No comments yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Be the first to share feedback on this module.</p>
                          </div>
                        )}
                      </div>

                      <div className="p-3 border-t border-slate-200 bg-white shrink-0">
                        <form onSubmit={handleAddComment} className="flex gap-2">
                          <Input
                            placeholder="Write a comment..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="text-xs h-9 bg-slate-50 border-slate-200 focus-visible:bg-white"
                          />
                          <Button 
                            type="submit" 
                            size="sm" 
                            disabled={!newCommentText.trim() || isSubmittingComment}
                            className="bg-brand-teal hover:bg-brand-teal/90 text-white shrink-0 h-9 w-9 p-0 shadow-2xs cursor-pointer"
                            title="Send Comment"
                          >
                            {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="settings" className="flex-1 min-h-0 p-6 m-0 overflow-y-auto custom-scrollbar">
              <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-base text-slate-800 mb-4 pb-3 border-b border-slate-100">Module Stage & Assignments</h3>
                {selectedModule && (
                  <form onSubmit={handleUpdateModule} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title" className="text-xs font-bold text-slate-700">Module Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="edit-title"
                        placeholder="e.g. User Authentication"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-assignedToId" className="text-xs font-bold text-slate-700">Assign To (Optional)</Label>
                      <Select 
                        value={editFormData.assignedToId} 
                        onValueChange={(val) => setEditFormData(prev => ({ ...prev, assignedToId: val === "unassigned" ? "" : val }))}
                      >
                        <SelectTrigger id="edit-assignedToId" className="text-xs h-9">
                          <SelectValue placeholder="Select Member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id} className="text-xs">
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-stage" className="text-xs font-bold text-slate-700">Stage</Label>
                        <Select 
                          value={editFormData.stage} 
                          onValueChange={(val) => setEditFormData(prev => ({ ...prev, stage: val }))}
                        >
                          <SelectTrigger id="edit-stage" className="text-xs h-9">
                            <SelectValue placeholder="Select Stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo" className="text-xs">To Do</SelectItem>
                            <SelectItem value="in-progress" className="text-xs">In Progress</SelectItem>
                            <SelectItem value="bugs" className="text-xs">Bugs</SelectItem>
                            <SelectItem value="onhold" className="text-xs">On Hold</SelectItem>
                            <SelectItem value="fix-bugs" className="text-xs">Fix Bugs</SelectItem>
                            <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-priority" className="text-xs font-bold text-slate-700">Priority</Label>
                        <Select 
                          value={editFormData.priority} 
                          onValueChange={(val) => setEditFormData(prev => ({ ...prev, priority: val }))}
                        >
                          <SelectTrigger id="edit-priority" className="text-xs h-9">
                            <SelectValue placeholder="Select Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low" className="text-xs">Low</SelectItem>
                            <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                            <SelectItem value="high" className="text-xs">High</SelectItem>
                            <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-dueDate" className="text-xs font-bold text-slate-700">Module Deadline (Optional)</Label>
                      <Input
                        id="edit-dueDate"
                        type="date"
                        value={editFormData.dueDate}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                        max={selectedModule.phase?.endDate || selectedProject?.teamDeadline || selectedProject?.endDate || undefined}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)} className="text-xs font-semibold">
                        Close
                      </Button>
                      <Button type="submit" size="sm" className="bg-brand-teal hover:bg-brand-teal/90 text-white text-xs font-bold shadow-sm" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                        Save Details
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
