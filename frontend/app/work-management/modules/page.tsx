"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Plus, ArrowLeft, ChevronRight, User, Calendar, Filter, Pencil, Trash2, BookOpen, MessageSquare, Send, Eye, SlidersHorizontal, Key, Link2, History, Shuffle, GripVertical, CheckSquare } from "lucide-react";
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

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const canManageModule = Boolean(user && (
    ['admin', 'super admin', 'superadmin', 'team leader'].includes(user.role?.toLowerCase() || '') ||
    user.designation?.toLowerCase() === 'team leader' ||
    selectedProject?.teamLeaderId === user.id ||
    projects.some((p: any) => p.teamLeaderId === user.id)
  ));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [availablePresets, setAvailablePresets] = useState<any[]>([]);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);
  const [activePhase, setActivePhase] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    dueDate: "",
    assignedToId: user?.id || "",
    stage: "todo",
    priority: "medium",
    estimatedHours: 0
  });

  // Module Tasks State
  const [newModuleTasks, setNewModuleTasks] = useState<{ title: string; description: string; dueDate?: string | null }[]>([]);
  const [newModuleTaskTitle, setNewModuleTaskTitle] = useState("");
  const [newModuleTaskDueDate, setNewModuleTaskDueDate] = useState<string>("");
  const [moduleTasks, setModuleTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loadingModuleTasks, setLoadingModuleTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskHours, setNewTaskHours] = useState(0);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskHours, setEditTaskHours] = useState(0);
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskAssignee, setEditTaskAssignee] = useState("unassigned");
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);

  // Module Details / Edit State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    dueDate: "",
    assignedToId: "",
    stage: "todo",
    priority: "medium",
    estimatedHours: 0
  });

  // Notebook & Comments State
  const [isEditingNotebook, setIsEditingNotebook] = useState(false);
  const [notebookContent, setNotebookContent] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
   const [isSavingNotebook, setIsSavingNotebook] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [logsOpen, setLogsOpen] = useState(false);
  const [projectLogs, setProjectLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Drag-and-Drop State
  const [draggedModule, setDraggedModule] = useState<{index: number, phaseName: string | null} | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{index: number, phaseName: string | null} | null>(null);

  // Auto-Distribute State
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [memberCapacities, setMemberCapacities] = useState<Record<string, number>>({});

  // Filters State
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  // Inline Editing State
  const [editingCell, setEditingCell] = useState<{moduleName: string, phaseName: string | null, field: string} | null>(null);
  const [quickAddModule, setQuickAddModule] = useState({
    name: "",
    phaseName: "",
    stage: "todo",
    priority: "medium",
    estimatedHours: 0,
    assignedToId: "",
    dueDate: ""
  });

  const handleInlineUpdateModule = async (originalModule: any, field: string, value: any) => {
    if (!selectedProject) return;
    
    const updatedModule = { ...originalModule };
    
    if (field === "assignedToId") {
      const assignee = employees.find(emp => emp.id === value);
      updatedModule.assignedToId = value === "unassigned" ? "" : value;
      updatedModule.assignedToName = assignee ? `${assignee.firstName} ${assignee.lastName}` : null;
    } else if (field === "name") {
      if (!value.trim()) {
        toast.error("Module name cannot be empty");
        return;
      }
      updatedModule.name = value.trim();
    } else {
      updatedModule[field] = value;
    }

    if (field === "dueDate" && value) {
      const moduleDate = new Date(value);
      const phase = selectedProject.phases?.find((p: any) => p.name === updatedModule.phaseName);
      if (phase && phase.endDate) {
        if (moduleDate > new Date(phase.endDate)) {
          toast.error("Module deadline cannot exceed Phase deadline");
          return;
        }
      } else {
        const referenceDeadlineStr = selectedProject.teamDeadline || selectedProject.endDate;
        if (referenceDeadlineStr) {
          if (moduleDate > new Date(referenceDeadlineStr)) {
            toast.error(`Module deadline cannot exceed Project deadline`);
            return;
          }
        }
      }
    }

    const updatedModules = (selectedProject.modules || []).map((m: any) => 
      (m.name === originalModule.name && m.phaseName === originalModule.phaseName) 
        ? updatedModule 
        : m
    );

    try {
      const res = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedProject,
          modules: updatedModules,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        })
      });
      if (res.ok) {
        toast.success("Module updated");
        fetchData();
      } else {
        toast.error("Failed to update module");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating module");
    }
    setEditingCell(null);
  };

  // Drag-and-Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number, phaseName: string | null) => {
    setDraggedModule({ index, phaseName });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // needed for Firefox
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedModule(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number, phaseName: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Only allow drop within the same phase
    if (draggedModule && draggedModule.phaseName === phaseName) {
      setDragOverIndex({ index, phaseName });
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number, phaseName: string | null) => {
    e.preventDefault();
    if (!draggedModule || !selectedProject) return;
    if (draggedModule.phaseName !== phaseName) return;
    if (draggedModule.index === dropIndex) {
      setDraggedModule(null);
      setDragOverIndex(null);
      return;
    }

    const allModules = [...(selectedProject.modules || [])];
    // Get modules for this specific phase in order
    const phaseModules = allModules.filter((m: any) =>
      phaseName === null ? !m.phaseName : m.phaseName === phaseName
    );
    // Get modules NOT in this phase (to preserve them)
    const otherModules = allModules.filter((m: any) =>
      phaseName === null ? !!m.phaseName : m.phaseName !== phaseName
    );

    // Reorder within this phase's modules
    const [movedItem] = phaseModules.splice(draggedModule.index, 1);
    phaseModules.splice(dropIndex, 0, movedItem);

    // Recombine: put phase modules back in their original position relative to other modules
    const reorderedModules = [...otherModules, ...phaseModules];

    try {
      const res = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedProject,
          modules: reorderedModules,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        })
      });
      if (res.ok) {
        toast.success("Module order updated");
        fetchData();
      } else {
        toast.error("Failed to reorder modules");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error reordering modules");
    }

    setDraggedModule(null);
    setDragOverIndex(null);
  };

  const [quickAddInputs, setQuickAddInputs] = useState<Record<string, any>>({});

  const updateQuickAddInput = (phaseKey: string, field: string, value: any) => {
    setQuickAddInputs(prev => ({
      ...prev,
      [phaseKey]: {
        ...(prev[phaseKey] || {}),
        [field]: value
      }
    }));
  };

  const handleQuickAddModule = async (phaseName: string | null) => {
    if (!selectedProject) return;
    const phaseKey = phaseName || "general";
    const input = quickAddInputs[phaseKey] || {};
    
    if (!input.name?.trim()) {
      toast.error("Module name is required");
      return;
    }

    const project = selectedProject;
    if (input.dueDate) {
      const moduleDate = new Date(input.dueDate);
      const phase = project.phases?.find((p: any) => p.name === phaseName);
      if (phase && phase.endDate) {
        if (moduleDate > new Date(phase.endDate)) {
          toast.error("Module deadline cannot exceed Phase deadline");
          return;
        }
      } else {
        const referenceDeadlineStr = project.teamDeadline || project.endDate;
        if (referenceDeadlineStr) {
          if (moduleDate > new Date(referenceDeadlineStr)) {
            toast.error(`Module deadline cannot exceed Project deadline`);
            return;
          }
        }
      }
    }

    const finalAssignedId = input.assignedToId || user?.id || "";
    const assignee = employees.find(emp => emp.id === finalAssignedId);
    const creatorName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || null;
    
    const newModule = {
      name: input.name.trim(),
      phaseName: phaseName || null,
      dueDate: input.dueDate || null,
      assignedToId: finalAssignedId,
      assignedToName: assignee ? `${assignee.firstName} ${assignee.lastName}` : (finalAssignedId === user?.id ? creatorName : null),
      stage: input.stage || "todo",
      priority: input.priority || "medium",
      estimatedHours: input.estimatedHours || 0
    };

    const updatedModules = [...(project.modules || []), newModule];

    try {
      const res = await fetch(`${API_URL}/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...project,
          modules: updatedModules,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        })
      });
      if (res.ok) {
        toast.success("Module added successfully");
        setQuickAddInputs(prev => ({
          ...prev,
          [phaseKey]: {
            name: "",
            stage: "todo",
            priority: "medium",
            estimatedHours: 0,
            assignedToId: "",
            dueDate: ""
          }
        }));
        fetchData();
      } else {
        toast.error("Failed to add module");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error adding module");
    }
  };

  const handleOpenPresetModal = async () => {
    try {
      const res = await fetch(`${API_URL}/task-presets`);
      if (res.ok) {
        const data = await res.json();
        setAvailablePresets(data.filter((p: any) => p.presetType === "normal"));
      }
    } catch (err) {
      console.error(err);
    }
    setPresetModalOpen(true);
  };

  const handleApplyPreset = async (preset: any) => {
    if (!selectedProject || !preset.modules?.length) return;
    setIsApplyingPreset(true);
    try {
      // Deep clone to avoid reference issues
      const modulesToAdd = JSON.parse(JSON.stringify(preset.modules));
      
      // Assign Phase if available
      if (activePhase) {
        modulesToAdd.forEach((m: any) => {
          if (!m.phaseName) m.phaseName = activePhase.name;
        });
      }

      const updatedModules = [...(selectedProject.modules || []), ...modulesToAdd];
      
      const res = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedProject,
          modules: updatedModules,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        })
      });
      
      if (res.ok) {
        toast.success("Preset applied successfully!");
        setPresetModalOpen(false);
        fetchData(); 
      } else {
        toast.error("Failed to apply preset");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error applying preset");
    } finally {
      setIsApplyingPreset(false);
    }
  };

  // Credentials & Links State
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [credFrontendLink, setCredFrontendLink] = useState("");
  const [credIntegrations, setCredIntegrations] = useState<any[]>([]);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  const handleOpenCreds = () => {
    if (!selectedProject) return;
    setCredFrontendLink(selectedProject.frontendLink || "");
    setCredIntegrations(selectedProject.thirdPartyIntegrations || []);
    setCredModalOpen(true);
  };

  const handleSaveCreds = async () => {
    if (!selectedProject) return;
    setIsSavingCreds(true);
    try {
      const res = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedProject,
          frontendLink: credFrontendLink,
          thirdPartyIntegrations: credIntegrations,
          performedBy: user?.id || "Unknown",
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown User"
        })
      });
      if (res.ok) {
        toast.success("Links & Credentials updated successfully!");
        setCredModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to update credentials");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSavingCreds(false);
    }
  };

  useEffect(() => {
    setFilterPhase("all");
    setFilterAssignee("all");
  }, [selectedProjectId]);

  const fetchData = async () => {
    try {
      const [pRes, eRes, tRes] = await Promise.all([
        fetch(`${API_URL}/projects?department=Development`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/wm-tasks`)
      ]);
      
      if (pRes.ok) {
        const data = await pRes.json();
        const devProjects = data.filter((p: any) => p.department === "Development");
        setProjects(devProjects);
        if (devProjects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(devProjects[0].id);
        }
      }
      
      if (eRes.ok) {
        const emps = await eRes.json();
        setEmployees(emps.filter((e: any) => e.department === "Development"));
      }

      if (tRes.ok) {
        const tData = await tRes.json();
        setAllTasks(tData);
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

  useEffect(() => {
    if (user?.id && !formData.assignedToId) {
      setFormData(prev => ({ ...prev, assignedToId: user.id }));
    }
  }, [user]);

  const projectTeamMembers = React.useMemo(() => {
    if (!selectedProject) return [];
    const ids = new Set<string>();
    if (selectedProject.assignedEmployeeId) ids.add(selectedProject.assignedEmployeeId);
    if (Array.isArray(selectedProject.assignedTeamIds)) {
      selectedProject.assignedTeamIds.forEach((id: string) => ids.add(id));
    }
    if (Array.isArray(selectedProject.phases)) {
      selectedProject.phases.forEach((p: any) => {
        if (p.assignedToId) ids.add(p.assignedToId);
        if (Array.isArray(p.assignedToIds)) p.assignedToIds.forEach((id: string) => ids.add(id));
      });
    }
    return employees.filter(e => ids.has(e.id));
  }, [selectedProject, employees]);

  useEffect(() => {
    if (projectTeamMembers.length > 0) {
      setMemberCapacities(prev => {
        const initialCaps: Record<string, number> = { ...prev };
        projectTeamMembers.forEach(m => {
          if (initialCaps[m.id] === undefined) {
            initialCaps[m.id] = 1.0; // default normal capacity
          }
        });
        return initialCaps;
      });
    }
  }, [projectTeamMembers]);

  const fetchModuleTasks = async () => {
    if (!selectedProjectId || !selectedModule) return;
    setLoadingModuleTasks(true);
    try {
      const res = await fetch(`${API_URL}/wm-tasks`);
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((t: any) => 
          t.projectId === selectedProjectId && 
          t.moduleName === selectedModule.name &&
          (t.phase === selectedModule.phaseName || (!t.phase && !selectedModule.phaseName))
        );
        setModuleTasks(filtered);
      }
    } catch (err) {
      console.error("Error fetching module tasks:", err);
    } finally {
      setLoadingModuleTasks(false);
    }
  };

  useEffect(() => {
    if (selectedModule) {
      fetchModuleTasks();
    }
  }, [selectedModule, selectedProjectId]);

  const handleAddModuleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedModule || !selectedProjectId) return;

    if (newTaskDueDate) {
      const taskDate = new Date(newTaskDueDate);
      const refDeadlineStr = selectedModule.dueDate || selectedProject?.endDate;
      if (refDeadlineStr) {
        if (taskDate > new Date(refDeadlineStr)) {
          toast.error(`Task due date cannot exceed ${selectedModule.dueDate ? "Module" : "Project"} deadline (${refDeadlineStr})`);
          return;
        }
      }
    }

    try {
      const task_assignee_id = selectedModule.assignedToId || "";
      const task_assignee_name = selectedModule.assignedToName || "Unassigned";
      
      const payload = {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        projectId: selectedProjectId,
        projectName: selectedProject?.title,
        assignedToId: task_assignee_id,
        assignedToName: task_assignee_name,
        dueDate: newTaskDueDate || selectedModule.dueDate || null,
        moduleName: selectedModule.name,
        moduleDeadline: selectedModule.dueDate || null,
        status: "todo",
        priority: selectedModule.priority || "medium",
        estimatedHours: newTaskHours || 0,
        phase: selectedModule.phaseName || null,
        performedBy: user?.id || "Unknown",
        userName: user?.name || "User"
      };

      const res = await fetch(`${API_URL}/wm-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Task added to module successfully!");
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskHours(0);
        setNewTaskDueDate("");
        fetchModuleTasks();
        fetchData();
      } else {
        toast.error("Failed to add task to module");
      }
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error("An error occurred");
    }
  };

  const handleUpdateTaskStatus = async (task: any, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/wm-tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: newStatus,
          performedBy: user?.id || "Unknown",
          userName: user?.name || "User"
        })
      });

      if (res.ok) {
        toast.success("Task status updated!");
        fetchModuleTasks();
        fetchData();
      } else {
        toast.error("Failed to update task status");
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      toast.error("An error occurred");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const isConfirmed = await confirm({
      title: "Delete Task",
      message: "Are you sure you want to delete this task? This action cannot be undone.",
      destructive: true,
      confirmText: "Delete"
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/wm-tasks/${taskId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success("Task deleted successfully!");
        fetchModuleTasks();
        fetchData();
      } else {
        toast.error("Failed to delete task");
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("An error occurred");
    }
  };

  const openEditTaskModal = (task: any) => {
    setEditingTask(task);
    setEditTaskTitle(task.title || "");
    setEditTaskDesc(task.description || "");
    setEditTaskHours(task.estimatedHours || 0);
    setEditTaskDueDate(task.dueDate || task.moduleDeadline || "");
    setEditTaskAssignee(task.assignedToId || "unassigned");
    setIsEditTaskModalOpen(true);
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim()) return;

    if (editTaskDueDate) {
      const taskDate = new Date(editTaskDueDate);
      const refDeadlineStr = selectedModule?.dueDate || selectedProject?.endDate;
      if (refDeadlineStr) {
        if (taskDate > new Date(refDeadlineStr)) {
          toast.error(`Task due date cannot exceed ${selectedModule?.dueDate ? "Module" : "Project"} deadline (${refDeadlineStr})`);
          return;
        }
      }
    }

    try {
      const finalAssigneeId = editTaskAssignee === "unassigned" ? "" : editTaskAssignee;
      const assigneeEmp = employees.find(emp => emp.id === finalAssigneeId);
      const res = await fetch(`${API_URL}/wm-tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingTask,
          title: editTaskTitle.trim(),
          description: editTaskDesc.trim(),
          estimatedHours: Number(editTaskHours) || 0,
          dueDate: editTaskDueDate || selectedModule?.dueDate || null,
          assignedToId: finalAssigneeId,
          assignedToName: assigneeEmp ? `${assigneeEmp.firstName} ${assigneeEmp.lastName}`.trim() : (finalAssigneeId ? "Assigned" : ""),
          performedBy: user?.id || "Unknown",
          userName: user?.name || "User"
        })
      });

      if (res.ok) {
        toast.success("Task updated successfully!");
        setIsEditTaskModalOpen(false);
        setEditingTask(null);
        fetchModuleTasks();
        fetchData();
      } else {
        toast.error("Failed to update task");
      }
    } catch (err) {
      console.error("Error updating task:", err);
      toast.error("An error occurred while updating task");
    }
  };

  const handleOpenDistributeModal = () => {
    if (!selectedProject || !selectedProject.modules || selectedProject.modules.length === 0) {
      toast.error("No modules to distribute");
      return;
    }
    if (projectTeamMembers.length === 0) {
      toast.error("No team members found for this project");
      return;
    }
    setIsDistributeModalOpen(true);
  };

  const handleAutoDistributeModules = async () => {
    if (!selectedProject || !selectedProject.modules || selectedProject.modules.length === 0) {
      toast.error("No modules to distribute");
      return;
    }
    
    // Filter out team members excluded from distribution (capacity <= 0)
    const activeTeam = projectTeamMembers.filter(member => (memberCapacities[member.id] || 1.0) > 0);
    
    if (activeTeam.length === 0) {
      toast.error("Please select at least one active team member for distribution");
      return;
    }

    // Sort modules by estimatedHours descending (Longest Processing Time first)
    const sortedModules = [...selectedProject.modules].sort((a, b) => {
      const aHrs = a.estimatedHours || 1;
      const bHrs = b.estimatedHours || 1;
      return bHrs - aHrs;
    });

    // Initialize workload tracking
    const workload: Record<string, number> = {};
    activeTeam.forEach(member => {
      workload[member.id] = 0;
    });

    // Greedy assignment considering capacity multipliers:
    // We allocate to the member whose current virtual workload (workload / capacity) is lowest.
    const updatedModules = sortedModules.map(m => {
      let lowestMember = activeTeam[0];
      let lowestVirtualWorkload = Infinity;
      
      activeTeam.forEach(member => {
        const capacity = memberCapacities[member.id] || 1.0;
        const virtualWorkload = workload[member.id] / capacity;
        if (virtualWorkload < lowestVirtualWorkload) {
          lowestVirtualWorkload = virtualWorkload;
          lowestMember = member;
        }
      });

      const weight = m.estimatedHours || 1;
      workload[lowestMember.id] += weight;
      return {
        ...m,
        assignedToId: lowestMember.id,
        assignedToName: `${lowestMember.firstName} ${lowestMember.lastName}`
      };
    });

    try {
      const res = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedProject,
          modules: updatedModules,
          performedBy: user?.id,
          userName: user?.name || `${user?.firstName} ${user?.lastName}`,
        })
      });

      if (res.ok) {
        toast.success("Modules successfully distributed based on user priority!");
        setIsDistributeModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to save distributed modules");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error distributing modules");
    }
  };

  const openAddModal = (phase: any = null) => {
    setActivePhase(phase);
    setFormData({ title: "", dueDate: "", assignedToId: user?.id || "", stage: "todo", priority: "medium", estimatedHours: 0 });
    setNewModuleTasks([]);
    setNewModuleTaskTitle("");
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
      const finalAssignedId = formData.assignedToId || user?.id || "";
      const assignee = employees.find(emp => emp.id === finalAssignedId);
      const creatorName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || null;
      
      const newModule = { 
        name: formData.title.trim(), 
        phaseName: activePhase ? activePhase.name : null,
        dueDate: formData.dueDate,
        assignedToId: finalAssignedId,
        assignedToName: assignee ? `${assignee.firstName} ${assignee.lastName}` : (finalAssignedId === user?.id ? creatorName : null),
        stage: formData.stage,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours || 0,
        researchWork: "",
        comments: [],
        tasks: newModuleTasks
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
      priority: module.priority || "medium",
      estimatedHours: module.estimatedHours || 0
    });
    setNotebookContent(module.researchWork || "");
    setIsEditingNotebook(false);
    setNewCommentText("");
    setNewTaskDueDate("");
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
        priority: editFormData.priority,
        estimatedHours: editFormData.estimatedHours || 0
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
        toast.success("Research note added!");
        const updatedProj = await res.json();
        const updatedModule = updatedProj.modules?.find((m: any) => m.name === selectedModule.name && m.phaseName === selectedModule.phaseName);
        if (updatedModule) {
          setSelectedModule(updatedModule);
        }
        setNotebookContent("");
        setIsEditingNotebook(false);
        fetchData();
      } else {
        toast.error("Failed to add research note");
      }
    } catch (err) {
      console.error("Error adding research note:", err);
      toast.error("An error occurred");
    } finally {
      setIsSavingNotebook(false);
    }
  };

  const handleSaveEditedNote = async (noteId: string) => {
    if (!selectedModule || !selectedProjectId) return;
    setIsSavingNotebook(true);
    try {
      const res = await fetch(`${API_URL}/projects/${selectedProjectId}/modules/notebook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleName: selectedModule.name,
          phaseName: selectedModule.phaseName || null,
          researchWork: editNoteContent,
          performedBy: user?.id || (user as any)?.employeeId || "Unknown",
          userName: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "User",
          noteId: noteId
        })
      });
      if (res.ok) {
        toast.success("Research note updated!");
        const updatedProj = await res.json();
        const updatedModule = updatedProj.modules?.find((m: any) => m.name === selectedModule.name && m.phaseName === selectedModule.phaseName);
        if (updatedModule) {
          setSelectedModule(updatedModule);
        }
        setEditingNoteId(null);
        setEditNoteContent("");
        fetchData();
      } else {
        toast.error("Failed to update research note");
      }
    } catch (err) {
      console.error("Error updating research note:", err);
      toast.error("An error occurred");
    } finally {
      setIsSavingNotebook(false);
    }
  };

  const fetchProjectLogs = async () => {
    if (!selectedProjectId) return;
    setIsLoadingLogs(true);
    setLogsOpen(true);
    try {
      const res = await fetch(`${API_URL}/task-logs?projectId=${selectedProjectId}`);
      if (res.ok) {
        setProjectLogs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching project logs:", err);
    } finally {
      setIsLoadingLogs(false);
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
                    {selectedProject.department?.toLowerCase() === 'development' && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {selectedProject.frontendLink && (
                          <a href={selectedProject.frontendLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-teal/10 text-brand-teal text-xs font-bold hover:bg-brand-teal/20 transition-colors">
                            <Link2 className="w-3.5 h-3.5" /> Frontend URL
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOpenCreds}
                          className="h-7 text-xs font-bold gap-1.5 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        >
                          <Key className="w-3.5 h-3.5 text-brand-teal" /> Integrations & Credentials {(selectedProject.thirdPartyIntegrations?.length || 0) > 0 && `(${selectedProject.thirdPartyIntegrations.length})`}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={fetchProjectLogs}
                          className="h-7 text-xs font-bold gap-1.5 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        >
                          <History className="w-3.5 h-3.5 text-brand-teal" /> View Activity Logs
                        </Button>
                        {canManageModule && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleOpenDistributeModal}
                            className="h-7 text-xs font-bold gap-1.5 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                          >
                            <Shuffle className="w-3.5 h-3.5 text-brand-teal" /> Auto-Distribute Modules
                          </Button>
                        )}
                      </div>
                    )}
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
                        {projectTeamMembers.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    <div className="flex gap-2 items-center">
                    {canManageModule && (
                      <>
                        <Button 
                          onClick={handleOpenPresetModal}
                          variant="outline"
                          className="font-bold h-9 border-brand-teal/30 text-brand-teal hover:bg-brand-teal/5"
                        >
                          <Briefcase className="w-4 h-4 mr-1.5" />
                          Apply Presets
                        </Button>
                        <Button 
                          onClick={() => openAddModal(null)}
                          className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-9"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add Module
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

                <div className="flex-1 bg-slate-50/30 overflow-y-auto min-h-0 custom-scrollbar">
                  {(() => {
                    const phases = selectedProject.phases || [];
                    const modules = selectedProject.modules || [];
                    
                    const renderPhaseTable = (phaseName: string | null, displayName: string) => {
                      const stageOrder: Record<string, number> = {
                        "in_progress": 1,
                        "in-progress": 1,
                        "bugs": 2,
                        "review": 3,
                        "todo": 4,
                        "to_do": 4,
                        "onhold": 5,
                        "on_hold": 5,
                        "completed": 6
                      };

                      const phaseModules = modules.filter((m: any) => {
                        const matchPhase = phaseName === null ? !m.phaseName : m.phaseName === phaseName;
                        const matchAssignee = filterAssignee === "all" || 
                          (filterAssignee === "unassigned" ? !m.assignedToId : m.assignedToId === filterAssignee);
                        return matchPhase && matchAssignee;
                      }).sort((a: any, b: any) => {
                        const stageA = a.stage?.toLowerCase() || "todo";
                        const stageB = b.stage?.toLowerCase() || "todo";
                        const orderA = stageOrder[stageA] || 99;
                        const orderB = stageOrder[stageB] || 99;
                        return orderA - orderB;
                      });

                      // If there are no modules in this phase, and user cannot manage modules, hide the slab
                      if (!canManageModule && phaseModules.length === 0) {
                        return null;
                      }

                      const phaseKey = phaseName || "general";
                      const input = quickAddInputs[phaseKey] || {
                        name: "",
                        stage: "todo",
                        priority: "medium",
                        estimatedHours: 0,
                        assignedToId: "",
                        dueDate: ""
                      };

                      return (
                        <div key={phaseKey} className="p-6 pb-2">
                          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                            <div className="p-4 px-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-brand-teal" />
                                {displayName}
                              </h3>
                              {phaseName && (
                                <span className="text-[10px] font-extrabold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs">
                                  {phases.find((p: any) => p.name === phaseName)?.startDate} to {phases.find((p: any) => p.name === phaseName)?.endDate}
                                </span>
                              )}
                            </div>

                            <Table>
                              <TableHeader className="bg-slate-50/30">
                                <TableRow className="hover:bg-transparent">
                                  {canManageModule && <TableHead className="font-bold text-slate-700 h-10 py-2 w-10"></TableHead>}
                                  <TableHead className="font-bold text-slate-700 h-10 py-2">Module Name</TableHead>
                                  <TableHead className="font-bold text-slate-700 h-10 py-2">Stage</TableHead>
                                  <TableHead className="font-bold text-slate-700 h-10 py-2">Hours</TableHead>
                                  <TableHead className="font-bold text-slate-700 h-10 py-2">Assigned To</TableHead>
                                  <TableHead className="font-bold text-slate-700 h-10 py-2">Due Date</TableHead>
                                  <TableHead className="font-bold text-slate-700 h-10 py-2 w-24 text-center">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {phaseModules.map((m: any, idx: number) => (
                                  <TableRow 
                                    key={idx} 
                                    className={`hover:bg-slate-50/50 transition-colors ${
                                      canManageModule ? 'cursor-default' : ''
                                    } ${
                                      dragOverIndex?.index === idx && dragOverIndex?.phaseName === phaseName && draggedModule?.index !== idx
                                        ? 'border-t-2 !border-t-brand-teal' 
                                        : ''
                                    } ${
                                      draggedModule?.index === idx && draggedModule?.phaseName === phaseName
                                        ? 'opacity-40 bg-slate-100' 
                                        : ''
                                    }`}
                                    draggable={canManageModule}
                                    onDragStart={(e) => canManageModule && handleDragStart(e, idx, phaseName)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => canManageModule && handleDragOver(e, idx, phaseName)}
                                    onDrop={(e) => canManageModule && handleDrop(e, idx, phaseName)}
                                  >
                                    {canManageModule && (
                                      <TableCell className="py-3 w-10 pr-0">
                                        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors">
                                          <GripVertical className="w-4 h-4" />
                                        </div>
                                      </TableCell>
                                    )}
                                    <TableCell className="font-bold text-slate-800 py-3">
                                      {editingCell?.moduleName === m.name && editingCell?.phaseName === m.phaseName && editingCell?.field === "name" ? (
                                        <Input
                                          defaultValue={m.name}
                                          onBlur={(e) => handleInlineUpdateModule(m, "name", e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleInlineUpdateModule(m, "name", (e.target as any).value);
                                          }}
                                          autoFocus
                                          className="h-8 text-xs font-bold"
                                        />
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
                                          <span 
                                            onClick={() => canManageModule && setEditingCell({ moduleName: m.name, phaseName: m.phaseName, field: "name" })}
                                            className={canManageModule ? "cursor-pointer hover:underline" : ""}
                                          >
                                            {m.name}
                                          </span>
                                        </div>
                                      )}
                                    </TableCell>

                                    <TableCell className="py-3">
                                      {editingCell?.moduleName === m.name && editingCell?.phaseName === m.phaseName && editingCell?.field === "stage" ? (
                                        <Select 
                                          defaultValue={m.stage || "todo"} 
                                          onValueChange={(val) => handleInlineUpdateModule(m, "stage", val)}
                                        >
                                          <SelectTrigger className="h-8 text-xs bg-white">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="todo">To Do</SelectItem>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="review">Review</SelectItem>
                                            <SelectItem value="bugs">Bugs</SelectItem>
                                            <SelectItem value="onhold">On Hold</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <div className="flex flex-col gap-1 items-start">
                                          <span 
                                            onClick={() => canManageModule && setEditingCell({ moduleName: m.name, phaseName: m.phaseName, field: "stage" })}
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold capitalize ${
                                              m.stage === "completed" 
                                                ? "bg-green-100 text-green-800 border border-green-200" 
                                                : m.stage === "in_progress" || m.stage === "in-progress"
                                                ? "bg-blue-100 text-blue-800 border border-blue-200" 
                                                : m.stage === "review" || m.stage === "ready for review"
                                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                : m.stage === "bugs"
                                                ? "bg-red-100 text-red-800 border border-red-200"
                                                : m.stage === "onhold"
                                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                                : "bg-slate-100 text-slate-800 border border-slate-200"
                                            } ${canManageModule ? "cursor-pointer hover:opacity-80" : ""}`}
                                          >
                                            {(m.stage || "todo").replace("_", " ")}
                                          </span>
                                          {(() => {
                                            const modTasks = allTasks.filter(t => t.projectId === selectedProjectId && t.moduleName === m.name && (t.phase === m.phaseName || (!t.phase && !m.phaseName)));
                                            if (modTasks.length === 0) return null;
                                            const approvedCount = modTasks.filter(t => t.status === "completed" && t.isApproved).length;
                                            const completedCount = modTasks.filter(t => t.status === "completed").length;
                                            const totalCount = modTasks.length;
                                            return (
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                approvedCount === totalCount ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                completedCount === totalCount ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                                "bg-slate-50 text-slate-600 border border-slate-200"
                                              }`}>
                                                {approvedCount === totalCount ? `✓ ${approvedCount}/${totalCount} Approved` : `${completedCount}/${totalCount} Done`}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </TableCell>



                                    <TableCell className="py-3 font-semibold text-xs text-slate-600">
                                      {editingCell?.moduleName === m.name && editingCell?.phaseName === m.phaseName && editingCell?.field === "estimatedHours" ? (
                                        <Input
                                          type="number"
                                          defaultValue={m.estimatedHours || 0}
                                          onBlur={(e) => handleInlineUpdateModule(m, "estimatedHours", parseFloat(e.target.value) || 0)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleInlineUpdateModule(m, "estimatedHours", parseFloat((e.target as any).value) || 0);
                                          }}
                                          autoFocus
                                          className="h-8 text-xs w-20"
                                        />
                                      ) : (
                                        <span 
                                          onClick={() => canManageModule && setEditingCell({ moduleName: m.name, phaseName: m.phaseName, field: "estimatedHours" })}
                                          className={canManageModule ? "cursor-pointer hover:underline" : ""}
                                        >
                                          {m.estimatedHours ? `${m.estimatedHours} hrs` : "—"}
                                        </span>
                                      )}
                                    </TableCell>

                                    <TableCell className="py-3">
                                      {editingCell?.moduleName === m.name && editingCell?.phaseName === m.phaseName && editingCell?.field === "assignedToId" ? (
                                        <Select 
                                          defaultValue={m.assignedToId || "unassigned"} 
                                          onValueChange={(val) => handleInlineUpdateModule(m, "assignedToId", val)}
                                        >
                                          <SelectTrigger className="h-8 text-xs bg-white w-32">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {projectTeamMembers.map(emp => (
                                              <SelectItem key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <span 
                                          onClick={() => canManageModule && setEditingCell({ moduleName: m.name, phaseName: m.phaseName, field: "assignedToId" })}
                                          className={`text-xs font-bold ${m.assignedToName ? "text-slate-700" : "text-slate-400 italic"} ${canManageModule ? "cursor-pointer hover:underline" : ""}`}
                                        >
                                          {m.assignedToName || "Unassigned"}
                                        </span>
                                      )}
                                    </TableCell>

                                    <TableCell className="py-3 text-xs font-semibold text-slate-600">
                                      {editingCell?.moduleName === m.name && editingCell?.phaseName === m.phaseName && editingCell?.field === "dueDate" ? (
                                        <Input
                                          type="date"
                                          defaultValue={m.dueDate || ""}
                                          onBlur={(e) => handleInlineUpdateModule(m, "dueDate", e.target.value || null)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleInlineUpdateModule(m, "dueDate", (e.target as any).value || null);
                                          }}
                                          autoFocus
                                          className="h-8 text-xs w-32"
                                        />
                                      ) : (
                                        <span 
                                          onClick={() => canManageModule && setEditingCell({ moduleName: m.name, phaseName: m.phaseName, field: "dueDate" })}
                                          className={canManageModule ? "cursor-pointer hover:underline" : ""}
                                        >
                                          {m.dueDate || "Not set"}
                                        </span>
                                      )}
                                    </TableCell>

                                    <TableCell className="py-3 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => openEditModule(m, phases.find((p: any) => p.name === m.phaseName) || null)}
                                          className="w-7 h-7 text-brand-teal hover:bg-brand-teal/10 rounded-md cursor-pointer"
                                          title="Open Notebook"
                                        >
                                          <BookOpen className="w-3.5 h-3.5" />
                                        </Button>
                                        {canManageModule && (
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={(e) => handleDeleteModule(e, m)}
                                            className="w-7 h-7 text-red-500 hover:bg-red-50 rounded-md cursor-pointer"
                                            title="Delete Module"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}

                                {canManageModule && (
                                  <TableRow className="bg-slate-50/10 hover:bg-slate-50/20 border-t border-dashed border-slate-200">
                                    <TableCell className="py-2.5"></TableCell>
                                    <TableCell className="py-2.5">
                                      <Input
                                        placeholder="Add module..."
                                        value={input.name || ""}
                                        onChange={(e) => updateQuickAddInput(phaseKey, "name", e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleQuickAddModule(phaseName);
                                        }}
                                        className="h-8 text-xs font-semibold bg-white"
                                      />
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                      <Select 
                                        value={input.stage || "todo"} 
                                        onValueChange={(val) => updateQuickAddInput(phaseKey, "stage", val)}
                                      >
                                        <SelectTrigger className="h-8 text-xs bg-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="todo">To Do</SelectItem>
                                          <SelectItem value="in_progress">In Progress</SelectItem>
                                          <SelectItem value="review">Review</SelectItem>
                                          <SelectItem value="bugs">Bugs</SelectItem>
                                          <SelectItem value="onhold">On Hold</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                      <Input
                                        type="number"
                                        placeholder="Hrs"
                                        value={input.estimatedHours || ""}
                                        onChange={(e) => updateQuickAddInput(phaseKey, "estimatedHours", parseFloat(e.target.value) || 0)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleQuickAddModule(phaseName);
                                        }}
                                        className="h-8 text-xs font-medium bg-white w-16"
                                      />
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                      <Select 
                                        value={input.assignedToId || "unassigned"} 
                                        onValueChange={(val) => updateQuickAddInput(phaseKey, "assignedToId", val)}
                                      >
                                        <SelectTrigger className="h-8 text-xs bg-white w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unassigned">Unassigned</SelectItem>
                                          {projectTeamMembers.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                              {emp.firstName} {emp.lastName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                      <Input
                                        type="date"
                                        value={input.dueDate || ""}
                                        onChange={(e) => updateQuickAddInput(phaseKey, "dueDate", e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleQuickAddModule(phaseName);
                                        }}
                                        className="h-8 text-xs font-medium bg-white"
                                      />
                                    </TableCell>

                                    <TableCell className="py-2.5 text-center">
                                      <Button
                                        type="button"
                                        onClick={() => handleQuickAddModule(phaseName)}
                                        className="h-8 px-3 bg-brand-teal text-white hover:bg-brand-teal-light text-xs font-bold cursor-pointer"
                                      >
                                        Add
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    };

                    const hasModulesOrPhases = (selectedProject.modules && selectedProject.modules.length > 0) || (phases.length > 0);

                    if (!hasModulesOrPhases) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full py-16">
                          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center max-w-md text-center">
                            <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-700 mb-2">No Modules Found</h3>
                            <p className="text-sm text-slate-500 mb-6">This project does not have any modules set up yet. Get started by adding your first module.</p>
                            <Button 
                              onClick={() => openAddModal(null)}
                              className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold h-11 px-6 cursor-pointer"
                            >
                              <Plus className="w-4 h-4 mr-1.5" /> Add Module
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="pb-8 space-y-2">
                        {/* Render table for each phase */}
                        {phases
                          .filter((p: any) => filterPhase === "all" || p.name === filterPhase)
                          .map((p: any) => renderPhaseTable(p.name, p.name))}
                        
                        {/* Render General/Unassigned modules slab */}
                        {filterPhase === "all" && ((modules.some((m: any) => !m.phaseName) || phases.length === 0)) && 
                          renderPhaseTable(null, "General / Unassigned Modules")
                        }
                      </div>
                    );
                  })()}
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
                  {projectTeamMembers.map(emp => (
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
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="bugs">Bugs</SelectItem>
                    <SelectItem value="onhold">On Hold</SelectItem>
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
              <Label htmlFor="estimatedHours" className="text-brand-teal font-extrabold flex items-center gap-1">
                ⏱️ Estimated Hours
              </Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 8"
                value={formData.estimatedHours || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                className="font-bold text-brand-teal bg-brand-teal/5 border-brand-teal/30"
              />
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

            <div className="space-y-3 p-3 bg-slate-50/50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-brand-teal" /> Tasks within Module
                </Label>
                <span className="text-[10px] text-slate-500 font-medium">{newModuleTasks.length} tasks added</span>
              </div>
              
              {newModuleTasks.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {newModuleTasks.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs">
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-800">{t.title}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 text-slate-400 hover:text-red-500 rounded-md shrink-0"
                        onClick={() => setNewModuleTasks(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Task title..."
                  className="text-xs h-8 bg-white"
                  value={newModuleTaskTitle}
                  onChange={(e) => setNewModuleTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newModuleTaskTitle.trim()) {
                        setNewModuleTasks(prev => [...prev, { title: newModuleTaskTitle.trim(), description: "", dueDate: newModuleTaskDueDate || null }]);
                        setNewModuleTaskTitle("");
                        setNewModuleTaskDueDate("");
                      }
                    }
                  }}
                />
                <div className="w-[130px] shrink-0">
                  <Input
                    type="date"
                    value={newModuleTaskDueDate}
                    onChange={(e) => setNewModuleTaskDueDate(e.target.value)}
                    className="text-xs h-8 bg-white"
                    title="Due Date"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-brand-teal hover:bg-brand-teal/90 text-white h-8 text-xs font-bold shrink-0"
                  onClick={() => {
                    if (newModuleTaskTitle.trim()) {
                      setNewModuleTasks(prev => [...prev, { title: newModuleTaskTitle.trim(), description: "", dueDate: newModuleTaskDueDate || null }]);
                      setNewModuleTaskTitle("");
                      setNewModuleTaskDueDate("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
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

              <div className="flex items-center gap-2 shrink-0 pr-8 sm:pr-10">
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
                <TabsTrigger value="tasks" className="flex items-center gap-2 font-bold text-xs px-4 h-8 rounded-lg data-[state=active]:bg-brand-teal data-[state=active]:text-white data-[state=active]:shadow-sm transition-all cursor-pointer">
                  <CheckSquare className="w-3.5 h-3.5" /> Tasks ({moduleTasks.length})
                </TabsTrigger>
                {canManageModule && (
                  <TabsTrigger value="settings" className="flex items-center gap-2 font-bold text-xs px-4 h-8 rounded-lg data-[state=active]:bg-brand-teal data-[state=active]:text-white data-[state=active]:shadow-sm transition-all cursor-pointer">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Stage & Details
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="notebook" className="flex-1 min-h-0 p-6 m-0 overflow-hidden focus-visible:outline-none focus-visible:ring-0">
              {(() => {
                const canEditResearch = true;

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
                            onClick={() => {
                              setNotebookContent("");
                              setIsEditingNotebook(true);
                            }}
                            className="h-8 text-xs font-bold text-brand-teal border-brand-teal/30 hover:bg-brand-teal/5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 mr-1.5" />
                            Add Note
                          </Button>
                        )}
                        {isEditingNotebook && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { setIsEditingNotebook(false); setNotebookContent(""); }} className="h-8 text-xs font-semibold text-slate-500 cursor-pointer">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveNotebook} disabled={isSavingNotebook} className="h-8 text-xs font-bold bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm cursor-pointer">
                              {isSavingNotebook && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                              Save Note
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto p-5 min-h-0 custom-scrollbar relative">
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
                        ) : (selectedModule?.researchNotes && selectedModule.researchNotes.length > 0) ? (
                          <div className="space-y-4">
                            {selectedModule.researchNotes.map((note: any, idx: number) => {
                              const isOwnNote = user && (note.userId === user.id || note.userId === (user as any).employeeId);
                              return (
                                <div key={note.id || idx} className="p-4 bg-slate-50/40 border border-slate-200 rounded-xl shadow-xs">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                        {note.userName ? note.userName[0] : 'U'}
                                      </div>
                                      <span className="font-bold text-xs text-slate-800">{note.userName}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-slate-400 font-semibold">
                                        {note.createdAt} {note.editedAt && `(Edited ${note.editedAt})`}
                                      </span>
                                      {isOwnNote && editingNoteId !== note.id && (
                                        <button 
                                          onClick={() => {
                                            setEditingNoteId(note.id);
                                            setEditNoteContent(note.content);
                                          }}
                                          className="text-xs font-bold text-brand-teal hover:underline cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {editingNoteId === note.id ? (
                                    <div className="space-y-3 mt-2">
                                      <ReactQuill
                                        theme="snow"
                                        modules={quillModules}
                                        value={editNoteContent}
                                        onChange={setEditNoteContent}
                                        className="bg-white rounded-lg"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)} className="h-7 text-xs font-semibold">
                                          Cancel
                                        </Button>
                                        <Button size="sm" onClick={() => handleSaveEditedNote(note.id)} disabled={isSavingNotebook} className="h-7 text-xs font-bold bg-brand-teal text-white">
                                          {isSavingNotebook && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                          Save
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="ql-container ql-snow border-none !font-sans">
                                      <div 
                                        className="ql-editor !p-0 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap select-text"
                                        dangerouslySetInnerHTML={{ __html: note.content }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : selectedModule?.researchWork ? (
                          <div className="p-4 bg-slate-50/40 border border-slate-200 rounded-xl shadow-xs">
                            <div className="ql-container ql-snow border-none !font-sans">
                              <div 
                                className="ql-editor !p-0 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap select-text"
                                dangerouslySetInnerHTML={{ __html: selectedModule.researchWork }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                            <BookOpen className="w-12 h-12 stroke-1 mb-3 opacity-40 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">No Research Notes Added</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">Research notes, links, and documentation will appear here once added.</p>
                            <Button 
                              size="sm" 
                              onClick={() => setIsEditingNotebook(true)}
                              className="mt-5 bg-brand-teal hover:bg-brand-teal/90 text-white font-bold text-xs h-9 px-4 shadow-sm cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Start Research Notes
                            </Button>
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

            <TabsContent value="tasks" className="flex-1 min-h-0 p-6 m-0 overflow-y-auto custom-scrollbar focus-visible:outline-none focus-visible:ring-0">
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-xs min-h-[300px] flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-brand-teal" /> Module Tasks ({moduleTasks.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full capitalize">
                      Assignee: {selectedModule?.assignedToName || "Unassigned"}
                    </span>
                  </h3>

                  {loadingModuleTasks ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-2" />
                      <p className="text-xs font-medium">Loading tasks...</p>
                    </div>
                  ) : moduleTasks.length > 0 ? (
                    <div className="space-y-3">
                      {moduleTasks.map((task) => (
                        <div key={task.id} className={`p-3 border rounded-xl flex items-start justify-between gap-3 transition-all ${
                          task.status === "completed" 
                            ? "bg-slate-50/50 border-slate-200/60 opacity-75" 
                            : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}>
                          <div className="flex items-start min-w-0">
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold text-slate-800 ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap break-words leading-relaxed font-medium bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                <Select 
                                  value={task.status || "todo"} 
                                  onValueChange={(val) => handleUpdateTaskStatus(task, val)}
                                >
                                  <SelectTrigger className={`h-6 text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider border shadow-2xs w-auto gap-1 cursor-pointer ${
                                    task.status === "completed" 
                                      ? "bg-green-100 text-green-800 border-green-200" 
                                      : task.status === "in_progress" || task.status === "in-progress"
                                      ? "bg-blue-100 text-blue-800 border-blue-200" 
                                      : task.status === "review" || task.status === "ready for review"
                                      ? "bg-amber-100 text-amber-800 border-amber-200"
                                      : task.status === "bugs"
                                      ? "bg-red-100 text-red-800 border-red-200"
                                      : task.status === "onhold"
                                      ? "bg-purple-100 text-purple-800 border-purple-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="review">Review</SelectItem>
                                    <SelectItem value="bugs">Bugs</SelectItem>
                                    <SelectItem value="onhold">On Hold</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>

                                {task.estimatedHours > 0 && (
                                  <span className="text-[10px] font-bold bg-brand-teal/5 text-brand-teal border border-brand-teal/20 px-2 py-0.5 rounded">
                                    ⏱️ {task.estimatedHours} hrs
                                  </span>
                                )}
                                {task.assignedToName && (
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                                    <User className="w-3 h-3" /> {task.assignedToName}
                                  </span>
                                )}
                                {task.dueDate && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
                                    new Date(task.dueDate) < new Date() && task.status !== "completed"
                                      ? "bg-red-50 text-red-600 border-red-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}>
                                    📅 {task.dueDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-md shrink-0 cursor-pointer"
                              onClick={() => openEditTaskModal(task)}
                              title="Edit Task"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-red-500 hover:bg-red-50 rounded-md shrink-0 cursor-pointer"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Delete Task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <CheckSquare className="w-12 h-12 stroke-1 mb-2 opacity-30 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">No tasks in this module</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[250px]">Use the inline add bar below to add your first module task.</p>
                    </div>
                  )}
                </div>

                {/* Inline Add Task Row (like Modules table quick-add) */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <form onSubmit={handleAddModuleTask} className="flex flex-wrap items-center gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 transition-all">
                    <div className="flex-1 min-w-[220px]">
                      <Input
                        placeholder="+ Add new task title... (Press Enter to save)"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="h-8 text-xs font-semibold bg-white border-slate-200 focus:border-brand-teal shadow-2xs"
                      />
                    </div>



                    <div className="w-[140px]">
                      <Input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="h-8 text-xs bg-white border-slate-200 shadow-2xs"
                        title="Due Date (Defaults to module deadline)"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={!newTaskTitle.trim()}
                      className="h-8 px-4 bg-brand-teal hover:bg-brand-teal-light text-white font-bold text-xs shadow-2xs cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Task
                    </Button>
                  </form>
                </div>
              </div>
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
                          {projectTeamMembers.map(emp => (
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
                            <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                            <SelectItem value="review" className="text-xs">Review</SelectItem>
                            <SelectItem value="bugs" className="text-xs">Bugs</SelectItem>
                            <SelectItem value="onhold" className="text-xs">On Hold</SelectItem>
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
                      <Label htmlFor="edit-estimatedHours" className="text-xs font-bold text-brand-teal flex items-center gap-1">
                        ⏱️ Estimated Hours
                      </Label>
                      <Input
                        id="edit-estimatedHours"
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="e.g. 8"
                        value={editFormData.estimatedHours || ""}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                        className="text-xs h-9 font-bold text-brand-teal bg-brand-teal/5 border-brand-teal/30"
                      />
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

      {/* Links & Credentials Dialog */}
      <Dialog open={credModalOpen} onOpenChange={setCredModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Key className="w-5 h-5 text-brand-teal" /> Frontend Link & Third-Party Credentials
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 custom-scrollbar">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Frontend Link</Label>
              <Input
                placeholder="e.g. https://staging.myapp.vercel.app or repo link"
                value={credFrontendLink}
                onChange={(e) => setCredFrontendLink(e.target.value)}
                disabled={!canManageModule}
                className="text-xs h-9 disabled:bg-slate-50 disabled:text-slate-600"
              />
            </div>
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Third-Party Integrations & API Keys</Label>
                {canManageModule && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCredIntegrations(prev => [...prev, { name: "", credentials: "", notes: "" }])}
                    className="h-7 text-xs font-bold border-brand-teal text-brand-teal hover:bg-brand-teal/5"
                  >
                    + Add Integration
                  </Button>
                )}
              </div>
              {credIntegrations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No third-party integrations added yet.</p>
              ) : (
                <div className="space-y-3">
                  {credIntegrations.map((intg, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative shadow-2xs">
                      {canManageModule && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setCredIntegrations(prev => prev.filter((_, i) => i !== idx))}
                          className="h-6 w-6 absolute top-2 right-2 text-red-500 hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-7">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Service / Integration</Label>
                          <Input
                            placeholder="e.g. Stripe API, AWS S3, Firebase"
                            value={intg.name || ""}
                            onChange={(e) => {
                              const arr = [...credIntegrations];
                              arr[idx] = { ...arr[idx], name: e.target.value };
                              setCredIntegrations(arr);
                            }}
                            disabled={!canManageModule}
                            className="h-8 text-xs font-semibold bg-white disabled:bg-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Credentials / Secret Key (Copyable)</Label>
                          <Input
                            placeholder="e.g. sk_live_xxx / API key"
                            value={intg.credentials || ""}
                            onChange={(e) => {
                              const arr = [...credIntegrations];
                              arr[idx] = { ...arr[idx], credentials: e.target.value };
                              setCredIntegrations(arr);
                            }}
                            readOnly={!canManageModule}
                            className="h-8 text-xs font-mono bg-white select-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Purpose / Scope Notes</Label>
                        <Input
                          placeholder="e.g. Payment gateway integration for checkout flow"
                          value={intg.notes || ""}
                          onChange={(e) => {
                            const arr = [...credIntegrations];
                            arr[idx] = { ...arr[idx], notes: e.target.value };
                            setCredIntegrations(arr);
                          }}
                          disabled={!canManageModule}
                          className="h-8 text-xs bg-white disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setCredModalOpen(false)}>Close</Button>
            {canManageModule && (
              <Button size="sm" onClick={handleSaveCreds} disabled={isSavingCreds} className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold">
                {isSavingCreds && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Save Links & Credentials
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 bg-slate-50 border-slate-200 shadow-2xl">
          <div className="p-6 pb-4 bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                  <History className="w-5 h-5 text-brand-teal" />
                  Project Activity Logs
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Historical record of all module and notebook changes for this project.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {isLoadingLogs ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
                <p className="text-sm font-medium">Loading activity history...</p>
              </div>
            ) : projectLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <History className="w-12 h-12 stroke-1 mb-3 opacity-40 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No Activity Logs Found</p>
                <p className="text-xs text-slate-400 mt-1">Activities such as creating modules, updating stages, and adding research notes will be logged here.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {projectLogs.map((log: any) => (
                  <div key={log.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs transition-all hover:border-slate-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-teal/10 text-brand-teal border border-brand-teal/20">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{log.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed">{log.details}</p>
                    <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                      <span>Performed by:</span>
                      <strong className="text-slate-700">{log.userName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
            <Button variant="outline" onClick={() => setLogsOpen(false)} className="font-bold text-xs h-9 px-4 cursor-pointer">
              Close History
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto Distribute Priorities Config Modal */}
      <Dialog open={isDistributeModalOpen} onOpenChange={setIsDistributeModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-brand-teal" />
              Configure Workload Priorities
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set priority/capacity levels for team members. Distribution will assign workload proportionally (e.g. Low gets fewer hours, High gets more hours).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {projectTeamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold text-xs uppercase">
                      {member.firstName ? member.firstName[0] : 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{member.firstName} {member.lastName}</p>
                      <p className="text-[11px] text-slate-500 font-medium capitalize">{member.role}</p>
                    </div>
                  </div>

                  <Select
                    value={String(memberCapacities[member.id] === 0.25 ? "0.25" : Number(memberCapacities[member.id] ?? 1.0).toFixed(1))}
                    onValueChange={(val) => setMemberCapacities(prev => ({ ...prev, [member.id]: parseFloat(val) }))}
                  >
                    <SelectTrigger className="w-[160px] h-9 text-xs bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2.0">High (2.0x Load)</SelectItem>
                      <SelectItem value="1.5">Above Normal (1.5x Load)</SelectItem>
                      <SelectItem value="1.0">Normal (1.0x Load)</SelectItem>
                      <SelectItem value="0.5">Low (0.5x Load)</SelectItem>
                      <SelectItem value="0.25">Least (0.25x Load)</SelectItem>
                      <SelectItem value="0.0">Exclude (No Load)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDistributeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleAutoDistributeModules} className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold">
                Run Distribution
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={isEditTaskModalOpen} onOpenChange={setIsEditTaskModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-brand-teal" />
              Edit Module Task
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update task details, description, hours, and assignee.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditTask} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-title" className="text-xs font-bold text-slate-700">Task Title *</Label>
              <Input
                id="edit-task-title"
                placeholder="e.g. Implement UI components"
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-task-assignee" className="text-xs font-bold text-slate-700">Assign To</Label>
              <Select value={editTaskAssignee} onValueChange={setEditTaskAssignee}>
                <SelectTrigger id="edit-task-assignee" className="text-xs h-9">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-task-desc" className="text-xs font-bold text-slate-700">Description</Label>
              <Textarea
                id="edit-task-desc"
                placeholder="e.g. Needs responsive inputs and validation"
                value={editTaskDesc}
                onChange={(e) => setEditTaskDesc(e.target.value)}
                className="text-xs min-h-[80px] resize-y"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">              <div className="space-y-1.5">
                <Label htmlFor="edit-task-due-date" className="text-xs font-bold text-slate-700 flex items-center gap-1">📅 Due Date</Label>
                <Input
                  id="edit-task-due-date"
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditTaskModalOpen(false)}
                className="text-xs h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold text-xs h-9 px-5 shadow-xs"
                disabled={!editTaskTitle.trim()}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Apply Preset Modal */}
      <Dialog open={presetModalOpen} onOpenChange={setPresetModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Briefcase className="w-5 h-5 text-brand-teal" />
              Apply Module Preset
            </DialogTitle>
          </DialogHeader>

          {activePhase && (
            <div className="mb-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <p><span className="font-semibold text-slate-700">Project:</span> {selectedProject?.title}</p>
              <p><span className="font-semibold text-slate-700">Phase:</span> {activePhase.name} <span className="text-slate-500">({activePhase.startDate} to {activePhase.endDate})</span></p>
            </div>
          )}

          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {availablePresets.length === 0 ? (
              <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 font-medium">No Normal Presets found.</p>
                <p className="text-sm text-slate-400 mt-1">Create one in the Work Management section first.</p>
              </div>
            ) : (
              availablePresets.map((preset) => (
                <div key={preset._id || preset.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-brand-teal/50 transition-colors">
                  <div>
                    <h3 className="font-bold text-slate-800">{preset.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{preset.description || "No description"}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {preset.modules?.length || 0} Modules
                      </span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleApplyPreset(preset)}
                    disabled={isApplyingPreset}
                    size="sm"
                    className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold"
                  >
                    {isApplyingPreset ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
