"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar } from "lucide-react";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

export interface WMTaskFormData {
  title: string;
  description: string;
  projectId: string;
  assignedToId: string;
  department?: string;
  phase?: string;
  dueDate: string;
  status: string;
  priority: string;
  moduleName?: string;
  remarks?: string;
  createdDate?: string;
  
  // Graphics fields
  postingDate?: string;
  postingDay?: string;
  reelPost?: string;
  concept?: string;
  reference?: string;
  scriptLink?: string;
  scriptDate?: string;
  shootingLink?: string;
  shootDate?: string;
  editingLink?: string;
  editingDate?: string;
  reviewByTL?: string;
  finalLink?: string;
  postingStatus?: string;
  estimatedHours?: number;
  isBatchDistribution?: boolean;
  distributedTasks?: any[];
}

const defaultFormData: WMTaskFormData = {
  title: "",
  description: "",
  projectId: "",
  assignedToId: "",
  department: "Development",
  phase: "",
  dueDate: new Date().toISOString().split('T')[0],
  status: "todo",
  priority: "medium",
  moduleName: "",
  remarks: "",
  postingDate: "",
  postingDay: "",
  reelPost: "Post",
  concept: "",
  reference: "",
  scriptLink: "",
  scriptDate: "",
  shootingLink: "",
  shootDate: "",
  editingLink: "",
  editingDate: "",
  reviewByTL: "",
  finalLink: "",
  postingStatus: "No",
  estimatedHours: 0,
};

interface WMTaskFormProps {
  initialData?: Partial<WMTaskFormData>;
  onSubmit: (data: WMTaskFormData) => void;
  isSubmitting?: boolean;
  userDepartment?: string;
}

export function WMTaskForm({ initialData, onSubmit, isSubmitting, userDepartment }: WMTaskFormProps) {
  const [formData, setFormData] = useState<WMTaskFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [distributedList, setDistributedList] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      ...defaultFormData,
      dueDate: today,
      ...initialData,
    });
  }, [initialData]);

  const fetchMetadata = async () => {
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`${API_URL}/projects`),
        fetch(`${API_URL}/employees`)
      ]);
      
      if (pRes.ok) setProjects(await pRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
    } catch (err) {
      console.error("Error fetching task metadata:", err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleChange = (field: keyof WMTaskFormData, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate Posting Day if Posting Date changes
      if (field === "postingDate" && value) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const day = days[new Date(value).getDay()];
        newData.postingDay = day;
      }
      
      // Auto-set department when employee is selected
      if (field === "assignedToId" && value) {
        const emp = employees.find(e => e.id === value);
        if (emp && emp.department) {
          newData.department = emp.department;
        }
      }

      // Reset project and assignee if they mismatch the newly selected department
      if (field === "department" && value) {
        const currentProject = projects.find(p => p.id === prev.projectId);
        if (currentProject && currentProject.department?.toLowerCase() !== value.toLowerCase()) {
          newData.projectId = "";
        }
        const currentEmployee = employees.find(e => e.id === prev.assignedToId);
        if (currentEmployee && currentEmployee.department?.toLowerCase() !== value.toLowerCase()) {
          newData.assignedToId = "";
        }
      }

      // Reset module when project or phase changes
      if (field === "projectId" || field === "phase") {
        newData.moduleName = "";
      }
      
      if (field === "moduleName" && value === "none") {
        newData.moduleName = "";
      }
      
      return newData;
    });
  };

  const filteredProjects = formData.department
    ? projects.filter(p => p.department?.toLowerCase() === formData.department?.toLowerCase())
    : projects.filter(p => p.department?.toLowerCase() === "development");

  const filteredEmployees = formData.department
    ? employees.filter(e => e.department?.toLowerCase() === formData.department?.toLowerCase())
    : employees.filter(e => e.department?.toLowerCase() === "development");

  const selectedProject = projects.find(p => p.id === formData.projectId);
  const isGraphicsProject = 
    selectedProject?.department?.toLowerCase() === "creative" || 
    userDepartment?.toLowerCase() === "creative" || 
    formData.department?.toLowerCase() === "creative";

  const projectTeamMembers = React.useMemo(() => {
    if (!selectedProject) return filteredEmployees;
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
    if (ids.size === 0) return filteredEmployees;
    return employees.filter(e => ids.has(e.id));
  }, [selectedProject, filteredEmployees, employees]);

  const handleCalculateDistribution = () => {
    if (!selectedProject || projectTeamMembers.length === 0) {
      toast.error("No team members found for this project");
      return;
    }
    const team = projectTeamMembers;
    const totalHours = formData.estimatedHours || 10;
    
    if (distributedList.length === 0) {
      const hoursPerMember = parseFloat((totalHours / team.length).toFixed(1));
      const newList = team.map((emp, i) => ({
        title: team.length > 1 ? `${formData.title || "Task"} (${emp.firstName})` : (formData.title || "Task"),
        hours: hoursPerMember,
        assignedToId: emp.id
      }));
      setDistributedList(newList);
      toast.success(`Task split and auto-distributed across ${team.length} team members!`);
    } else {
      const allocated: Record<string, number> = {};
      team.forEach(e => allocated[e.id] = 0);
      
      const newList = distributedList.map(row => {
        let lowestEmp = team[0];
        let lowestHrs = Infinity;
        team.forEach(emp => {
          if ((allocated[emp.id] || 0) < lowestHrs) {
            lowestHrs = allocated[emp.id] || 0;
            lowestEmp = emp;
          }
        });
        allocated[lowestEmp.id] = (allocated[lowestEmp.id] || 0) + (row.hours || 0);
        return { ...row, assignedToId: lowestEmp.id };
      });
      setDistributedList(newList);
      toast.success("Workload auto-rebalanced across team!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProject) {
      if (formData.dueDate && selectedProject.endDate && new Date(formData.dueDate) > new Date(selectedProject.endDate)) {
        toast.error("Task deadline cannot exceed Project deadline");
        return;
      }
      if (formData.phase && selectedProject.phases) {
        const selectedPhase = selectedProject.phases.find((p: any) => p.name === formData.phase);
        if (selectedPhase && formData.dueDate && selectedPhase.endDate && new Date(formData.dueDate) > new Date(selectedPhase.endDate)) {
          toast.error("Task deadline cannot exceed Phase deadline");
          return;
        }
      }
    }
    if (formData.department?.toLowerCase() === "development" && distributedList.length > 0) {
      onSubmit({
        ...formData,
        isBatchDistribution: true,
        distributedTasks: distributedList.map(item => ({
          ...formData,
          title: item.title || formData.title,
          estimatedHours: item.hours || 0,
          assignedToId: item.assignedToId || formData.assignedToId
        }))
      });
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      {formData.createdDate && (
        <div className="text-[11px] text-slate-500 font-bold bg-slate-50 border border-slate-100 rounded-lg p-2.5 px-3 inline-flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-brand-teal" />
          <span>TASK CREATED DATE: <span className="text-slate-800 font-extrabold">{formData.createdDate}</span></span>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          placeholder="e.g. Implement User Authentication"
          value={formData.title ?? ""}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Select 
            value={formData.department ?? ""} 
            onValueChange={(v) => handleChange("department", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Development">Development</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select 
            value={formData.projectId ?? ""} 
            onValueChange={(v) => handleChange("projectId", v)}
            disabled={isLoadingMeta}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingMeta ? "Loading..." : "Select Project"} />
            </SelectTrigger>
            <SelectContent>
              {filteredProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedToId">Assign Member</Label>
          <Select 
            value={formData.assignedToId ?? ""} 
            onValueChange={(v) => handleChange("assignedToId", v)}
            disabled={isLoadingMeta}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingMeta ? "Loading..." : "Select Member"} />
            </SelectTrigger>
            <SelectContent>
              {filteredEmployees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(selectedProject?.isPhaseWise || (selectedProject?.modules && selectedProject.modules.length > 0)) && (
        <div className="grid grid-cols-2 gap-4">
          {selectedProject?.isPhaseWise && selectedProject?.phases && selectedProject.phases.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="phase">Project Phase</Label>
              <Select 
                value={formData.phase ?? ""} 
                onValueChange={(v) => handleChange("phase", v)}
              >
                <SelectTrigger className="w-full">
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

          {selectedProject?.modules && selectedProject.modules.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="moduleName">Module Name</Label>
              <Select 
                value={formData.moduleName || "none"} 
                onValueChange={(v) => handleChange("moduleName", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Module</SelectItem>
                  {selectedProject.modules
                    .filter((m: any) => !formData.phase || m.phaseName === formData.phase)
                    .map((m: any) => (
                      <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Task details..."
          value={formData.description ?? ""}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Task Deadline</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate ?? ""}
            onChange={(e) => handleChange("dueDate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Stage</Label>
          <Select 
            value={formData.status ?? ""} 
            onValueChange={(v) => handleChange("status", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Stage" />
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
            value={formData.priority ?? ""} 
            onValueChange={(v) => handleChange("priority", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Priority" />
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

      {formData.department?.toLowerCase() === "development" && (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="estimatedHours" className="text-brand-teal font-extrabold flex items-center gap-1.5 text-xs uppercase">
              ⏱️ Number of Hours (Total / Estimated)
            </Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 12"
              value={formData.estimatedHours || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
              className="font-extrabold border-brand-teal/40 bg-brand-teal/5 text-brand-teal h-9 text-xs max-w-[200px]"
            />
          </div>

          {selectedProject && (
            <div className="p-4 bg-slate-50 border border-brand-teal/30 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase">
                    ⚡ Team Auto-Distribution & Manual Override
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Auto-distribute tasks amongst selected team members for this project ({projectTeamMembers.length} members).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCalculateDistribution}
                    className="h-7 text-xs font-extrabold border-brand-teal text-brand-teal hover:bg-brand-teal/10 shadow-2xs"
                  >
                    🤖 Auto-Distribute Hours
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDistributedList(prev => [...prev, { title: formData.title ? `${formData.title} (Part ${prev.length + 1})` : `Task ${prev.length + 1}`, hours: formData.estimatedHours || 4, assignedToId: projectTeamMembers[prev.length % (projectTeamMembers.length || 1)]?.id || formData.assignedToId || "" }])}
                    className="h-7 text-xs font-bold bg-white text-slate-700 border-slate-200"
                  >
                    + Split / Add Deliverable
                  </Button>
                </div>
              </div>

              {distributedList.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <Label className="text-[10px] uppercase font-extrabold text-slate-500">
                    Distributed Tasks Table (Manual Override Assignee)
                  </Label>
                  <div className="space-y-2">
                    {distributedList.map((dt, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <Input
                          value={dt.title}
                          onChange={(e) => {
                            const arr = [...distributedList];
                            arr[idx].title = e.target.value;
                            setDistributedList(arr);
                          }}
                          placeholder="Task item title"
                          className="h-8 text-xs font-semibold flex-1 min-w-[140px]"
                        />
                        <div className="w-24 flex items-center gap-1 bg-slate-50 border rounded-lg px-2 h-8">
                          <span className="text-[10px] text-slate-400 font-bold">Hrs:</span>
                          <input
                            type="number"
                            step="0.5"
                            value={dt.hours}
                            onChange={(e) => {
                              const arr = [...distributedList];
                              arr[idx].hours = parseFloat(e.target.value) || 0;
                              setDistributedList(arr);
                            }}
                            className="w-full bg-transparent text-xs font-bold outline-none border-none text-brand-teal"
                          />
                        </div>
                        <Select
                          value={dt.assignedToId || ""}
                          onValueChange={(val) => {
                            const arr = [...distributedList];
                            arr[idx].assignedToId = val;
                            setDistributedList(arr);
                          }}
                        >
                          <SelectTrigger className="w-[170px] h-8 text-xs font-extrabold bg-brand-teal/5 border-brand-teal/20 text-brand-teal">
                            <SelectValue placeholder="Assignee (Override)" />
                          </SelectTrigger>
                          <SelectContent>
                            {projectTeamMembers.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setDistributedList(prev => prev.filter((_, i) => i !== idx))}
                          className="h-7 w-7 text-red-500 hover:bg-red-50 shrink-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Input
          id="remarks"
          placeholder="Any additional notes..."
          value={formData.remarks ?? ""}
          onChange={(e) => handleChange("remarks", e.target.value)}
        />
      </div>

      {isGraphicsProject && (
        <div className="space-y-6 border-t pt-6 mt-6">
          <h3 className="text-sm font-medium text-brand-teal uppercase tracking-wider">Creative & Production Details</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Posting Date</Label>
              <Input type="date" value={formData.postingDate ?? ""} onChange={(e) => handleChange("postingDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Posting Day</Label>
              <Input value={formData.postingDay ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Reel/Post</Label>
              <Select value={formData.reelPost ?? ""} onValueChange={(v) => handleChange("reelPost", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Post">Post</SelectItem>
                  <SelectItem value="Reel">Reel</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Concept</Label>
              <Input placeholder="Theme or core idea" value={formData.concept ?? ""} onChange={(e) => handleChange("concept", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input placeholder="Reference link or note" value={formData.reference ?? ""} onChange={(e) => handleChange("reference", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Script Link</Label>
              <Input placeholder="Google Doc / Link" value={formData.scriptLink ?? ""} onChange={(e) => handleChange("scriptLink", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Script Date</Label>
              <Input type="date" value={formData.scriptDate ?? ""} onChange={(e) => handleChange("scriptDate", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shooting Link</Label>
              <Input placeholder="Raw footage link" value={formData.shootingLink ?? ""} onChange={(e) => handleChange("shootingLink", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Shoot Date</Label>
              <Input type="date" value={formData.shootDate ?? ""} onChange={(e) => handleChange("shootDate", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Editing/Post Link</Label>
              <Input placeholder="WIP edit link" value={formData.editingLink ?? ""} onChange={(e) => handleChange("editingLink", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Editing/Post Make Date</Label>
              <Input type="date" value={formData.editingDate ?? ""} onChange={(e) => handleChange("editingDate", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Review By TL</Label>
              <Input placeholder="TL Feedback" value={formData.reviewByTL ?? ""} onChange={(e) => handleChange("reviewByTL", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Final (Video/Post) Link</Label>
              <Input placeholder="Deliverable link" value={formData.finalLink ?? ""} onChange={(e) => handleChange("finalLink", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Posting (Yes/No)</Label>
              <Select value={formData.postingStatus ?? ""} onValueChange={(v) => handleChange("postingStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Task" : "Assign Task"}
        </Button>
      </div>
    </form>
  );
}
