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
import { SIDEBAR_MAIN_TABS } from "@/lib/sidebarConfig";

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

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

type TabType = "modules" | "stats" | "faqs" | "hero" | "about" | "why_us" | "benefits" | "final_cta" | "contact" | "header_footer";

const POPULAR_ICONS = [
  "Users", "Clock", "CreditCard", "Calendar", "UserPlus", "ClipboardList", 
  "LogOut", "Gauge", "Award", "ListTodo", "ShieldCheck", "BarChart3", 
  "MessageSquare", "Settings", "Activity", "HelpCircle", "Globe", "Layers",
  "FileText", "Briefcase", "DollarSign", "UserCheck", "AlertTriangle", "CheckCircle",
  "FileCheck", "Folder", "PieChart", "TrendingUp", "Zap", "Lock",
  "Mail", "Bell", "Database", "Search", "Sliders", "UserCog"
];

export default function LandingPageCRUD() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>("hero");
  
  // Data lists state
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const availableModuleOptions = React.useMemo(() => {
    const names = new Set<string>();
    SIDEBAR_MAIN_TABS.forEach(t => names.add(t.name));
    modules.forEach(m => {
      if (m.name) names.add(m.name);
    });
    return Array.from(names);
  }, [modules]);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // Section States
  const [sectionsData, setSectionsData] = useState<any>({
    hero: { title: "", subtitle: "", cta_primary_text: "", cta_primary_link: "", cta_secondary_text: "", cta_secondary_link: "", image_url: "", badge_text: "", trust_badge_1: "", trust_badge_2: "", trust_badge_3: "" },
    about: { headline: "", subheadline: "", bullets: [], image_url: "" },
    why_us: { headline: "", subheadline: "", cards: [] },
    benefits: { headline: "", subheadline: "", items: [] },
    final_cta: { title: "", subtitle: "", button_text: "", button_link: "" },
    contact: { address: "", email: "", phone: "", map_url: "" },
    header_footer: { logo_url: "", company_name: "", company_subtitle: "", social_instagram: "", social_linkedin: "", social_facebook: "", social_twitter: "" },
    modules_header: { badge_text: "", headline: "", subheadline: "" }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingHeroImg, setIsUploadingHeroImg] = useState(false);
  const [isUploadingAboutImg, setIsUploadingAboutImg] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
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

  // 3. FAQ Form
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
    const isSectionTab = ["hero", "about", "why_us", "benefits", "final_cta", "contact", "header_footer"].includes(activeTab);
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
              Configure modules, stats, and FAQs displayed on the corporate home page.
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

            <button
              onClick={() => setActiveTab("header_footer")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "header_footer"
                  ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/20 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>Header & Footer</span>
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
                  {activeTab === "header_footer" && "Header & Footer Settings"}
                  {activeTab === "modules" && "Modules List"}
                  {activeTab === "stats" && "About Stats"}
                  {activeTab === "faqs" && "FAQs List"}
                </span>
                {!["hero", "about", "why_us", "benefits", "final_cta", "contact", "header_footer"].includes(activeTab) && (
                  <span className="text-xs text-slate-400 font-semibold">
                    (
                    {activeTab === "modules" && `${modules.length} items`}
                    {activeTab === "stats" && `${stats.length} items`}
                    {activeTab === "faqs" && `${faqs.length} items`}
                    )
                  </span>
                )}
              </div>
              {!["hero", "about", "why_us", "benefits", "final_cta", "contact", "header_footer"].includes(activeTab) && (
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
                      <label className="text-xs font-bold text-slate-500 uppercase">Image / Banner</label>
                      <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                        {sectionsData.hero?.image_url ? (
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0 w-32 h-20 group rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                              {/* Clickable Image to change */}
                              <label htmlFor="hero-image-upload" className="cursor-pointer block w-full h-full">
                                <img
                                  src={sectionsData.hero.image_url.startsWith("http") ? sectionsData.hero.image_url : `${API_URL}${sectionsData.hero.image_url}`}
                                  alt="Hero Preview"
                                  className="w-full h-full object-cover group-hover:opacity-85 transition-all duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  Click to Change
                                </div>
                              </label>
                              
                              {/* Trash/Remove Icon in the top right corner */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSectionsData((prev: any) => ({
                                    ...prev,
                                    hero: { ...prev.hero, image_url: "" }
                                  }));
                                }}
                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                title="Remove Image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                {isUploadingHeroImg ? "Uploading..." : "Image uploaded successfully"}
                              </span>
                              <input
                                type="file"
                                id="hero-image-upload"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingHeroImg}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUploadingHeroImg(true);
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  try {
                                    const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setSectionsData((prev: any) => ({
                                        ...prev,
                                        hero: { ...prev.hero, image_url: data.url }
                                      }));
                                    }
                                  } catch (err) {
                                    console.error("Error uploading hero image:", err);
                                  } finally {
                                    setIsUploadingHeroImg(false);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-white">
                            <span className="text-xs text-slate-400 mb-2">No image uploaded yet</span>
                            <label className="px-4 py-2 bg-[#EAF7F6] text-[#09A08A] hover:bg-[#d5f0ed] border border-[#09A08A]/15 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                              {isUploadingHeroImg ? "Uploading..." : "Upload Image"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingHeroImg}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUploadingHeroImg(true);
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  try {
                                    const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setSectionsData((prev: any) => ({
                                        ...prev,
                                        hero: { ...prev.hero, image_url: data.url }
                                      }));
                                    }
                                  } catch (err) {
                                    console.error("Error uploading hero image:", err);
                                  } finally {
                                    setIsUploadingHeroImg(false);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
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
                      <label className="text-xs font-bold text-slate-500 uppercase">Side Image</label>
                      <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                        {sectionsData.about?.image_url ? (
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0 w-32 h-20 group rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                              {/* Clickable Image to change */}
                              <label htmlFor="about-image-upload" className="cursor-pointer block w-full h-full">
                                <img
                                  src={sectionsData.about.image_url.startsWith("http") ? sectionsData.about.image_url : `${API_URL}${sectionsData.about.image_url}`}
                                  alt="About Preview"
                                  className="w-full h-full object-cover group-hover:opacity-85 transition-all duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  Click to Change
                                </div>
                              </label>
                              
                              {/* Trash/Remove Icon in the top right corner */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSectionsData((prev: any) => ({
                                    ...prev,
                                    about: { ...prev.about, image_url: "" }
                                  }));
                                }}
                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                title="Remove Image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                {isUploadingAboutImg ? "Uploading..." : "Image uploaded successfully"}
                              </span>
                              <input
                                type="file"
                                id="about-image-upload"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingAboutImg}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUploadingAboutImg(true);
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  try {
                                    const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setSectionsData((prev: any) => ({
                                        ...prev,
                                        about: { ...prev.about, image_url: data.url }
                                      }));
                                    }
                                  } catch (err) {
                                    console.error("Error uploading about image:", err);
                                  } finally {
                                    setIsUploadingAboutImg(false);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-white">
                            <span className="text-xs text-slate-400 mb-2">No image uploaded yet</span>
                            <label className="px-4 py-2 bg-[#EAF7F6] text-[#09A08A] hover:bg-[#d5f0ed] border border-[#09A08A]/15 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                              {isUploadingAboutImg ? "Uploading..." : "Upload Image"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingAboutImg}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUploadingAboutImg(true);
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  try {
                                    const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setSectionsData((prev: any) => ({
                                        ...prev,
                                        about: { ...prev.about, image_url: data.url }
                                      }));
                                    }
                                  } catch (err) {
                                    console.error("Error uploading about image:", err);
                                  } finally {
                                    setIsUploadingAboutImg(false);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
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
                  </form>
                )}

                {/* 7. Header & Footer Form */}
                {activeTab === "header_footer" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveSection("header_footer", sectionsData.header_footer);
                    }}
                    className="space-y-4 max-w-2xl"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Brand Logo</label>
                      <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                        {sectionsData.header_footer?.logo_url ? (
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0 w-32 h-20 group rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white p-2 flex items-center justify-center">
                              {/* Clickable Image to change */}
                              <label htmlFor="logo-image-upload" className="cursor-pointer block w-full h-full relative">
                                <img
                                  src={sectionsData.header_footer.logo_url.startsWith("http") ? sectionsData.header_footer.logo_url : `${API_URL}${sectionsData.header_footer.logo_url}`}
                                  alt="Logo Preview"
                                  className="w-full h-full object-contain group-hover:opacity-85 transition-all duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  Click to Change
                                </div>
                              </label>
                              
                              {/* Trash/Remove Icon in the top right corner */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSectionsData((prev: any) => ({
                                    ...prev,
                                    header_footer: { ...prev.header_footer, logo_url: "" }
                                  }));
                                }}
                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                title="Remove Logo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                {isUploadingLogo ? "Uploading..." : "Logo uploaded successfully"}
                              </span>
                              <input
                                type="file"
                                id="logo-image-upload"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingLogo}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUploadingLogo(true);
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  try {
                                    const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setSectionsData((prev: any) => ({
                                        ...prev,
                                        header_footer: { ...prev.header_footer, logo_url: data.url }
                                      }));
                                    }
                                  } catch (err) {
                                    console.error("Error uploading logo:", err);
                                  } finally {
                                    setIsUploadingLogo(false);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-white">
                            <span className="text-xs text-slate-400 mb-2">No logo uploaded yet</span>
                            <label className="px-4 py-2 bg-[#EAF7F6] text-[#09A08A] hover:bg-[#d5f0ed] border border-[#09A08A]/15 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                              {isUploadingLogo ? "Uploading..." : "Upload Logo Image"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploadingLogo}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUploadingLogo(true);
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  try {
                                    const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setSectionsData((prev: any) => ({
                                        ...prev,
                                        header_footer: { ...prev.header_footer, logo_url: data.url }
                                      }));
                                    }
                                  } catch (err) {
                                    console.error("Error uploading logo:", err);
                                  } finally {
                                    setIsUploadingLogo(false);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Instagram Link</label>
                        <input
                          type="text"
                          value={sectionsData.header_footer?.social_instagram || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            header_footer: { ...sectionsData.header_footer, social_instagram: e.target.value }
                          })}
                          placeholder="https://instagram.com/yourprofile"
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">LinkedIn Link</label>
                        <input
                          type="text"
                          value={sectionsData.header_footer?.social_linkedin || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            header_footer: { ...sectionsData.header_footer, social_linkedin: e.target.value }
                          })}
                          placeholder="https://linkedin.com/in/yourprofile"
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Facebook Link</label>
                        <input
                          type="text"
                          value={sectionsData.header_footer?.social_facebook || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            header_footer: { ...sectionsData.header_footer, social_facebook: e.target.value }
                          })}
                          placeholder="https://facebook.com/yourprofile"
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Twitter / X Link</label>
                        <input
                          type="text"
                          value={sectionsData.header_footer?.social_twitter || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            header_footer: { ...sectionsData.header_footer, social_twitter: e.target.value }
                          })}
                          placeholder="https://twitter.com/yourprofile"
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSubmitting ? "Saving..." : "Save Header & Footer"}
                    </button>
                  </form>
                )}

                {/* Modules list and header config */}
                {activeTab === "modules" && (
                  <div className="space-y-8">
                    {/* Section Header Configuration */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveSection("modules_header", sectionsData.modules_header);
                      }}
                      className="p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-4 max-w-3xl shadow-xs"
                    >
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                        <Sparkles className="w-4 h-4 text-[#09A08A]" />
                        Modules Section Header Settings
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1 col-span-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Badge / Tag</label>
                          <input
                            type="text"
                            value={sectionsData.modules_header?.badge_text || ""}
                            onChange={(e) => setSectionsData({
                              ...sectionsData,
                              modules_header: { ...sectionsData.modules_header, badge_text: e.target.value }
                            })}
                            placeholder="e.g. HRMS Modules"
                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#09A08A]"
                            required
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Headline / Main Title</label>
                          <input
                            type="text"
                            value={sectionsData.modules_header?.headline || ""}
                            onChange={(e) => setSectionsData({
                              ...sectionsData,
                              modules_header: { ...sectionsData.modules_header, headline: e.target.value }
                            })}
                            placeholder="e.g. 24 modules, one connected platform"
                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#09A08A]"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Subheadline / Description</label>
                        <textarea
                          value={sectionsData.modules_header?.subheadline || ""}
                          onChange={(e) => setSectionsData({
                            ...sectionsData,
                            modules_header: { ...sectionsData.modules_header, subheadline: e.target.value }
                          })}
                          placeholder="e.g. Enable only what you need today and switch on the rest as your organisation grows."
                          rows={2}
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#09A08A] resize-none"
                          required
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          {isSubmitting ? "Saving..." : "Save Header Settings"}
                        </button>
                      </div>
                    </form>

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#09A08A]" />
                        Modules List ({modules.length} items)
                      </h4>
                      <table className="w-full text-left text-xs text-slate-700 border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                        <thead className="bg-[#EAF7F6] text-xs font-bold text-slate-700 uppercase border-b border-[#09A08A]/15">
                          <tr>
                            <th className="py-3 px-4 w-12 text-center">Icon</th>
                            <th className="py-3 px-4 w-52">Module Name</th>
                            <th className="py-3 px-4">Description</th>
                            <th className="py-3 px-4 text-right w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
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
                    </div>
                  </div>
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
                    <select
                      value={modIcon}
                      onChange={(e) => setModIcon(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 mt-1.5 focus:border-[#09A08A] focus:outline-none cursor-pointer"
                      required
                    >
                      <option value="">-- Select Module Icon --</option>
                      {POPULAR_ICONS.map((ico) => (
                        <option key={ico} value={ico}>
                          {ico} Icon
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Module Name (Select Sidebar Item) *</label>
                    <select
                      value={modName}
                      onChange={(e) => setModName(e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 focus:border-[#09A08A] focus:outline-none cursor-pointer"
                      required
                    >
                      <option value="">-- Select Sidebar Module --</option>
                      {availableModuleOptions.map((optName) => (
                        <option key={optName} value={optName}>
                          {optName}
                        </option>
                      ))}
                    </select>
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
