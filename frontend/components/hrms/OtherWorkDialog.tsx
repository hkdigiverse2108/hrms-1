"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

export function OtherWorkDialog({ source = "other-work" }: { source?: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigneeId: "",
    deadline: ""
  });

  const [empSearch, setEmpSearch] = useState("");
  const [empOpen, setEmpOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/employees`).then(res => res.json()).then(data => {
      if(Array.isArray(data)) setEmployees(data);
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.assigneeId || !formData.deadline) {
      toast.error("Please fill all required fields");
      return;
    }

    const assignee = employees.find(emp => emp.id === formData.assigneeId);

    try {
      const isDigitalMarketing = user?.department?.toLowerCase().includes("digital marketing");
      const computedTaskType = isDigitalMarketing ? "digital-marketing" : source;

      const res = await fetch(`${API_URL}/other-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          assigneeId: formData.assigneeId,
          assigneeName: assignee ? (assignee.name || `${assignee.firstName} ${assignee.lastName}`) : "",
          assignerId: user?.id || "",
          assignerName: user ? (user.name || `${user.firstName} ${user.lastName}`) : "",
          deadline: formData.deadline,
          status: "Pending",
          taskType: computedTaskType
        })
      });

      if (res.ok) {
        toast.success("Work assigned successfully!");
        setOpen(false);
        setFormData({ title: "", description: "", assigneeId: "", deadline: "" });
        setTimeout(() => window.location.reload(), 500);
      } else {
        toast.error("Failed to assign work");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  const selectedEmp = employees.find(e => e.id === formData.assigneeId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium shadow-sm h-10 px-4 rounded-lg flex items-center transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Assign Creative Work
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Assign Creative Work</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-slate-700">Task Title <span className="text-rose-500">*</span></Label>
            <Input 
              placeholder="e.g. Design new logo" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Assign To (Creative Team) <span className="text-rose-500">*</span></Label>
            <Popover open={empOpen} onOpenChange={setEmpOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={empOpen} className="w-full justify-between font-normal h-10 border-slate-200">
                  {selectedEmp ? (selectedEmp.name || `${selectedEmp.firstName} ${selectedEmp.lastName}`) : <span className="text-slate-500">Select Employee</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="flex items-center border-b px-3 bg-slate-50/50">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
                  <input 
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                    placeholder="Search employee..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-56 overflow-y-auto p-1">
                  {employees.filter((e: any) => {
                    const term = empSearch.toLowerCase();
                    const name = (e.name || `${e.firstName} ${e.lastName}`).toLowerCase();
                    return name.includes(term) && (e.department?.toLowerCase().includes("creative") || e.department?.toLowerCase().includes("design") || e.department?.toLowerCase().includes("digital marketing"));
                  }).map((emp: any) => (
                    <div 
                      key={emp.id}
                      className={`relative flex justify-between cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-slate-100 ${formData.assigneeId === emp.id ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700"}`}
                      onClick={() => { setFormData({...formData, assigneeId: emp.id}); setEmpOpen(false); setEmpSearch(""); }}
                    >
                      <div className="flex items-center">
                        <span>{emp.name || `${emp.firstName} ${emp.lastName}`}</span>
                      </div>
                      <Check className={`h-4 w-4 text-brand-teal ${formData.assigneeId === emp.id ? "opacity-100" : "opacity-0"}`} />
                    </div>
                  ))}
                  {employees.filter((e: any) => {
                    const term = empSearch.toLowerCase();
                    const name = (e.name || `${e.firstName} ${e.lastName}`).toLowerCase();
                    return name.includes(term) && (e.department?.toLowerCase().includes("creative") || e.department?.toLowerCase().includes("design") || e.department?.toLowerCase().includes("digital marketing"));
                  }).length === 0 && (
                    <div className="p-4 text-center text-sm text-slate-500">No team members found.</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Deadline <span className="text-rose-500">*</span></Label>
            <Input 
              type="date"
              value={formData.deadline}
              onChange={e => setFormData({...formData, deadline: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Description (Optional)</Label>
            <Input 
              placeholder="Any additional details..." 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium">Assign Work</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
