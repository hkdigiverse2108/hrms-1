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
  X,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";
import SuperAdminHeader from "@/components/layout/SuperAdminHeader";

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
  total_inquiries: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();

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
      {/* Mint SuperAdminHeader */}
      <SuperAdminHeader onRefresh={fetchDashboardData} isLoading={isLoading} />

      {/* Main Content - Centered Layout with Side Spacing */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 pt-24 pb-8 space-y-8">
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

          {/* Card 4: Website Inquiries */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Website Inquiries</span>
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-200">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 mb-1">
                {stats?.total_inquiries ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Lead Submissions & Demo Requests</p>
            </div>
          </div>
        </div>

        {/* WEBSITE INQUIRIES & DEMO REQUESTS QUICK ACCESS */}
        <div className="bg-gradient-to-r from-[#EAF7F6] to-white border border-[#09A08A]/20 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#09A08A] animate-pulse" />
              Website Inquiries &amp; Demo Requests
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Review lead submissions, selected plans, custom module pricing calculations, and messages from the landing page.
            </p>
          </div>
          <Link
            href="/super-admin/inquiries"
            className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-[#09A08A]/20 transition-all"
          >
            Open Inquiries Dashboard &rarr;
          </Link>
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
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{company.employee_count}</td>
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
