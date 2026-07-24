"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  CreditCard, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  X, 
  ShieldCheck, 
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  Check,
  Zap,
  HelpCircle,
  CheckSquare,
  Square,
  Info
} from "lucide-react";
import { API_URL } from "@/lib/config";

interface ModuleOption {
  module_key: string;
  display_name: string;
  category: string;
  price_per_month: number;
  description: string;
}

interface PlanOption {
  plan_key: string;
  display_name: string;
  months: number;
  discount_percent: number;
  badge: string;
}

export default function PurchasePage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successResult, setSuccessResult] = useState<any>(null);

  // Selections
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>("");

  // Summary Calculations
  const [summary, setSummary] = useState<{
    selected_modules_count: number;
    monthly_subtotal: number;
    duration_months: number;
    raw_total: number;
    discount_percent: number;
    discount_amount: number;
    final_total: number;
    plan_display_name: string;
  } | null>(null);

  // Modal Checkout State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/purchase/options`);
        const data = await res.json();
        if (res.ok) {
          const loadedMods = data.modules || [];
          const loadedPlans = data.plans || [];
          setModules(loadedMods);
          setPlans(loadedPlans);
          
          // Default select all modules for onboarding
          if (loadedMods.length > 0) {
            setSelectedModules(loadedMods.map((m: any) => m.module_key));
          }
          // Default select first available plan
          if (loadedPlans.length > 0) {
            setSelectedPlanKey(loadedPlans[0].plan_key);
          }
        }
      } catch (err: any) {
        setError("Failed to load HRMS pricing data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOptions();
  }, []);

  // Recalculate summary whenever module selections or plan changes
  useEffect(() => {
    if (selectedModules.length > 0 && selectedPlanKey) {
      calculateSummary();
    } else {
      setSummary(null);
    }
  }, [selectedModules, selectedPlanKey]);

  const calculateSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/purchase/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_modules: selectedModules,
          plan_key: selectedPlanKey
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Calculation error:", err);
    }
  };

  const toggleModule = (key: string) => {
    if (selectedModules.includes(key)) {
      if (selectedModules.length <= 1) {
        setError("Please select at least 1 module.");
        return;
      }
      setSelectedModules(selectedModules.filter(k => k !== key));
    } else {
      setSelectedModules([...selectedModules, key]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedModules.length === modules.length) {
      // Keep at least the first module
      if (modules.length > 0) setSelectedModules([modules[0].module_key]);
    } else {
      setSelectedModules(modules.map(m => m.module_key));
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");
      
      const payload = {
        company_name: companyName,
        company_code: companyCode || companyName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        logo_url: "",
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address: address,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        selected_modules: selectedModules,
        plan_key: selectedPlanKey
      };

      const res = await fetch(`${API_URL}/purchase/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Checkout failed.");

      setSuccessResult(data);
      setIsCheckoutModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Checkout registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Array.from(new Set(modules.map(m => m.category || "General")));
  const selectedPlan = plans.find(p => p.plan_key === selectedPlanKey);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-[#09A08A]/20 selection:text-[#09A08A]">
      {/* HEADER NAVBAR */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#09A08A] to-emerald-400 flex items-center justify-center text-white shadow-md shadow-[#09A08A]/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-1">
                HRMS <span className="text-[#09A08A]">Portal</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block -mt-1">Modular Subscription</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Client Login
            </Link>
            <button
              onClick={() => setIsCheckoutModalOpen(true)}
              disabled={selectedModules.length === 0}
              className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#09A08A]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>Get Started</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO & PLAN SWITCHER */}
      <div className="bg-gradient-to-b from-white to-[#F8FAFC] border-b border-slate-200/60 py-10 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EAF7F6] border border-[#09A08A]/30 rounded-full text-[#09A08A] text-xs font-extrabold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customize Your HRMS Package</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Flexible Modular Pricing for Your Team
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl mx-auto font-medium">
            No rigid bundles or hidden tier limits. Select only the modules your business needs and toggle duration discount plans.
          </p>

          {/* DURATION PLAN TOGGLE SWITCHER (VASYERP STYLE) */}
          {plans.length > 0 && (
            <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
              <div className="inline-flex items-center p-1.5 bg-white border border-slate-300/80 rounded-full shadow-sm">
                {plans.map(plan => {
                  const isSelected = selectedPlanKey === plan.plan_key;
                  return (
                    <button
                      key={plan.plan_key}
                      onClick={() => setSelectedPlanKey(plan.plan_key)}
                      className={`px-6 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? "bg-slate-900 text-white shadow-md"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span>{plan.display_name}</span>
                      {plan.discount_percent > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? "bg-[#09A08A] text-white" : "bg-emerald-100 text-emerald-800 font-extrabold"}`}>
                          {plan.discount_percent}% OFF
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Offer Highlight Badge */}
              {selectedPlan && (
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 bg-sky-50 text-sky-800 px-4 py-2 rounded-full border border-sky-200">
                  <span>{selectedPlan.badge || `Save with ${selectedPlan.display_name}`}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CALCULATOR CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center justify-between font-bold shadow-xs">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {successResult ? (
          /* SUCCESS ORDER CONFIRMATION */
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Subscription Created Successfully!</h2>
              <p className="text-xs text-slate-500 font-medium">Your company workspace and admin credentials have been initialized.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 text-left space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-500">Company Name:</span>
                <span className="font-black text-slate-900">{successResult.company?.company_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-500">Company Code:</span>
                <span className="font-mono font-black text-[#09A08A]">{successResult.company?.company_code}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-500">Admin Email:</span>
                <span className="font-bold text-slate-900">{successResult.admin?.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-500">Subscription Term:</span>
                <span className="font-bold text-slate-900">{successResult.company?.subscription_plan}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-slate-500">Total Paid:</span>
                <span className="font-black text-emerald-600 text-sm">₹{successResult.company?.total_paid}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <Link
                href="/login"
                className="px-8 py-3.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-[#09A08A]/20 flex items-center gap-2"
              >
                <span>Proceed to Client Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* VASYERP STYLE MODULE SELECTION MATRIX & SUMMARY */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: MODULE SELECTION MATRIX */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#09A08A]" />
                      Select Modules for Your Workspace
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Check or uncheck individual modules to calculate real-time pricing</p>
                  </div>

                  <button
                    onClick={toggleSelectAll}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {selectedModules.length === modules.length ? <CheckSquare className="w-4 h-4 text-[#09A08A]" /> : <Square className="w-4 h-4" />}
                    <span>{selectedModules.length === modules.length ? "Deselect Extra" : "Select All Modules"}</span>
                  </button>
                </div>

                {isLoading ? (
                  <div className="py-20 text-center text-slate-400 text-sm font-medium">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#09A08A]" />
                    Loading available modules...
                  </div>
                ) : modules.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-sm font-medium">
                    No active modules available right now. Please check back later.
                  </div>
                ) : (
                  /* MODULE SELECTION TABLE / LIST (VASYERP STYLE) */
                  <div className="space-y-8">
                    {categories.map(cat => {
                      const categoryMods = modules.filter(m => m.category === cat);
                      return (
                        <div key={cat} className="space-y-3">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#09A08A]" />
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{cat}</h3>
                          </div>

                          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-[#F8FAFC]">
                            {categoryMods.map(mod => {
                              const isSelected = selectedModules.includes(mod.module_key);
                              return (
                                <div
                                  key={mod.module_key}
                                  onClick={() => toggleModule(mod.module_key)}
                                  className={`p-4 flex items-center justify-between gap-4 transition-all cursor-pointer select-none ${
                                    isSelected
                                      ? "bg-white hover:bg-[#EAF7F6]/40"
                                      : "bg-slate-50/50 hover:bg-slate-100/60 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Checkbox (VasyERP Style) */}
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                                      isSelected
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "border-2 border-slate-300 bg-white"
                                    }`}>
                                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>

                                    <div className="min-w-0">
                                      <h4 className="font-extrabold text-slate-900 text-sm">{mod.display_name}</h4>
                                      <p className="text-[11px] text-slate-500 truncate">{mod.description || "Module functionality for team access."}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right">
                                      <span className="font-black text-sm text-[#09A08A]">₹{mod.price_per_month}</span>
                                      <span className="text-[10px] text-slate-400 font-medium block">/ month</span>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${
                                      isSelected
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-slate-200 text-slate-600 border-slate-300"
                                    }`}>
                                      {isSelected ? "Selected" : "Add"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: STICKY ORDER SUMMARY BOX (REAL-TIME CALCULATED) */}
            <div className="lg:col-span-4 sticky top-24 space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#09A08A]" />
                    Order Summary
                  </h3>
                  <span className="px-2.5 py-0.5 bg-[#EAF7F6] text-[#09A08A] text-[11px] font-extrabold rounded-full border border-[#09A08A]/20">
                    {selectedModules.length} Modules
                  </span>
                </div>

                <div className="space-y-4 text-xs font-medium">
                  {/* Selected Plan Info */}
                  <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Billing Plan</span>
                      <span className="font-extrabold text-slate-900 text-sm">{summary?.plan_display_name || selectedPlan?.display_name || "Standard Plan"}</span>
                    </div>
                    {summary?.discount_percent ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-md">
                        {summary.discount_percent}% OFF
                      </span>
                    ) : null}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2.5 border-t border-b border-slate-100 py-3">
                    <div className="flex justify-between text-slate-600">
                      <span>Monthly Subtotal:</span>
                      <span className="font-bold text-slate-900">₹{summary?.monthly_subtotal || 0} / mo</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Subscription Duration:</span>
                      <span className="font-bold text-slate-900">{summary?.duration_months || 1} Month(s)</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({summary?.duration_months || 1} mos):</span>
                      <span className="font-bold text-slate-900">₹{summary?.raw_total || 0}</span>
                    </div>

                    {summary?.discount_amount ? (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Plan Savings ({summary.discount_percent}% OFF):</span>
                        <span>-₹{summary.discount_amount}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Final Total */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-slate-500 font-bold block text-[11px]">Total Amount Payable</span>
                      <span className="text-2xl font-black text-[#09A08A]">₹{summary?.final_total || 0}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Taxes Included</span>
                  </div>
                </div>

                {/* PROCEED TO CHECKOUT BUTTON */}
                <button
                  onClick={() => setIsCheckoutModalOpen(true)}
                  disabled={selectedModules.length === 0}
                  className="w-full py-4 bg-[#09A08A] hover:bg-[#07806e] text-white font-extrabold text-xs rounded-2xl transition-all shadow-lg shadow-[#09A08A]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* TRUST BADGES */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-slate-500" /> SSL Encrypted</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Instant Activation</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-sky-500" /> Cancel Anytime</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CHECKOUT & SETUP COMPANY MODAL */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#09A08A]" />
                  Setup Company Workspace
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter details to create your admin account and initialize modules</p>
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[10px]">1. Company Information</h4>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Digiverse Pvt Ltd"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (!companyCode) setCompanyCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                    }}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:border-[#09A08A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Code / Subdomain (Unique Slug) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. acme-digiverse"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))}
                    className="w-full bg-[#EAF7F6] border border-[#09A08A]/30 text-[#09A08A] font-mono font-bold rounded-xl p-3 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="contact@company.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[10px]">2. Primary Admin Credentials</h4>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admin Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:border-[#09A08A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admin Email (Login Username) *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@company.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:border-[#09A08A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admin Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:border-[#09A08A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Order Final Summary inside Modal */}
              <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Selected Term:</span>
                  <span>{summary?.plan_display_name}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Modules Count:</span>
                  <span>{selectedModules.length} Modules</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span className="text-base text-[#09A08A]">₹{summary?.final_total || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl transition-all shadow-md shadow-[#09A08A]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Activate & Pay ₹{summary?.final_total || 0}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
