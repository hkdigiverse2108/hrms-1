"use client";

import React from "react";
import { 
  Plus, 
  Search, 
  Download,
  Filter,
  Calendar as CalendarIcon,
  MoreVertical,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export";


const invoicesData = [
  { id: "INV-2026-001", client: "Acme Corp", issueDate: "Oct 25, 2026", dueDate: "Nov 08, 2026", amount: "₹ 12,000.00", status: "Pending" },
  { id: "INV-2026-002", client: "Global Tech", issueDate: "Oct 20, 2026", dueDate: "Nov 03, 2026", amount: "₹ 45,000.00", status: "Paid" },
  { id: "INV-2026-003", client: "Synergy Ltd", issueDate: "Oct 15, 2026", dueDate: "Oct 29, 2026", amount: "₹ 8,500.00", status: "Paid" },
  { id: "INV-2026-004", client: "Nexus Dynamics", issueDate: "Oct 01, 2026", dueDate: "Oct 15, 2026", amount: "₹ 32,000.00", status: "Overdue" },
  { id: "INV-2026-005", client: "Elevate Partners", issueDate: "Sep 28, 2026", dueDate: "Oct 12, 2026", amount: "₹ 15,000.00", status: "Overdue" },
  { id: "INV-2026-006", client: "Vanguard Solutions", issueDate: "Oct 28, 2026", dueDate: "Nov 10, 2026", amount: "₹ 4,200.00", status: "Paid" },
];

const getStatusStyles = (status: string) => {
  switch (status) {
    case "Paid": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Pending": return "bg-amber-100 text-amber-700 border-amber-200";
    case "Overdue": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function AllInvoicesPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="All Invoices" 
        description="Manage and track all your client invoices."
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="h-10 px-4 text-sm font-medium"
            onClick={() => exportToCSV(invoicesData, 'invoices')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Link href="/invoice/create">
            <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm h-10 px-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold">
              <Filter className="w-3.5 h-3.5 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold">
              <CalendarIcon className="w-3.5 h-3.5 mr-2" />
              Date Range
            </Button>
          </div>
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." className="pl-9 bg-gray-50/50 border-border rounded-lg h-10" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground font-bold border-b border-border bg-gray-50/30 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Date of Issue</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoicesData.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-border font-bold text-xs text-slate-600 uppercase">
                        {invoice.client[0]}
                      </div>
                      <span className="font-bold text-slate-700">{invoice.client}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-500">
                    {invoice.id}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600 text-[13px]">
                    {invoice.issueDate}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600 text-[13px]">
                    {invoice.dueDate}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {invoice.amount}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn("px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wide", getStatusStyles(invoice.status))}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-white border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="text-[13px] text-muted-foreground font-medium">
             Showing 1 to 6 of 35 entries
           </div>
           
           <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium text-muted-foreground">Previous</Button>
             <div className="flex items-center gap-1">
               <Button size="sm" className="h-8 w-8 p-0 text-xs font-bold bg-brand-teal text-white">1</Button>
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs font-medium text-muted-foreground">2</Button>
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs font-medium text-muted-foreground">3</Button>
               <span className="px-1 text-muted-foreground">...</span>
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs font-medium text-muted-foreground">35</Button>
             </div>
             <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium text-muted-foreground">Next</Button>
           </div>
        </div>
      </div>
    </div>
  );
}
