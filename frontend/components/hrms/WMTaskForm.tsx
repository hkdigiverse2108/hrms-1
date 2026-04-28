"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";

export interface WMTaskFormData {
  title: string;
  description: string;
  projectId: string;
  assignedToId: string;
  dueDate: string;
  priority: string;
}

const defaultFormData: WMTaskFormData = {
  title: "",
  description: "",
  projectId: "",
  assignedToId: "",
  dueDate: new Date().toISOString().split('T')[0],
  priority: "medium",
};

interface WMTaskFormProps {
  initialData?: Partial<WMTaskFormData>;
  onSubmit: (data: WMTaskFormData) => void;
  isSubmitting?: boolean;
}

export function WMTaskForm({ initialData, onSubmit, isSubmitting }: WMTaskFormProps) {
  const [formData, setFormData] = useState<WMTaskFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  useEffect(() => {
    fetchMetadata();
  }, []);

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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          placeholder="e.g. Design Login Page"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select 
            value={formData.projectId} 
            onValueChange={(v) => handleChange("projectId", v)}
            disabled={isLoadingMeta}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingMeta ? "Loading..." : "Select Project"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedToId">Assign To</Label>
          <Select 
            value={formData.assignedToId} 
            onValueChange={(v) => handleChange("assignedToId", v)}
            disabled={isLoadingMeta}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingMeta ? "Loading..." : "Select Employee"} />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
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
          placeholder="Task details..."
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange("dueDate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select 
            value={formData.priority} 
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
