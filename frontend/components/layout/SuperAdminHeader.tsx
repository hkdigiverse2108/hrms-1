"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  RefreshCw, 
  Layers, 
  Sparkles, 
  Plus, 
  LogOut,
  Globe,
  MessageSquare,
  Building2,
  LayoutDashboard
} from "lucide-react";

interface SuperAdminHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function SuperAdminHeader({
  onRefresh,
  isLoading = false
}: SuperAdminHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/super-admin/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#09A08A]/15 bg-[#EAF7F6]/95 backdrop-blur-md px-6 sm:px-8 py-4 shadow-sm transition-all">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
        {/* Left: HariKrushn DigiVerse Logo */}
        <Link href="/super-admin/dashboard" className="flex items-center gap-3">
          <img src="/logo.png" alt="HariKrushn DigiVerse Logo" className="h-10 w-auto object-contain" />
        </Link>

        {/* Right: Clean Standard Super Admin Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#09A08A]" : ""}`} />
            </button>
          )}

          <Link
            href="/super-admin/dashboard"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#09A08A] font-bold rounded-xl text-xs flex items-center gap-2 border border-[#09A08A]/30 shadow-sm transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          <Link
            href="/super-admin/companies"
            className="px-4 py-2.5 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Building2 className="w-4 h-4" />
            Companies
          </Link>

          <Link
            href="/super-admin/inquiries"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#09A08A] font-bold rounded-xl text-xs flex items-center gap-2 border border-[#09A08A]/30 shadow-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Website Inquiries
          </Link>

          <Link
            href="/super-admin/pricing"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#09A08A] font-bold rounded-xl text-xs flex items-center gap-2 border border-[#09A08A]/30 shadow-sm transition-all"
          >
            <Layers className="w-4 h-4" />
            Module Pricing & Plans
          </Link>

          <Link
            href="/super-admin/landing-page"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#09A08A] font-bold rounded-xl text-xs flex items-center gap-2 border border-[#09A08A]/30 shadow-sm transition-all"
          >
            <Globe className="w-4 h-4" />
            Landing Page CRUD
          </Link>

          <button
            onClick={handleLogout}
            className="p-2.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl border border-slate-200 transition-colors shadow-sm cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
