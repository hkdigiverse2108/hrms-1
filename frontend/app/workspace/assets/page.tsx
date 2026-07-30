"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Calendar, 
  Trash2, 
  Image as ImageIcon,
  X,
  Upload,
  Loader2,
  Link as LinkIcon,
  UserCircle,
  ShieldAlert,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/PageHeader";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserContext } from "@/context/UserContext";

export default function WorkspaceAssetsPage() {
  const { user } = useUserContext();
  const { isAdmin, canAdd, canEdit, canDelete, canView, loading: permLoading } = usePermissions("assets");
  
  const [settings, setSettings] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isAddBannerModalOpen, setIsAddBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [newBanner, setNewBanner] = useState({ imageUrl: "", startDate: "", endDate: "", externalUrl: "", isActive: true, heading: "", employeeId: "" });
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin || canView) {
      fetchSettings();
      fetchEmployees();
    }
  }, [isAdmin, canView]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/system-settings?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        setSettings(await res.json());
      } else {
        toast.error("Failed to load settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while loading settings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setNewBanner(prev => ({ ...prev, imageUrl: data.url }));
        toast.success("Banner image uploaded!");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const saveSettingsToAPI = async (newSettings: any) => {
    try {
      const res = await fetch(`${API_URL}/system-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        setSettings(await res.json());
      } else {
        toast.error("Failed to auto-save banner settings.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addDashboardBanner = () => {
    if (!newBanner.imageUrl) {
      toast.error("Image is required.");
      return;
    }
    
    let normalizedUrl = newBanner.externalUrl ? newBanner.externalUrl.trim() : "";
    if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('/')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    const bannerToSave = { ...newBanner, externalUrl: normalizedUrl };

    let updatedBanners;
    if (editingBannerId) {
      updatedBanners = (settings?.dashboardBanners || []).map((b: any) => b.id === editingBannerId ? { ...bannerToSave, id: editingBannerId } : b);
    } else {
      const banner = { ...bannerToSave, id: Date.now().toString() };
      updatedBanners = [...(settings?.dashboardBanners || []), banner];
    }
    
    const newSettings = { ...settings, dashboardBanners: updatedBanners };
    setSettings(newSettings);
    saveSettingsToAPI(newSettings);
    
    setNewBanner({ imageUrl: "", startDate: "", endDate: "", externalUrl: "", isActive: true, heading: "", employeeId: "" });
    setEditingBannerId(null);
    setIsAddBannerModalOpen(false);
    toast.success(editingBannerId ? "Banner updated successfully!" : "Banner added successfully!");
  };

  const removeDashboardBanner = (id: string) => {
    const updatedBanners = (settings?.dashboardBanners || []).filter((b: any) => b.id !== id);
    const newSettings = { ...settings, dashboardBanners: updatedBanners };
    setSettings(newSettings);
    saveSettingsToAPI(newSettings);
    toast.success("Banner removed!");
  };

  const toggleBannerActive = (id: string, isActive: boolean) => {
    const updatedBanners = (settings?.dashboardBanners || []).map((b: any) => b.id === id ? { ...b, isActive } : b);
    const newSettings = { ...settings, dashboardBanners: updatedBanners };
    setSettings(newSettings);
    saveSettingsToAPI(newSettings);
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (!isAdmin && !canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center bg-white rounded-2xl border border-red-100 shadow-sm max-w-lg mx-auto my-12">
        <ShieldAlert className="w-16 h-16 text-rose-500 animate-bounce" />
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the Workspace Assets page. Please contact your administrator.</p>
      </div>
    );
  }

  const canEditBanners = isAdmin || canEdit;
  const canDeleteBanners = isAdmin || canDelete;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Workspace Assets" 
          description="Manage image banners and announcements displayed in the dashboard carousel."
        />
        {(isAdmin || canAdd) && (
          <Dialog open={isAddBannerModalOpen} onOpenChange={(val) => {
            if (!val) {
              setNewBanner({ imageUrl: "", startDate: "", endDate: "", externalUrl: "", isActive: true, heading: "", employeeId: "" });
              setEditingBannerId(null);
            }
            setIsAddBannerModalOpen(val);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-brand-teal hover:bg-brand-teal-light text-white h-9">
                <Plus className="w-4 h-4 mr-2" />
                Add Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingBannerId ? "Edit Dashboard Banner" : "Add Dashboard Banner"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Banner Image <span className="text-red-500">*</span></Label>
                  {newBanner.imageUrl ? (
                    <div className="relative border rounded-lg p-2 bg-slate-50">
                      <img src={newBanner.imageUrl.startsWith('http') ? newBanner.imageUrl : `${API_URL}${newBanner.imageUrl}`} alt="Preview" className="h-32 w-full object-cover rounded-md" />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-4 right-4 h-6 w-6 rounded-full"
                        onClick={() => setNewBanner({...newBanner, imageUrl: ""})}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50">
                      <label className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-6 h-6 text-slate-400 mb-2" />
                        <span className="text-sm font-semibold text-brand-teal">Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={isUploadingBanner} />
                      </label>
                      {isUploadingBanner && <p className="text-xs text-muted-foreground mt-2 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Uploading...</p>}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Heading (Optional)</Label>
                  <Input placeholder="Enter announcement heading..." value={newBanner.heading || ""} onChange={e => setNewBanner({...newBanner, heading: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <SearchableSelect
                    options={[
                      { value: "all", label: "All Employees" },
                      ...employees.map(emp => ({
                        value: emp.id,
                        label: emp.name || `${emp.firstName} ${emp.lastName}`
                      }))
                    ]}
                    value={newBanner.employeeId || "all"}
                    onValueChange={(val) => setNewBanner({...newBanner, employeeId: val === "all" ? "" : val})}
                    placeholder="All Employees"
                    triggerClassName="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date (Optional)</Label>
                    <Input type="date" value={newBanner.startDate} onChange={e => setNewBanner({...newBanner, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <Input type="date" value={newBanner.endDate} onChange={e => setNewBanner({...newBanner, endDate: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>External URL (Optional)</Label>
                  <Input placeholder="https://example.com" value={newBanner.externalUrl} onChange={e => setNewBanner({...newBanner, externalUrl: e.target.value})} />
                </div>
                <div className="flex justify-end pt-4 gap-2">
                  <Button variant="outline" onClick={() => setIsAddBannerModalOpen(false)}>Cancel</Button>
                  <Button className="bg-brand-teal hover:bg-brand-teal-light text-white" onClick={addDashboardBanner}>
                    {editingBannerId ? "Save Changes" : "Add to List"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-6 border shadow-sm">
        <div className="space-y-4">
          {(settings?.dashboardBanners || []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(settings?.dashboardBanners || []).map((banner: any) => (
                <div key={banner.id} className="flex flex-col p-4 border rounded-xl bg-slate-50/30 hover:bg-slate-50/70 transition-all gap-4">
                  <div className="w-full h-44 rounded-lg overflow-hidden border bg-white flex items-center justify-center shrink-0">
                    <img src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `${API_URL}${banner.imageUrl}`} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {banner.heading ? (
                      <h4 className="text-sm font-bold text-slate-800">{banner.heading}</h4>
                    ) : (
                      <h4 className="text-sm italic text-slate-400">Untitled announcement</h4>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {banner.startDate || banner.endDate 
                            ? `${banner.startDate || 'Any'} to ${banner.endDate || 'Any'}`
                            : 'Always Active'}
                        </span>
                      </div>
                      {banner.employeeId ? (
                        <div className="flex items-center gap-2 text-brand-teal">
                          <UserCircle className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                          <span className="truncate font-semibold">
                            {employees.find((e: any) => e.id === banner.employeeId)?.name || 'Employee'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-600">
                          <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>All Employees</span>
                        </div>
                      )}
                    </div>
                    {banner.externalUrl && (
                      <a 
                        href={banner.externalUrl.startsWith('http') || banner.externalUrl.startsWith('/') ? banner.externalUrl : `https://${banner.externalUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-brand-teal hover:underline cursor-pointer"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span className="truncate max-w-[250px] block">{banner.externalUrl}</span>
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={banner.isActive} 
                        onCheckedChange={(c) => toggleBannerActive(banner.id, c)} 
                        disabled={!canEditBanners} 
                      />
                      <Label className="text-xs font-semibold cursor-pointer">Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEditBanners && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-brand-teal hover:text-brand-teal hover:bg-brand-light h-8 w-8" 
                          onClick={() => {
                            setNewBanner({
                              imageUrl: banner.imageUrl || "",
                              startDate: banner.startDate || "",
                              endDate: banner.endDate || "",
                              externalUrl: banner.externalUrl || "",
                              isActive: banner.isActive !== undefined ? banner.isActive : true,
                              heading: banner.heading || "",
                              employeeId: banner.employeeId || ""
                            });
                            setEditingBannerId(banner.id);
                            setIsAddBannerModalOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteBanners && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8" 
                          onClick={() => removeDashboardBanner(banner.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <ImageIcon className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">No dashboard banners found</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Add your first promotional or announcement banner to show in the dashboard carousel.</p>
              {(isAdmin || canAdd) && (
                <Button size="sm" onClick={() => setIsAddBannerModalOpen(true)} className="bg-brand-teal hover:bg-brand-teal-light text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Banner
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
