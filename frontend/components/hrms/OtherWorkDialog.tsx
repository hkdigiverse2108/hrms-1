import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const SearchableEmployeeSelect = ({ value, onChange, placeholder, employees }: { value: string, onChange: (val: string) => void, placeholder: string, employees: any[] }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedEmp = employees.find((e: any) => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10 border-slate-200">
          {selectedEmp ? (selectedEmp.name || `${selectedEmp.firstName} ${selectedEmp.lastName}`) : <span className="text-slate-500">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 bg-slate-50/50">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
          <input 
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {employees.filter((e: any) => {
            const term = search.toLowerCase();
            const name = (e.name || `${e.firstName} ${e.lastName}`).toLowerCase();
            const dept = (e.department || "").toLowerCase();
            return name.includes(term) || dept.includes(term);
          }).map((emp: any) => (
             <div 
               key={emp.id}
               className={`relative flex justify-between cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-slate-100 transition-colors ${value === emp.id ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700"}`}
               onClick={() => { onChange(emp.id); setOpen(false); setSearch(""); }}
             >
               <div className="flex items-center truncate">
                 <Check className={`mr-2 h-4 w-4 shrink-0 text-brand-teal ${value === emp.id ? "opacity-100" : "opacity-0"}`} />
                 <span className="truncate">{emp.name || `${emp.firstName} ${emp.lastName}`}</span>
               </div>
               {emp.department && <span className="ml-2 shrink-0 text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md truncate max-w-[100px]">{emp.department}</span>}
             </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export function OtherWorkDialog() {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && employees.length === 0) {
      fetch(`${API_URL}/employees`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEmployees(data);
          } else {
            console.error("Failed to load employees:", data);
            setEmployees([]);
          }
        })
        .catch(err => {
          console.error(err);
          setEmployees([]);
        });
    }
  }, [open]);

  const handleSave = async () => {
    if (!title || !assigneeId || !deadline) {
      toast.error("Please fill in the title, assignee, and deadline.");
      return;
    }

    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) || "Unknown";
      
      const assignee = employees.find(e => e.id === assigneeId);
      const assigneeName = assignee ? (assignee.name || `${assignee.firstName} ${assignee.lastName}`) : "Unknown";

      const payload = {
        title,
        description,
        assigneeId,
        assigneeName,
        assignerId: user?.id || "unknown",
        assignerName: userName,
        deadline,
        status: "Pending"
      };

      const res = await fetch(`${API_URL}/other-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Work assigned successfully!");
        setOpen(false);
        setTitle("");
        setDescription("");
        setAssigneeId("");
        setDeadline("");
        // Reload page to reflect new tasks instantly if needed
        setTimeout(() => window.location.reload(), 500);
      } else {
        toast.error("Failed to assign work.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 bg-brand-teal hover:bg-brand-teal/90 text-white gap-2 w-full md:w-auto shrink-0 shadow-sm">
          <Plus className="w-4 h-4" />
          Assign Other Work
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Work to Team Member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Task Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Create special festival reel" />
          </div>
          
          <div className="space-y-2">
            <Label>Assign To</Label>
            <SearchableEmployeeSelect 
              value={assigneeId} 
              onChange={setAssigneeId} 
              placeholder="Select employee..." 
              employees={employees} 
            />
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Add any additional details or references here..."
              rows={4}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-brand-teal hover:bg-brand-teal/90 text-white" onClick={handleSave} disabled={loading}>
            {loading ? "Assigning..." : "Assign Work"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

export function OtherWorkDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigneeId: "",
    deadline: "",
    clientId: "none"
  });

  const [empSearch, setEmpSearch] = useState("");
  const [empOpen, setEmpOpen] = useState(false);

  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/employees`).then(res => res.json()).then(data => {
      if(Array.isArray(data)) setEmployees(data);
    }).catch(console.error);

    fetch(`${API_URL}/clients`).then(res => res.json()).then(data => {
      if(Array.isArray(data)) setClients(data);
    }).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.assigneeId || !formData.deadline) {
      toast.error("Please fill all required fields");
      return;
    }

    const assignee = employees.find(emp => emp.id === formData.assigneeId);
    const client = clients.find(c => c.id === formData.clientId);

    try {
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
          clientId: formData.clientId === "none" ? null : formData.clientId,
          clientName: client ? client.companyName : null,
          status: "Pending"
        })
      });

      if (res.ok) {
        toast.success("Work assigned successfully!");
        setOpen(false);
        setFormData({ title: "", description: "", assigneeId: "", deadline: "", clientId: "none" });
      } else {
        toast.error("Failed to assign work");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  const selectedEmp = employees.find(e => e.id === formData.assigneeId);
  const selectedClient = clients.find(c => c.id === formData.clientId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Assign Other Work
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Assign Other Work</DialogTitle>
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
                    return name.includes(term) && (e.department?.toLowerCase().includes("creative") || e.department?.toLowerCase().includes("design"));
                  }).map((emp: any) => (
                    <div 
                      key={emp.id}
                      className={`relative flex justify-between cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-slate-100 ${formData.assigneeId === emp.id ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700"}`}
                      onClick={() => { setFormData({...formData, assigneeId: emp.id}); setEmpOpen(false); setEmpSearch(""); }}
                    >
                      <span>{emp.name || `${emp.firstName} ${emp.lastName}`}</span>
                      <Check className={`h-4 w-4 text-brand-teal ${formData.assigneeId === emp.id ? "opacity-100" : "opacity-0"}`} />
                    </div>
                  ))}
                  {employees.filter((e: any) => {
                    const term = empSearch.toLowerCase();
                    const name = (e.name || `${e.firstName} ${e.lastName}`).toLowerCase();
                    return name.includes(term) && (e.department?.toLowerCase().includes("creative") || e.department?.toLowerCase().includes("design"));
                  }).length === 0 && (
                    <div className="p-4 text-center text-sm text-slate-500">No creative team members found.</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Related Client (Optional)</Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={clientOpen} className="w-full justify-between font-normal h-10 border-slate-200">
                  {selectedClient ? selectedClient.companyName : (formData.clientId === "none" ? <span className="italic text-slate-500">None</span> : <span className="text-slate-500">Select Client</span>)}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="flex items-center border-b px-3 bg-slate-50/50">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
                  <input 
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                    placeholder="Search client..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-56 overflow-y-auto p-1">
                  <div
                     className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-slate-100 ${formData.clientId === "none" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600"}`}
                     onClick={() => { setFormData({...formData, clientId: "none"}); setClientOpen(false); setClientSearch(""); }}
                  >
                    <Check className={`mr-2 h-4 w-4 text-brand-teal ${formData.clientId === "none" ? "opacity-100" : "opacity-0"}`} />
                    <span className="italic">None</span>
                  </div>
                  {clients.filter((c: any) => c.companyName?.toLowerCase().includes(clientSearch.toLowerCase())).map((c: any) => (
                    <div 
                      key={c.id}
                      className={`relative flex justify-between cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-slate-100 ${formData.clientId === c.id ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700"}`}
                      onClick={() => { setFormData({...formData, clientId: c.id}); setClientOpen(false); setClientSearch(""); }}
                    >
                      <span>{c.companyName}</span>
                      <Check className={`h-4 w-4 text-brand-teal ${formData.clientId === c.id ? "opacity-100" : "opacity-0"}`} />
                    </div>
                  ))}
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
