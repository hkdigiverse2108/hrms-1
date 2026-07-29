"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  Search, 
  Trash2, 
  Mail, 
  Phone, 
  Users, 
  Calendar, 
  Eye, 
  X, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from "lucide-react";
import SuperAdminHeader from "@/components/layout/SuperAdminHeader";
import { API_URL } from "@/lib/config";
import { useConfirm } from "@/context/ConfirmContext";

interface Inquiry {
  id: string;
  fullName: string;
  companyName: string;
  businessEmail: string;
  phoneNumber: string;
  employeesRange: string;
  message: string;
  plan?: string;
  billingCycle?: string;
  custom_modules?: string;
  total?: string;
  createdAt?: string;
}

export default function SuperAdminInquiriesPage() {
  const { confirm } = useConfirm();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/inquiries`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to load website inquiries");
      }
      const data = await res.json();
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching inquiries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleDeleteInquiry = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete Inquiry",
      message: `Are you sure you want to delete inquiry from '${name}'?`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/super-admin/inquiries/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to delete inquiry");
      }
      setInquiries((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete inquiry");
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const q = searchQuery.toLowerCase();
    return (
      inq.fullName?.toLowerCase().includes(q) ||
      inq.companyName?.toLowerCase().includes(q) ||
      inq.businessEmail?.toLowerCase().includes(q) ||
      inq.phoneNumber?.toLowerCase().includes(q) ||
      inq.message?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EAF7F6] via-white to-[#EAF7F6]/40 pt-24 pb-16 px-4 sm:px-8">
      <SuperAdminHeader onRefresh={fetchInquiries} isLoading={isLoading} />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Title & Stats Card */}
        <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-[#09A08A]/20 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#09A08A]/10 text-[#09A08A] flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Website Inquiries & Demo Requests
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  View and manage all inquiries submitted through the Let&apos;s Talk &amp; Book a Demo form
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end sm:self-center">
            <div className="px-5 py-2.5 bg-[#EAF7F6] border border-[#09A08A]/30 rounded-2xl text-center">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase block tracking-wider">
                Total Inquiries
              </span>
              <span className="text-2xl font-black text-[#09A08A]">
                {inquiries.length}
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search by name, company, email, phone, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* Table / Inquiries List */}
        <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-md overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#09A08A] animate-spin" />
              <span className="text-sm font-bold">Loading website inquiries...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 font-bold bg-rose-50/50">
              {error}
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-base font-bold text-slate-600">No inquiries found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? "Try refining your search query." : "Inquiries submitted from the landing page will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Contact &amp; Company</th>
                    <th className="py-4 px-6">Employees</th>
                    <th className="py-4 px-6">Plan / Modules</th>
                    <th className="py-4 px-6">Message Preview</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredInquiries.map((inq) => (
                    <tr key={inq.id} className="hover:bg-[#EAF7F6]/30 transition-colors">
                      <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(inq.createdAt)}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {inq.fullName}
                          <span className="text-xs font-semibold text-slate-500">
                            (@ {inq.companyName})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#09A08A]" />
                            {inq.businessEmail}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#09A08A]" />
                            {inq.phoneNumber}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          {inq.employeesRange || "N/A"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {inq.plan ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#09A08A]/10 text-[#09A08A] font-extrabold text-xs uppercase">
                              {inq.plan} {inq.billingCycle ? `(${inq.billingCycle})` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">General Inquiry</span>
                          )}
                          {inq.custom_modules && (
                            <div className="text-xs font-semibold text-slate-600 max-w-xs truncate">
                              Modules: <span className="text-slate-800">{inq.custom_modules}</span>
                            </div>
                          )}
                          {inq.total && (
                            <div className="text-xs font-extrabold text-[#09A08A]">
                              Est. Total: ₹{inq.total}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 max-w-xs truncate text-slate-600 text-xs font-normal">
                        {inq.message || "—"}
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedInquiry(inq)}
                            className="p-2 bg-[#EAF7F6] hover:bg-[#09A08A] text-[#09A08A] hover:text-white rounded-xl transition-all shadow-sm"
                            title="View Full Inquiry Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInquiry(inq.id, inq.fullName)}
                            className="p-2 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Delete Inquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal to View Full Inquiry Details */}
        {selectedInquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-6">
              <button
                onClick={() => setSelectedInquiry(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF7F6] text-[#09A08A] flex items-center justify-center font-bold text-xl">
                  {selectedInquiry.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedInquiry.fullName}
                  </h3>
                  <p className="text-sm font-medium text-slate-500">
                    {selectedInquiry.companyName} &bull; {selectedInquiry.employeesRange} Employees
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Business Email
                  </span>
                  <a
                    href={`mailto:${selectedInquiry.businessEmail}`}
                    className="text-slate-800 font-semibold hover:text-[#09A08A] mt-0.5 block"
                  >
                    {selectedInquiry.businessEmail}
                  </a>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Phone Number
                  </span>
                  <a
                    href={`tel:${selectedInquiry.phoneNumber}`}
                    className="text-slate-800 font-semibold hover:text-[#09A08A] mt-0.5 block"
                  >
                    {selectedInquiry.phoneNumber}
                  </a>
                </div>
                {selectedInquiry.plan && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Selected Plan
                    </span>
                    <span className="text-[#09A08A] font-extrabold uppercase mt-0.5 block">
                      {selectedInquiry.plan} {selectedInquiry.billingCycle ? `(${selectedInquiry.billingCycle})` : ""}
                    </span>
                  </div>
                )}
                {selectedInquiry.total && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Estimated Total
                    </span>
                    <span className="text-slate-900 font-extrabold mt-0.5 block">
                      ₹{selectedInquiry.total}
                    </span>
                  </div>
                )}
                {selectedInquiry.custom_modules && (
                  <div className="sm:col-span-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Selected Custom Modules
                    </span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {selectedInquiry.custom_modules}
                    </span>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Submitted Date &amp; Time
                  </span>
                  <span className="text-slate-700 font-medium mt-0.5 block">
                    {formatDate(selectedInquiry.createdAt)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                  Message / Requirements
                </span>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                  {selectedInquiry.message || "No message provided."}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
