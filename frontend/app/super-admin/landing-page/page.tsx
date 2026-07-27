"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Globe, 
  Layers, 
  HelpCircle, 
  TrendingUp, 
  Table, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  ArrowLeft,
  CheckCircle,
  HelpCircle as FaqIcon,
  Sparkles,
  Info,
  Check,
  X as CrossIcon
} from "lucide-react";
import { API_URL } from "@/lib/config";
import SuperAdminHeader from "@/components/layout/SuperAdminHeader";
import { useConfirm } from "@/context/ConfirmContext";

interface ModuleItem {
  id: string;
  icon_name: string;
  name: string;
  description: string;
}

interface StatItem {
  id: string;
  value: string;
  label: string;
}

interface PlanItem {
  id: string;
  name: string;
  description: string;
  priceYearly: string;
  priceOnetime: string;
  limit: string;
  isPopular: boolean;
  features: string[];
}

interface ComparisonItem {
  id: string;
  category: string;
  featureName: string;
  lite: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  elite: string | boolean;
  hybrid: string | boolean;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

type TabType = "modules" | "stats" | "plans" | "comparison" | "faqs";

const POPULAR_ICONS = [
  "Users", "Clock", "CreditCard", "Calendar", "UserPlus", "ClipboardList", 
  "LogOut", "Gauge", "Award", "ListTodo", "ShieldCheck", "BarChart3", 
  "MessageSquare", "Settings", "Activity", "HelpCircle", "Globe", "Layers"
];

export default function LandingPageCRUD() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>("modules");
  
  // Data lists state
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // Section States
  const [sectionsData, setSectionsData] = useState<any>({
    hero: { title: "", subtitle: "", cta_primary_text: "", cta_primary_link: "", cta_secondary_text: "", cta_secondary_link: "", image_url: "", badge_text: "", trust_badge_1: "", trust_badge_2: "", trust_badge_3: "" },
    about: { headline: "", subheadline: "", bullets: [], image_url: "" },
    why_us: { headline: "", subheadline: "", cards: [] },
    benefits: { headline: "", subheadline: "", items: [] },
    final_cta: { title: "", subtitle: "", button_text: "", button_link: "" },
    contact: { address: "", email: "", phone: "", map_url: "" }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals visibility state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  // 1. Module Form
  const [modIcon, setModIcon] = useState("Users");
  const [modName, setModName] = useState("");
  const [modDesc, setModDesc] = useState("");

  // 2. Stat Form
  const [statValue, setStatValue] = useState("");
  const [statLabel, setStatLabel] = useState("");

  // 3. Plan Form
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planPriceYearly, setPlanPriceYearly] = useState("");
  const [planPriceOnetime, setPlanPriceOnetime] = useState("");
  const [planLimit, setPlanLimit] = useState("");
  const [planIsPopular, setPlanIsPopular] = useState(false);
  const [planFeaturesStr, setPlanFeaturesStr] = useState("");

  // 4. Comparison Form
  const [compCategory, setCompCategory] = useState("");
  const [compFeatureName, setCompFeatureName] = useState("");
  const [compLite, setCompLite] = useState<string | boolean>("");
  const [compStarter, setCompStarter] = useState<string | boolean>("");
  const [compPro, setCompPro] = useState<string | boolean>("");
  const [compElite, setCompElite] = useState<string | boolean>("");
  const [compHybrid, setCompHybrid] = useState<string | boolean>("");

  // 5. FAQ Form
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  // Fetch sections data
  const fetchSections = async () => {
    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/super-admin/login");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/super-admin/landing/sections`, { headers });
      if (res.status === 401 || res.status === 403) {
        router.push("/super-admin/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load sections data.");
      }
      const data = await res.json();
      setSectionsData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load sections data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Save a section's data
  const handleSaveSection = async (key: string, payloadData: any) => {
    try {
      setIsSubmitting(true);
      setError("");
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      };
      
      const res = await fetch(`${API_URL}/super-admin/landing/sections/${key}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payloadData)
      });

      if (res.ok) {
        setSuccessMsg("Section updated successfully!");
        fetchSections();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update section.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update section.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch data on mount / tab change
  const fetchData = async () => {
    const isSectionTab = ["hero", "about", "why_us", "benefits", "final_cta", "contact"].includes(activeTab);
    if (isSectionTab) {
      await fetchSections();
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/super-admin/login");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_URL}/super-admin/landing/${activeTab}`, { headers });
      if (res.status === 401 || res.status === 403) {
        router.push("/super-admin/login");
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load ${activeTab} data.`);
      }

      const data = await res.json();
      if (activeTab === "modules") setModules(data);
      else if (activeTab === "stats") setStats(data);
      else if (activeTab === "plans") setPlans(data);
      else if (activeTab === "comparison") setComparisons(data);
      else if (activeTab === "faqs") setFaqs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load landing page data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingId(null);
    setError("");

    if (activeTab === "modules") {
      setModIcon("Users");
      setModName("");
      setModDesc("");
    } else if (activeTab === "stats") {
      setStatValue("");
      setStatLabel("");
    } else if (activeTab === "plans") {
      setPlanName("");
      setPlanDesc("");
      setPlanPriceYearly("");
      setPlanPriceOnetime("");
      setPlanLimit("");
      setPlanIsPopular(false);
      setPlanFeaturesStr("");
    } else if (activeTab === "comparison") {
      setCompCategory("");
      setCompFeatureName("");
      setCompLite("");
      setCompStarter("");
      setCompPro("");
      setCompElite("");
      setCompHybrid("");
    } else if (activeTab === "faqs") {
      setFaqQuestion("");
      setFaqAnswer("");
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item.id);
    setError("");

    if (activeTab === "modules") {
      setModIcon(item.icon_name || "Users");
      setModName(item.name || "");
      setModDesc(item.description || "");
    } else if (activeTab === "stats") {
      setStatValue(item.value || "");
      setStatLabel(item.label || "");
    } else if (activeTab === "plans") {
      setPlanName(item.name || "");
      setPlanDesc(item.description || "");
      setPlanPriceYearly(item.priceYearly || "");
      setPlanPriceOnetime(item.priceOnetime || "");
      setPlanLimit(item.limit || "");
      setPlanIsPopular(item.isPopular || false);
      setPlanFeaturesStr(Array.isArray(item.features) ? item.features.join("\n") : "");
    } else if (activeTab === "comparison") {
      setCompCategory(item.category || "");
      setCompFeatureName(item.featureName || "");
      setCompLite(item.lite !== undefined ? item.lite : "");
      setCompStarter(item.starter !== undefined ? item.starter : "");
      setCompPro(item.pro !== undefined ? item.pro : "");
      setCompElite(item.elite !== undefined ? item.elite : "");
      setCompHybrid(item.hybrid !== undefined ? item.hybrid : "");
    } else if (activeTab === "faqs") {
      setFaqQuestion(item.question || "");
      setFaqAnswer(item.answer || "");
    }
    setIsModalOpen(true);
  };

  // Delete Action Handler
  const handleDeleteItem = async (item: any) => {
    const itemLabel = item.name || item.label || item.featureName || item.question || "this item";
    const confirmed = await confirm({
      title: `Delete Landing Page ${activeTab.toUpperCase()}`,
      message: `Are you sure you want to permanently delete "${itemLabel}" from the landing page?`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_URL}/super-admin/landing/${activeTab}/${item.id}`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        setSuccessMsg("Item deleted successfully!");
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to delete item.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete item.");
      setIsLoading(false);
    }
  };

  // Submit Handler (Create/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");

      const token = localStorage.getItem("token");
      const headers = { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      };

      let body: any = {};
      if (activeTab === "modules") {
        if (!modName || !modDesc) throw new Error("Please fill in all fields.");
        body = { icon_name: modIcon, name: modName, description: modDesc };
      } else if (activeTab === "stats") {
        if (!statValue || !statLabel) throw new Error("Please fill in all fields.");
        body = { value: statValue, label: statLabel };
      } else if (activeTab === "plans") {
        if (!planName || !planDesc || !planPriceYearly || !planPriceOnetime || !planLimit) {
          throw new Error("Please fill in all standard fields.");
        }
        const features = planFeaturesStr
          .split("\n")
          .map(f => f.trim())
          .filter(f => f !== "");
        body = { 
          name: planName, 
          description: planDesc, 
          priceYearly: planPriceYearly, 
          priceOnetime: planPriceOnetime, 
          limit: planLimit, 
          isPopular: planIsPopular,
          features 
        };
      } else if (activeTab === "comparison") {
        if (!compCategory || !compFeatureName) {
          throw new Error("Category and Feature Name are required.");
        }
        body = {
          category: compCategory,
          featureName: compFeatureName,
          lite: compLite,
          starter: compStarter,
          pro: compPro,
          elite: compElite,
          hybrid: compHybrid
        };
      } else if (activeTab === "faqs") {
        if (!faqQuestion || !faqAnswer) throw new Error("Please fill in question and answer.");
        body = { question: faqQuestion, answer: faqAnswer };
      }

      const method = editingId ? "PUT" : "POST";
      const url = editingId 
        ? `${API_URL}/super-admin/landing/${activeTab}/${editingId}`
        : `${API_URL}/super-admin/landing/${activeTab}`;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setSuccessMsg(editingId ? "Updated successfully!" : "Created successfully!");
        setIsModalOpen(false);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to save item.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for comparison matrix values
  const renderComparisonFieldInput = (
    label: string,
    value: string | boolean,
    onChange: (val: string | boolean) => void
  ) => {
    const isBool = typeof value === "boolean";
    return (
      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label} Value</label>
        <div className="flex gap-2 items-center">
          <select
            value={isBool ? "bool" : "text"}
            onChange={(e) => {
              if (e.target.value === "bool") {
                onChange(true);
              } else {
                onChange("");
              }
            }}
            className="text-xs bg-white border border-slate-200 rounded-lg p-2 focus:border-[#09A08A] focus:outline-none"
          >
            <option value="text">Custom Text</option>
            <option value="bool">Check / Cross</option>
          </select>
          {isBool ? (
            <select
              value={value ? "true" : "false"}
              onChange={(e) => onChange(e.target.value === "true")}
              className="text-xs flex-1 bg-white border border-slate-200 rounded-lg p-2 focus:border-[#09A08A] focus:outline-none font-bold text-slate-700"
            >
              <option value="true">✅ Enabled (Check)</option>
              <option value="false">❌ Disabled (Cross)</option>
            </select>
          ) : (
            <input
              type="text"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. 1 Admin + 2 Users"
              className="text-xs flex-1 bg-white border border-slate-200 rounded-lg p-2 focus:border-[#09A08A] focus:outline-none font-semibold text-slate-700"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <SuperAdminHeader onRefresh={fetchData} isLoading={isLoading} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 pt-24 pb-12 space-y-6">
        {/* Navigation Info */}
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
          <span className="hover:underline cursor-pointer" onClick={() => router.push("/super-admin/dashboard")}>Dashboard</span>
          <span>&rarr;</span>
          <span className="text-[#09A08A]">Landing Page Editor</span>
        </div>

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Globe className="w-6 h-6 text-[#09A08A]" />
              Landing Page Dynamic Content
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Configure modules, stats, plans, comparison columns, and FAQs displayed on the corporate home page.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[#09A08A]/10 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between font-medium">
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-[#EAF7F6] border border-[#09A08A]/30 rounded-xl text-[#09A08A] text-xs flex items-center justify-between font-medium animate-pulse">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Main Content Layout with Vertical Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* Vertical Sidebar Navigation */}
          <aside className="w-full lg:w-64 flex-shrink-0 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm space-y-1">
            <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Page Sections
            </div>
            
            <button
              onClick={() => setActiveTab("hero")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "hero"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                <span>Hero Section</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "about"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4" />
                <span>About Section</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("why_us")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "why_us"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Why Choose Us</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("benefits")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "benefits"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Benefits Section</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("final_cta")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "final_cta"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ArrowLeft className="w-4 h-4 rotate-180" />
                <span>Final CTA</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("contact")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "contact"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-sky-500" />
                <span>Contact Info</span>
              </div>
            </button>

            <div className="px-3 pt-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Dynamic Collections
            </div>
            
            <button
              onClick={() => setActiveTab("modules")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "modules"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Modules List</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "modules" ? "bg-[#09A08A] text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {modules.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("plans")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "plans"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                <span>Pricing Plans</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "plans" ? "bg-[#09A08A] text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {plans.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("comparison")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "comparison"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Table className="w-4 h-4" />
                <span>Comparison Matrix</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "comparison" ? "bg-[#09A08A] text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {comparisons.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("faqs")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "faqs"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4" />
                <span>FAQs List</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "faqs" ? "bg-[#09A08A] text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {faqs.length}
              </span>
            </button>
          </aside>

          {/* Tab Content Rendering Container */}
          <div className="flex-1 w-full bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden min-h-[450px] flex flex-col">
            {/* Active Tab Header Bar */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm capitalize">
                  {activeTab === "hero" && "Hero Section Content"}
                  {activeTab === "about" && "About HRMS Section"}
                  {activeTab === "why_us" && "Why Choose Us Section"}
                  {activeTab === "benefits" && "Benefits Section"}
                  {activeTab === "final_cta" && "Final CTA Block"}
                  {activeTab === "contact" && "Contact Page Settings"}
                  {activeTab === "modules" && "Modules List"}
                  {activeTab === "stats" && "About Stats"}
                  {activeTab === "plans" && "Pricing Plans"}
                  {activeTab === "comparison" && "Comparison Matrix"}
                  {activeTab === "faqs" && "FAQs List"}
                </span>
                {!["hero", "about", "why_us", "benefits", "final_cta", "contact"].includes(activeTab) && (
                  <span className="text-xs text-slate-400 font-semibold">
                    (
                    {activeTab === "modules" && `${modules.length} items`}
                    {activeTab === "stats" && `${stats.length} items`}
                    {activeTab === "plans" && `${plans.length} items`}
                    {activeTab === "comparison" && `${comparisons.length} items`}
                    {activeTab === "faqs" && `${faqs.length} items`}
                    )
                  </span>
                )}
              </div>
              {!["hero", "about", "why_us", "benefits", "final_cta", "contact"].includes(activeTab) && (
                <button
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-2 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#09A08A]/10 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#09A08A]" />
                <span className="text-xs font-bold">Fetching latest {activeTab} data...</span>
              </div>
            ) : (
              <div className="p-6 overflow-x-auto">
                {/* 1. Hero Section Form */}
                {activeTab === "hero" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveSection("hero", sectionsData.hero);
                    }}
                    className="space-y-4 max-w-2xl"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Pill Badge Text</label>
                      <input
                        type="text"
                        value={sectionsData.hero?.badge_text || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          hero: { ...sectionsData.hero, badge_text: e.target.value }
                        })}
                        placeholder="e.g. Cloud HRMS Platform"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#09A08A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Hero Title</label>
                      <input
                        type="text"
                        value={sectionsData.hero?.title || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          hero: { ...sectionsData.hero, title: e.target.value }
                        })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#09A08A]"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Hero Subtitle</label>
                      <textarea
                        value={sectionsData.hero?.subtitle || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          hero: { ...sectionsData.hero, subtitle: e.target.value }
                        })}
                        rows={3}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#09A08A]"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Primary CTA Text</label>
                        <input
                          type="text"
                          value={sectionsData.hero?.cta_primary_text || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            hero: { ...sectionsData.hero, cta_primary_text: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Primary CTA Link</label>
                        <input
                          type="text"
                          value={sectionsData.hero?.cta_primary_link || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            hero: { ...sectionsData.hero, cta_primary_link: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Secondary CTA Text</label>
                        <input
                          type="text"
                          value={sectionsData.hero?.cta_secondary_text || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            hero: { ...sectionsData.hero, cta_secondary_text: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Secondary CTA Link</label>
                        <input
                          type="text"
                          value={sectionsData.hero?.cta_secondary_link || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            hero: { ...sectionsData.hero, cta_secondary_link: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Image / Banner URL</label>
                      <input
                        type="text"
                        value={sectionsData.hero?.image_url || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          hero: { ...sectionsData.hero, image_url: e.target.value }
                        })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Trust Indicator 1</label>
                        <input
                          type="text"
                          value={sectionsData.hero?.trust_badge_1 || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            hero: { ...sectionsData.hero, trust_badge_1: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Trust Indicator 2</label>
                        <input
                          type="text"
                          value={sectionsData.hero?.trust_badge_2 || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            hero: { ...sectionsData.hero, trust_badge_2: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Trust Indicator 3</label>
                        <input
                          type="text"
                          value={sectionsData.hero?.trust_badge_3 || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            hero: { ...sectionsData.hero, trust_badge_3: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                    </div>

                    {/* Trust Features Grid List */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase font-extrabold text-[#09A08A]">Trust Strip Features</h4>
                        <button
                          type="button"
                          onClick={() => {
                            const currentFeatures = Array.isArray(sectionsData.hero?.trust_features) ? sectionsData.hero.trust_features : [];
                            setSectionsData({
                              ...sectionsData,
                              hero: {
                                ...sectionsData.hero,
                                trust_features: [...currentFeatures, { title: "New Feature", description: "Details...", icon_name: "Cpu" }]
                              }
                            });
                          }}
                          className="px-2.5 py-1.5 bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/15 hover:bg-[#09A08A]/10 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          + Add Feature Card
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.isArray(sectionsData.hero?.trust_features) && sectionsData.hero.trust_features.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => {
                                const newFeatures = [...sectionsData.hero.trust_features];
                                newFeatures.splice(idx, 1);
                                setSectionsData({
                                  ...sectionsData,
                                  hero: { ...sectionsData.hero, trust_features: newFeatures }
                                });
                              }}
                              className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer transition-colors"
                              title="Delete Feature"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Title</label>
                                <input
                                  type="text"
                                  value={item.title || ""}
                                  onChange={(e) => {
                                    const newFeatures = [...sectionsData.hero.trust_features];
                                    newFeatures[idx].title = e.target.value;
                                    setSectionsData({
                                      ...sectionsData,
                                      hero: { ...sectionsData.hero, trust_features: newFeatures }
                                    });
                                  }}
                                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#09A08A]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Icon Name</label>
                                <input
                                  type="text"
                                  value={item.icon_name || ""}
                                  onChange={(e) => {
                                    const newFeatures = [...sectionsData.hero.trust_features];
                                    newFeatures[idx].icon_name = e.target.value;
                                    setSectionsData({
                                      ...sectionsData,
                                      hero: { ...sectionsData.hero, trust_features: newFeatures }
                                    });
                                  }}
                                  placeholder="e.g. Cpu, ShieldCheck"
                                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#09A08A] font-mono"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">Description</label>
                              <textarea
                                value={item.description || ""}
                                onChange={(e) => {
                                  const newFeatures = [...sectionsData.hero.trust_features];
                                  newFeatures[idx].description = e.target.value;
                                  setSectionsData({
                                    ...sectionsData,
                                    hero: { ...sectionsData.hero, trust_features: newFeatures }
                                  });
                                }}
                                rows={2}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#09A08A]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Saving..." : "Save Hero Section"}
                    </button>
                  </form>
                )}

                {/* 2. About Section Form */}
                {activeTab === "about" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveSection("about", sectionsData.about);
                    }}
                    className="space-y-4 max-w-2xl"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Headline</label>
                      <input
                        type="text"
                        value={sectionsData.about?.headline || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          about: { ...sectionsData.about, headline: e.target.value }
                        })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Sub-headline</label>
                      <textarea
                        value={sectionsData.about?.subheadline || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          about: { ...sectionsData.about, subheadline: e.target.value }
                        })}
                        rows={3}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Feature Bullets (One per line)</label>
                      <textarea
                        value={Array.isArray(sectionsData.about?.bullets) ? sectionsData.about.bullets.join("\n") : ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          about: { ...sectionsData.about, bullets: e.target.value.split("\n") }
                        })}
                        rows={5}
                        placeholder="Feature bullet 1&#10;Feature bullet 2"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Side Image URL</label>
                      <input
                        type="text"
                        value={sectionsData.about?.image_url || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          about: { ...sectionsData.about, image_url: e.target.value }
                        })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                      />
                    </div>

                    {/* Stats List */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase font-extrabold text-[#09A08A]">About Section Statistics</h4>
                        <button
                          type="button"
                          onClick={() => {
                            const currentStats = Array.isArray(sectionsData.about?.stats) ? sectionsData.about.stats : [];
                            setSectionsData({
                              ...sectionsData,
                              about: {
                                ...sectionsData.about,
                                stats: [...currentStats, { value: "100+", label: "New Stat Label" }]
                              }
                            });
                          }}
                          className="px-2.5 py-1.5 bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/15 hover:bg-[#09A08A]/10 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          + Add Stat Card
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.isArray(sectionsData.about?.stats) && sectionsData.about.stats.map((stat: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => {
                                const newStats = [...sectionsData.about.stats];
                                newStats.splice(idx, 1);
                                setSectionsData({
                                  ...sectionsData,
                                  about: { ...sectionsData.about, stats: newStats }
                                });
                              }}
                              className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer transition-colors"
                              title="Delete Stat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">Stat Value (e.g. 500+)</label>
                              <input
                                type="text"
                                value={stat.value || ""}
                                onChange={(e) => {
                                  const newStats = [...sectionsData.about.stats];
                                  newStats[idx].value = e.target.value;
                                  setSectionsData({
                                    ...sectionsData,
                                    about: { ...sectionsData.about, stats: newStats }
                                  });
                                }}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#09A08A]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">Stat Label</label>
                              <input
                                type="text"
                                value={stat.label || ""}
                                onChange={(e) => {
                                  const newStats = [...sectionsData.about.stats];
                                  newStats[idx].label = e.target.value;
                                  setSectionsData({
                                    ...sectionsData,
                                    about: { ...sectionsData.about, stats: newStats }
                                  });
                                }}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#09A08A]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Saving..." : "Save About Settings"}
                    </button>
                  </form>
                )}

                {/* 3. Why Choose Us Form */}
                {activeTab === "why_us" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveSection("why_us", sectionsData.why_us);
                    }}
                    className="space-y-4 max-w-3xl"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Section Headline</label>
                      <input
                        type="text"
                        value={sectionsData.why_us?.headline || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          why_us: { ...sectionsData.why_us, headline: e.target.value }
                        })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Sub-headline</label>
                      <textarea
                        value={sectionsData.why_us?.subheadline || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          why_us: { ...sectionsData.why_us, subheadline: e.target.value }
                        })}
                        rows={2}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                      />
                    </div>
                    
                    {/* Cards Sub List */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase">Features Grid Cards</h4>
                        <button
                          type="button"
                          onClick={() => {
                            const currentCards = Array.isArray(sectionsData.why_us?.cards) ? sectionsData.why_us.cards : [];
                            setSectionsData({
                              ...sectionsData,
                              why_us: {
                                ...sectionsData.why_us,
                                cards: [...currentCards, { title: "New Feature", description: "Details...", icon_name: "Sparkles" }]
                              }
                            });
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          + Add Card
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.isArray(sectionsData.why_us?.cards) && sectionsData.why_us.cards.map((card: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => {
                                const newCards = [...sectionsData.why_us.cards];
                                newCards.splice(idx, 1);
                                setSectionsData({
                                  ...sectionsData,
                                  why_us: { ...sectionsData.why_us, cards: newCards }
                                });
                              }}
                              className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50 p-1 rounded-lg cursor-pointer"
                              title="Delete Card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Card Title</label>
                                <input
                                  type="text"
                                  value={card.title || ""}
                                  onChange={(e) => {
                                    const newCards = [...sectionsData.why_us.cards];
                                    newCards[idx].title = e.target.value;
                                    setSectionsData({
                                      ...sectionsData,
                                      why_us: { ...sectionsData.why_us, cards: newCards }
                                    });
                                  }}
                                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Icon Name</label>
                                <input
                                  type="text"
                                  value={card.icon_name || ""}
                                  onChange={(e) => {
                                    const newCards = [...sectionsData.why_us.cards];
                                    newCards[idx].icon_name = e.target.value;
                                    setSectionsData({
                                      ...sectionsData,
                                      why_us: { ...sectionsData.why_us, cards: newCards }
                                    });
                                  }}
                                  placeholder="e.g. Clock, ShieldCheck"
                                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-mono"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">Description</label>
                              <textarea
                                value={card.description || ""}
                                onChange={(e) => {
                                  const newCards = [...sectionsData.why_us.cards];
                                  newCards[idx].description = e.target.value;
                                  setSectionsData({
                                    ...sectionsData,
                                    why_us: { ...sectionsData.why_us, cards: newCards }
                                  });
                                }}
                                rows={2}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Saving..." : "Save Why Choose Us"}
                    </button>
                  </form>
                )}

                {/* 4. Benefits Section Form */}
                {activeTab === "benefits" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveSection("benefits", sectionsData.benefits);
                    }}
                    className="space-y-4 max-w-3xl"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Headline</label>
                      <input
                        type="text"
                        value={sectionsData.benefits?.headline || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          benefits: { ...sectionsData.benefits, headline: e.target.value }
                        })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Subtext Description</label>
                      <textarea
                        value={sectionsData.benefits?.subheadline || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          benefits: { ...sectionsData.benefits, subheadline: e.target.value }
                        })}
                        rows={2}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                      />
                    </div>

                    {/* Benefit Items List */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase">Benefits List Items</h4>
                        <button
                          type="button"
                          onClick={() => {
                            const currentItems = Array.isArray(sectionsData.benefits?.items) ? sectionsData.benefits.items : [];
                            setSectionsData({
                              ...sectionsData,
                              benefits: {
                                ...sectionsData.benefits,
                                items: [...currentItems, { title: "Benefit Title", description: "Details..." }]
                              }
                            });
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          + Add Benefit
                        </button>
                      </div>

                      <div className="space-y-3">
                        {Array.isArray(sectionsData.benefits?.items) && sectionsData.benefits.items.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...sectionsData.benefits.items];
                                newItems.splice(idx, 1);
                                setSectionsData({
                                  ...sectionsData,
                                  benefits: { ...sectionsData.benefits, items: newItems }
                                });
                              }}
                              className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50 p-1 rounded-lg cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">Benefit Title</label>
                              <input
                                type="text"
                                value={item.title || ""}
                                onChange={(e) => {
                                  const newItems = [...sectionsData.benefits.items];
                                  newItems[idx].title = e.target.value;
                                  setSectionsData({
                                    ...sectionsData,
                                    benefits: { ...sectionsData.benefits, items: newItems }
                                  });
                                }}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">Description</label>
                              <textarea
                                value={item.description || ""}
                                onChange={(e) => {
                                  const newItems = [...sectionsData.benefits.items];
                                  newItems[idx].description = e.target.value;
                                  setSectionsData({
                                    ...sectionsData,
                                    benefits: { ...sectionsData.benefits, items: newItems }
                                  });
                                }}
                                rows={2}
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Saving..." : "Save Benefits"}
                    </button>
                  </form>
                )}

                {/* 5. Final CTA Form */}
                {activeTab === "final_cta" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveSection("final_cta", sectionsData.final_cta);
                    }}
                    className="space-y-4 max-w-2xl"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                      <input
                        type="text"
                        value={sectionsData.final_cta?.title || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          final_cta: { ...sectionsData.final_cta, title: e.target.value }
                        })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Subtitle Description</label>
                      <textarea
                        value={sectionsData.final_cta?.subtitle || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          final_cta: { ...sectionsData.final_cta, subtitle: e.target.value }
                        })}
                        rows={3}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Button Text</label>
                        <input
                          type="text"
                          value={sectionsData.final_cta?.button_text || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            final_cta: { ...sectionsData.final_cta, button_text: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Button Link Path</label>
                        <input
                          type="text"
                          value={sectionsData.final_cta?.button_link || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            final_cta: { ...sectionsData.final_cta, button_link: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Saving..." : "Save Final CTA"}
                    </button>
                  </form>
                )}

                {/* 6. Contact Info Form */}
                {activeTab === "contact" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveSection("contact", sectionsData.contact);
                    }}
                    className="space-y-4 max-w-2xl"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Page Badge</label>
                        <input
                          type="text"
                          value={sectionsData.contact?.badge || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            contact: { ...sectionsData.contact, badge: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Working Hours</label>
                        <input
                          type="text"
                          value={sectionsData.contact?.working_hours || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            contact: { ...sectionsData.contact, working_hours: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Headline</label>
                      <input
                        type="text"
                        value={sectionsData.contact?.headline || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          contact: { ...sectionsData.contact, headline: e.target.value }
                        })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Description Sub-headline</label>
                      <textarea
                        value={sectionsData.contact?.subheadline || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          contact: { ...sectionsData.contact, subheadline: e.target.value }
                        })}
                        rows={2}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Office Address</label>
                      <textarea
                        value={sectionsData.contact?.address || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          contact: { ...sectionsData.contact, address: e.target.value }
                        })}
                        rows={2}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Contact Email</label>
                        <input
                          type="email"
                          value={sectionsData.contact?.email || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            contact: { ...sectionsData.contact, email: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Contact Phone</label>
                        <input
                          type="text"
                          value={sectionsData.contact?.phone || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            contact: { ...sectionsData.contact, phone: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Form Title</label>
                        <input
                          type="text"
                          value={sectionsData.contact?.form_title || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            contact: { ...sectionsData.contact, form_title: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Form Subtitle Description</label>
                        <input
                          type="text"
                          value={sectionsData.contact?.form_subtitle || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            contact: { ...sectionsData.contact, form_subtitle: e.target.value }
                          })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Google Map Embed URL</label>
                      <input
                        type="text"
                        value={sectionsData.contact?.map_url || ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          contact: { ...sectionsData.contact, map_url: e.target.value }
                        })}
                        placeholder="https://www.google.com/maps/embed?pb=..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono"
                      />
                    </div>

                    {/* Employee Range Dropdown Options */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Employee Range Dropdown Options (One per line)</label>
                      <textarea
                        value={Array.isArray(sectionsData.contact?.employee_options) ? sectionsData.contact.employee_options.join("\n") : ""}
                        onChange={(e) => setSectionsData({
                          ...sectionsData,
                          contact: { ...sectionsData.contact, employee_options: e.target.value.split("\n") }
                        })}
                        rows={4}
                        placeholder="1 - 50 Employees&#10;51 - 200 Employees"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Saving..." : "Save Contact Info"}
                    </button>
                  </form>        )}

                {/* Modules list */}
                {activeTab === "modules" && (
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-[#EAF7F6] text-xs font-bold text-slate-700 uppercase border-b border-[#09A08A]/15">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl w-12 text-center">Icon</th>
                        <th className="py-3 px-4 w-52">Module Name</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right rounded-r-xl w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {modules.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">No modules found. Add one now!</td>
                        </tr>
                      ) : (
                        modules.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 text-center">
                              <span className="px-2.5 py-1.5 bg-[#EAF7F6] text-[#09A08A] rounded-lg border border-[#09A08A]/15 font-mono text-[11px]">{m.icon_name || "Layers"}</span>
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-900">{m.name}</td>
                            <td className="py-4 px-4 text-slate-500 font-medium">{m.description}</td>
                            <td className="py-4 px-4 text-right space-x-2">
                              <button onClick={() => handleOpenEditModal(m)} className="p-1.5 text-slate-500 hover:text-[#09A08A] hover:bg-[#EAF7F6] rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteItem(m)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* About Stats */}
                {activeTab === "stats" && (
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-[#EAF7F6] text-xs font-bold text-slate-700 uppercase border-b border-[#09A08A]/15">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl w-48">Value</th>
                        <th className="py-3 px-4">Label</th>
                        <th className="py-3 px-4 text-right rounded-r-xl w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {stats.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400">No stats found. Add one now!</td>
                        </tr>
                      ) : (
                        stats.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 font-mono font-bold text-[#09A08A] text-sm">{s.value}</td>
                            <td className="py-4 px-4 text-slate-800">{s.label}</td>
                            <td className="py-4 px-4 text-right space-x-2">
                              <button onClick={() => handleOpenEditModal(s)} className="p-1.5 text-slate-500 hover:text-[#09A08A] hover:bg-[#EAF7F6] rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteItem(s)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* Pricing Plans */}
                {activeTab === "plans" && (
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-[#EAF7F6] text-xs font-bold text-slate-700 uppercase border-b border-[#09A08A]/15">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl w-36">Plan Name</th>
                        <th className="py-3 px-4 w-44">Limit</th>
                        <th className="py-3 px-4 w-28">Yearly (₹)</th>
                        <th className="py-3 px-4 w-28">One-Time (₹)</th>
                        <th className="py-3 px-4 w-20">Popular</th>
                        <th className="py-3 px-4">Features</th>
                        <th className="py-3 px-4 text-right rounded-r-xl w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {plans.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">No plans found. Add one now!</td>
                        </tr>
                      ) : (
                        plans.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-900">{p.name}</td>
                            <td className="py-4 px-4 text-slate-600 font-mono text-[11px]">{p.limit}</td>
                            <td className="py-4 px-4 font-mono">₹{p.priceYearly}</td>
                            <td className="py-4 px-4 font-mono">₹{p.priceOnetime}</td>
                            <td className="py-4 px-4">
                              {p.isPopular ? (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">Yes</span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">No</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1 max-w-sm">
                                {p.features?.map((f, i) => (
                                  <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">{f}</span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right space-x-2">
                              <button onClick={() => handleOpenEditModal(p)} className="p-1.5 text-slate-500 hover:text-[#09A08A] hover:bg-[#EAF7F6] rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteItem(p)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {/* Comparison Matrix */}
                {activeTab === "comparison" && (
                  <table className="w-full text-left text-xs text-slate-700 min-w-[800px]">
                    <thead className="bg-[#EAF7F6] text-xs font-bold text-slate-700 uppercase border-b border-[#09A08A]/15">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl w-44">Category</th>
                        <th className="py-3 px-4 w-48">Feature</th>
                        <th className="py-3 px-4 text-center">Lite</th>
                        <th className="py-3 px-4 text-center">Starter</th>
                        <th className="py-3 px-4 text-center">Pro</th>
                        <th className="py-3 px-4 text-center">Elite</th>
                        <th className="py-3 px-4 text-center">Hybrid</th>
                        <th className="py-3 px-4 text-right rounded-r-xl w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {comparisons.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">No features mapped yet. Add one now!</td>
                        </tr>
                      ) : (
                        comparisons.map((c) => {
                          const renderVal = (v: string | boolean) => {
                            if (typeof v === "boolean") {
                              return v ? <Check className="w-4 h-4 mx-auto text-emerald-600 font-bold" /> : <CrossIcon className="w-4 h-4 mx-auto text-slate-300" />;
                            }
                            return <span className="text-[11px] font-medium text-slate-500">{v}</span>;
                          };
                          return (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-4 font-bold text-slate-900">{c.category}</td>
                              <td className="py-4 px-4 text-slate-800">{c.featureName}</td>
                              <td className="py-4 px-4 text-center">{renderVal(c.lite)}</td>
                              <td className="py-4 px-4 text-center">{renderVal(c.starter)}</td>
                              <td className="py-4 px-4 text-center">{renderVal(c.pro)}</td>
                              <td className="py-4 px-4 text-center">{renderVal(c.elite)}</td>
                              <td className="py-4 px-4 text-center">{renderVal(c.hybrid)}</td>
                              <td className="py-4 px-4 text-right space-x-2">
                                <button onClick={() => handleOpenEditModal(c)} className="p-1.5 text-slate-500 hover:text-[#09A08A] hover:bg-[#EAF7F6] rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteItem(c)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}

                {/* FAQs */}
                {activeTab === "faqs" && (
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-[#EAF7F6] text-xs font-bold text-slate-700 uppercase border-b border-[#09A08A]/15">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl w-72">Question</th>
                        <th className="py-3 px-4">Answer</th>
                        <th className="py-3 px-4 text-right rounded-r-xl w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {faqs.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400">No FAQs found. Add one now!</td>
                        </tr>
                      ) : (
                        faqs.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-950">{f.question}</td>
                            <td className="py-4 px-4 text-slate-500 font-medium leading-relaxed max-w-md">{f.answer}</td>
                            <td className="py-4 px-4 text-right space-x-2">
                              <button onClick={() => handleOpenEditModal(f)} className="p-1.5 text-slate-500 hover:text-[#09A08A] hover:bg-[#EAF7F6] rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteItem(f)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#09A08A]" />
                {editingId ? `Edit ${activeTab.substring(0, activeTab.length-1).toUpperCase()}` : `Add New ${activeTab.substring(0, activeTab.length-1).toUpperCase()}`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Form 1: Modules */}
              {activeTab === "modules" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Module Icon</label>
                    <div className="grid grid-cols-6 gap-2">
                      {POPULAR_ICONS.map((ico) => (
                        <button
                          key={ico}
                          type="button"
                          onClick={() => setModIcon(ico)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                            modIcon === ico 
                              ? "bg-[#EAF7F6] text-[#09A08A] border-[#09A08A]"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-mono text-[9px]">{ico.substring(0, 5)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="pt-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Or Custom Icon Name</label>
                      <input
                        type="text"
                        value={modIcon}
                        onChange={(e) => setModIcon(e.target.value)}
                        placeholder="e.g. Users"
                        className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 mt-1.5 focus:border-[#09A08A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Module Name</label>
                    <input
                      type="text"
                      value={modName}
                      onChange={(e) => setModName(e.target.value)}
                      placeholder="e.g. Attendance Management"
                      className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                    <textarea
                      value={modDesc}
                      onChange={(e) => setModDesc(e.target.value)}
                      placeholder="Short feature description shown on landing page..."
                      rows={3}
                      className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none resize-none"
                      required
                    />
                  </div>
                </>
              )}

              {/* Form 2: Stats */}
              {activeTab === "stats" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stat KPI Value</label>
                    <input
                      type="text"
                      value={statValue}
                      onChange={(e) => setStatValue(e.target.value)}
                      placeholder="e.g. 500+ or 99.9%"
                      className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Label Description</label>
                    <input
                      type="text"
                      value={statLabel}
                      onChange={(e) => setStatLabel(e.target.value)}
                      placeholder="e.g. Companies onboarded or Uptime"
                      className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {/* Form 3: Plans */}
              {activeTab === "plans" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Name</label>
                      <input
                        type="text"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder="e.g. Pro"
                        className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Limits</label>
                      <input
                        type="text"
                        value={planLimit}
                        onChange={(e) => setPlanLimit(e.target.value)}
                        placeholder="e.g. 1 Admin + 10 Users"
                        className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Short Sub-headline</label>
                    <input
                      type="text"
                      value={planDesc}
                      onChange={(e) => setPlanDesc(e.target.value)}
                      placeholder="e.g. Try HK HRMS at minimum cost. Perfect for small teams."
                      className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Yearly Price (INR, comma format)</label>
                      <input
                        type="text"
                        value={planPriceYearly}
                        onChange={(e) => setPlanPriceYearly(e.target.value)}
                        placeholder="e.g. 29,999"
                        className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">One-Time Price (INR, comma format)</label>
                      <input
                        type="text"
                        value={planPriceOnetime}
                        onChange={(e) => setPlanPriceOnetime(e.target.value)}
                        placeholder="e.g. 54,999"
                        className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
                    <input
                      type="checkbox"
                      id="planIsPopular"
                      checked={planIsPopular}
                      onChange={(e) => setPlanIsPopular(e.target.checked)}
                      className="w-4 h-4 text-[#09A08A] rounded focus:ring-[#09A08A]"
                    />
                    <label htmlFor="planIsPopular" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Mark as "Popular" Plan (Adds highlighted badge on landing page)
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Features Included (One feature per line)</label>
                    <textarea
                      value={planFeaturesStr}
                      onChange={(e) => setPlanFeaturesStr(e.target.value)}
                      placeholder="Standard Attendance Logs&#10;Basic Leave Requests&#10;Email Support"
                      rows={5}
                      className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none font-mono"
                      required
                    />
                  </div>
                </>
              )}

              {/* Form 4: Comparison Matrix */}
              {activeTab === "comparison" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Feature Category</label>
                      <input
                        type="text"
                        value={compCategory}
                        onChange={(e) => setCompCategory(e.target.value)}
                        placeholder="e.g. Core Features or Attendance"
                        className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Feature Name</label>
                      <input
                        type="text"
                        value={compFeatureName}
                        onChange={(e) => setCompFeatureName(e.target.value)}
                        placeholder="e.g. Employee Self Service Portal"
                        className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {renderComparisonFieldInput("Lite Plan", compLite, setCompLite)}
                    {renderComparisonFieldInput("Starter Plan", compStarter, setCompStarter)}
                    {renderComparisonFieldInput("Pro Plan", compPro, setCompPro)}
                    {renderComparisonFieldInput("Elite Plan", compElite, setCompElite)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    {renderComparisonFieldInput("Hybrid Plan", compHybrid, setCompHybrid)}
                  </div>
                </>
              )}

              {/* Form 5: FAQs */}
              {activeTab === "faqs" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question</label>
                    <input
                      type="text"
                      value={faqQuestion}
                      onChange={(e) => setFaqQuestion(e.target.value)}
                      placeholder="e.g. What is the key difference between Yearly and One-Time plans?"
                      className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detailed Answer</label>
                    <textarea
                      value={faqAnswer}
                      onChange={(e) => setFaqAnswer(e.target.value)}
                      placeholder="Write answer details..."
                      rows={4}
                      className="w-full text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none resize-none"
                      required
                    />
                  </div>
                </>
              )}

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#09A08A]/10 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
