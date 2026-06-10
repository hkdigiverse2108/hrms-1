"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface LeadFormData {
  company: string;
  contact: string;
  email: string;
  phone: string;
  expectedIncome: string;
  status: string;
  priority: string;
  source: string;
  remarks: string;
  assignedTo: string[];
  isHot: boolean;
  holdResumeDate?: string;
  date?: string;
}

import { API_URL } from "@/lib/config";

interface LeadFormProps {
  initialData?: any;
  onSubmit: (data: LeadFormData) => void;
  isSubmitting: boolean;
}

export function LeadForm({ initialData, onSubmit, isSubmitting }: LeadFormProps) {
  const parsedInitialData = initialData ? {
    ...initialData,
    assignedTo: Array.isArray(initialData.assignedTo) 
      ? initialData.assignedTo 
      : (initialData.assignedTo ? [initialData.assignedTo] : [])
  } : null;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LeadFormData>({
    defaultValues: parsedInitialData || {
      status: "Lead",
      priority: "Medium",
      isHot: false,
      assignedTo: [],
      holdResumeDate: "",
      date: new Date().toISOString().split('T')[0],
    }
  });

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_URL}/employees`);
        if (res.ok) setEmployees(await res.json());
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  const currentStatus = watch("status");
  const currentPriority = watch("priority");
  const currentAssignedTo = watch("assignedTo");

  useEffect(() => {
    if (currentStatus === "On Hold" || currentStatus === "Client Won" || currentStatus === "Client Loss") {
      setValue("isHot", false);
    }
  }, [currentStatus, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact">Contact Person</Label>
          <Input 
            id="contact" 
            placeholder="Enter contact name" 
            {...register("contact", { required: "Contact name is required" })} 
          />
          {errors.contact && <p className="text-xs text-red-500">{errors.contact.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            placeholder="+1 (555) 000-0000" 
            {...register("phone", { required: "Phone number is required" })} 
          />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company Name</Label>
          <Input 
            id="company" 
            placeholder="Enter company name" 
            {...register("company")} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            type="email"
            placeholder="email@example.com" 
            {...register("email")} 
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expectedIncome">Expected Income</Label>
          <Input 
            id="expectedIncome" 
            placeholder="e.g. ₹10,000" 
            {...register("expectedIncome")} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Lead Source</Label>
          <Input 
            id="source" 
            placeholder="e.g. Website, LinkedIn" 
            {...register("source")} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Created Date</Label>
          <Input 
            id="date" 
            type="date"
            {...register("date")} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={currentStatus} onValueChange={(val) => setValue("status", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
              <SelectItem value="Client Won">Client Won</SelectItem>
              <SelectItem value="Client Loss">Client Loss</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={currentPriority} onValueChange={(val) => setValue("priority", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {currentStatus === "On Hold" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="holdResumeDate">Resume Date</Label>
            <Input 
              id="holdResumeDate"
              type="date"
              {...register("holdResumeDate", { required: "Resume date is required when status is On Hold" })}
            />
            {errors.holdResumeDate && <p className="text-xs text-red-500">{errors.holdResumeDate.message}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <Label>Assigned To</Label>
          <div className="border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50/50">
            {employees.filter(emp => emp.department?.toLowerCase() === 'sales').map(emp => {
              const empName = emp.name || `${emp.firstName} ${emp.lastName}`;
              const assignedList = Array.isArray(currentAssignedTo) ? currentAssignedTo : (currentAssignedTo ? [currentAssignedTo] : []);
              return (
                <label key={emp.id} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={assignedList.includes(empName)}
                    onChange={(e) => {
                      const updated = e.target.checked 
                        ? [...assignedList, empName] 
                        : assignedList.filter((n: string) => n !== empName);
                      setValue("assignedTo", updated);
                    }}
                    className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal w-3.5 h-3.5"
                  />
                  {empName}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 h-10">
          <input 
            type="checkbox"
            id="isHot"
            disabled={currentStatus === "On Hold" || currentStatus === "Client Won" || currentStatus === "Client Loss"}
            {...register("isHot")}
            className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Label 
            htmlFor="isHot" 
            className={`font-bold text-slate-700 ${
              (currentStatus === "On Hold" || currentStatus === "Client Won" || currentStatus === "Client Loss")
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            Mark as Hot Lead
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea 
          id="remarks" 
          placeholder="Add any internal notes or follow-up details..." 
          className="min-h-[100px]"
          {...register("remarks")} 
        />
      </div>

      <div className="pt-4 flex justify-end gap-3 border-t">
        <Button type="submit" className="bg-brand-teal hover:bg-brand-teal-light text-white" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update Lead" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}
