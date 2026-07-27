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

  // Fetch data on mount / tab change
  const fetchData = async () => {
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

        {/* Custom Premium Tabs Navigation */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-sm flex overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("modules")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "modules"
                ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/15"
                : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <Layers className="w-4 h-4" />
            Modules List
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "stats"
                ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/15"
                : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            About Stats
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "plans"
                ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/15"
                : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Pricing Plans
          </button>
          <button
            onClick={() => setActiveTab("comparison")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "comparison"
                ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/15"
                : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <Table className="w-4 h-4" />
            Comparison Matrix
          </button>
          <button
            onClick={() => setActiveTab("faqs")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "faqs"
                ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/15"
                : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            FAQs List
          </button>
        </div>

        {/* Tab Content Rendering */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden min-h-[300px] flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#09A08A]" />
              <span className="text-xs font-bold">Fetching latest {activeTab} data...</span>
            </div>
          ) : (
            <div className="p-6 overflow-x-auto">
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
