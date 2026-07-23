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
  Zap
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successResult, setSuccessResult] = useState<any>(null);

  // Step 1: Company & Admin Details
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Step 2 & 3: Selections
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>("1_year");

  // Step 4: Summary Calculations
  const [summary, setSummary] = useState<{
    monthly_subtotal: number;
    duration_months: number;
    raw_total: number;
    discount_percent: number;
    discount_amount: number;
    final_total: number;
    plan_display_name: string;
  } | null>(null);

  // Payment Gateway Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/purchase/options`);
        const data = await res.json();
        if (res.ok) {
          setModules(data.modules || []);
          setPlans(data.plans || []);
          // Default select all modules initially for great onboarding
          if (data.modules) {
            setSelectedModules(data.modules.map((m: any) => m.module_key));
          }
          if (data.plans && data.plans.length > 0) {
            setSelectedPlanKey(data.plans[data.plans.length - 1].plan_key);
          }
        }
      } catch (err: any) {
        setError("Failed to load HRMS purchase options.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOptions();
  }, []);

  // Update order calculation whenever selection changes
  useEffect(() => {
    if (selectedModules.length > 0 && selectedPlanKey) {
      calculateSummary();
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
      console.error(err);
    }
  };

  const toggleModule = (key: string) => {
    if (selectedModules.includes(key)) {
      if (selectedModules.length <= 1) {
        setError("At least 1 module must be selected.");
        return;
      }
      setSelectedModules(selectedModules.filter(k => k !== key));
    } else {
      setSelectedModules([...selectedModules, key]);
    }
  };

  const handleProceedStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!companyName || !contactEmail || !adminName || !adminEmail || !adminPassword) {
      setError("Please fill out all required company and admin credentials fields.");
      return;
    }
    setStep(2);
  };

  const handleCheckoutSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError("");

      const res = await fetch(`${API_URL}/purchase/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          company_code: companyCode || companyName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          logo_url: logoUrl,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address: address,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
          selected_modules: selectedModules,
          plan_key: selectedPlanKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Checkout & Provisioning failed.");
      }

      setSuccessResult(data);
      setIsPaymentModalOpen(false);
    } catch (err: any) {
      setError(err.message || "An error occurred during payment processing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Array.from(new Set(modules.map(m => m.category || "General")));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Mint Header */}
      <header className="border-b border-[#09A08A]/15 bg-[#EAF7F6] px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="HariKrushn DigiVerse Logo" className="h-10 w-auto object-contain" />
          <div className="h-7 w-px bg-[#09A08A]/20 mx-1" />
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
              HRMS Purchase & Custom Onboarding Wizard
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Build your custom HRMS suite & choose sidebar modules</p>
          </div>
        </div>

        <Link
          href="/login"
          className="px-4 py-2 bg-white hover:bg-slate-50 text-[#09A08A] font-bold rounded-xl text-xs border border-[#09A08A]/30 shadow-sm transition-all"
        >
          HRMS Login Page
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* Step Indicator Progress Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
            {[
              { id: 1, label: "1. Details", icon: Building2 },
              { id: 2, label: "2. Select Modules", icon: Layers },
              { id: 3, label: "3. Choose Plan", icon: Calendar },
              { id: 4, label: "4. Checkout", icon: CreditCard }
            ].map(s => (
              <div
                key={s.id}
                onClick={() => {
                  if (s.id < step) setStep(s.id as any);
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                  step === s.id
                    ? "bg-[#09A08A] text-white font-bold shadow-md shadow-[#09A08A]/20"
                    : step > s.id
                    ? "bg-[#EAF7F6] text-[#09A08A] font-bold"
                    : "bg-slate-50 text-slate-400 font-semibold"
                }`}
              >
                <s.icon className="w-4 h-4" />
                <span className="text-xs">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between font-medium">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* SUCCESS CONFIRMATION STATE */}
        {successResult ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-md text-center max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-[#EAF7F6] text-[#09A08A] rounded-full flex items-center justify-center mx-auto border border-[#09A08A]/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Congratulations! Workspace Provisioned</h2>
              <p className="text-slate-500 text-xs mt-1">
                Company <span className="font-bold text-slate-800">{successResult.company?.company_name}</span> is active and ready for login!
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Admin Login Email:</span>
                <span className="font-bold text-slate-900">{successResult.admin?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Purchased Plan:</span>
                <span className="font-bold text-[#09A08A]">{successResult.order?.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Subscription Expiry:</span>
                <span className="font-bold text-slate-900">{successResult.order?.expiry_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Enabled Modules:</span>
                <span className="font-bold text-[#09A08A]">{successResult.order?.enabled_modules?.length} Tabs Granted</span>
              </div>
            </div>

            <Link
              href="/login"
              className="w-full py-3.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#09A08A]/20"
            >
              Go to HRMS Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* STEP 1: COMPANY & ADMIN DETAILS */}
            {step === 1 && (
              <form onSubmit={handleProceedStep1} className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#09A08A]" />
                    Step 1: Company Profile & Initial Admin Credentials
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Enter your organization details and setup your primary admin login account</p>
                </div>

                {/* Company Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#09A08A] uppercase tracking-wider border-b border-slate-100 pb-2">1. Organization Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-700 font-bold mb-1">Company Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sahjanand Technologies"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          if (!companyCode) {
                            setCompanyCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                          }
                        }}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 font-bold mb-1">Tenant Code / Slug *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. sahjanand-tech"
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-[#09A08A] font-mono font-semibold placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 font-bold mb-1">Contact Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="contact@company.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 font-bold mb-1">Contact Phone</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-700 font-bold mb-1">Company Logo URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Admin Setup */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold text-[#09A08A] uppercase tracking-wider border-b border-slate-100 pb-2">2. Primary Admin Account Setup</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-700 font-bold mb-1">Admin Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 font-bold mb-1">Admin Login Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@company.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-700 font-bold mb-1">Admin Initial Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-[#09A08A]/20"
                  >
                    Next: Choose HRMS Modules
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: CHOOSE HRMS MODULES / TABS */}
            {step === 2 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#09A08A]" />
                      Step 2: Choose HRMS Sidebar Modules & Tabs
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Select only the modules your company needs. Your admin & sub-admins will be granted access to these tabs.</p>
                  </div>

                  <div className="bg-[#EAF7F6] border border-[#09A08A]/30 rounded-xl px-4 py-2 text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Monthly Modules Subtotal</p>
                    <p className="text-lg font-extrabold text-[#09A08A]">₹{summary?.monthly_subtotal || 0} <span className="text-xs text-slate-400 font-medium">/ mo</span></p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="py-16 text-center text-slate-400 text-sm font-medium">
                    Loading module list...
                  </div>
                ) : (
                  <div className="space-y-8">
                    {categories.map(cat => (
                      <div key={cat} className="space-y-3">
                        <h3 className="text-xs font-extrabold text-[#09A08A] uppercase tracking-wider flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5" />
                          {cat}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {modules.filter(m => m.category === cat).map(mod => {
                            const isSelected = selectedModules.includes(mod.module_key);
                            return (
                              <div
                                key={mod.module_key}
                                onClick={() => toggleModule(mod.module_key)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? "bg-[#EAF7F6]/60 border-[#09A08A] shadow-sm"
                                    : "bg-[#F8FAFC] border-slate-200 hover:border-slate-300 opacity-70"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-extrabold text-slate-900 text-sm">{mod.display_name}</span>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                      isSelected ? "bg-[#09A08A] text-white" : "border border-slate-300 bg-white"
                                    }`}>
                                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">{mod.description}</p>
                                </div>

                                <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
                                  <span className="text-xs font-bold text-[#09A08A]">₹{mod.price_per_month} / mo</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isSelected ? "bg-[#09A08A]/10 text-[#09A08A]" : "bg-slate-200 text-slate-500"
                                  }`}>
                                    {isSelected ? "Selected" : "Add"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-3 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-[#09A08A]/20"
                  >
                    Next: Choose Subscription Plan ({selectedModules.length} Modules)
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE DURATION PLAN (3 MONTHS / 6 MONTHS / 1 YEAR) */}
            {step === 3 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#09A08A]" />
                    Step 3: Select Subscription Billing Cycle
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Save more with longer subscription terms (up to 20% Discount)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map(plan => {
                    const isSelected = selectedPlanKey === plan.plan_key;
                    const isBestValue = plan.months === 12;
                    return (
                      <div
                        key={plan.plan_key}
                        onClick={() => setSelectedPlanKey(plan.plan_key)}
                        className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? "bg-[#EAF7F6]/50 border-[#09A08A] shadow-md"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {plan.badge && (
                          <span className={`absolute -top-3 right-4 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isBestValue ? "bg-amber-500 text-white shadow-sm" : "bg-[#09A08A] text-white"
                          }`}>
                            {plan.badge}
                          </span>
                        )}

                        <div>
                          <h3 className="font-extrabold text-slate-900 text-lg mb-1">{plan.display_name}</h3>
                          <p className="text-xs text-slate-500 mb-4">{plan.months} Months full access to selected modules</p>

                          <div className="space-y-2 border-t border-b border-slate-100 py-3 text-xs text-slate-600">
                            <div className="flex justify-between">
                              <span>Monthly Rate:</span>
                              <span className="font-bold text-slate-800">₹{summary?.monthly_subtotal}/mo</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Discount Rate:</span>
                              <span className="font-bold text-[#09A08A]">{plan.discount_percent}% OFF</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-2">
                          <button
                            type="button"
                            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                              isSelected
                                ? "bg-[#09A08A] text-white shadow-sm"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                Selected Plan
                                <Check className="w-4 h-4 stroke-[3]" />
                              </>
                            ) : (
                              "Select Plan"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Modules
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-6 py-3 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-[#09A08A]/20"
                  >
                    Next: Order Breakdown & Checkout
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: ORDER BREAKDOWN & CHECKOUT */}
            {step === 4 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#09A08A]" />
                    Step 4: Itemized Invoice & Payment Checkout
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Review your order summary before proceeding to payment gateway</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Itemized Invoice Table */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Order Summary Details</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-[#EAF7F6] text-slate-800 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Selected Module / Item</th>
                            <th className="p-3 text-right">Rate / Month</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {modules.filter(m => selectedModules.includes(m.module_key)).map(m => (
                            <tr key={m.module_key} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-900">{m.display_name} ({m.category})</td>
                              <td className="p-3 text-right font-mono text-slate-800">₹{m.price_per_month}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment Calculation Summary Card */}
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base mb-4 border-b border-slate-200 pb-2">Final Invoice</h3>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Monthly Rate Subtotal:</span>
                          <span className="font-bold text-slate-900">₹{summary?.monthly_subtotal}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Billing Duration:</span>
                          <span className="font-bold text-slate-900">{summary?.duration_months} Months</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Raw Total:</span>
                          <span className="font-bold text-slate-900">₹{summary?.raw_total}</span>
                        </div>
                        {summary?.discount_amount ? (
                          <div className="flex justify-between text-[#09A08A] font-bold">
                            <span>Discount ({summary.discount_percent}%):</span>
                            <span>- ₹{summary.discount_amount}</span>
                          </div>
                        ) : null}

                        <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-extrabold text-slate-900">
                          <span>Total Amount Payable:</span>
                          <span className="text-xl text-[#09A08A]">₹{summary?.final_total}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="w-full py-3.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#09A08A]/20"
                    >
                      <CreditCard className="w-4 h-4" />
                      Proceed to Payment Gateway
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Plan
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Payment Gateway Trigger Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 bg-[#EAF7F6] text-[#09A08A] rounded-2xl flex items-center justify-center mx-auto border border-[#09A08A]/30">
              <CreditCard className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Payment Gateway Checkout</h3>
              <p className="text-xs text-slate-500 mt-1">Ready to integrate your preferred Payment Gateway (Razorpay / Stripe / PhonePe)</p>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Company:</span>
                <span className="font-bold text-slate-900">{companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total Amount:</span>
                <span className="font-extrabold text-[#09A08A]">₹{summary?.final_total} INR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Duration:</span>
                <span className="font-bold text-slate-900">{summary?.duration_months} Months</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-[#09A08A]/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Completing Checkout & Provisioning...
                  </>
                ) : (
                  <>
                    Simulate Successful Payment & Provision Workspace
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-full text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
