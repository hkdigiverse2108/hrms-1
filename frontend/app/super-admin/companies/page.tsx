"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  X, 
  ArrowLeft,
  ExternalLink,
  Trash2
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
  gstin?: string;
  payment_method?: string;
  total_paid?: number;
  created_at?: string;
}

export default function SuperAdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  const deleteCompany = async (company: Company) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the company "${company.company_name}"? This action cannot be undone and will delete all associated users and data.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/companies/${company.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setSuccessMsg(`Company ${company.company_name} was deleted successfully.`);
        fetchCompanies();
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to delete company.");
      }
    } catch (err: any) {
      setError(err.message || "Error deleting company.");
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
              <p className="text-xs text-slate-500 font-medium">Manage tenant subscriptions and company instances</p>
            </div>
          </div>
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
                          src={company.logo_url.startsWith("http") ? company.logo_url : `http://127.0.0.1:8000${company.logo_url}`}
                          alt={company.company_name}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                          className="w-12 h-12 rounded-xl object-contain bg-slate-100 p-1 border border-slate-200"
                        />
                      ) : null}
                      <div className={`w-12 h-12 rounded-xl bg-[#EAF7F6] border border-[#09A08A]/20 text-[#09A08A] flex items-center justify-center font-bold text-base ${company.logo_url ? 'hidden' : ''}`}>
                        {company.company_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-[#09A08A] transition-colors">
                          {company.company_name}
                        </h3>
                        <p className="text-xs font-mono text-[#09A08A] font-medium">code: {company.company_code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCompanyStatus(company)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${
                          company.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        {company.status === "active" ? "Active" : "Suspended"}
                      </button>
                      
                      <button
                        onClick={() => deleteCompany(company)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        title="Delete Company Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 mb-6">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Plan:</span>
                      <span className="font-semibold text-slate-800">{company.subscription_plan}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Total Paid:</span>
                      <span className="font-bold text-[#09A08A]">₹{company.total_paid?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Payment Via:</span>
                      <span className="font-medium text-slate-700">{company.payment_method || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">GSTIN:</span>
                      <span className="font-medium text-slate-700">{company.gstin || "N/A (No GSTIN)"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Contact / Phone:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[180px]">
                        {company.contact_email || "N/A"} <br/> {company.contact_phone}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Employees:</span>
                      <span className="font-semibold text-slate-800">
                        {company.employee_count} / {company.max_employees}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
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
    </div>
  );
}
