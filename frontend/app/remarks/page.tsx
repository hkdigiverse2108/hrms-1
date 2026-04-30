"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Download,
  Edit2,
  Trash2,
  Loader2
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { TablePagination } from "@/components/common/TablePagination";
import { exportToCSV } from "@/lib/export";


const remarksData = [
  {
    id: "R1",
    date: "Oct 24, 2026",
    employee: "Michael Chang",
    role: "Marketing",
    avatar: "/avatars/michael.jpg",
    type: "Appreciation",
    details: "Outstanding presentation during the Q3 review. Clearly communicated the campaign metrics and future strategies to the stakeholders.",
    addedBy: "Sarah Jenkins"
  },
  {
    id: "R2",
    date: "Oct 22, 2026",
    employee: "Emily Roberts",
    role: "Sales",
    avatar: "/avatars/emily.jpg",
    type: "Warning",
    details: "Arrived late for the daily standup meeting three times this week. Needs immediate improvement on punctuality.",
    addedBy: "Mark Davis"
  },
  {
    id: "R3",
    date: "Oct 18, 2026",
    employee: "David Wilson",
    role: "Engineering",
    avatar: "/avatars/david.jpg",
    type: "Performance",
    details: "Successfully resolved the critical bug in the payment gateway ahead of schedule, preventing potential revenue loss.",
    addedBy: "Tech Lead"
  },
  {
    id: "R4",
    date: "Oct 15, 2026",
    employee: "Jessica Taylor",
    role: "HR",
    avatar: "/avatars/jessica.jpg",
    type: "General",
    details: "Requested a new ergonomic chair for the home office setup. Approved and ordered.",
    addedBy: "Sarah Jenkins"
  },
  {
    id: "R5",
    date: "Oct 12, 2026",
    employee: "Robert Chen",
    role: "Design",
    avatar: "/avatars/robert.jpg",
    type: "Appreciation",
    details: "The new UI mockups for the dashboard look fantastic and have been approved by the client without revisions.",
    addedBy: "Mark Davis"
  }
];

const getTypeBadge = (type: string) => {
  switch (type) {
    case "Appreciation": return "bg-emerald-100/50 text-emerald-700 border-emerald-200";
    case "Warning": return "bg-amber-100/50 text-amber-700 border-amber-200";
    case "Performance": return "bg-blue-100/50 text-blue-700 border-blue-200";
    case "General": return "bg-gray-100 text-gray-700 border-gray-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function RemarksPage() {
  const [remarks, setRemarks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRemark, setSelectedRemark] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("This Month");
  const { user } = useUser();

  const canManageRemarks = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'team leader';

  // New remark state
  const [newRemark, setNewRemark] = useState({
    employeeId: "",
    type: "General",
    details: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [remRes, empRes] = await Promise.all([
        fetch(`${API_URL}/remarks`),
        fetch(`${API_URL}/employees`)
      ]);
      if (remRes.ok) setRemarks(await remRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
    } catch (err) {
      console.error("Error fetching remarks data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRemark = async () => {
    if (!newRemark.employeeId || !newRemark.details) return;
    
    setIsSubmitting(true);
    try {
      const emp = employees.find(e => e.id === newRemark.employeeId || e.employeeId === newRemark.employeeId);
      const payload = {
        ...newRemark,
        employeeName: emp?.name || "Unknown",
        role: emp?.designation || "Staff",
        avatar: emp?.profilePhoto || "",
        addedBy: user?.name || "Admin",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      const res = await fetch(`${API_URL}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setNewRemark({ employeeId: "", type: "General", details: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Error creating remark:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRemark = async () => {
    if (!selectedRemark) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/remarks/${selectedRemark.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedRemark.type,
          details: selectedRemark.details
        })
      });

      if (res.ok) {
        setEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error updating remark:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRemark = async (id: string) => {
    if (!confirm("Are you sure you want to delete this remark?")) return;
    
    try {
      const res = await fetch(`${API_URL}/remarks/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Error deleting remark:", err);
    }
  };

  const openEditModal = (remark: any) => {
    setSelectedRemark(remark);
    setEditModalOpen(true);
  };

  const filteredRemarks = remarks.filter(r => {
    const matchesSearch = r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.details?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "All" || r.type === typeFilter;
    
    // Simple date filtering logic
    let matchesDate = true;
    if (dateFilter === "Today") {
       const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
       matchesDate = r.date === today;
    } else if (dateFilter === "This Month") {
       const currentMonth = new Date().toLocaleString('default', { month: 'short' });
       matchesDate = r.date?.includes(currentMonth);
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Remarks" 
        description="Manage employee feedback, warnings, and performance notes."
      >
        {canManageRemarks && (
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full sm:w-auto mt-4 sm:mt-0">
                <Plus className="w-4 h-4 mr-2" />
                New Remark
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add New Remark</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Create a new feedback, warning, or performance note for an employee.</p>
              </DialogHeader>
              
              <div className="space-y-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Employee</label>
                    <Select onValueChange={(val) => setNewRemark(prev => ({ ...prev, employeeId: val }))} value={newRemark.employeeId}>
                      <SelectTrigger className="w-full bg-white shadow-sm border-border hover:bg-gray-50/50 transition-colors">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id || emp.employeeId}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Date</label>
                    <div className="relative">
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input value={new Date().toLocaleDateString('en-GB').replace(/\//g, '-')} className="bg-gray-50 text-muted-foreground" readOnly />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Remark Type</label>
                  <Select onValueChange={(val) => setNewRemark(prev => ({ ...prev, type: val }))} value={newRemark.type}>
                    <SelectTrigger className="w-full bg-white shadow-sm border-border hover:bg-gray-50/50 transition-colors">
                      <SelectValue placeholder="Select remark type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Appreciation">Appreciation</SelectItem>
                      <SelectItem value="Warning">Warning</SelectItem>
                      <SelectItem value="Performance">Performance</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Remark Details</label>
                  <Textarea 
                    value={newRemark.details}
                    onChange={(e) => setNewRemark(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Enter detailed description of the remark..." 
                    className="h-32 resize-none bg-white"
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                <Button 
                  disabled={isSubmitting || !newRemark.employeeId || !newRemark.details}
                  className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-light text-white font-semibold" 
                  onClick={handleCreateRemark}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Send Remark"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Remark</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Update employee feedback, warnings, and performance notes.</p>
          </DialogHeader>
          
          {selectedRemark && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Employee</label>
                  <Select defaultValue="current">
                    <SelectTrigger className="w-full bg-white shadow-sm border-border">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={selectedRemark.avatar} />
                            <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                              {selectedRemark.employeeName?.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{selectedRemark.employeeName}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">{selectedRemark.employeeName}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Remark Type</label>
                  <Select 
                    value={selectedRemark.type} 
                    onValueChange={(val) => setSelectedRemark((prev:any) => ({ ...prev, type: val }))}
                  >
                    <SelectTrigger className="w-full bg-white shadow-sm border-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Appreciation">Appreciation</SelectItem>
                      <SelectItem value="Warning">Warning</SelectItem>
                      <SelectItem value="Performance">Performance</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input value={selectedRemark.date} className="bg-gray-50 text-muted-foreground pr-10" readOnly />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Added By</label>
                  <Input defaultValue={selectedRemark.addedBy} className="bg-gray-50 text-muted-foreground font-medium" readOnly />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Remark Details</label>
                <Textarea 
                  value={selectedRemark.details}
                  onChange={(e) => setSelectedRemark((prev:any) => ({ ...prev, details: e.target.value }))}
                  className="h-32 resize-none bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button 
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-light text-white font-semibold" 
              onClick={handleUpdateRemark}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee name..." 
                className="pl-9 bg-gray-50/50" 
              />
            </div>
            
            <div className="w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[130px] font-medium border-border shadow-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-brand-teal" />
                    <span>{typeFilter === "All" ? "Type: All" : typeFilter}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Appreciation">Appreciation</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Performance">Performance</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-auto">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[150px] font-medium border-border shadow-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span>{dateFilter}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Time">All Time</SelectItem>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="This Month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full xl:w-auto shadow-sm font-medium text-foreground"
            onClick={() => exportToCSV(filteredRemarks, 'remarks')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground font-bold border-b border-border bg-gray-50/30 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Remark Details</th>
                <th className="px-6 py-4">Added By</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                    <p className="text-sm text-muted-foreground mt-2">Loading remarks...</p>
                  </td>
                </tr>
              ) : filteredRemarks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    No remarks found.
                  </td>
                </tr>
              ) : (
                filteredRemarks.map((remark) => (
                  <tr key={remark.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-500">
                      {remark.date}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border rounded-lg overflow-hidden">
                          <AvatarImage src={remark.avatar} className="object-cover" />
                          <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                            {remark.employeeName?.split(' ').map((n:any) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-foreground text-[14px] leading-tight">{remark.employeeName}</div>
                          <div className="text-[12px] text-muted-foreground font-medium mt-0.5">{remark.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${getTypeBadge(remark.type)}`}>
                        {remark.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[350px]">
                      <div className="text-[13px] text-slate-600 leading-relaxed whitespace-normal line-clamp-2">
                        {remark.details}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {remark.addedBy}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canManageRemarks && (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal" onClick={() => openEditModal(remark)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteRemark(remark.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <TablePagination totalItems={filteredRemarks.length} itemsPerPage={10} currentPage={1} itemName="entries" />
      </div>
    </div>
  );
}
