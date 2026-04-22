"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Download,
  Edit2,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { TablePagination } from "@/components/common/TablePagination";

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRemark, setSelectedRemark] = useState<any>(null);

  const openEditModal = (remark: any) => {
    setSelectedRemark(remark);
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Remarks" 
        description="Manage employee feedback, warnings, and performance notes."
      >
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
                  <Select>
                    <SelectTrigger className="w-full bg-white shadow-sm border-border hover:bg-gray-50/50 transition-colors">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="michael">Michael Chang</SelectItem>
                      <SelectItem value="emily">Emily Roberts</SelectItem>
                      <SelectItem value="david">David Wilson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input defaultValue="24-10-2026" className="bg-white pr-10" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Remark Type</label>
                <Select>
                  <SelectTrigger className="w-full bg-white shadow-sm border-border hover:bg-gray-50/50 transition-colors">
                    <SelectValue placeholder="Select remark type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appreciation">Appreciation</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Remark Details</label>
                <Textarea 
                  placeholder="Enter detailed description of the remark..." 
                  className="h-32 resize-none bg-white"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-light text-white font-semibold" onClick={() => setCreateModalOpen(false)}>
                Send Remark
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                              {selectedRemark.employee.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{selectedRemark.employee}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">{selectedRemark.employee}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Remark Type</label>
                  <div className={`inline-flex w-full items-center px-3 py-2 rounded-md border text-sm font-medium ${getTypeBadge(selectedRemark.type)}`}>
                    {selectedRemark.type}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input defaultValue={selectedRemark.date} className="bg-white pr-10" />
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
                  defaultValue={selectedRemark.details}
                  className="h-32 resize-none bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-light text-white font-semibold" onClick={() => setEditModalOpen(false)}>
              Save Changes
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
              <Input placeholder="Search by employee name..." className="pl-9 bg-gray-50/50" />
            </div>
            
            <Button variant="outline" className="w-full sm:w-auto shadow-sm font-medium">
              <Filter className="w-4 h-4 mr-2" />
              Type: All
            </Button>
            
            <Button variant="outline" className="w-full sm:w-auto shadow-sm font-medium">
              <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
              This Month
            </Button>
          </div>

          <Button variant="outline" className="w-full xl:w-auto shadow-sm font-medium text-foreground">
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
              {remarksData.map((remark) => (
                <tr key={remark.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 font-semibold text-slate-500">
                    {remark.date}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border rounded-lg overflow-hidden">
                        <AvatarImage src={remark.avatar} className="object-cover" />
                        <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                          {remark.employee.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-foreground text-[14px] leading-tight">{remark.employee}</div>
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
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal" onClick={() => openEditModal(remark)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <TablePagination totalItems={35} itemsPerPage={5} currentPage={1} itemName="entries" />
      </div>
    </div>
  );
}
