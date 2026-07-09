"use client";

import { useState, useEffect } from "react";
import { useUserContext } from "@/context/UserContext";
import { API_URL } from "@/lib/config";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, X, PlusCircle, UserPlus, Check, ChevronLeft } from "lucide-react";

export function TaskPresetsView({ onBack }: { onBack?: () => void }) {
  const { user } = useUserContext();
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<"list" | "form">("list");
  const [editingPreset, setEditingPreset] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"intern" | "normal">("intern");

  const [employees, setEmployees] = useState<any[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningPreset, setAssigningPreset] = useState<any>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tasks: [{ title: "", description: "", projectId: "", projectName: "", department: "development", estimatedHours: 0, estimatedMinutes: 0 }],
    modules: [{ name: "", tasks: [{ title: "", description: "", priority: "medium", estimatedHours: 0, status: "todo" }] }]
  });

  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchPresets();
    fetchProjects();
    fetchEmployees();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch(`${API_URL}/task-presets`);
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load presets");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects?status=active`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (preset: any = null) => {
    if (preset) {
      setEditingPreset(preset);
      setFormData({
        name: preset.name,
        description: preset.description || "",
        tasks: preset.tasks?.length ? preset.tasks : [{ title: "", description: "", projectId: "", projectName: "", department: "development", estimatedHours: 0, estimatedMinutes: 0 }],
        modules: preset.modules?.length ? preset.modules : [{ name: "", tasks: [{ title: "", description: "", priority: "medium", estimatedHours: 0, status: "todo" }] }]
      });
    } else {
      setEditingPreset(null);
      setFormData({
        name: "",
        description: "",
        tasks: [{ title: "", description: "", projectId: "", projectName: "", department: "development", estimatedHours: 0, estimatedMinutes: 0 }],
        modules: [{ name: "", tasks: [{ title: "", description: "", priority: "medium", estimatedHours: 0, status: "todo" }] }]
      });
    }
    setViewState("form");
  };

  const savePreset = async () => {
    if (!formData.name.trim()) return toast.error("Preset name is required");
    
    let payload: any = {
      name: formData.name,
      description: formData.description,
      presetType: activeTab,
    };

    if (activeTab === "intern") {
      const validTasks = formData.tasks.filter(t => t.title.trim() !== "");
      if (validTasks.length === 0) return toast.error("At least one valid task is required");
      payload.tasks = validTasks;
      payload.modules = [];
    } else {
      const validModules = formData.modules.filter(m => m.name.trim() !== "").map(m => ({
        ...m,
        tasks: []
      }));
      if (validModules.length === 0) return toast.error("At least one valid module is required");
      payload.modules = validModules;
      payload.tasks = [];
    }

    try {
      const url = editingPreset ? `${API_URL}/task-presets/${editingPreset._id || editingPreset.id}` : `${API_URL}/task-presets`;
      const method = editingPreset ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingPreset ? "Preset updated" : "Preset created");
        setViewState("list");
        fetchPresets();
      } else {
        toast.error("Failed to save preset");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving preset");
    }
  };

  const deletePreset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this preset?")) return;
    try {
      const res = await fetch(`${API_URL}/task-presets/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Preset deleted");
        fetchPresets();
      } else {
        toast.error("Failed to delete preset");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAssignModal = (preset: any) => {
    setAssigningPreset(preset);
    setSelectedEmployeeIds([]);
    setAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (!assigningPreset || selectedEmployeeIds.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }
    setIsAssigning(true);
    try {
      const payload = {
        assignedToIds: selectedEmployeeIds,
        performedBy: user?.id,
        userName: `${user?.firstName} ${user?.lastName}`
      };
      const res = await fetch(`${API_URL}/task-presets/${assigningPreset._id || assigningPreset.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Successfully assigned preset and created ${data.tasks_created} tasks`);
        setAssignModalOpen(false);
        setSelectedEmployeeIds([]);
      } else {
        const err = await res.json();
        toast.error(`Error: ${err.detail || "Failed to assign preset"}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while assigning");
    } finally {
      setIsAssigning(false);
    }
  };

  const addTaskRow = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { title: "", description: "", projectId: "", projectName: "", department: "development", estimatedHours: 0, estimatedMinutes: 0 }]
    });
    setTimeout(() => {
      const inputs = document.querySelectorAll('.task-title-input');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) lastInput.focus();
    }, 10);
  };

  const removeTaskRow = (index: number) => {
    const newTasks = [...formData.tasks];
    newTasks.splice(index, 1);
    setFormData({ ...formData, tasks: newTasks });
  };

  const updateTask = (index: number, field: string, value: any) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setFormData({ ...formData, tasks: newTasks });
  };

  // Module helpers
  const addModuleRow = () => {
    setFormData({
      ...formData,
      modules: [...formData.modules, { name: "", tasks: [{ title: "", description: "", priority: "medium", estimatedHours: 0, status: "todo" }] }]
    });
  };

  const removeModuleRow = (index: number) => {
    const newModules = [...formData.modules];
    newModules.splice(index, 1);
    setFormData({ ...formData, modules: newModules });
  };

  const updateModule = (index: number, field: string, value: any) => {
    const newModules = [...formData.modules];
    newModules[index] = { ...newModules[index], [field]: value };
    setFormData({ ...formData, modules: newModules });
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {viewState === "list" ? (
        <>
        <div className="flex items-center gap-4">
          {onBack && (
            <Button 
              variant="outline" 
              size="icon"
              className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full h-9 w-9 border-slate-200 shrink-0"
              onClick={onBack}
              title="Back to Board"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="bg-white rounded-full border border-slate-200 p-1 flex w-max shadow-sm">
            <button 
              onClick={() => setActiveTab("intern")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === "intern" ? "bg-brand-teal text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              INTERN PRESETS
            </button>
            <button 
              onClick={() => setActiveTab("normal")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${activeTab === "normal" ? "bg-brand-teal text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              NORMAL PRESETS
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-bold">Manage Task Presets</h2>
            <p className="text-sm text-slate-500">Create and manage predefined task bundles for quick assignment.</p>
          </div>
          <Button onClick={() => openModal()} className="bg-brand-teal hover:bg-brand-teal/90 gap-2 font-bold text-white">
            <Plus className="w-4 h-4" /> Create Preset
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Preset Name</TableHead>
                  <TableHead className="font-bold">Description</TableHead>
                  <TableHead className="font-bold text-center">{activeTab === "normal" ? "Modules" : "Tasks"}</TableHead>
                  <TableHead className="font-bold text-center">Total Duration</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presets.filter(p => (p.presetType || "intern") === activeTab).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No presets found. Create one to get started!
                    </TableCell>
                  </TableRow>
                ) : (
                  presets.filter(p => (p.presetType || "intern") === activeTab).map((preset) => (
                    <TableRow key={preset._id || preset.id}>
                      <TableCell className="font-semibold text-slate-900">{preset.name}</TableCell>
                      <TableCell className="text-slate-500">{preset.description || "-"}</TableCell>
                      <TableCell className="text-center">
                        <span className="bg-brand-teal/10 text-brand-teal px-2.5 py-1 rounded-full text-xs font-bold">
                          {activeTab === "normal" ? `${preset.modules?.length || 0} modules` : `${preset.tasks?.length || 0} tasks`}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-slate-600">
                        {(() => {
                          let totalMinutes = 0;
                          if (activeTab === "intern" && preset.tasks) {
                            totalMinutes = preset.tasks.reduce((sum: number, t: any) => sum + (parseFloat(t.estimatedHours || 0) * 60) + parseFloat(t.estimatedMinutes || 0), 0);
                          } else if (activeTab === "normal" && preset.modules) {
                            preset.modules.forEach((mod: any) => {
                              if (mod.tasks) {
                                totalMinutes += mod.tasks.reduce((sum: number, t: any) => sum + (parseFloat(t.estimatedHours || 0) * 60) + parseFloat(t.estimatedMinutes || 0), 0);
                              }
                            });
                          }
                          
                          if (totalMinutes > 0) {
                            const h = Math.floor(totalMinutes / 60);
                            const m = Math.floor(totalMinutes % 60);
                            return (
                              <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-md">
                                {h > 0 ? `${h}h ` : ""}{m > 0 ? `${m}m` : ""}
                              </span>
                            );
                          }
                          return "-";
                        })()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openAssignModal(preset)} title="Assign Preset">
                          <UserPlus className="w-4 h-4 text-brand-teal" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openModal(preset)}>
                          <Edit2 className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deletePreset(preset._id || preset.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        </>
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold">{editingPreset ? "Edit Preset" : "Create Task Preset"}</h2>
            <p className="text-sm text-slate-500">Define a bundle of tasks that can be assigned with one click.</p>
          </div>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preset Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Basic Frontend Onboarding"
                  className="font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="What is this preset for?"
                />
              </div>
            </div>

            {activeTab === "intern" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">Tasks in this Preset</Label>
                  <Button variant="outline" size="sm" onClick={addTaskRow} className="gap-1 font-bold text-brand-teal border-brand-teal/30 hover:bg-brand-teal/5">
                    <PlusCircle className="w-4 h-4" /> Add Task
                  </Button>
                </div>
                
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {formData.tasks.map((task, index) => (
                    <div key={index} className="flex gap-3 items-start bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                      <div className="flex-1">
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-5">
                            <Input 
                              placeholder="Task Title *"
                              value={task.title}
                              onChange={(e) => updateTask(index, "title", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addTaskRow();
                                }
                              }}
                              className="task-title-input font-semibold"
                            />
                          </div>
                          <div className="col-span-4">
                            <Input 
                              placeholder="Task Description (Optional)"
                              value={task.description}
                              onChange={(e) => updateTask(index, "description", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addTaskRow();
                                }
                              }}
                              className="text-xs bg-slate-50"
                            />
                          </div>
                          <div className="col-span-3 flex gap-2">
                            <div className="flex-1 relative">
                              <Input 
                                type="number" 
                                placeholder="0" 
                                value={task.estimatedHours || ""} 
                                onChange={(e) => updateTask(index, "estimatedHours", parseFloat(e.target.value) || 0)} 
                                className="pr-5 text-xs font-semibold" 
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">h</span>
                            </div>
                            <div className="flex-1 relative">
                              <Input 
                                type="number" 
                                placeholder="0" 
                                value={task.estimatedMinutes || ""} 
                                onChange={(e) => updateTask(index, "estimatedMinutes", parseFloat(e.target.value) || 0)} 
                                className="pr-5 text-xs font-semibold" 
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">m</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {formData.tasks.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeTaskRow(index)} className="shrink-0 text-slate-400 hover:text-red-500 mt-1">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">Modules in this Preset</Label>
                  <Button variant="outline" size="sm" onClick={addModuleRow} className="gap-1 font-bold text-brand-teal border-brand-teal/30 hover:bg-brand-teal/5">
                    <PlusCircle className="w-4 h-4" /> Add Module
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.modules.map((module, mIndex) => (
                    <div key={mIndex} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      <div className="flex gap-3 items-start relative group">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs font-semibold text-slate-500">Module Name *</Label>
                          <Input 
                            placeholder="e.g. Phase 1 Setup"
                            value={module.name}
                            onChange={(e) => updateModule(mIndex, "name", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addModuleRow();
                                setTimeout(() => {
                                  const inputs = document.querySelectorAll('input[placeholder="e.g. Phase 1 Setup"]');
                                  if (inputs.length > 0) {
                                    (inputs[inputs.length - 1] as HTMLInputElement).focus();
                                  }
                                }, 50);
                              }
                            }}
                            className="font-bold border-slate-300"
                          />
                        </div>
                        <div className="w-24 space-y-2">
                          <Label className="text-xs font-semibold text-slate-500">Hours</Label>
                          <Input 
                            type="number"
                            placeholder="0"
                            value={module.estimatedHours || ""}
                            onChange={(e) => updateModule(mIndex, "estimatedHours", parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addModuleRow();
                                setTimeout(() => {
                                  const inputs = document.querySelectorAll('input[placeholder="e.g. Phase 1 Setup"]');
                                  if (inputs.length > 0) {
                                    (inputs[inputs.length - 1] as HTMLInputElement).focus();
                                  }
                                }, 50);
                              }
                            }}
                            className="font-bold border-slate-300"
                          />
                        </div>
                        {formData.modules.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeModuleRow(mIndex)} className="shrink-0 text-slate-400 hover:text-red-500 mt-6">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setViewState("list")}>Cancel</Button>
            <Button onClick={savePreset} className="bg-brand-teal hover:bg-brand-teal/90 font-bold text-white">
              {editingPreset ? "Save Changes" : "Create Preset"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Task Preset</DialogTitle>
            <DialogDescription>
              Assign &quot;{assigningPreset?.name}&quot; tasks to {assigningPreset?.presetType === "normal" ? "employees" : "Development Interns"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Select {assigningPreset?.presetType === "normal" ? "Employees" : "Development Interns"}</Label>
              <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                {employees
                  .filter(emp => {
                    if (assigningPreset?.presetType === "normal") return true;
                    const dept = emp.department?.trim().toLowerCase() || "";
                    const pos = emp.position?.trim().toLowerCase() || "";
                    const desig = emp.designation?.trim().toLowerCase() || "";
                    const role = emp.role?.trim().toLowerCase() || "";
                    return dept === 'development' && (pos.includes('intern') || desig.includes('intern') || role.includes('intern'));
                  })
                  .map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.id || emp._id);
                  return (
                    <div 
                      key={emp.id || emp._id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedEmployeeIds(prev => prev.filter(id => id !== (emp.id || emp._id)));
                        } else {
                          setSelectedEmployeeIds(prev => [...prev, (emp.id || emp._id)]);
                        }
                      }}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-brand-teal/10 border border-brand-teal/30' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-brand-teal border-brand-teal text-white' : 'border-slate-300'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {emp.firstName} {emp.lastName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={isAssigning} className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold gap-2">
              {isAssigning && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
