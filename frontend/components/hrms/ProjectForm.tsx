"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, X, Check, Search, Link2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export interface ProjectFormData {
  title: string;
  description: string;
  clientId: string;
  leadId?: string;
  department: string;
  teamLeaderId: string;
  startDate: string;
  endDate: string;
  teamDeadline?: string;
  status: string;
  priority: string;
  // Creative fields
  services?: string;
  post?: number;
  reel?: number;
  festivalPost?: string;
  graphicsRequired?: string;
  postRequired?: string;
  reelRequired?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  isPhaseWise?: boolean;
  phases?: Array<{name: string, assignedToId?: string, assignedToIds?: string[], startDate: string, endDate: string}>;
  // Digital Marketing fields
  revenueAssigneeId?: string;
  followerAssigneeId?: string;
  userRemarkAssigneeId?: string;
  clientRemarkAssigneeId?: string;
  // Development fields
  frontendLink?: string;
  thirdPartyIntegrations?: Array<{ name: string; credentials: string; notes?: string }>;
  assignedTeamIds?: string[];
  testingLinks?: Array<{ title: string; url: string; notes?: string }>;
  testingBugs?: Array<{ id: string; title: string; description: string; reportedBy: string; reportedByName: string; date: string; status: "open" | "fixed" }>;
  // Finance and Feedback fields
  assignedFinanceManagerId?: string;
  assignedFinanceManagerName?: string;
  amountReceived?: number;
  projectFeedback?: string;
}

const defaultFormData: ProjectFormData = {
  title: "",
  description: "",
  clientId: "",
  department: "",
  teamLeaderId: "",
  startDate: new Date().toISOString().split('T')[0],
  endDate: "",
  teamDeadline: "",
  status: "planning",
  priority: "medium",
  // Creative fields defaults
  services: "",
  post: 0,
  reel: 0,
  festivalPost: "No",
  graphicsRequired: "No",
  postRequired: "No",
  reelRequired: "No",
  isPhaseWise: false,
  phases: [],
  frontendLink: "",
  thirdPartyIntegrations: [],
  testingLinks: [],
  testingBugs: [],
  assignedFinanceManagerId: "",
  assignedFinanceManagerName: "",
  amountReceived: 0,
  projectFeedback: "",
};

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => void;
  isSubmitting?: boolean;
  isAdmin?: boolean;
  currentUser?: any;
}

function PhaseMemberMultiSelect({ 
  employees, 
  selectedIds, 
  onChange,
}: { 
  employees: any[]; 
  selectedIds: string[]; 
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = employees.filter(emp => {
    const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const toggleEmployee = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedEmployees = employees.filter(e => selectedIds.includes(e.id));

  return (
    <div ref={containerRef} className="relative mt-1">
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selectedEmployees.map(emp => (
            <Badge 
              key={emp.id} 
              variant="outline" 
              className="bg-brand-teal/10 text-brand-teal border-brand-teal/30 text-[10px] py-0 px-1.5 pr-0.5 gap-1 font-medium"
            >
              {emp.firstName} {emp.lastName}
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleEmployee(emp.id); }}
                className="ml-0.5 hover:bg-brand-teal/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          placeholder="Select members..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="bg-white border-slate-200 focus-visible:ring-brand-teal h-8 text-xs"
        />
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-2 text-xs text-slate-500 text-center">No members found</div>
            ) : (
              filtered.map(emp => {
                const isSelected = selectedIds.includes(emp.id);
                return (
                  <div 
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className="flex items-center justify-between p-2 text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    <span>{emp.firstName} {emp.lastName}</span>
                    {isSelected && <Check className="w-3 h-3 text-brand-teal" />}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SingleEmployeeSelectWithSearch({ 
  employees, 
  selectedId, 
  onChange,
  placeholder = "Search employee..."
}: { 
  employees: any[]; 
  selectedId: string; 
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedId);

  // When dropdown is closed, reset search or keep it empty. We actually want to show the selected employee name in the input if not typing
  useEffect(() => {
    if (!isOpen) {
      if (selectedEmployee) {
        setSearch(`${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
      } else {
        setSearch("");
      }
    } else {
      setSearch("");
    }
  }, [isOpen, selectedEmployee]);

  const filtered = employees.filter(emp => {
    const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        className="w-full bg-white border-slate-200 focus-visible:ring-brand-teal text-sm h-10"
      />
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 text-center">No employee found</div>
          ) : (
            filtered.map(emp => {
              const isSelected = selectedId === emp.id;
              return (
                <div 
                  key={emp.id}
                  onClick={() => handleSelect(emp.id)}
                  className="flex items-center justify-between p-2.5 text-sm hover:bg-slate-50 cursor-pointer"
                >
                  <div>
                    <span>{emp.firstName} {emp.lastName}</span>
                    {emp.department && <span className="text-xs text-slate-400 ml-2">({emp.department})</span>}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-teal" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectForm({ initialData, onSubmit, isSubmitting, isAdmin = true, currentUser }: ProjectFormProps) {
  const isTeamLeader = currentUser?.role === "Team Leader" || currentUser?.designation?.toLowerCase() === "team leader";
  const isFinanceManager = initialData?.assignedFinanceManagerId === currentUser?.id;
  const canSeeFinance = isAdmin || isTeamLeader || isFinanceManager;
  
  const [formData, setFormData] = useState<ProjectFormData>({
    ...defaultFormData,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultFormData,
        ...initialData,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [initialData]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Static departments as requested by user earlier
  const departments = ["Development", "Creative", "Digital Marketing"];

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [cRes, eRes] = await Promise.all([
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/employees`)
      ]);
      
      if (cRes.ok) setClients(await cRes.json());
      if (eRes.ok) {
        const allEmployeesData = await eRes.json();
        setAllEmployees(allEmployeesData);
        // Only show employees who have the role of "Team Leader" or "Admin"
        setEmployees(allEmployeesData.filter((emp: any) => emp.role === "Team Leader" || emp.role === "Admin"));
      }
    } catch (err) {
      console.error("Error fetching project metadata:", err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === "department") {
        const isDev = typeof value === "string" && (value.toLowerCase() === "development" || value.toLowerCase().includes("dev"));
        if (isDev && !["in-progress", "on-hold", "completed", "testing"].includes(newData.status as string)) {
          newData.status = "in-progress";
        }
      }
      return newData;
    });
  };

  const handleAddPhase = () => {
    const currentPhases = formData.phases || [];
    handleChange("phases", [...currentPhases, { name: "", assignedToId: "", assignedToIds: [], startDate: "", endDate: "" }]);
  };

  const handlePhaseChange = (index: number, field: string, value: any) => {
    const newPhases = [...(formData.phases || [])];
    newPhases[index] = { ...newPhases[index], [field]: value };
    handleChange("phases", newPhases);
  };

  const handleRemovePhase = (index: number) => {
    const newPhases = [...(formData.phases || [])];
    newPhases.splice(index, 1);
    handleChange("phases", newPhases);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.department === "Development") {

      if (formData.endDate && formData.teamDeadline) {
        if (new Date(formData.teamDeadline) > new Date(formData.endDate)) {
          toast.error("Team Deadline cannot be later than the Client Deadline.");
          return;
        }
      }

      // Validate phase deadlines against team deadline (or client deadline)
      if (formData.isPhaseWise && formData.phases && formData.phases.length > 0) {
        const referenceDeadlineStr = formData.teamDeadline || formData.endDate;
        if (referenceDeadlineStr) {
          const referenceDeadline = new Date(referenceDeadlineStr);
          const deadlineLabel = formData.teamDeadline ? 'Team Deadline' : 'Client Deadline';
          for (let i = 0; i < formData.phases.length; i++) {
            const phase = formData.phases[i];
            if (phase.startDate) {
              const phaseStartDate = new Date(phase.startDate);
              if (phaseStartDate > referenceDeadline) {
                toast.error(`Phase ${i + 1} start date cannot be later than the ${deadlineLabel}.`);
                return;
              }
            }
            if (phase.endDate) {
              const phaseDeadline = new Date(phase.endDate);
              if (phaseDeadline > referenceDeadline) {
                toast.error(`Phase ${i + 1} deadline cannot be later than the ${deadlineLabel}.`);
                return;
              }
            }
          }
        }
      }
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ScrollArea className="max-h-[65vh] pr-4">
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                placeholder="e.g. Website Redesign"
                value={formData.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client</Label>
              <Select 
                value={formData.clientId} 
                onValueChange={(v) => handleChange("clientId", v)}
                disabled={isLoadingMeta}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingMeta ? "Loading..." : "Select Client"} />
                </SelectTrigger>
                <SelectContent>
                  {clients
                    .filter(client => {
                      if (!formData.department) return true;
                      const clientDepts = client.department 
                        ? client.department.split(',').map((d: string) => d.trim()).filter(Boolean) 
                        : ["Development"];
                      return clientDepts.includes(formData.department);
                    })
                    .map((client) => {
                      const displayName = client.companyName || client.name || "Unknown Client";
                      return (
                        <SelectItem key={client.id} value={client.id}>
                          {displayName} {client.name && client.companyName ? `(${client.name})` : ""}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-${formData.department === "Digital Marketing" ? '3' : '2'} gap-4`}>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select 
                value={formData.department} 
                onValueChange={(v) => handleChange("department", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamLeaderId">Team Leader</Label>
              <SingleEmployeeSelectWithSearch 
                employees={allEmployees} 
                selectedId={formData.teamLeaderId}
                onChange={(v) => handleChange("teamLeaderId", v)}
                placeholder={isLoadingMeta ? "Loading..." : "Search Team Leader..."}
              />
            </div>
            {formData.department === "Digital Marketing" && (
              <div className="space-y-2">
                <Label htmlFor="assignedEmployeeId">Assign Employee</Label>
                <Select 
                  value={formData.assignedEmployeeId || ""} 
                  onValueChange={(v) => {
                    const emp = allEmployees.find(e => e.id === v);
                    setFormData((prev) => ({ 
                      ...prev, 
                      assignedEmployeeId: v,
                      assignedEmployeeName: emp ? `${emp.firstName} ${emp.lastName}` : ""
                    }));
                  }}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEmployees
                      .filter(emp => emp.department === "Digital Marketing" || emp.department === "Marketing")
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.role ? `(${emp.role})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.department === "Digital Marketing" && (
              <>
                <div className="space-y-2">
                  <Label>Revenue Assignee</Label>
                  <Select value={formData.revenueAssigneeId || "none"} onValueChange={(v) => handleChange("revenueAssigneeId", v === "none" ? "" : v)}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {allEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.role ? `(${emp.role})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Followers Assignee</Label>
                  <Select value={formData.followerAssigneeId || "none"} onValueChange={(v) => handleChange("followerAssigneeId", v === "none" ? "" : v)}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {allEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.role ? `(${emp.role})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>User Remark Assignee</Label>
                  <Select value={formData.userRemarkAssigneeId || "none"} onValueChange={(v) => handleChange("userRemarkAssigneeId", v === "none" ? "" : v)}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {allEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.role ? `(${emp.role})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Client Remark Assignee</Label>
                  <Select value={formData.clientRemarkAssigneeId || "none"} onValueChange={(v) => handleChange("clientRemarkAssigneeId", v === "none" ? "" : v)}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {allEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} {emp.role ? `(${emp.role})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 p-3 bg-brand-teal/5 border border-brand-teal/20 rounded-xl">
            <Label className="text-xs font-extrabold text-brand-teal flex items-center gap-1.5 uppercase">
              👥 Assigned Project Team Members (Select Multiple Employees)
            </Label>
            <PhaseMemberMultiSelect 
              employees={formData.department ? allEmployees.filter(e => e.department?.toLowerCase().trim() === formData.department?.toLowerCase().trim() || (formData.teamLeaderId && e.id === formData.teamLeaderId)) : allEmployees}
              selectedIds={formData.assignedTeamIds || []}
              onChange={(val) => handleChange("assignedTeamIds", val)}
            />
            <p className="text-[11px] text-slate-500 font-medium">
              Assign multiple employees to this project. They will be included in team task distributions and access controls.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Brief project overview..."
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div className={`grid grid-cols-1 gap-4 ${formData.department === "Development" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate || ""}
            onChange={(e) => handleChange("startDate", e.target.value)}
            required
          />
        </div>
        {(isAdmin || isTeamLeader) && (
          <div className="space-y-2">
            <Label htmlFor="endDate">
              {formData.department === "Development" ? (
                "Client Deadline (Optional)"
              ) : (
                "End Date (Optional)"
              )}
            </Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate || ""}
              onChange={(e) => handleChange("endDate", e.target.value)}
            />
          </div>
        )}
        {formData.department === "Development" && (
          <div className="space-y-2">
            <Label htmlFor="teamDeadline">
              Team Deadline (Optional)
            </Label>
            <Input
              id="teamDeadline"
              type="date"
              value={formData.teamDeadline || ""}
              onChange={(e) => handleChange("teamDeadline", e.target.value)}
              max={formData.endDate || ""}
            />
          </div>
        )}
      </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(v) => handleChange("status", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {formData.department?.toLowerCase() === "development" || formData.department?.toLowerCase().includes("dev") ? (
                <>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  {(formData.status === "testing") && <SelectItem value="testing" disabled>Testing Phase</SelectItem>}
                  <SelectItem value="completed" disabled={!isAdmin && currentUser?.role?.toLowerCase() !== "cto"}>Completed</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  {formData.status === "testing" && <SelectItem value="testing" disabled>Testing Phase</SelectItem>}
                  <SelectItem value="completed" disabled={!isAdmin && currentUser?.role?.toLowerCase() !== "cto"}>Completed</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select 
            value={formData.priority} 
            onValueChange={(v) => handleChange("priority", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {formData.department === "Development" && (
        <div className="space-y-4 pt-4 border-t border-slate-200 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold text-slate-800">Phase Wise Project</Label>
              <p className="text-xs text-slate-500">Assign phase deadlines and team members</p>
            </div>
            <Switch
              checked={formData.isPhaseWise || false}
              onCheckedChange={(checked) => handleChange("isPhaseWise", checked)}
            />
          </div>
          
          {formData.isPhaseWise && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-700">Project Phases & Deadlines</h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddPhase}
                  className="h-8 text-xs bg-brand-teal text-white hover:bg-brand-teal-light hover:text-white border-transparent"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Phase
                </Button>
              </div>
              
              {(formData.phases || []).length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm border rounded-lg bg-slate-50 border-dashed">
                  No phases added yet. Click "Add Phase" to assign deadlines.
                </div>
              ) : (
                <div className="space-y-3">
                  {(formData.phases || []).map((phase, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50/60 shadow-sm">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-bold text-slate-600">Phase Name</Label>
                            <Input 
                              value={phase.name || ""} 
                              onChange={(e) => handlePhaseChange(index, "name", e.target.value)} 
                              placeholder="e.g. Design Phase"
                              className="h-8 text-xs mt-1 bg-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold text-slate-600">Assign To Members</Label>
                            <PhaseMemberMultiSelect 
                              employees={allEmployees.filter(e => formData.department ? (e.department?.toLowerCase().trim() === formData.department.toLowerCase().trim() || (formData.teamLeaderId && e.id === formData.teamLeaderId)) : true)}
                              selectedIds={phase.assignedToIds || (phase.assignedToId ? [phase.assignedToId] : [])}
                              onChange={(val) => handlePhaseChange(index, "assignedToIds", val)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-bold text-slate-600">Start Date</Label>
                            <Input 
                              type="date" 
                              value={phase.startDate || ""} 
                              max={formData.teamDeadline || formData.endDate || undefined}
                              onChange={(e) => handlePhaseChange(index, "startDate", e.target.value)}
                              className="h-8 text-xs mt-1 bg-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-bold text-slate-600">Phase Deadline</Label>
                            <Input 
                              type="date" 
                              value={phase.endDate || ""} 
                              max={formData.teamDeadline || formData.endDate || undefined}
                              onChange={(e) => handlePhaseChange(index, "endDate", e.target.value)}
                              className="h-8 text-xs mt-1 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                      <Button 
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePhase(index)}
                        className="mt-6 h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        title="Remove Phase"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {formData.department === "Creative" && (
        <div className="space-y-4 pt-4 border-t border-slate-200 mt-4">
          <h3 className="text-sm font-semibold text-slate-800">Creative Deliverables</h3>
          
          <div className="space-y-2">
            <Label htmlFor="services">Services Description</Label>
            <Input 
              id="services"
              placeholder="e.g. Social Media Management, SEO, FB Ads"
              value={formData.services || ""}
              onChange={(e) => handleChange("services", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {/* Posts Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <Label className="font-semibold text-slate-700">Standard Posts</Label>
                <Select value={formData.postRequired || "No"} onValueChange={(v) => handleChange("postRequired", v)}>
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.postRequired === "Yes" && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Post Count per Month</Label>
                  <Input 
                    type="number" 
                    value={formData.post || 0} 
                    onChange={(e) => handleChange("post", parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              )}
            </div>

            {/* Reels Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <Label className="font-semibold text-slate-700">Reels / Videos</Label>
                <Select value={formData.reelRequired || "No"} onValueChange={(v) => handleChange("reelRequired", v)}>
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.reelRequired === "Yes" && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Reel Count per Month</Label>
                  <Input 
                    type="number" 
                    value={formData.reel || 0} 
                    onChange={(e) => handleChange("reel", parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Festival Posts Included?</Label>
              <Select value={formData.festivalPost || "No"} onValueChange={(v) => handleChange("festivalPost", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Graphics/Banners Required?</Label>
              <Select value={formData.graphicsRequired || "No"} onValueChange={(v) => handleChange("graphicsRequired", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {formData.department === "Development" && (
        <div className="space-y-4 pt-4 border-t border-slate-200 mt-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-brand-teal" /> Development Links & Third-Party Integrations
          </h3>
          
          <div className="space-y-2">
            <Label htmlFor="frontendLink">Frontend Link</Label>
            <Input 
              id="frontendLink"
              placeholder="e.g. https://staging.myapp.vercel.app or GitHub repo"
              value={formData.frontendLink || ""}
              onChange={(e) => handleChange("frontendLink", e.target.value)}
            />
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-slate-700">Third-Party Integrations & Credentials</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const current = formData.thirdPartyIntegrations || [];
                  handleChange("thirdPartyIntegrations", [...current, { name: "", credentials: "", notes: "" }]);
                }}
                className="h-7 text-xs border-brand-teal text-brand-teal hover:bg-brand-teal/5"
              >
                + Add Integration
              </Button>
            </div>
            {(!formData.thirdPartyIntegrations || formData.thirdPartyIntegrations.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No third-party integrations added yet.</p>
            ) : (
              <div className="space-y-3">
                {formData.thirdPartyIntegrations.map((intg: any, index: number) => (
                  <div key={index} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 relative shadow-2xs">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const updated = (formData.thirdPartyIntegrations || []).filter((_, i) => i !== index);
                        handleChange("thirdPartyIntegrations", updated);
                      }}
                      className="h-6 w-6 absolute top-2 right-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-8">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Service / Tool Name</Label>
                        <Input
                          placeholder="e.g. Stripe API, Firebase, Twilio"
                          value={intg.name || ""}
                          onChange={(e) => {
                            const updated = [...(formData.thirdPartyIntegrations || [])];
                            updated[index] = { ...updated[index], name: e.target.value };
                            handleChange("thirdPartyIntegrations", updated);
                          }}
                          className="h-8 text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Credentials / API Keys</Label>
                        <Input
                          placeholder="e.g. sk_live_xxx / client_id"
                          value={intg.credentials || ""}
                          onChange={(e) => {
                            const updated = [...(formData.thirdPartyIntegrations || [])];
                            updated[index] = { ...updated[index], credentials: e.target.value };
                            handleChange("thirdPartyIntegrations", updated);
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-500">Notes / Scope (Optional)</Label>
                      <Input
                        placeholder="e.g. Used for payment gateway on checkout page"
                        value={intg.notes || ""}
                        onChange={(e) => {
                          const updated = [...(formData.thirdPartyIntegrations || [])];
                          updated[index] = { ...updated[index], notes: e.target.value };
                          handleChange("thirdPartyIntegrations", updated);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {canSeeFinance && (
        <div className="space-y-4 pt-4 border-t border-slate-200 mt-4 bg-slate-50 p-4 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            Finance & Feedback
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assigned Finance Manager</Label>
              <SingleEmployeeSelectWithSearch
                employees={allEmployees}
                selectedId={formData.assignedFinanceManagerId || ""}
                onChange={(id) => {
                  const emp = allEmployees.find(e => e.id === id);
                  handleChange("assignedFinanceManagerId", id);
                  handleChange("assignedFinanceManagerName", emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "");
                }}
                placeholder="Select Finance Manager..."
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Received</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={formData.amountReceived || ""}
                onChange={(e) => handleChange("amountReceived", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Project Feedback / Notes</Label>
              <Input
                placeholder="Feedback or important notes regarding this project..."
                value={formData.projectFeedback || ""}
                onChange={(e) => handleChange("projectFeedback", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

        </div>
      </ScrollArea>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
        <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData && 'id' in initialData ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
