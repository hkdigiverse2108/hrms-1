"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, User, FileText } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Textarea } from "@/components/ui/textarea";

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
  interviewDate?: string;
  interviewTime?: string;
  interviewerName?: string;
  interviewLink?: string;
  interviewNotes?: string;
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
  dailyFollowup: "No",
  interviewDate: "",
  interviewTime: "",
  interviewerName: "",
  interviewNotes: "",
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
      console.error("Error fetching employees:", err);
    }
  };

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
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-500">Contact Person Name</Label>
          <Input id="name" placeholder="e.g. John Doe" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-xs font-bold uppercase text-slate-500">Company Name</Label>
          <Input id="companyName" placeholder="e.g. Acme Corp" value={formData.companyName} onChange={(e) => handleChange("companyName", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-bold uppercase text-slate-500">Email Address</Label>
          <Input id="email" type="email" placeholder="client@example.com" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-xs font-bold uppercase text-slate-500">Phone Number</Label>
          <Input id="phone" placeholder="+91 00000 00000" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <div className="space-y-2">
          <Label htmlFor="department" className="text-xs font-bold uppercase text-slate-500">Department</Label>
          <Select value={formData.department} onValueChange={(v) => handleChange("department", v)}>
            <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status" className="text-xs font-bold uppercase text-slate-500">Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border-t border-slate-100 pt-6">
        <h4 className="text-xs font-bold text-brand-teal uppercase tracking-widest flex items-center gap-2">
          <FileText className="w-4 h-4" /> All Service Fields
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="services" className="text-[10px] font-bold uppercase text-slate-400">Services</Label>
            <Input id="services" placeholder="e.g. SMM, Web Dev" value={formData.services} onChange={(e) => handleChange("services", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyBudget" className="text-[10px] font-bold uppercase text-slate-400">Daily Budget (₹)</Label>
            <Input id="dailyBudget" type="number" value={formData.dailyBudget} onChange={(e) => handleChange("dailyBudget", parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post" className="text-[10px] font-bold uppercase text-slate-400">Post Count</Label>
            <Input id="post" type="number" value={formData.post} onChange={(e) => handleChange("post", parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reel" className="text-[10px] font-bold uppercase text-slate-400">Reel Count</Label>
            <Input id="reel" type="number" value={formData.reel} onChange={(e) => handleChange("reel", parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="graphics" className="text-[10px] font-bold uppercase text-slate-400">Graphics Requirements</Label>
            <Input id="graphics" value={formData.graphics} onChange={(e) => handleChange("graphics", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="video" className="text-[10px] font-bold uppercase text-slate-400">Video Requirements</Label>
            <Input id="video" value={formData.video} onChange={(e) => handleChange("video", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["festivalPost", "postRequired", "reelRequired", "graphicsRequired", "dailyFollowup"].map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field} className="text-[10px] font-bold uppercase text-slate-400">{field.replace(/([A-Z])/g, ' $1')}</Label>
              <Select value={(formData as any)[field]} onValueChange={(v) => handleChange(field as any, v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="responsibility" className="text-[10px] font-bold uppercase text-slate-400">Assigned To</Label>
            <Select value={formData.responsibility} onValueChange={(v) => handleChange("responsibility", v)}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>{emp.firstName} {emp.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-slate-100 pt-6">
        <h4 className="text-xs font-bold text-purple-600 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Interview / Meeting Schedule
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="interviewDate" className="text-[10px] font-bold uppercase text-slate-400">Date</Label>
            <Input id="interviewDate" type="date" value={formData.interviewDate} onChange={(e) => handleChange("interviewDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interviewTime" className="text-[10px] font-bold uppercase text-slate-400">Time</Label>
            <Input id="interviewTime" type="time" value={formData.interviewTime} onChange={(e) => handleChange("interviewTime", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interviewerName" className="text-[10px] font-bold uppercase text-slate-400">Interviewer / Contact</Label>
            <Select value={formData.interviewerName} onValueChange={(v) => handleChange("interviewerName", v)}>
              <SelectTrigger><SelectValue placeholder="Select Person" /></SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.name || `${emp.firstName} ${emp.lastName}`}>{emp.name || `${emp.firstName} ${emp.lastName}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="interviewNotes" className="text-[10px] font-bold uppercase text-slate-400">Interview Notes</Label>
          <Textarea id="interviewNotes" placeholder="Internal notes for the meeting..." value={formData.interviewNotes} onChange={(e) => handleChange("interviewNotes", e.target.value)} className="min-h-[100px]" />
        </div>
      </div>

      <div className="space-y-2 pt-4">
        <Label htmlFor="remarks" className="text-xs font-bold uppercase text-slate-500">General Remarks</Label>
        <Textarea id="remarks" placeholder="Any additional notes..." value={formData.remarks} onChange={(e) => handleChange("remarks", e.target.value)} className="min-h-[80px]" />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white px-8 h-11 font-bold" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Client" : "Add Client"}
        </Button>
      </div>
    </form>
  );
}
