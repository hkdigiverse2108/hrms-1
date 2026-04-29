"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";

export interface ClientFormData {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  status: string;
  services?: string;
  festivalPost?: string;
  post?: number;
  graphics?: string;
  reel?: number;
  video?: string;
  postRequired?: string;
  reelRequired?: string;
  graphicsRequired?: string;
  salesFocused?: string;
  dailyBudget?: number;
  remarks?: string;
  responsibility?: string;
  dailyFollowup?: string;
}

const defaultFormData: ClientFormData = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  address: "",
  department: "",
  status: "active",
  services: "",
  festivalPost: "No",
  post: 0,
  graphics: "",
  reel: 0,
  video: "",
  postRequired: "No",
  reelRequired: "No",
  graphicsRequired: "No",
  salesFocused: "",
  dailyBudget: 0,
  remarks: "",
  responsibility: "",
  dailyFollowup: "",
};

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => void;
  isSubmitting?: boolean;
  departments?: string[];
}

export function ClientForm({ initialData, onSubmit, isSubmitting, departments: propDepartments }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [employees, setEmployees] = useState<any[]>([]);

  React.useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error("Error fetching employees for responsibility dropdown:", err);
    }
  };

  // Use prop departments or a sensible fallback
  const departments = propDepartments && propDepartments.length > 0 
    ? propDepartments 
    : ["Development", "Sales", "Graphics", "Marketing"];

  const handleChange = (field: keyof ClientFormData, value: any) => {
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
          <Label htmlFor="name">Contact Person Name</Label>
          <Input
            id="name"
            placeholder="e.g. John Doe"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="e.g. Acme Corp"
            value={formData.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="client@example.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="+1 234 567 890"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Assign to Department</Label>
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
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(v) => handleChange("status", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {formData.department === "Marketing" && (
        <div className="space-y-4 border-t border-slate-100 pt-4 mt-4">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Marketing Department Details</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="services">Services</Label>
              <Input
                id="services"
                placeholder="e.g. Social Media Marketing"
                value={formData.services}
                onChange={(e) => handleChange("services", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyBudget">Daily Budget</Label>
              <Input
                id="dailyBudget"
                type="number"
                value={formData.dailyBudget ?? 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleChange("dailyBudget", isNaN(val) ? 0 : val);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesFocused">Sales Focused</Label>
              <Input
                id="salesFocused"
                placeholder="e.g. High/Low"
                value={formData.salesFocused}
                onChange={(e) => handleChange("salesFocused", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyFollowup">Daily Followup</Label>
              <Select value={formData.dailyFollowup} onValueChange={(v) => handleChange("dailyFollowup", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsibility">Responsibility (Assigned To)</Label>
            <Select 
              value={formData.responsibility} 
              onValueChange={(v) => handleChange("responsibility", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter((emp) => 
                    !formData.department || 
                    emp.department?.toLowerCase() === formData.department.toLowerCase()
                  )
                  .map((emp) => (
                  <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              placeholder="Any additional notes..."
              value={formData.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
            />
          </div>
        </div>
      )}

      {formData.department === "Graphics" && (
        <div className="space-y-4 border-t border-slate-100 pt-4 mt-4">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Graphics Department Details</h4>
          
          <div className="space-y-2">
            <Label htmlFor="services">Services</Label>
            <Input
              id="services"
              placeholder="e.g. Social Media"
              value={formData.services}
              onChange={(e) => handleChange("services", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="festivalPost">Festival Post</Label>
              <Select value={formData.festivalPost} onValueChange={(v) => handleChange("festivalPost", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="graphics">Graphics Requirement</Label>
              <Select value={formData.graphics} onValueChange={(v) => handleChange("graphics", v)}>
                <SelectTrigger><SelectValue placeholder="Select Requirement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Required">Required</SelectItem>
                  <SelectItem value="Not Required">Not Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postRequired">Post Required?</Label>
              <Select value={formData.postRequired} onValueChange={(v) => handleChange("postRequired", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post">Post Count</Label>
              <Input
                id="post"
                type="number"
                value={formData.post ?? 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleChange("post", isNaN(val) ? 0 : val);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reelRequired">Reel Required?</Label>
              <Select value={formData.reelRequired} onValueChange={(v) => handleChange("reelRequired", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reel">Reel Count</Label>
              <Input
                id="reel"
                type="number"
                value={formData.reel ?? 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  handleChange("reel", isNaN(val) ? 0 : val);
                }}
              />
            </div>
          </div>

        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Client" : "Add Client"}
        </Button>
      </div>
    </form>
  );
}
