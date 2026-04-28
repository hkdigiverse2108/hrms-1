"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";

export interface ProjectFormData {
  title: string;
  description: string;
  clientId: string;
  department: string;
  teamLeaderId: string;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
  budget: string;
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
  budget: "0",
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
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Static departments as requested by user earlier
  const departments = ["Development", "Sales", "Graphics", "Marketing"];

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
        const allEmployees = await eRes.json();
        // Only show employees who have the role of "Team Leader"
        setEmployees(allEmployees.filter((emp: any) => emp.role === "Team Leader"));
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
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Project Title</Label>
          <Input
            id="title"
            placeholder="e.g. Website Redesign"
            value={formData.title}
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
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Brief project overview..."
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date (Optional)</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange("endDate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="budget">Budget</Label>
          <Input
            id="budget"
            type="number"
            placeholder="0"
            value={formData.budget}
            onChange={(e) => handleChange("budget", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
