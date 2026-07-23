"use client";

import React from "react";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#09A08A] selection:text-white">
      {children}
    </div>
  );
}
