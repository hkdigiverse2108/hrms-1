"use client";

import React, { useState, useEffect } from "react";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";
import { Loader2, Plus, Trash2, Save, X, Check, Maximize, Minimize, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ContentCalendarTableProps {
  clientId: string;
}

export function ContentCalendarTable({ clientId }: ContentCalendarTableProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { confirm } = useConfirm();

  const [holidays, setHolidays] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    scriptDateOffset: 14,
    shootDateOffset: 12,
    editingStartOffset: 6,
    approvalOffset: 5
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>({});

  useEffect(() => {
    // Fetch all holidays once
    fetch(`${API_URL}/holidays`)
      .then(res => res.json())
      .then(data => setHolidays(data || []))
      .catch(err => console.error("Failed to fetch holidays", err));
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/content-calendar-settings?clientId=${clientId}&monthYear=${monthYear}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSettingsForm(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/content-calendar?clientId=${clientId}&monthYear=${monthYear}`);
      if (res.ok) {
        const data = await res.json();
        data.sort((a: any, b: any) => {
          if (!a.postingDate) return 1;
          if (!b.postingDate) return -1;
          return a.postingDate.localeCompare(b.postingDate);
        });
        setEntries(data);
      }
    } catch (error) {
      console.error("Failed to fetch calendar entries", error);
      toast.error("Failed to load content calendar");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchSettings();
  }, [clientId, monthYear]);

  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isFullScreen]);

  const handleAddRow = async () => {
    try {
      const res = await fetch(`${API_URL}/content-calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          monthYear,
        }),
      });
      if (res.ok) {
        const newEntry = await res.json();
        setEntries([...entries, newEntry]);
        startEditing(newEntry);
      }
    } catch (error) {
      toast.error("Failed to add new row");
    }
  };

  const startEditing = (entry: any) => {
    setEditingId(entry.id);
    setEditForm({ ...entry });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveRow = async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/content-calendar/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntries(entries.map(e => e.id === editingId ? updated : e));
        setEditingId(null);
        toast.success("Row updated");
      } else {
        toast.error("Failed to update row");
      }
    } catch (error) {
      toast.error("Failed to update row");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const payload = {
        ...settingsForm,
        clientId,
        monthYear,
        scriptDateOffset: Number(settingsForm.scriptDateOffset),
        shootDateOffset: Number(settingsForm.shootDateOffset),
        editingStartOffset: Number(settingsForm.editingStartOffset),
        approvalOffset: Number(settingsForm.approvalOffset),
      };
      const res = await fetch(`${API_URL}/content-calendar-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setIsSettingsOpen(false);
        toast.success("Settings saved for this month!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  const handleDeleteRow = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Delete Row",
      message: "Are you sure you want to delete this row? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
    });
    
    if (!isConfirmed) return;
    
    try {
      const res = await fetch(`${API_URL}/content-calendar/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEntries(entries.filter(e => e.id !== id));
        toast.success("Row deleted");
      }
    } catch (error) {
      toast.error("Failed to delete row");
    }
  };



  const tableHeaders = [
    "Posting Date", "Posting Day", "Post/Reel", "Concept", "Topic", "Reference",
    "Script Date", "Script Link", "Shoot Date", "Shoot Link", "Editing Start",
    "Final Reel Link", "Final Post Link", "Approval by Het", "Is Approved", "Thumbnail Link",
    "Posting Link IG", "Actual Posting Date", ""
  ];

  const fieldKeys = [
    "postingDate", "postingDay", "postReel", "concept", "topic", "reference",
    "scriptDate", "scriptLink", "shootDate", "shootLink", "editingStart",
    "finalReelLink", "finalPostLink", "approval", "isApproved", "thumbnailLink",
    "postingLinkOfIg", "actualPostingDate"
  ];

  const formatDateDisplay = (dateString: any) => {
    if (!dateString) return null;
    if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-");
      return `${day}-${month}-${year}`;
    }
    return dateString;
  };

  const handleDaySelect = (dateString: string) => {
    setEditForm((prev: any) => {
      const updates: any = { postingDate: dateString };
      try {
        if (dateString) {
          let d: Date | undefined;
          if (dateString.includes("-")) {
            d = new Date(dateString);
          } else if (dateString.includes("/")) {
            const parts = dateString.split("/");
            d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
          if (d && !isNaN(d.getTime())) {
            // Posting Day
            updates.postingDay = d.toLocaleDateString("en-US", { weekday: "long" });

            // Helper to subtract working days and return YYYY-MM-DD
            const isHoliday = (date: Date) => {
              const dStr = date.toISOString().split('T')[0];
              return holidays.some(h => h.date && h.date.startsWith(dStr));
            };

            const subtractDays = (startDate: Date, workingDaysToSubtract: number) => {
              let currentDate = new Date(startDate);
              let daysSubtracted = 0;
              
              while (daysSubtracted < workingDaysToSubtract) {
                currentDate.setDate(currentDate.getDate() - 1);
                const dayOfWeek = currentDate.getDay(); // 0 is Sunday
                if (dayOfWeek !== 0 && !isHoliday(currentDate)) {
                  daysSubtracted++;
                }
              }
              return currentDate.toISOString().split('T')[0];
            };

            // Calculate dates if they aren't already manually set
            if (!prev.scriptDate) updates.scriptDate = subtractDays(d, settings.scriptDateOffset);
            if (!prev.shootDate) updates.shootDate = subtractDays(d, settings.shootDateOffset);
            if (!prev.editingStart) updates.editingStart = subtractDays(d, settings.editingStartOffset);
            if (!prev.approval) updates.approval = subtractDays(d, settings.approvalOffset);
          }
        }
      } catch (e) {
        console.error("Error parsing date", e);
      }
      return { ...prev, ...updates };
    });
  };

  const containerClasses = isFullScreen 
    ? "fixed inset-0 z-50 bg-slate-50 flex flex-col" 
    : "bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col mt-6 min-h-[calc(100vh-350px)]";

  return (
    <div className={containerClasses}>
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Content Calendar</h2>
          <p className="text-xs text-slate-500">Plan and track content creation and posting</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            type="month" 
            value={monthYear} 
            onChange={(e) => setMonthYear(e.target.value)} 
            className="w-[180px] h-9"
          />
          <Button onClick={() => { setSettingsForm(settings); setIsSettingsOpen(true); }} size="icon" variant="outline" title="Settings">
            <Settings2 className="w-4 h-4 text-slate-600" />
          </Button>
          <Button onClick={handleAddRow} size="sm" className="bg-brand-teal hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-1" />
            Add Row
          </Button>
          <Button onClick={() => setIsFullScreen(!isFullScreen)} size="icon" variant="outline">
            {isFullScreen ? <Minimize className="w-4 h-4 text-slate-600" /> : <Maximize className="w-4 h-4 text-slate-600" />}
          </Button>
        </div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calendar Settings ({monthYear})</DialogTitle>
            <DialogDescription>
              Configure the working day offsets for automatic date calculations for this specific month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-2">Script Date Offset</Label>
              <Input type="number" className="col-span-2" value={settingsForm.scriptDateOffset || 0} onChange={e => setSettingsForm({...settingsForm, scriptDateOffset: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-2">Shoot Date Offset</Label>
              <Input type="number" className="col-span-2" value={settingsForm.shootDateOffset || 0} onChange={e => setSettingsForm({...settingsForm, shootDateOffset: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-2">Editing Start Offset</Label>
              <Input type="number" className="col-span-2" value={settingsForm.editingStartOffset || 0} onChange={e => setSettingsForm({...settingsForm, editingStartOffset: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right col-span-2">Approval Offset</Label>
              <Input type="number" className="col-span-2" value={settingsForm.approvalOffset || 0} onChange={e => setSettingsForm({...settingsForm, approvalOffset: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} className="bg-brand-teal text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={`no-scrollbar ${isFullScreen ? 'flex-1 overflow-auto' : 'overflow-x-auto'}`}>
        {isLoading ? (
          <div className="flex justify-center p-8 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse border border-slate-200 text-sm whitespace-nowrap min-w-[2000px]">
            <thead>
              <tr className="bg-slate-50">
                {tableHeaders.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-semibold text-slate-600 text-xs uppercase tracking-wider border border-slate-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="px-4 py-8 text-center text-slate-500">
                    No entries for this month. Click "Add Row" to start planning.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  
                  return (
                    <tr key={entry.id} className="odd:bg-white even:bg-slate-50">
                      {fieldKeys.map((key) => (
                        <td key={key} className="px-2 py-1 border border-slate-200 max-w-[200px]">
                          {isEditing ? (
                            key === "postReel" ? (
                              <Select 
                                value={editForm[key] || ""} 
                                onValueChange={(val) => setEditForm({ ...editForm, [key]: val })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Post">Post</SelectItem>
                                  <SelectItem value="Reel">Reel</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : key === "isApproved" ? (
                              <Select 
                                value={editForm[key] || ""} 
                                onValueChange={(val) => setEditForm({ ...editForm, [key]: val })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Approval" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yes">Yes</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : key === "postingDate" ? (
                              <Input 
                                type="date"
                                className="h-8 text-xs px-2 py-1 min-w-[120px]"
                                value={editForm[key] || ""}
                                onChange={(e) => handleDaySelect(e.target.value)}
                              />
                            ) : ["scriptDate", "shootDate", "editingStart", "actualPostingDate", "approval"].includes(key) ? (
                              <Input 
                                type="date"
                                className="h-8 text-xs px-2 py-1 min-w-[120px]"
                                value={editForm[key] || ""}
                                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                              />
                            ) : (
                              <Input 
                                className="h-8 text-xs px-2 py-1"
                                value={editForm[key] || ""}
                                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                              />
                            )
                          ) : (
                            <div 
                              className="truncate px-1 cursor-pointer min-h-[20px] flex items-center text-xs" 
                              onClick={() => startEditing(entry)}
                              title={entry[key] || ""}
                            >
                              {entry[key] && (key.toLowerCase().includes("link") || key === "reference") && entry[key].startsWith("http") ? (
                                <a href={entry[key]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                                  Link
                                </a>
                              ) : (
                                formatDateDisplay(entry[key]) || null
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-1 border border-slate-200 min-w-[80px]">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50" onClick={handleSaveRow} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:bg-slate-100" onClick={cancelEditing}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteRow(entry.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

