"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  Search, 
  Info,
  ShieldAlert,
  Loader2,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/PageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface GalleryItem {
  id: string;
  eventName: string;
  date: string;
  link: string;
  purpose: string;
}

export default function GalleryPage() {
  const { isAdmin, canAdd, canEdit, canDelete, canView, loading: permLoading } = usePermissions("gallery");
  const { confirm } = useConfirm();

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [eventName, setEventName] = useState("");
  const [date, setDate] = useState("");
  const [link, setLink] = useState("");
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    if (canView || isAdmin) {
      fetchEvents();
    }
  }, [canView, isAdmin]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/gallery`);
      if (response.ok) {
        setItems(await response.json());
      } else {
        toast.error("Failed to load gallery events");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading gallery events");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setEventName("");
    setDate(new Date().toISOString().split("T")[0]);
    setLink("");
    setPurpose("");
    setIsOpen(true);
  };

  const handleOpenEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setEventName(item.eventName);
    setDate(item.date ? item.date.split("T")[0] : "");
    setLink(item.link || "");
    setPurpose(item.purpose || "");
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      toast.error("Event Name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        eventName,
        date: date || null,
        link,
        purpose
      };

      if (editingItem) {
        // Edit existing
        const response = await fetch(`${API_URL}/gallery/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          toast.success("Event updated successfully");
          fetchEvents();
          setIsOpen(false);
        } else {
          toast.error("Failed to update event");
        }
      } else {
        // Create new
        const response = await fetch(`${API_URL}/gallery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          toast.success("Event added successfully");
          fetchEvents();
          setIsOpen(false);
        } else {
          toast.error("Failed to add event");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Delete Event?",
      message: "Are you sure you want to delete this event from the gallery?",
      confirmText: "Delete",
      cancelText: "Cancel"
    });

    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/gallery/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        toast.success("Event deleted successfully");
        fetchEvents();
      } else {
        toast.error("Failed to delete event");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while deleting");
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterDate) {
      if (!item.date) return false;
      const itemDateOnly = item.date.split("T")[0];
      if (itemDateOnly !== filterDate) return false;
    }

    return true;
  });

  if (permLoading) {
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
        <p className="text-muted-foreground">You do not have permission to view the Gallery workspace. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6">
      <PageHeader 
        title="Workspace Gallery" 
        description="Manage events, share links, and keep track of purposes"
      />

      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-stretch md:items-center">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search events or purposes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50/50 border-gray-200"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-48 flex items-center">
              <span className="text-xs text-gray-500 mr-2 shrink-0">Date</span>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-slate-50/50 border-gray-200 text-xs"
              />
            </div>
            {filterDate && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilterDate("")}
                className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 h-9"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </div>

        {/* Add Button */}
        {(isAdmin || canAdd) && (
          <Button onClick={handleOpenAdd} className="bg-brand-teal hover:bg-brand-teal/90 text-white w-full xl:w-auto shadow-sm gap-2">
            <Plus className="w-4 h-4" />
            Add Event
          </Button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
            <p>Loading events...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
              <Info className="w-6 h-6" />
            </div>
            <p className="text-gray-500 font-medium">No events found in the gallery.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Event Name</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Link</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-700">Purpose</th>
                  {(isAdmin || canEdit || canDelete) && (
                    <th className="px-6 py-4 text-right font-semibold text-slate-700 sticky right-0 z-20 bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-900 max-w-[200px] truncate">{item.eventName}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {item.date ? (
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          <span>{new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.link ? (
                        <a 
                          href={item.link.startsWith("http") ? item.link : `https://${item.link}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-teal hover:underline font-medium"
                        >
                          <Globe className="w-4 h-4 shrink-0" />
                          <span className="max-w-[220px] truncate">{item.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No link</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[300px] truncate">{item.purpose || <span className="text-slate-400 italic">None</span>}</td>
                    {(isAdmin || canEdit || canDelete) && (
                      <td className="px-6 py-4 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-1px_0_0_0_#e2e8f0] transition-colors">
                        <div className="flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100">
                          {(isAdmin || canEdit) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenEdit(item)}
                              className="w-8 h-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {(isAdmin || canDelete) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(item.id)}
                              className="w-8 h-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editingItem ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="eventName" className="font-semibold text-slate-700">Event Name *</Label>
              <Input 
                id="eventName"
                placeholder="Enter event name" 
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                className="bg-white border-gray-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date" className="font-semibold text-slate-700">Date</Label>
              <Input 
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link" className="font-semibold text-slate-700">Link</Label>
              <Input 
                id="link"
                placeholder="e.g. drive.google.com/..." 
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="bg-white border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose" className="font-semibold text-slate-700">Purpose</Label>
              <Textarea 
                id="purpose"
                placeholder="Enter event purpose or details" 
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className="bg-white border-gray-200 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-brand-teal hover:bg-brand-teal/90 text-white gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingItem ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
