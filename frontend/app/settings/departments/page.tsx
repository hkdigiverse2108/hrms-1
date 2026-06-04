"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Plus, Pencil, Trash2, Loader2, Search, Briefcase, Building2, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/context/ConfirmContext";

export default function DepartmentsPage() {
  const { confirm } = useConfirm();
  const { user } = useUser();
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    head: ""
  });

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== "admin") {
      router.push("/");
      return;
    }
    fetchDepartments();
  }, [user]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/departments`);
      if (res.ok) {
        setDepartments(await res.json());
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingDept 
        ? `${API_URL}/departments/${editingDept.id}` 
        : `${API_URL}/departments`;
      const method = editingDept ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(`Department ${editingDept ? "updated" : "created"} successfully`);
        setIsModalOpen(false);
        setEditingDept(null);
        setFormData({ name: "", head: "" });
        fetchDepartments();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save department");
      }
    } catch (err) {
      console.error("Error saving department:", err);
      toast.error("Connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Confirm Action",
      message: "Are you sure you want to delete this department?",
      destructive: true,
      confirmText: "Confirm"
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/departments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Department deleted successfully");
        fetchDepartments();
      } else {
        toast.error("Failed to delete department");
      }
    } catch (err) {
      console.error("Error deleting department:", err);
      toast.error("Connection error");
    }
  };

  const filteredDepts = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Department Management" 
        description="Create and manage company departments for employee classification."
      >
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingDept(null);
            setFormData({ name: "", head: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-teal" />
                {editingDept ? "Edit Department" : "New Department"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Development, HR, Marketing" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="head">Department Head (Optional)</Label>
                <Input 
                  id="head" 
                  placeholder="e.g. John Doe" 
                  value={formData.head}
                  onChange={e => setFormData({ ...formData, head: e.target.value })}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-brand-teal hover:bg-brand-teal-light text-white"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingDept ? "Update" : "Create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search departments..." 
            className="pl-10 h-9" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
            <p className="text-sm text-muted-foreground">Loading departments...</p>
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl bg-slate-50/50">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No departments found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepts.map((dept) => (
              <div 
                key={dept.id} 
                className="p-5 rounded-xl border border-slate-200 bg-white hover:border-brand-teal/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-brand-teal/5 flex items-center justify-center text-brand-teal">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-brand-teal"
                      onClick={() => {
                        setEditingDept(dept);
                        setFormData({ name: dept.name, head: dept.head || "" });
                        setIsModalOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-rose-600"
                      onClick={() => handleDelete(dept.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{dept.name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                  <User className="w-3.5 h-3.5" />
                  <span>{dept.head || "No Head Assigned"}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-brand-teal mt-3 bg-brand-teal/5 px-2 py-1 rounded-md w-fit">
                  <Users className="w-3 h-3" />
                  <span>{dept.employeeCount || 0} Employees</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
