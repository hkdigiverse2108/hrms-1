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
  ChevronRight,
  Pencil,
  Trash2,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/PageHeader";
import { useApi } from "@/hooks/useApi";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Allocated": return "bg-blue-100/50 text-blue-700 border-blue-200";
    case "Available": return "bg-emerald-100/50 text-emerald-700 border-emerald-200";
    case "Maintenance": return "bg-amber-100/50 text-amber-700 border-amber-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function ResourceManagementPage() {
  const { user, isLoading: userLoading } = useUser();
  const { data, isLoading } = useApi();
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const initialFormState = {
    name: "",
    category: "",
    status: "Available",
    assignedTo: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    description: "",
    value: 0
  };

  // Form state
  const [formData, setFormData] = useState(initialFormState);
  const [isAssignedImmediately, setIsAssignedImmediately] = useState(false);

  const isAdminOrHR = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "hr";

  const handleEditClick = (resource: any) => {
    setEditingId(resource.id);
    setFormData({
      name: resource.name,
      category: resource.category,
      status: resource.status,
      assignedTo: resource.assignedTo || "",
      purchaseDate: resource.purchaseDate || new Date().toISOString().split('T')[0],
      description: resource.description || "",
      value: resource.value || 0
    });
    setIsAssignedImmediately(!!resource.assignedTo);
    setIsAddingMode(true);
  };

  const handleDeleteResource = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;

    try {
      const response = await fetch(`${API_URL}/assets/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Resource deleted successfully");
        window.location.reload();
      } else {
        toast.error("Failed to delete resource");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while deleting");
    }
  };

  const handleCancel = () => {
    setIsAddingMode(false);
    setEditingId(null);
    setFormData(initialFormState);
    setIsAssignedImmediately(false);
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <RefreshCw className="w-8 h-8 text-brand-teal animate-spin" />
      </div>
    );
  }

  if (!isAdminOrHR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4 px-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <Wrench className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This section is restricted to Admin and HR personnel only. Please contact your administrator if you believe this is an error.
        </p>
        <Button 
          className="bg-brand-teal hover:bg-brand-teal-light text-white"
          onClick={() => window.location.href = "/"}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const allResources = data?.assets || [];
  const filteredResources = allResources.filter((res: any) => {
    const matchStatus = statusFilter === "all" || res.status.toLowerCase() === statusFilter.toLowerCase();
    const matchType = typeFilter === "all" || res.category === typeFilter;
    return matchStatus && matchType;
  });

  const resources = filteredResources;

  const handleSaveResource = async () => {
    if (!formData.name || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingId ? `${API_URL}/assets/${editingId}` : `${API_URL}/assets`;
      const method = editingId ? "PUT" : "POST";
      
      const payload = {
        ...formData,
        status: isAssignedImmediately ? "Allocated" : formData.status,
      };

      if (!editingId) {
        // Only for new assets
        (payload as any).assetId = `HKSET${String(resources.length + 1).padStart(3, '0')}`;
        (payload as any).serialNumber = `SN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(editingId ? "Resource updated successfully" : "Resource added successfully");
        handleCancel();
        // Refresh page to show new data
        window.location.reload();
      } else {
        toast.error(editingId ? "Failed to update resource" : "Failed to add resource");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isAddingMode) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <span className="cursor-pointer hover:text-foreground" onClick={handleCancel}>Resource Management</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground font-semibold">{editingId ? "Edit Resource" : "Add Resource"}</span>
        </div>
        
        <PageHeader title={editingId ? "Edit Resource" : "Add New Resource"} />

        <div className="bg-white border border-border rounded-xl shadow-sm max-w-4xl">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">Resource Details</h3>
            <p className="text-sm text-muted-foreground">{editingId ? "Modify the information for the existing resource." : "Enter the information for the new resource to be added to the inventory."}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Resource Name <span className="text-red-500">*</span></label>
                <Input 
                  placeholder="e.g. Ergonomic Office Chair" 
                  className="bg-white" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Assign To</label>
                <Select 
                  value={formData.assignedTo}
                  onValueChange={(val) => setFormData({...formData, assignedTo: val})}
                  disabled={!isAssignedImmediately && formData.status !== "Allocated"}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.name || emp.firstName + ' ' + emp.lastName}>
                        {emp.name || `${emp.firstName} ${emp.lastName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Category <span className="text-red-500">*</span></label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PC">PC / Laptop</SelectItem>
                    <SelectItem value="CPU">CPU</SelectItem>
                    <SelectItem value="Monitor">Monitor</SelectItem>
                    <SelectItem value="Keyboard">Keyboard</SelectItem>
                    <SelectItem value="Mouse">Mouse</SelectItem>
                    <SelectItem value="Mousepad">Mousepad</SelectItem>
                    <SelectItem value="Parking Card">Parking Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Purchase Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input 
                    type="date"
                    placeholder="Select date" 
                    className="bg-white pr-10" 
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Value (Amount)</label>
                <Input 
                  type="number"
                  placeholder="0.00" 
                  className="bg-white" 
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Initial Status</label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Allocated">Allocated</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Description & Notes</label>
              <Textarea 
                placeholder="Add any additional details, specifications, or notes about this resource..." 
                className="h-28 resize-none bg-white" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
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
              <Switch 
                checked={isAssignedImmediately}
                onCheckedChange={(checked) => {
                  setIsAssignedImmediately(checked);
                  if (checked) {
                    setFormData({...formData, status: "Allocated"});
                  } else {
                    setFormData({...formData, status: "Available"});
                  }
                }}
              />
            </div>
          </div>
          
          <div className="p-6 border-t border-border flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
            <Button variant="outline" className="font-medium bg-white" onClick={handleCancel} disabled={isSaving}>Cancel</Button>
            <Button 
              className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm"
              onClick={handleSaveResource}
              disabled={isSaving}
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isSaving ? "Saving..." : (editingId ? "Update Resource" : "Save Resource")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const allocatedCount = allResources.filter((r: any) => r.status === "Allocated").length;
  const availableCount = allResources.filter((r: any) => r.status === "Available").length;
  const maintenanceCount = allResources.filter((r: any) => r.status === "Maintenance").length;

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
          <div className="text-4xl font-bold text-foreground mb-2">{allocatedCount}</div>
          <p className="text-xs font-medium text-emerald-600">+0 this month</p>
        </div>
        
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-emerald-500" />
            <h3 className="font-medium text-muted-foreground text-sm">Available Resources</h3>
          </div>
          <div className="text-4xl font-bold text-foreground mb-2">{availableCount}</div>
          <p className="text-xs font-medium text-muted-foreground">Ready for deployment</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-muted-foreground text-sm">Under Maintenance</h3>
          </div>
          <div className="text-4xl font-bold text-foreground mb-2">{maintenanceCount}</div>
          <p className="text-xs font-medium text-red-500">Scheduled service</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-foreground">All Resources</h2>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-gray-50">
                <span className="text-muted-foreground mr-1">Status:</span> <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] bg-gray-50">
                <span className="text-muted-foreground mr-1">Type:</span> <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PC">PC / Laptop</SelectItem>
                <SelectItem value="CPU">CPU</SelectItem>
                <SelectItem value="Monitor">Monitor</SelectItem>
                <SelectItem value="Keyboard">Keyboard</SelectItem>
                <SelectItem value="Mouse">Mouse</SelectItem>
                <SelectItem value="Mousepad">Mousepad</SelectItem>
                <SelectItem value="Parking Card">Parking Card</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground font-semibold border-b border-border bg-gray-50/30 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium text-foreground">Name / Details</th>
                <th className="px-6 py-4 font-medium text-foreground">Category</th>
                <th className="px-6 py-4 font-medium text-foreground">Status</th>
                <th className="px-6 py-4 font-medium text-foreground">Assigned To</th>
                <th className="px-6 py-4 font-medium text-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    {isLoading ? "Loading resources..." : "No resources found. Click 'Add Resource' to get started."}
                  </td>
                </tr>
              ) : resources.map((res: any) => (
                <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    <div className="flex flex-col">
                      <span>{res.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{res.assetId}</span>
                    </div>
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
                    {res.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={res.avatar || ""} />
                          <AvatarFallback className="bg-brand-light text-brand-teal text-[10px] font-bold">
                            {res.assignedTo.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground text-sm">{res.assignedTo}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-muted-foreground hover:text-brand-teal hover:bg-brand-light/50"
                        onClick={() => handleEditClick(res)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteResource(res.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
