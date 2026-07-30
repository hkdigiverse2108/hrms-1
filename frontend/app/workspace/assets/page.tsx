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
import { Select as AntSelect } from "antd";
import { BADGE_PRESETS } from "@/components/layout/Header";
import { CELEBRATION_PRESETS } from "@/components/common/SparklesCelebration";

export default function WorkspaceAssetsPage() {
  const { user } = useUserContext();
  const { isAdmin, canAdd, canEdit, canDelete, canView, loading: permLoading } = usePermissions("assets");
  
  const [settings, setSettings] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isAddBannerModalOpen, setIsAddBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [newBanner, setNewBanner] = useState({ imageUrl: "", startDate: "", endDate: "", externalUrl: "", isActive: true, heading: "", employeeIds: [] as string[], employeeId: "", badgeStyle: "gold", celebrationEffect: "poppers" });
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
    
    setNewBanner({ imageUrl: "", startDate: "", endDate: "", externalUrl: "", isActive: true, heading: "", employeeIds: [], employeeId: "", badgeStyle: "gold", celebrationEffect: "poppers" });
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
              setNewBanner({ imageUrl: "", startDate: "", endDate: "", externalUrl: "", isActive: true, heading: "", employeeIds: [], employeeId: "", badgeStyle: "gold", celebrationEffect: "poppers" });
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
            <DialogContent className="sm:max-w-[540px] max-h-[85vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>{editingBannerId ? "Edit Dashboard Banner" : "Add Dashboard Banner"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
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
                  <Label>Employees (Target Audience)</Label>
                  <AntSelect
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    className="w-full"
                    placeholder="All Employees (or select specific employees)"
                    value={newBanner.employeeIds || []}
                    onChange={(vals) => setNewBanner({ ...newBanner, employeeIds: vals, employeeId: vals?.[0] || "" })}
                    options={employees.map(emp => ({
                      value: emp.id,
                      label: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeId
                    }))}
                    getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
                  />
                </div>

                {/* Header Profile Ring Badge Selector & Live Preview */}
                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-xs text-slate-700 uppercase tracking-wider">Profile Badge Ring Style</Label>
                    <span className="text-[10px] text-brand-teal font-semibold">Live Header Preview</span>
                  </div>
                  
                  {/* Badge Preset Options */}
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(BADGE_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewBanner({ ...newBanner, badgeStyle: key })}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-all ${
                          (newBanner.badgeStyle || "gold") === key
                            ? "border-brand-teal bg-white ring-2 ring-brand-teal/20 shadow-xs font-bold"
                            : "border-slate-200 bg-white/60 hover:bg-white text-slate-600"
                        }`}
                      >
                        <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
                          {key !== "none" && (
                            <div className={`absolute -inset-0.5 rounded-full ${preset.class}`}></div>
                          )}
                          <div className="relative z-10 w-4 h-4 rounded-full bg-slate-200 border border-white"></div>
                        </div>
                        <span className="truncate text-[11px]">{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Live Avatar Preview */}
                  <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <div className="relative flex items-center justify-center">
                      {(newBanner.badgeStyle || "gold") !== "none" && (
                        <div className={`absolute -inset-[2.5px] rounded-full shadow-sm ${BADGE_PRESETS[newBanner.badgeStyle || "gold"]?.class || BADGE_PRESETS.gold.class}`}></div>
                      )}
                      <div className="relative z-10 w-8 h-8 rounded-full bg-brand-teal text-white flex items-center justify-center font-bold text-xs border-2 border-white shadow-2xs">
                        {employees.find(e => newBanner.employeeIds?.includes(e.id))?.name?.charAt(0) || "P"}
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        {employees.find(e => newBanner.employeeIds?.includes(e.id))?.name || "Targeted Employee"}
                        {(newBanner.badgeStyle || "gold") !== "none" && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black uppercase">Header Ring Active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {(newBanner.badgeStyle || "gold") !== "none" 
                          ? BADGE_PRESETS[newBanner.badgeStyle || "gold"]?.description
                          : "Standard avatar (No badge ring)"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Celebration Animation Selector */}
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <Label className="font-bold text-xs text-slate-700 uppercase tracking-wider">Dashboard Celebration Effect</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(CELEBRATION_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewBanner({ ...newBanner, celebrationEffect: key })}
                        className={`flex flex-col p-2 rounded-lg border text-xs text-left transition-all ${
                          (newBanner.celebrationEffect || "poppers") === key
                            ? "border-brand-teal bg-white ring-2 ring-brand-teal/20 shadow-xs font-bold"
                            : "border-slate-200 bg-white/60 hover:bg-white text-slate-600"
                        }`}
                      >
                        <span className="font-bold text-slate-800 text-[11px]">{preset.label}</span>
                        <span className="text-[9px] text-slate-500 line-clamp-1">{preset.description}</span>
                      </button>
                    ))}
                  </div>
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
                    <div className="flex items-start justify-between gap-2">
                      {banner.heading ? (
                        <h4 className="text-sm font-bold text-slate-800">{banner.heading}</h4>
                      ) : (
                        <h4 className="text-sm italic text-slate-400">Untitled announcement</h4>
                      )}

                      {/* Ring Style Tag */}
                      {(() => {
                        const styleKey = banner.badgeStyle || "gold";
                        const preset = BADGE_PRESETS[styleKey] || BADGE_PRESETS.gold;
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 bg-white text-slate-700 shadow-2xs shrink-0">
                            {styleKey !== "none" && (
                              <span className="relative w-2.5 h-2.5 flex items-center justify-center shrink-0">
                                <span className={`absolute inset-0 rounded-full ${preset.class}`}></span>
                                <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-white"></span>
                              </span>
                            )}
                            {preset.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {banner.startDate || banner.endDate 
                            ? `${banner.startDate || 'Any'} to ${banner.endDate || 'Any'}`
                            : 'Always Active'}
                        </span>
                      </div>
                      {(() => {
                        const targetIds = banner.employeeIds && Array.isArray(banner.employeeIds) && banner.employeeIds.length > 0
                          ? banner.employeeIds
                          : (banner.employeeId ? [banner.employeeId] : []);
                        
                        if (targetIds.length === 1) {
                          const empName = employees.find((e: any) => e.id === targetIds[0])?.name || '1 Employee';
                          return (
                            <div className="flex items-center gap-2 text-brand-teal">
                              <UserCircle className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                              <span className="truncate font-semibold">{empName}</span>
                            </div>
                          );
                        } else if (targetIds.length > 1) {
                          return (
                            <div className="flex items-center gap-2 text-brand-teal">
                              <UserCircle className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                              <span className="truncate font-semibold">{targetIds.length} Employees Selected</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-2 text-slate-600">
                              <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>All Employees</span>
                            </div>
                          );
                        }
                      })()}
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
                            const existingIds = banner.employeeIds && Array.isArray(banner.employeeIds)
                              ? banner.employeeIds
                              : (banner.employeeId ? [banner.employeeId] : []);
                            setNewBanner({
                              imageUrl: banner.imageUrl || "",
                              startDate: banner.startDate || "",
                              endDate: banner.endDate || "",
                              externalUrl: banner.externalUrl || "",
                              isActive: banner.isActive !== undefined ? banner.isActive : true,
                              heading: banner.heading || "",
                              employeeIds: existingIds,
                              employeeId: existingIds[0] || "",
                              badgeStyle: banner.badgeStyle || "gold",
                              celebrationEffect: banner.celebrationEffect || "poppers"
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
