"use client";

import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, User, FileText, Search, ChevronDown, Check } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Textarea } from "@/components/ui/textarea";
import { INDIAN_STATES } from "@/lib/constants";


export interface ClientFormData {
  name: string;
  companyName: string;
  email?: string;
  phone: string;
  address: string;
  gstin?: string;
  state?: string;
  department: string;
  status: string;
  salesFocused?: string;
  dailyBudget?: number;
  remarks?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
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
  gstin: "",
  state: "",
  department: "",
  status: "active",
  salesFocused: "",
  dailyBudget: 0,
  remarks: "",
  assignedEmployeeId: "",
    assignedEmployeeName: "",
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
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [isStateOpen, setIsStateOpen] = useState(false);
  const stateContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (stateContainerRef.current && !stateContainerRef.current.contains(e.target as Node)) {
        setIsStateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    fetchEmployees();
  }, []);

  React.useEffect(() => {
    setFormData({
      ...defaultFormData,
      ...initialData,
    });
  }, [initialData]);

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

  const baseDepts = propDepartments && propDepartments.length > 0 
    ? propDepartments.map(d => d.trim()) 
    : ["Development", "Creative", "Digital Marketing"];
  
  const departments = Array.from(new Set([...baseDepts]));

  const handleChange = (field: keyof ClientFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isMarketing = formData.department?.includes("Marketing");
  const isGraphics = formData.department?.includes("Creative");
  const isDevelopment = formData.department?.includes("Development");
  const isSales = formData.department?.includes("Sales");

  const toggleDepartment = (dept: string) => {
    const currentDepts = formData.department 
      ? formData.department.split(',').map(d => d.trim()).filter(Boolean) 
      : [];
    
    let newDepts;
    if (currentDepts.includes(dept)) {
      newDepts = currentDepts.filter(d => d !== dept);
    } else {
      newDepts = [...currentDepts, dept];
    }
    
    handleChange("department", newDepts.join(', '));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
      <div 
        className="flex-1 overflow-y-auto px-6 py-2" 
        style={{ maxHeight: "calc(90vh - 140px)" }}
      >
        <div className="space-y-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-500">Contact Person Name <span className="text-red-500">*</span></Label>
              <Input id="name" placeholder="e.g. John Doe" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-xs font-bold uppercase text-slate-500">Company Name <span className="text-red-500">*</span></Label>
              <Input id="companyName" placeholder="e.g. Acme Corp" value={formData.companyName} onChange={(e) => handleChange("companyName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold uppercase text-slate-500">Phone Number <span className="text-red-500">*</span></Label>
              <Input id="phone" placeholder="+91 00000 00000" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase text-slate-500">Email Address (Optional)</Label>
              <Input id="email" type="email" placeholder="e.g. client@example.com" value={formData.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs font-bold uppercase text-slate-500">Address (Optional)</Label>
              <Input id="address" placeholder="e.g. 123 Main St, City" value={formData.address || ""} onChange={(e) => handleChange("address", e.target.value)} />
            </div>
            <div className="space-y-2" ref={stateContainerRef}>
              <Label htmlFor="state" className="text-xs font-bold uppercase text-slate-500">State / UT (Optional)</Label>
              <div className="relative">
                <button
                  id="state"
                  type="button"
                  onClick={() => setIsStateOpen(!isStateOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal text-slate-700 min-h-9"
                >
                  <span className="truncate">
                    {formData.state
                      ? `${formData.state} - ${INDIAN_STATES.find(s => s.code === formData.state)?.name || ""}`
                      : "Select State..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>

                {isStateOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <Input
                        placeholder="Search states..."
                        value={stateSearchQuery}
                        onChange={(e) => setStateSearchQuery(e.target.value)}
                        className="h-8 text-xs border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
                        autoFocus
                      />
                    </div>
                    <ScrollArea className="max-h-60 overflow-y-auto">
                      <div className="p-1">
                        <div
                          onClick={() => {
                            handleChange("state", "");
                            setIsStateOpen(false);
                            setStateSearchQuery("");
                          }}
                          className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer rounded-sm text-slate-500"
                        >
                          Select State...
                        </div>
                        {INDIAN_STATES.filter((state) =>
                          `${state.code} ${state.name}`
                            .toLowerCase()
                            .includes(stateSearchQuery.toLowerCase())
                        ).map((state) => {
                          const isSelected = formData.state === state.code;
                          return (
                            <div
                              key={state.code}
                              onClick={() => {
                                handleChange("state", state.code);
                                setIsStateOpen(false);
                                setStateSearchQuery("");
                              }}
                              className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer rounded-sm ${isSelected ? "text-brand-teal font-medium" : "text-slate-700"}`}
                            >
                              <span>{state.code} - {state.name}</span>
                              {isSelected && <Check className="w-4 h-4 text-brand-teal" />}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstin" className="text-xs font-bold uppercase text-slate-500">GSTIN (Optional)</Label>
              <Input id="gstin" placeholder="e.g. 22AAAAA0000A1Z5" value={formData.gstin || ""} onChange={(e) => handleChange("gstin", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Department(s)</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {departments.map((dept) => {
                  const currentDepts = formData.department 
                    ? formData.department.split(',').map(d => d.trim()).filter(Boolean) 
                    : [];
                  const isSelected = currentDepts.includes(dept);
                  return (
                    <button
                      type="button"
                      key={dept}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleDepartment(dept);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border transition-colors ${
                        isSelected 
                          ? 'bg-brand-teal text-white border-brand-teal' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-brand-teal/50'
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs font-bold uppercase text-slate-500">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Marketing Specific Fields - Simplified as per user request */}
          {isMarketing && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-brand-teal uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" /> Marketing Service Fields
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="services" className="text-[10px] font-bold uppercase text-slate-400">Services</Label>
                  <Input id="services" placeholder="e.g. SMM, SEO" value={formData.services || ""} onChange={(e) => handleChange("services", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salesFocused" className="text-[10px] font-bold uppercase text-slate-400">Sales Focused</Label>
                  <Input id="salesFocused" placeholder="e.g. Wp leads" value={formData.salesFocused || ""} onChange={(e) => handleChange("salesFocused", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyBudget" className="text-[10px] font-bold uppercase text-slate-400">Daily Budget (₹)</Label>
                  <Input id="dailyBudget" type="number" value={formData.dailyBudget || 0} onChange={(e) => handleChange("dailyBudget", parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400">Daily Followup</Label>
                  <Select value={formData.dailyFollowup} onValueChange={(v) => handleChange("dailyFollowup", v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedEmployeeId" className="text-[10px] font-bold uppercase text-slate-400">Assigned To</Label>
                  <Select value={formData.assignedEmployeeId} onValueChange={(v) => handleChange("assignedEmployeeId", v)}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id || `${emp.firstName} ${emp.lastName}`}>{emp.firstName} {emp.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}          {/* Development Specific Fields - Minimal as per user request */}
          {isDevelopment && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <p className="text-[10px] text-slate-400 font-medium italic">Only basic contact information is required for Development clients.</p>
            </div>
          )}




          <div className={`space-y-2 pt-4 ${isDevelopment ? 'hidden' : ''}`}>
            <Label htmlFor="remarks" className="text-xs font-bold uppercase text-slate-500">General Remarks</Label>
            <Textarea id="remarks" placeholder="Any additional notes..." value={formData.remarks || ""} onChange={(e) => handleChange("remarks", e.target.value)} className="min-h-[80px]" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white px-8 h-10 font-bold" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Client" : "Add Client"}
        </Button>
      </div>
    </form>
  );
}
