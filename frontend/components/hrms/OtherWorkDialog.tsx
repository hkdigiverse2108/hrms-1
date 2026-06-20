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
        <Button className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 w-full md:w-auto shrink-0 shadow-sm">
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
