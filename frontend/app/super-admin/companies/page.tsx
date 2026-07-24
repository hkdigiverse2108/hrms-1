"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Plus, 
  Search, 
  X, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft,
  ExternalLink
} from "lucide-react";
import { API_URL } from "@/lib/config";
import SuperAdminHeader from "@/components/layout/SuperAdminHeader";

interface Company {
  id: string;
  company_name: string;
  company_code: string;
  logo_url?: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  subscription_plan: string;
  status: string;
  max_employees: number;
  employee_count: number;
}

export default function SuperAdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("Standard");
  const [maxEmployees, setMaxEmployees] = useState(50);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        router.push("/super-admin/login");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setCompanies(data);
      } else {
        setError(data.detail || "Failed to fetch companies.");
      }
    } catch (err: any) {
      setError(err.message || "Error loading company directory.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/companies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          company_name: companyName,
          company_code: companyCode || companyName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          logo_url: logoUrl,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address: address,
          subscription_plan: subscriptionPlan,
          max_employees: Number(maxEmployees),
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to onboard company.");
      }

      setSuccessMsg(`Company '${companyName}' onboarded successfully! Fresh HRMS workspace is ready.`);
      setIsModalOpen(false);
      
      // Reset form
      setCompanyName("");
      setCompanyCode("");
      setLogoUrl("");
      setContactEmail("");
      setContactPhone("");
      setAddress("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");

      fetchCompanies();
    } catch (err: any) {
      setError(err.message || "An error occurred during company creation.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        setSuccessMsg(`Company status set to ${newStatus}`);
        fetchCompanies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCompanies = companies.filter((c) =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Mint SuperAdminHeader */}
      <SuperAdminHeader
        onRefresh={fetchCompanies}
        isLoading={isLoading}
        onOpenOnboardModal={() => setIsModalOpen(true)}
      />

      {/* Main Content - Spacious Full Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 sm:px-12 pt-24 pb-8 space-y-6">
        {/* Page Title & Back Button Row */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/super-admin/dashboard"
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl transition-colors shadow-sm border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-slate-900">Company Directory</h1>
              <p className="text-xs text-slate-500 font-medium">Onboard and manage tenant subscriptions</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-[#09A08A]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Onboard New Company
          </button>
        </div>
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

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search by company name, code, or contact email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Company Cards Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm font-medium">
            Loading companies...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm font-medium">
            No companies matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.company_name}
                          className="w-12 h-12 rounded-xl object-contain bg-slate-100 p-1 border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#EAF7F6] border border-[#09A08A]/20 text-[#09A08A] flex items-center justify-center font-bold text-base">
                          {company.company_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-[#09A08A] transition-colors">
                          {company.company_name}
                        </h3>
                        <p className="text-xs font-mono text-[#09A08A] font-medium">code: {company.company_code}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleCompanyStatus(company)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${
                        company.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                          : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                      }`}
                      title="Click to toggle status"
                    >
                      {company.status === "active" ? "Active" : "Suspended"}
                    </button>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 mt-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span>Contact Email:</span>
                      <span className="text-slate-900 font-medium">{company.contact_email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Subscription Plan:</span>
                      <span className="text-[#09A08A] font-bold">{company.subscription_plan}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Employees:</span>
                      <span className="text-slate-900 font-bold">{company.employee_count}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                  <Link
                    href={`/super-admin/companies/${company.id}`}
                    className="w-full py-2.5 bg-[#EAF7F6] hover:bg-[#09A08A] text-[#09A08A] hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-[#09A08A]/20"
                  >
                    Manage Tenant & Users
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Onboard Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#09A08A]" />
                  Onboard / Purchase New HRMS Instance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Provision a fresh HRMS website instance for a company tenant</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-6">
              {/* Company Info Section */}
              <div>
                <h3 className="text-xs font-bold text-[#09A08A] uppercase tracking-wider mb-3">1. Company Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corporation"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        if (!companyCode) {
                          setCompanyCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                        }
                      }}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Tenant Code / Slug *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. acme-corp"
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-[#09A08A] font-mono font-semibold placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Company Logo URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Subscription Plan</label>
                    <select
                      value={subscriptionPlan}
                      onChange={(e) => setSubscriptionPlan(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:border-[#09A08A] focus:outline-none"
                    >
                      <option value="Starter">Starter (20 Employees)</option>
                      <option value="Standard">Standard (50 Employees)</option>
                      <option value="Enterprise">Enterprise (200+ Employees)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Contact Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="info@acme.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Admin Setup Section */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-[#09A08A] uppercase tracking-wider mb-3">2. Initial Company Admin Credentials</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Admin Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Admin Login Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@acme.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1">Admin Initial Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-[#09A08A]/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Provisioning Workspace...
                    </>
                  ) : (
                    <>
                      Provision HRMS Instance
                      <CheckCircle2 className="w-4 h-4" />
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
