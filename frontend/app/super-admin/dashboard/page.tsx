"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  LogOut, 
  Plus, 
  IndianRupee, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  Sparkles,
  ExternalLink,
  Activity,
  Key,
  X,
  RefreshCw
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";

interface Company {
  id: string;
  company_name: string;
  company_code: string;
  logo_url?: string;
  contact_email: string;
  contact_phone?: string;
  subscription_plan: string;
  status: string;
  max_employees: number;
  employee_count: number;
  created_at?: string;
}

interface DashboardStats {
  total_companies: number;
  active_companies: number;
  suspended_companies: number;
  total_employees: number;
  total_revenue: number;
  total_activity_logs: number;
  plan_distribution: Record<string, number>;
  top_modules: Array<{ module_key: string; display_name: string; count: number }>;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { logout } = useUser();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [compRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/super-admin/companies`, { headers }),
        fetch(`${API_URL}/super-admin/stats`, { headers })
      ]);

      if (compRes.status === 401 || compRes.status === 403) {
        router.push("/super-admin/login");
        return;
      }

      const compData = await compRes.json();
      const statsData = await statsRes.json();

      if (compRes.ok) setCompanies(compData);
      if (statsRes.ok) setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard statistics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const toggleCompanyStatus = async (company: Company) => {
    const newStatus = company.status === "active" ? "suspended" : "active";
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/companies/${company.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setSuccessMsg(`Company '${company.company_name}' status set to ${newStatus}`);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Mint Header */}
      <header className="border-b border-[#09A08A]/15 bg-[#EAF7F6] px-6 sm:px-8 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="HariKrushn DigiVerse Logo" className="h-10 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={fetchDashboardData}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#09A08A]" : ""}`} />
            </button>

            <Link
              href="/super-admin/pricing"
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#09A08A] font-bold rounded-xl text-xs flex items-center gap-2 border border-[#09A08A]/30 shadow-sm transition-all"
            >
              <Layers className="w-4 h-4" />
              Module Pricing & Plans
            </Link>

            <Link
              href="/purchase"
              target="_blank"
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-200 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Purchase Wizard Preview
            </Link>

            <Link
              href="/super-admin/companies"
              className="px-4 py-2.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-[#09A08A]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Onboard New Company
            </Link>

            <button
              onClick={() => {
                logout();
                router.push("/super-admin/login");
              }}
              className="p-2.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl border border-slate-200 transition-colors shadow-sm"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Centered Layout with Side Spacing */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-8 space-y-8">
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

        {/* TOP EXECUTIVE METRIC CARDS (KPI GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Companies */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Companies</span>
              <div className="w-10 h-10 bg-[#EAF7F6] text-[#09A08A] rounded-xl flex items-center justify-center border border-[#09A08A]/20">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                {stats?.total_companies ?? companies.length}
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span className="text-emerald-600 font-bold">● {stats?.active_companies ?? companies.filter(c => c.status === "active").length} Active</span>
                <span className="text-rose-500 font-bold">● {stats?.suspended_companies ?? 0} Suspended</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total System Employees */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total System Users</span>
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-200">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                {stats?.total_employees ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Employees across all tenant companies</p>
            </div>
          </div>

          {/* Card 3: Total Subscription Revenue */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-200">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                ₹{stats?.total_revenue ? stats.total_revenue.toLocaleString("en-IN") : 0}
              </div>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Subscriptions & Modules Total
              </p>
            </div>
          </div>

          {/* Card 4: System Health & Activity */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Operational</span>
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 mb-1 flex items-center gap-2">
                100%
                <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">Healthy</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{stats?.total_activity_logs ?? 0} Activity Logs Tracked</p>
            </div>
          </div>
        </div>

        {/* ANALYTICS & POPULAR MODULES SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Purchased Modules */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#09A08A]" />
                  Top Purchased Sidebar Modules
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Most selected tabs by client companies</p>
              </div>
              <Link href="/super-admin/pricing" className="text-xs text-[#09A08A] font-bold hover:underline">
                Manage Prices &rarr;
              </Link>
            </div>

            {stats?.top_modules && stats.top_modules.length > 0 ? (
              <div className="space-y-4 pt-2">
                {stats.top_modules.map((mod, idx) => {
                  const maxCount = Math.max(...stats.top_modules.map(m => m.count), 1);
                  const percentage = Math.round((mod.count / maxCount) * 100);
                  return (
                    <div key={mod.module_key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{idx + 1}. {mod.display_name}</span>
                        <span className="text-slate-500 font-semibold">{mod.count} Companies</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#09A08A] rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No custom module usage statistics available yet.
              </div>
            )}
          </div>

          {/* Plan Distribution */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#09A08A]" />
                Subscription Plans
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Tenant billing cycle distribution</p>
            </div>

            {stats?.plan_distribution ? (
              <div className="space-y-3 pt-2">
                {Object.entries(stats.plan_distribution).map(([planName, count]) => (
                  <div key={planName} className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{planName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Active Tenants</p>
                    </div>
                    <span className="px-3 py-1 bg-[#EAF7F6] text-[#09A08A] font-extrabold text-xs rounded-full border border-[#09A08A]/20">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No active plans data available.
              </div>
            )}
          </div>
        </div>

        {/* REGISTERED HRMS COMPANIES TABLE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#09A08A]" />
                Registered Tenant Companies ({companies.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Overview of active HRMS instances & employee rosters</p>
            </div>

            <Link
              href="/super-admin/companies"
              className="text-xs text-[#09A08A] font-bold hover:underline flex items-center gap-1"
            >
              View Full Directory &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#EAF7F6] text-xs font-bold text-slate-700 uppercase border-b border-[#09A08A]/15">
                <tr>
                  <th className="py-3.5 px-4 rounded-l-xl">Company Name</th>
                  <th className="py-3.5 px-4">Tenant Code</th>
                  <th className="py-3.5 px-4">Contact Email</th>
                  <th className="py-3.5 px-4">Plan</th>
                  <th className="py-3.5 px-4">Employees</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      Loading company directory...
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No companies onboarded yet.
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-3">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt="" className="w-7 h-7 rounded-lg object-contain bg-slate-100 p-0.5 border border-slate-200" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-[#EAF7F6] text-[#09A08A] font-bold text-xs flex items-center justify-center border border-[#09A08A]/20">
                            {company.company_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span>{company.company_name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#09A08A] font-semibold">{company.company_code}</td>
                      <td className="py-3.5 px-4 text-slate-600">{company.contact_email}</td>
                      <td className="py-3.5 px-4 font-bold text-[#09A08A]">{company.subscription_plan}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{company.employee_count} / {company.max_employees}</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleCompanyStatus(company)}
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border transition-colors ${
                            company.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                          }`}
                          title="Click to toggle status"
                        >
                          {company.status === "active" ? "Active" : "Suspended"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/super-admin/companies/${company.id}`}
                          className="px-3 py-1 bg-[#EAF7F6] hover:bg-[#09A08A] text-[#09A08A] hover:text-white font-bold rounded-lg transition-all border border-[#09A08A]/20 inline-flex items-center gap-1"
                        >
                          Details
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
