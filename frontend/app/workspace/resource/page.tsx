"use client";

import React, { useState } from "react";
import { 
  Plus, 
  CheckCircle2, 
  Package, 
  Wrench,
  Image as ImageIcon,
  RefreshCw,
  Calendar as CalendarIcon,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/PageHeader";

const resources = [
  { id: "HKSET001", name: "Dual Monitor Setup (27\")", category: "IT Equipment", status: "Allocated", assignee: "Maya Patel", avatar: "/avatars/maya.jpg" },
  { id: "HKSET002", name: "Ergonomic Chair Pro", category: "Furniture", status: "Available", assignee: null, avatar: null },
  { id: "HKSET003", name: "Standing Desk V2", category: "Furniture", status: "Allocated", assignee: "Carlos Mendoza", avatar: "/avatars/carlos.jpg" },
  { id: "HKSET004", name: "MacBook Pro M2 Max", category: "IT Equipment", status: "Maintenance", assignee: null, avatar: null },
  { id: "HKSET005", name: "Docking Station Gen 3", category: "IT Equipment", status: "Allocated", assignee: "Maya Patel", avatar: "/avatars/maya.jpg" },
  { id: "HKSET006", name: "Filing Cabinet (3-Drawer)", category: "Furniture", status: "Available", assignee: null, avatar: null },
  { id: "HKSET007", name: "Dell UltraSharp 32\"", category: "IT Equipment", status: "Available", assignee: null, avatar: null },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Allocated": return "bg-blue-100/50 text-blue-700 border-blue-200";
    case "Available": return "bg-emerald-100/50 text-emerald-700 border-emerald-200";
    case "Maintenance": return "bg-amber-100/50 text-amber-700 border-amber-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function ResourceManagementPage() {
  const [isAddingMode, setIsAddingMode] = useState(false);

  if (isAddingMode) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <span className="cursor-pointer hover:text-foreground" onClick={() => setIsAddingMode(false)}>Resource Management</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground font-semibold">Add Resource</span>
        </div>
        
        <PageHeader title="Add New Resource" />

        <div className="bg-white border border-border rounded-xl shadow-sm max-w-4xl">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Resource Details</h3>
            <p className="text-sm text-muted-foreground">Enter the information for the new resource to be added to the inventory.</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Image Upload */}
            <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 bg-white border border-border rounded-xl flex items-center justify-center shadow-sm mb-3 text-muted-foreground">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">Click to upload resource image</p>
              <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF (max. 5MB)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Resource Name <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. Ergonomic Office Chair" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Resource ID <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <Input defaultValue="HKSET008" className="bg-gray-50 flex-1 font-medium text-muted-foreground" readOnly />
                  <Button variant="outline" size="icon" className="shrink-0 bg-white shadow-sm">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Category <span className="text-red-500">*</span></label>
                <Select>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">IT Equipment</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="software">Software License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Condition</label>
                <Select defaultValue="new">
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Location / Storage</label>
                <Input placeholder="e.g. IT Storage Room A" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Purchase Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input placeholder="Select date" className="bg-white pr-10" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Description & Notes</label>
              <Textarea placeholder="Add any additional details, specifications, or notes about this resource..." className="h-28 resize-none bg-white" />
            </div>

            <div className="flex items-center justify-between p-4 bg-brand-light/20 border border-brand-teal/10 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-brand-teal">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Assign immediately?</h4>
                  <p className="text-xs text-muted-foreground">Allocate this resource to an employee right away</p>
                </div>
              </div>
              <Switch />
            </div>
          </div>
          
          <div className="p-6 border-t border-border flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
            <Button variant="outline" className="font-medium bg-white" onClick={() => setIsAddingMode(false)}>Cancel</Button>
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Save Resource
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Resource Management">
        <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm" onClick={() => setIsAddingMode(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <h3 className="font-medium text-muted-foreground text-sm">Allocated Resources</h3>
          </div>
          <div className="text-4xl font-bold text-foreground mb-2">182</div>
          <p className="text-xs font-medium text-emerald-600">+12 this month</p>
        </div>
        
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-emerald-500" />
            <h3 className="font-medium text-muted-foreground text-sm">Available Resources</h3>
          </div>
          <div className="text-4xl font-bold text-foreground mb-2">58</div>
          <p className="text-xs font-medium text-muted-foreground">Ready for deployment</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-muted-foreground text-sm">Under Maintenance</h3>
          </div>
          <div className="text-4xl font-bold text-foreground mb-2">5</div>
          <p className="text-xs font-medium text-red-500">-2 from last week</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-foreground">All Resources</h2>
          <div className="flex items-center gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px] bg-gray-50">
                <span className="text-muted-foreground mr-1">Status:</span> <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="available">Available</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px] bg-gray-50">
                <span className="text-muted-foreground mr-1">Category:</span> <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="it">IT Equipment</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground font-semibold border-b border-border bg-gray-50/30 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Resource ID</th>
                <th className="px-6 py-4 font-medium">Name / Details</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resources.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-foreground">
                    {res.id}
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {res.name}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">
                    {res.category}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${getStatusBadge(res.status)}`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {res.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={res.avatar || ""} />
                          <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                            {res.assignee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground text-sm">{res.assignee}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
