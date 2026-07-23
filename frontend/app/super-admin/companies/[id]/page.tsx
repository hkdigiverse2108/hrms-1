"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Building2, 
  ArrowLeft, 
  Users, 
  Mail, 
  Phone, 
  Key, 
  Loader2, 
  X
} from "lucide-react";
import { API_URL } from "@/lib/config";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  status: string;
}

interface CompanyDetail {
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
  employees: Employee[];
}

export default function SuperAdminCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Reset Admin Password Modal State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const fetchCompanyDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        router.push("/super-admin/login");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setCompany(data);
      } else {
        setError(data.detail || "Failed to load company details.");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching company detail.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails();
    }
  }, [companyId]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/companies/${companyId}/reset-admin-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to reset admin password.");
      }

      setSuccessMsg("Company Admin password updated successfully!");
      setIsResetPasswordOpen(false);
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "An error occurred resetting password.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Header - Mint Theme */}
      <header className="border-b border-[#09A08A]/15 bg-[#EAF7F6] px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/super-admin/companies"
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl transition-colors shadow-sm border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <img src="/logo.png" alt="HariKrushn DigiVerse Logo" className="h-9 w-auto object-contain" />
          <div className="h-7 w-px bg-[#09A08A]/20" />
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
              {company?.company_name || "Company Tenant"}
            </h1>
            <p className="text-[11px] text-[#09A08A] font-mono font-semibold">code: {company?.company_code}</p>
          </div>
        </div>

        <button
          onClick={() => setIsResetPasswordOpen(true)}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-[#09A08A] font-bold rounded-xl text-xs flex items-center gap-2 border border-[#09A08A]/30 transition-all shadow-sm"
        >
          <Key className="w-4 h-4" />
          Reset Admin Password
        </button>
      </header>

      {/* Main Content - Spacious Full Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 sm:px-12 py-8 space-y-8">
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

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm font-medium">
            Loading tenant details...
          </div>
        ) : !company ? (
          <div className="py-16 text-center text-slate-400 text-sm font-medium">
            Company not found.
          </div>
        ) : (
          <>
            {/* Overview Banner */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.company_name}
                    className="w-16 h-16 rounded-2xl object-contain bg-slate-100 p-2 border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#EAF7F6] border border-[#09A08A]/20 text-[#09A08A] flex items-center justify-center font-bold text-xl">
                    {company.company_name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{company.company_name}</h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {company.contact_email}</span>
                    {company.contact_phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {company.contact_phone}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Subscription Plan</p>
                  <p className="text-sm font-extrabold text-[#09A08A] mt-0.5">{company.subscription_plan}</p>
                </div>
                <div className="h-8 w-px bg-slate-200 mx-2" />
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-bold uppercase">Status</p>
                  <p className={`text-sm font-extrabold mt-0.5 ${company.status === "active" ? "text-emerald-600" : "text-rose-600"}`}>
                    {company.status === "active" ? "Active" : "Suspended"}
                  </p>
                </div>
              </div>
            </div>

            {/* Employee Roster Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#09A08A]" />
                    Company Employee Roster ({company.employees.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Active users onboarded in this company instance</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-[#EAF7F6] text-xs font-bold text-slate-700 uppercase border-b border-[#09A08A]/15">
                    <tr>
                      <th className="py-3.5 px-4 rounded-l-xl">Employee Name</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Designation</th>
                      <th className="py-3.5 px-4 text-right rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {company.employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900">{emp.name}</td>
                        <td className="py-4 px-4 text-slate-600 font-mono text-xs">{emp.email}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            emp.role.toLowerCase() === "admin" 
                              ? "bg-[#EAF7F6] text-[#09A08A] border border-[#09A08A]/30" 
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">{emp.department || "—"}</td>
                        <td className="py-4 px-4 text-slate-600">{emp.designation || "—"}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`text-xs font-bold ${emp.status === "active" ? "text-emerald-600" : "text-slate-400"}`}>
                            ● {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Reset Admin Password Modal */}
      {isResetPasswordOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-[#09A08A]" />
                Reset Company Admin Password
              </h3>
              <button onClick={() => setIsResetPasswordOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password for Admin</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#09A08A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 shadow-md shadow-[#09A08A]/20"
                >
                  {isResetting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
