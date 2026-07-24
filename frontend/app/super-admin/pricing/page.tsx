"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  IndianRupee, 
  Percent, 
  Save, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  X, 
  ShieldCheck,
  Layers,
  Calendar,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { API_URL } from "@/lib/config";
import SuperAdminHeader from "@/components/layout/SuperAdminHeader";
import { SIDEBAR_MAIN_TABS } from "@/lib/sidebarConfig";
import { useConfirm } from "@/context/ConfirmContext";

interface ModulePrice {
  id?: string;
  module_key: string;
  display_name: string;
  category: string;
  price_per_month: number;
  is_enabled: boolean;
  description: string;
}

interface DurationPlan {
  id?: string;
  plan_key: string;
  display_name: string;
  months: number;
  discount_percent: number;
  badge: string;
  is_active: boolean;
}

export default function SuperAdminPricingPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<"modules" | "plans">("modules");
  const [modules, setModules] = useState<ModulePrice[]>([]);

  const availableModuleOptions = React.useMemo(() => {
    const map = new Map<string, { key: string; name: string }>();
    SIDEBAR_MAIN_TABS.forEach(tab => {
      map.set(tab.key, { key: tab.key, name: tab.name });
    });
    modules.forEach(m => {
      if (!map.has(m.module_key)) {
        map.set(m.module_key, { key: m.module_key, name: m.display_name });
      }
    });
    return Array.from(map.values());
  }, [modules]);
  const [plans, setPlans] = useState<DurationPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Module Modal State
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModuleKey, setEditingModuleKey] = useState<string | null>(null);
  const [modKey, setModKey] = useState("");
  const [modDisplayName, setModDisplayName] = useState("");
  const [modCategory, setModCategory] = useState("Core HR & Attendance");
  const [modPrice, setModPrice] = useState<number | "">("");
  const [modDesc, setModDesc] = useState("");
  const [modEnabled, setModEnabled] = useState(true);

  // Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanKey, setEditingPlanKey] = useState<string | null>(null);
  const [planKey, setPlanKey] = useState("");
  const [planDisplayName, setPlanDisplayName] = useState("");
  const [planMonths, setPlanMonths] = useState(3);
  const [planDiscount, setPlanDiscount] = useState(10);
  const [planBadge, setPlanBadge] = useState("");
  const [planActive, setPlanActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [modRes, planRes] = await Promise.all([
        fetch(`${API_URL}/super-admin/pricing/modules`, { headers }).catch((err) => {
          console.warn("Modules fetch failed:", err);
          return null;
        }),
        fetch(`${API_URL}/super-admin/pricing/plans`, { headers }).catch((err) => {
          console.warn("Plans fetch failed:", err);
          return null;
        })
      ]);

      if (!modRes || !planRes) {
        setError("Unable to connect to backend server. Please verify python app.py is running.");
        return;
      }

      if (modRes.status === 401 || modRes.status === 403) {
        router.push("/super-admin/login");
        return;
      }

      if (modRes.ok) {
        const modData = await modRes.json().catch(() => []);
        setModules(Array.isArray(modData) ? modData : []);
      }
      if (planRes.ok) {
        const planData = await planRes.json().catch(() => []);
        setPlans(Array.isArray(planData) ? planData : []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load pricing data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // --- Module Actions ---
  const openNewModuleModal = () => {
    setEditingModuleKey(null);
    setModKey("");
    setModDisplayName("");
    setModCategory("Core HR & Attendance");
    setModPrice("");
    setModDesc("");
    setModEnabled(true);
    setIsModuleModalOpen(true);
  };

  const openEditModuleModal = (mod: ModulePrice) => {
    setEditingModuleKey(mod.module_key);
    setModKey(mod.module_key);
    setModDisplayName(mod.display_name);
    setModCategory(mod.category || "Core HR & Attendance");
    setModPrice(mod.price_per_month);
    setModDesc(mod.description || "");
    setModEnabled(mod.is_enabled);
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMsg("");
      const token = localStorage.getItem("token");

      if (editingModuleKey) {
        // Update Module
        const res = await fetch(`${API_URL}/super-admin/pricing/modules/${editingModuleKey}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            display_name: modDisplayName,
            category: modCategory,
            price_per_month: Number(modPrice),
            description: modDesc,
            is_enabled: modEnabled
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to update module");
        setSuccessMsg(`Module '${modDisplayName}' updated successfully!`);
      } else {
        // Create New Module
        const res = await fetch(`${API_URL}/super-admin/pricing/modules`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            module_key: modKey || modDisplayName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            display_name: modDisplayName,
            category: modCategory,
            price_per_month: Number(modPrice),
            description: modDesc,
            is_enabled: modEnabled
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to create module");
        setSuccessMsg(`New module '${modDisplayName}' created successfully!`);
      }

      setIsModuleModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Save failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async (mKey: string, dName: string) => {
    const isConfirmed = await confirm({
      title: "Delete Module",
      message: `Are you sure you want to delete module '${dName}'?`,
      confirmText: "Delete",
      variant: "danger"
    });
    if (!isConfirmed) return;
    try {
      setError("");
      setSuccessMsg("");
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/pricing/modules/${mKey}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete module");
      setSuccessMsg(`Module '${dName}' deleted successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    }
  };

  // --- Plan Actions ---
  const openNewPlanModal = () => {
    setEditingPlanKey(null);
    setPlanKey("");
    setPlanDisplayName("");
    setPlanMonths(3);
    setPlanDiscount(10);
    setPlanBadge("");
    setPlanActive(true);
    setIsPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: DurationPlan) => {
    setEditingPlanKey(plan.plan_key);
    setPlanKey(plan.plan_key);
    setPlanDisplayName(plan.display_name);
    setPlanMonths(plan.months);
    setPlanDiscount(plan.discount_percent);
    setPlanBadge(plan.badge || "");
    setPlanActive(plan.is_active);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");
      setSuccessMsg("");
      const token = localStorage.getItem("token");

      if (editingPlanKey) {
        // Update Plan
        const res = await fetch(`${API_URL}/super-admin/pricing/plans/${editingPlanKey}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            display_name: planDisplayName,
            months: Number(planMonths),
            discount_percent: Number(planDiscount),
            badge: planBadge,
            is_active: planActive
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to update plan");
        setSuccessMsg(`Plan '${planDisplayName}' updated successfully!`);
      } else {
        // Create New Plan
        const generatedKey = planDisplayName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_") || `${planMonths}_months`;
        const res = await fetch(`${API_URL}/super-admin/pricing/plans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            plan_key: generatedKey,
            display_name: planDisplayName,
            months: Number(planMonths),
            discount_percent: Number(planDiscount),
            badge: planBadge,
            is_active: planActive
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to create plan");
        setSuccessMsg(`New plan '${planDisplayName}' created successfully!`);
      }

      setIsPlanModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Save failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async (pKey: string, dName: string) => {
    const isConfirmed = await confirm({
      title: "Delete Subscription Plan",
      message: `Are you sure you want to delete subscription plan '${dName}'?`,
      confirmText: "Delete",
      variant: "danger"
    });
    if (!isConfirmed) return;
    try {
      setError("");
      setSuccessMsg("");
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/pricing/plans/${pKey}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete plan");
      setSuccessMsg(`Plan '${dName}' deleted successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    }
  };

  // Group modules by category
  const categories = Array.from(new Set(modules.map(m => m.category || "General")));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Mint SuperAdminHeader */}
      <SuperAdminHeader onRefresh={fetchData} isLoading={isLoading} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 pt-24 pb-8 space-y-6">
        {/* Page Title & Back Button Row */}
        <div className="flex items-center justify-between pb-2 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/super-admin/dashboard"
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl transition-colors shadow-sm border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-2">
                Module Pricing & Plans Management
                <Sparkles className="w-4 h-4 text-[#09A08A]" />
              </h1>
              <p className="text-xs text-slate-500 font-medium">Configure individual module pricing and subscription duration discount plans</p>
            </div>
          </div>

          <Link
            href="/purchase"
            target="_blank"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <ExternalLink className="w-4 h-4 text-[#09A08A]" />
            <span>Preview Client Landing Page</span>
          </Link>
        </div>
        {/* Floating Top-Right Toast Notifications */}
        <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none max-w-sm w-full">
          {error && (
            <div className="pointer-events-auto p-4 bg-slate-900 text-rose-300 rounded-2xl text-xs flex items-center justify-between font-semibold shadow-2xl border border-rose-500/30 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError("")} className="ml-3 p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0">
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="pointer-events-auto p-4 bg-[#09A08A] text-white rounded-2xl text-xs flex items-center justify-between font-bold shadow-xl border border-emerald-300/30 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg("")} className="ml-3 p-1 hover:bg-[#07806e] rounded-lg transition-colors cursor-pointer shrink-0">
                <X className="w-4 h-4 text-emerald-100 hover:text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation & Action Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("modules")}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "modules"
                  ? "border-[#09A08A] text-[#09A08A]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Layers className="w-4 h-4" />
              Module Base Pricing ({modules.length})
            </button>

            <button
              onClick={() => setActiveTab("plans")}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "plans"
                  ? "border-[#09A08A] text-[#09A08A]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Subscription Duration Plans ({plans.length})
            </button>
          </div>

          <div>
            {activeTab === "modules" ? (
              <button
                onClick={openNewModuleModal}
                className="px-4 py-2 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-[#09A08A]/20 transition-all cursor-pointer mb-1"
              >
                <Plus className="w-4 h-4" />
                Add New Module
              </button>
            ) : (
              <button
                onClick={openNewPlanModal}
                className="px-4 py-2 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-[#09A08A]/20 transition-all cursor-pointer mb-1"
              >
                <Plus className="w-4 h-4" />
                Add New Duration Plan
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: MODULE BASE PRICING */}
        {activeTab === "modules" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm font-medium">
                Loading module pricing...
              </div>
            ) : modules.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm font-medium">
                No modules configured yet. Click "Add New Module" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-slate-200/80 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="py-4 px-6">Module Name</th>
                      <th className="py-4 px-6">Unique Key (Slug)</th>
                      <th className="py-4 px-6">Price (₹)</th>
                      <th className="py-4 px-6">Description</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {modules.map((mod) => (
                      <tr key={mod.module_key} className="hover:bg-[#EAF7F6]/30 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#09A08A]" />
                            <span className="text-slate-900 font-bold">{mod.display_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-mono text-[11px]">
                          {mod.module_key}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-extrabold text-sm text-[#09A08A]">₹{mod.price_per_month}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 max-w-md truncate">
                          {mod.description || "—"}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${mod.is_enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            {mod.is_enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModuleModal(mod)}
                              className="p-2 bg-[#EAF7F6] text-[#09A08A] hover:bg-[#09A08A] hover:text-white rounded-xl transition-all shadow-xs inline-flex items-center justify-center cursor-pointer border border-[#09A08A]/20"
                              title="Edit Module"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteModule(mod.module_key, mod.display_name)}
                              className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-xs inline-flex items-center justify-center cursor-pointer border border-rose-200"
                              title="Delete Module"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DURATION PLANS */}
        {activeTab === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.plan_key} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-lg text-slate-900">{plan.display_name}</span>
                    <span className="px-2.5 py-1 bg-[#EAF7F6] text-[#09A08A] text-xs font-bold rounded-full border border-[#09A08A]/20">
                      {plan.months} Months
                    </span>
                  </div>
                  {plan.badge && (
                    <span className="inline-block mb-3 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md border border-emerald-200">
                      {plan.badge}
                    </span>
                  )}
                  <p className="text-xs text-slate-500">Discount percentage configured for {plan.months} months subscription billing.</p>
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Discount Percentage:</span>
                    <span className="text-lg font-black text-[#09A08A]">{plan.discount_percent}% OFF</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Active Status:</span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${plan.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {plan.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openEditPlanModal(plan)}
                    className="flex-1 py-2.5 bg-[#EAF7F6] hover:bg-[#09A08A] text-[#09A08A] hover:text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border border-[#09A08A]/20"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Plan
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.plan_key, plan.display_name)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors border border-rose-200"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODULE CREATE / EDIT MODAL */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#09A08A]" />
                  {editingModuleKey ? "Edit Module Pricing" : "Add New Module"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure module parameters and monthly subscription rate</p>
              </div>
              <button onClick={() => setIsModuleModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Module Name (Select Sidebar Item) *</label>
                <select
                  value={modKey}
                  onChange={(e) => {
                    const selectedKey = e.target.value;
                    const selected = availableModuleOptions.find(m => m.key === selectedKey);
                    if (selected) {
                      setModKey(selected.key);
                      setModDisplayName(selected.name);
                    } else {
                      setModKey("");
                      setModDisplayName("");
                    }
                  }}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:border-[#09A08A] focus:outline-none"
                  required
                >
                  <option value="">-- Select Sidebar Module --</option>
                  {availableModuleOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              {!editingModuleKey && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Auto-Fetched Unique Key (slug) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. daily-progress"
                    value={modKey}
                    onChange={(e) => setModKey(e.target.value)}
                    className="w-full bg-[#EAF7F6] border border-[#09A08A]/40 rounded-xl p-3 text-[#09A08A] font-mono font-bold focus:border-[#09A08A] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#09A08A] mt-1 font-medium">⚡ Auto-fetched from selected sidebar module.</p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Price (₹) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  placeholder="Enter module price (e.g. 500)"
                  value={modPrice}
                  onChange={(e) => setModPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-extrabold focus:border-[#09A08A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe module functionality..."
                  value={modDesc}
                  onChange={(e) => setModDesc(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:border-[#09A08A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-700">Module Status</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modEnabled}
                    onChange={(e) => setModEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#09A08A]"
                  />
                  <span className="font-bold text-slate-900">{modEnabled ? "Enabled for Purchase" : "Disabled"}</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModuleModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl transition-all shadow-md shadow-[#09A08A]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingModuleKey ? "Update Module" : "Create Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAN CREATE / EDIT MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#09A08A]" />
                  {editingPlanKey ? "Edit Subscription Plan" : "Add New Duration Plan"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure subscription duration and discount rates</p>
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Name (e.g. Yearly, One Time, 3 Months) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yearly, One Time, 6 Months"
                  value={planDisplayName}
                  onChange={(e) => setPlanDisplayName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:border-[#09A08A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    placeholder="e.g. 12 or 0 for One Time"
                    value={planMonths}
                    onChange={(e) => setPlanMonths(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:border-[#09A08A] focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Use 0 for One-Time / Lifetime</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount % *</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    placeholder="e.g. 28"
                    value={planDiscount}
                    onChange={(e) => setPlanDiscount(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-extrabold focus:border-[#09A08A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Save Offer / Tag Text (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Pay one time and save up to 28%"
                  value={planBadge}
                  onChange={(e) => setPlanBadge(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:border-[#09A08A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-700">Plan Status</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planActive}
                    onChange={(e) => setPlanActive(e.target.checked)}
                    className="w-4 h-4 accent-[#09A08A]"
                  />
                  <span className="font-bold text-slate-900">{planActive ? "Active" : "Disabled"}</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl transition-all shadow-md shadow-[#09A08A]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingPlanKey ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
