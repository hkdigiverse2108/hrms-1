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
  status: string;
  priority: string;
  remarks?: string;
  
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
}

const defaultFormData: WMTaskFormData = {
  title: "",
  description: "",
  projectId: "",
  assignedToId: "",
  dueDate: new Date().toISOString().split('T')[0],
  status: "todo",
  priority: "medium",
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
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate Posting Day if Posting Date changes
      if (field === "postingDate" && value) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const day = days[new Date(value).getDay()];
        newData.postingDay = day;
      }
      
      return newData;
    });
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);
  const isGraphicsProject = selectedProject?.department?.toLowerCase() === "graphics" || userDepartment?.toLowerCase() === "graphics";

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
          value={formData.title ?? ""}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedToId">Assign To</Label>
          <Select 
            value={formData.assignedToId ?? ""} 
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
          value={formData.description ?? ""}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
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
              <SelectItem value="review">Review</SelectItem>
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
          <h3 className="text-sm font-medium text-brand-teal uppercase tracking-wider">Graphics & Production Details</h3>
          
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
          {initialData ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
