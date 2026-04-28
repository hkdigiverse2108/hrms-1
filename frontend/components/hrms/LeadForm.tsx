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
}

interface LeadFormProps {
  initialData?: any;
  onSubmit: (data: LeadFormData) => void;
  isSubmitting: boolean;
}

export function LeadForm({ initialData, onSubmit, isSubmitting }: LeadFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LeadFormData>({
    defaultValues: initialData || {
      status: "Lead",
      priority: "Medium",
    }
  });

  const currentStatus = watch("status");
  const currentPriority = watch("priority");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company Name</Label>
          <Input 
            id="company" 
            placeholder="Enter company name" 
            {...register("company", { required: "Company name is required" })} 
          />
          {errors.company && <p className="text-xs text-red-500">{errors.company.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact">Contact Person</Label>
          <Input 
            id="contact" 
            placeholder="Enter contact name" 
            {...register("contact", { required: "Contact name is required" })} 
          />
          {errors.contact && <p className="text-xs text-red-500">{errors.contact.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            type="email"
            placeholder="email@example.com" 
            {...register("email")} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            placeholder="+1 (555) 000-0000" 
            {...register("phone")} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expectedIncome">Expected Income</Label>
          <Input 
            id="expectedIncome" 
            placeholder="e.g. $10,000" 
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
              <SelectItem value="Negotiation">Negotiation</SelectItem>
              <SelectItem value="Closed Won">Closed Won</SelectItem>
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
