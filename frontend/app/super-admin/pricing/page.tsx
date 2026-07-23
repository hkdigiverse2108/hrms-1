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
  Sparkles
} from "lucide-react";
import { API_URL } from "@/lib/config";

interface ModulePrice {
  id: string;
  module_key: string;
  display_name: string;
  category: string;
  price_per_month: number;
  is_enabled: boolean;
  description: string;
}

interface DurationPlan {
  id: string;
  plan_key: string;
  display_name: string;
  months: number;
  discount_percent: number;
  badge: string;
  is_active: boolean;
}

export default function SuperAdminPricingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"modules" | "plans">("modules");
  const [modules, setModules] = useState<ModulePrice[]>([]);
  const [plans, setPlans] = useState<DurationPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [modRes, planRes] = await Promise.all([
        fetch(`${API_URL}/super-admin/pricing/modules`, { headers }),
        fetch(`${API_URL}/super-admin/pricing/plans`, { headers })
      ]);

      if (modRes.status === 401 || modRes.status === 403) {
        router.push("/super-admin/login");
        return;
      }

      const modData = await modRes.json();
      const planData = await planRes.json();

      if (modRes.ok) setModules(modData);
      if (planRes.ok) setPlans(planData);
    } catch (err: any) {
      setError(err.message || "Failed to load pricing data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateModule = async (mod: ModulePrice) => {
    try {
      setSavingKey(mod.module_key);
      setError("");
      setSuccessMsg("");

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/pricing/modules/${mod.module_key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          price_per_month: Number(mod.price_per_month),
          is_enabled: mod.is_enabled
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update module pricing");

      setSuccessMsg(`Updated '${mod.display_name}' price to ₹${mod.price_per_month}/month`);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdatePlan = async (plan: DurationPlan) => {
    try {
      setSavingKey(plan.plan_key);
      setError("");
      setSuccessMsg("");

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/pricing/plans/${plan.plan_key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          discount_percent: Number(plan.discount_percent),
          is_active: plan.is_active
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update plan");

      setSuccessMsg(`Updated '${plan.display_name}' discount to ${plan.discount_percent}%`);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  // Group modules by category
  const categories = Array.from(new Set(modules.map(m => m.category || "General")));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Mint Header */}
      <header className="border-b border-[#09A08A]/15 bg-[#EAF7F6] px-6 sm:px-8 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/super-admin/dashboard"
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl transition-colors shadow-sm border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <img src="/logo.png" alt="HariKrushn DigiVerse Logo" className="h-9 w-auto object-contain" />
            <div className="h-7 w-px bg-[#09A08A]/20" />
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900">Module Pricing & Duration Plans CRUD</h1>
              <p className="text-[11px] text-slate-500 font-medium">Configure tab monthly prices and 3/6/12 month discounts</p>
            </div>
          </div>

          <Link
            href="/purchase"
            target="_blank"
            className="px-4 py-2 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-[#09A08A]/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Preview Purchase Wizard
          </Link>
        </div>
      </header>

      {/* Main Content - Centered Layout with Side Spacing */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-8 space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between font-medium">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-[#EAF7F6] border border-[#09A08A]/30 rounded-xl text-[#09A08A] text-xs flex items-center justify-between font-medium">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab("modules")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "modules"
                ? "border-[#09A08A] text-[#09A08A]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            Module Base Pricing (Per Month)
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
            Subscription Duration Plans (3 / 6 / 12 Months)
          </button>
        </div>

        {/* TAB 1: MODULE BASE PRICING */}
        {activeTab === "modules" && (
          <div className="space-y-8">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm font-medium">
                Loading module pricing...
              </div>
            ) : (
              categories.map(cat => (
                <div key={cat} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-3 h-3 rounded-full bg-[#09A08A]" />
                    <h2 className="text-base font-extrabold text-slate-900">{cat}</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modules.filter(m => m.category === cat).map(mod => (
                      <div
                        key={mod.module_key}
                        className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-[#09A08A]/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 text-sm">{mod.display_name}</span>
                            <input
                              type="checkbox"
                              checked={mod.is_enabled}
                              onChange={(e) => {
                                const updated = modules.map(m => m.module_key === mod.module_key ? { ...m, is_enabled: e.target.checked } : m);
                                setModules(updated);
                              }}
                              className="w-4 h-4 accent-[#09A08A] cursor-pointer"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">{mod.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 mt-2">
                          <div className="relative w-32">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              value={mod.price_per_month}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = modules.map(m => m.module_key === mod.module_key ? { ...m, price_per_month: val } : m);
                                setModules(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 pl-6 pr-2 text-xs font-bold text-slate-900 focus:border-[#09A08A] focus:outline-none"
                            />
                          </div>
                          <span className="text-[11px] text-slate-400 font-semibold">/ month</span>

                          <button
                            onClick={() => handleUpdateModule(mod)}
                            disabled={savingKey === mod.module_key}
                            className="p-2 bg-[#09A08A] hover:bg-[#07806e] text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            title="Save Module Price"
                          >
                            {savingKey === mod.module_key ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
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
                  <p className="text-xs text-slate-500">Configure discount percentage for {plan.months} months subscription billing.</p>
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount Percentage (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={plan.discount_percent}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = plans.map(p => p.plan_key === plan.plan_key ? { ...p, discount_percent: val } : p);
                          setPlans(updated);
                        }}
                        className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 pr-8 text-sm font-extrabold text-slate-900 focus:border-[#09A08A] focus:outline-none"
                      />
                      <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Active Status:</span>
                    <button
                      onClick={() => {
                        const updated = plans.map(p => p.plan_key === plan.plan_key ? { ...p, is_active: !p.is_active } : p);
                        setPlans(updated);
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                        plan.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {plan.is_active ? "Active" : "Disabled"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleUpdatePlan(plan)}
                  disabled={savingKey === plan.plan_key}
                  className="w-full py-3 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-[#09A08A]/20 disabled:opacity-50"
                >
                  {savingKey === plan.plan_key ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Plan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Plan Settings
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
