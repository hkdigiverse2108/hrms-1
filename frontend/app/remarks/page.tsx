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
  Loader2,
  AlertCircle
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


const getTypeBadge = (type: string) => {
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const PENALTIES_FALLBACK = [
  { name: "Language rule violation", amount: 10 },
  { name: "Clean desk violation", amount: 20 },
  { name: "No socks", amount: 10 },
  { name: "Non-dry snacks", amount: 50 },
  { name: "Phone not submitted / unauthorized use", amount: 500 },
  { name: "Phone not on silent", amount: 50 },
  { name: "Activity not participated", amount: 20 },
  { name: "Disrespectful behavior", amount: 10 },
  { name: "Late Punch-in", amount: 50 },
];



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

  const canManageRemarks = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'hr';
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [penaltyTypes, setPenaltyTypes] = useState<any[]>([]);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [newType, setNewType] = useState({ name: "", amount: 0 });

  const getPenaltyAmount = (type: string) => {
    const p = penaltyTypes.find(item => item.name === type);
    return p ? p.amount : 0;
  };

  // New remark state
  const [newRemark, setNewRemark] = useState({
    employeeId: "",
    type: "Language rule violation",
    details: "Language rule violation. Penalty amount of ₹10 applied.",
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [remRes, empRes, typeRes] = await Promise.all([
        fetch(`${API_URL}/remarks`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/penalty-types`)
      ]);
      if (remRes.ok) setRemarks(await remRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (typeRes.ok) {
        const types = await typeRes.json();
        setPenaltyTypes(types.length > 0 ? types : PENALTIES_FALLBACK);
      } else {
        setPenaltyTypes(PENALTIES_FALLBACK);
      }
    } catch (err) {
      console.error("Error fetching remarks data:", err);
      setPenaltyTypes(PENALTIES_FALLBACK);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!newType.name || newType.amount <= 0) return;
    try {
      const res = await fetch(`${API_URL}/penalty-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType)
      });
      if (res.ok) {
        setNewType({ name: "", amount: 0 });
        fetchData();
      }
    } catch (err) {
      console.error("Error adding penalty type:", err);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this violation type?")) return;
    try {
      const res = await fetch(`${API_URL}/penalty-types/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Error deleting penalty type:", err);
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
        date: new Date(newRemark.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      const res = await fetch(`${API_URL}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setNewRemark({ 
          employeeId: "", 
          type: "Language rule violation", 
          details: "Language rule violation. Penalty amount of ₹10 applied.",
          date: new Date().toISOString().split('T')[0]
        });
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
    const matchesEmployee = employeeFilter === "All" || r.employeeId === employeeFilter || r.employeeName === employeeFilter;
    
    // Simple date filtering logic
    let matchesDate = true;
    if (dateFilter === "Today") {
       const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
       matchesDate = r.date === today;
    } else if (dateFilter === "This Month") {
       const currentMonth = new Date().toLocaleString('default', { month: 'short' });
       matchesDate = r.date?.includes(currentMonth);
    }
    
    return matchesSearch && matchesType && matchesDate && matchesEmployee;
  });

  const totalPages = Math.ceil(filteredRemarks.length / itemsPerPage);
  const paginatedRemarks = filteredRemarks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPenalty = filteredRemarks.reduce((sum, r) => sum + getPenaltyAmount(r.type), 0);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Remarks" 
        description="Manage employee feedback, warnings, and performance notes."
      >
        {canManageRemarks && (
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <Button 
              variant="outline"
              className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white font-medium shadow-sm w-full sm:w-auto"
              onClick={() => setManageTypesOpen(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Violation Types
            </Button>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm w-full sm:w-auto">
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
                      <Input 
                        type="date"
                        value={newRemark.date}
                        onChange={(e) => setNewRemark(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-white border-border hover:border-brand-teal/50 transition-all focus:ring-brand-teal" 
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Remark Type</label>
                  <Select onValueChange={(val) => {
                    const penalty = penaltyTypes.find(p => p.name === val);
                    if (penalty) {
                      setNewRemark(prev => ({ 
                        ...prev, 
                        type: val,
                        details: `${penalty.name}. Penalty amount of ₹${penalty.amount} applied.` 
                      }));
                    } else {
                      setNewRemark(prev => ({ ...prev, type: val }));
                    }
                  }} value={newRemark.type}>
                    <SelectTrigger className="w-full bg-white shadow-sm border-border hover:bg-gray-50/50 transition-colors">
                      <SelectValue placeholder="Select remark type" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Violations & Penalties</div>
                      {penaltyTypes.map((p, idx) => (
                        <SelectItem key={idx} value={p.name}>{p.name} (₹{p.amount})</SelectItem>
                      ))}
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
        </div>
        )}
      </PageHeader>

      <div className="space-y-6">

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
                      {penaltyTypes.map((p, idx) => (
                        <SelectItem key={idx} value={p.name}>{p.name}</SelectItem>
                      ))}
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
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
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
              <Select value={employeeFilter} onValueChange={(v) => { setEmployeeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px] font-medium border-border shadow-sm">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id || emp.name}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:min-w-[180px] sm:w-auto font-medium border-border shadow-sm">
                  <div className="flex items-center gap-2 px-1">
                    <Filter className="w-4 h-4 text-brand-teal flex-shrink-0" />
                    <span className="truncate">{typeFilter === "All" ? "Type: All" : typeFilter}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Violations</SelectItem>
                  {penaltyTypes.map((p, idx) => (
                    <SelectItem key={idx} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-auto">
              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:min-w-[140px] sm:w-auto font-medium border-border shadow-sm">
                  <div className="flex items-center gap-2 px-1">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
            className="w-full xl:w-auto shadow-sm font-medium text-foreground bg-white hover:bg-gray-50 border-border"
            onClick={() => {
              const exportData = filteredRemarks.map(r => ({
                'Date': r.date,
                'Employee Name': r.employeeName,
                'Role': r.role,
                'Violation Type': r.type,
                'Remark Details': r.details,
                'Penalty Amount': `₹${getPenaltyAmount(r.type)}`,
                'Added By': r.addedBy
              }));
              
              if (exportData.length > 0) {
                exportData.push({
                  'Date': 'TOTAL',
                  'Employee Name': '',
                  'Role': '',
                  'Violation Type': '',
                  'Remark Details': '',
                  'Penalty Amount': `₹${totalPenalty}`,
                  'Added By': ''
                });
              }
              
              exportToCSV(exportData, `Remarks_Penalty_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}`);
            }}
          >
            <Download className="w-4 h-4 mr-2 text-brand-teal" />
            Export CSV
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
                <th className="px-6 py-4 text-right">Penalty</th>
                {canManageRemarks && <th className="px-6 py-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={canManageRemarks ? 7 : 6} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-teal" />
                    <p className="text-sm text-muted-foreground mt-2">Loading remarks...</p>
                  </td>
                </tr>
              ) : paginatedRemarks.length === 0 ? (
                <tr>
                  <td colSpan={canManageRemarks ? 7 : 6} className="px-6 py-10 text-center text-muted-foreground">
                    No remarks found.
                  </td>
                </tr>
              ) : (
                paginatedRemarks.map((remark) => (
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
                    <td className="px-6 py-4 text-right font-bold text-red-600">
                      ₹{getPenaltyAmount(remark.type)}
                    </td>
                    {canManageRemarks && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal" onClick={() => openEditModal(remark)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteRemark(remark.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {filteredRemarks.length > 0 && (
              <tfoot className="bg-gray-50/50 border-t-2 border-border font-bold">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right text-slate-500 uppercase tracking-wider text-[11px] font-bold">Total Penalty Amount:</td>
                  <td className="px-6 py-4 text-right text-slate-900 text-lg font-black">₹{totalPenalty}</td>
                  {canManageRemarks && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        
        <TablePagination 
          totalItems={filteredRemarks.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
          itemName="entries" 
        />
      </div>

      {/* Penalty Types Management Modal */}
      <Dialog open={manageTypesOpen} onOpenChange={setManageTypesOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Manage Violation Types</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Add, edit, or remove the types of violations available in the system.</p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-gray-50/50 p-4 rounded-lg border border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Violation Type</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input 
                  placeholder="Violation Name" 
                  value={newType.name}
                  onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white flex-grow"
                />
                <Input 
                  type="number" 
                  placeholder="Amount (₹)" 
                  value={newType.amount || ""}
                  onChange={(e) => setNewType(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  className="bg-white w-full sm:w-[120px]"
                />
                <Button onClick={handleAddType} className="bg-brand-teal hover:bg-brand-teal-light text-white shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 sticky top-0 z-10 text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Violation Name</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {penaltyTypes.map((type, idx) => (
                    <tr key={type.id || idx} className="hover:bg-gray-50/30">
                      <td className="px-4 py-3 font-medium text-foreground">{type.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">₹{type.amount}</td>
                      <td className="px-4 py-3 text-right">
                        {type.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDeleteType(type.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setManageTypesOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
}
