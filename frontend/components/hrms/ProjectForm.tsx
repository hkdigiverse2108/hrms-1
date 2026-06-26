"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ProjectFormData {
  title: string;
  description: string;
  clientId: string;
  leadId?: string;
  department: string;
  teamLeaderId: string;
  startDate: string;
  endDate: string;
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
}

const defaultFormData: ProjectFormData = {
  title: "",
  description: "",
  clientId: "",
  department: "",
  teamLeaderId: "",
  startDate: new Date().toISOString().split('T')[0],
  endDate: "",
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
};

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => void;
  isSubmitting?: boolean;
}

export function ProjectForm({ initialData, onSubmit, isSubmitting }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    ...defaultFormData,
    ...initialData,
  });
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

  const handleChange = (field: keyof ProjectFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              <Select 
                value={formData.teamLeaderId} 
                onValueChange={(v) => handleChange("teamLeaderId", v)}
                disabled={isLoadingMeta}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingMeta ? "Loading..." : "Select Team Leader"} />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} {emp.department ? `(${emp.department})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date (Optional)</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate || ""}
            onChange={(e) => handleChange("endDate", e.target.value)}
          />
        </div>
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
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
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
