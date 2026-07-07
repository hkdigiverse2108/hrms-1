"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { API_URL } from "@/lib/config";
import {
  Plus,
  Loader2,
  Target,
  Calendar as CalendarIcon,
  IndianRupee,
  TrendingUp,
  Pencil,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CompanyFinancePlanPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    category: "General",
    status: "Active",
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/company-finance/plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      toast.error("Failed to load financial plans");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setForm({
        title: plan.title || "",
        description: plan.description || "",
        budget: String(plan.budget || 0),
        startDate: plan.startDate || new Date().toISOString().split("T")[0],
        endDate: plan.endDate || "",
        category: plan.category || "General",
        status: plan.status || "Active",
      });
    } else {
      setEditingPlan(null);
      setForm({
        title: "",
        description: "",
        budget: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        category: "General",
        status: "Active",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.budget) {
      toast.error("Title and Budget are required");
      return;
    }

    try {
      const payload = {
        ...form,
        budget: Number(form.budget),
      };

      const url = editingPlan
        ? `${API_URL}/company-finance/plans/${editingPlan._id || editingPlan.id}`
        : `${API_URL}/company-finance/plans`;
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingPlan ? "Plan updated successfully!" : "Financial plan created!");
        setIsModalOpen(false);
        fetchPlans();
      } else {
        toast.error("Failed to save plan");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving plan");
    }
  };

  const handleDelete = async (plan: any) => {
    if (!confirm(`Are you sure you want to delete the plan "${plan.title}"?`)) return;
    try {
      const res = await fetch(
        `${API_URL}/company-finance/plans/${plan._id || plan.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Plan deleted");
        fetchPlans();
      } else {
        toast.error("Failed to delete plan");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting plan");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        title="Financial Plans & Budgets"
        description="Set strategic financial targets, budget caps, and expenditure goals"
      >
        <Button size="sm" onClick={() => handleOpenModal()} className="h-9 font-bold bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Plan
        </Button>
      </PageHeader>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-teal" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <div className="w-16 h-16 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal mb-4 shadow-sm">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800">No financial plans created yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
            Establish financial goals and budget boundaries for different company departments or quarters.
          </p>
          <Button size="sm" onClick={() => handleOpenModal()} className="font-bold bg-brand-teal hover:bg-brand-teal/90 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Create Your First Plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => (
            <div
              key={plan._id || idx}
              className="border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg transition-all bg-white relative overflow-hidden group hover:border-brand-teal/50 flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/5 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform" />
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center font-bold shadow-sm">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-base leading-tight">{plan.title || "Untitled Plan"}</h3>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{plan.category || "General"}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenModal(plan)}
                      className="h-8 w-8 text-slate-400 hover:text-slate-800"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(plan)}
                      className="h-8 w-8 text-rose-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium mb-6 line-clamp-2">{plan.description || "No description provided for this financial goal."}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{plan.startDate ? new Date(plan.startDate).toLocaleDateString("en-IN") : "—"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Budget</span>
                  <span className="text-base font-black text-emerald-600">
                    ₹{(plan.budget || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- CREATE / EDIT PLAN MODAL --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-teal" />
              {editingPlan ? "Edit Financial Plan" : "Create Financial Plan"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define target budget allocations and strategic timelines.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Plan Title *</label>
              <Input
                required
                placeholder="e.g. Q3 Marketing Expansion"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Budget Cap (₹) *</label>
                <Input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 250000"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className="h-9 text-xs font-bold text-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Category</label>
                <Input
                  placeholder="e.g. Marketing, R&D"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Description</label>
              <Input
                placeholder="Brief outline of budget objectives..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">End Date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-brand-teal hover:bg-brand-teal/90 text-white font-bold">
                {editingPlan ? "Update Plan" : "Save Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
