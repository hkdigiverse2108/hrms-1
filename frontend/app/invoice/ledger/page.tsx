"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, 
  Calendar as CalendarIcon,
  Loader2,
  Filter,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { exportToPDF } from "@/lib/export-utils";

export default function InvoiceLedgerPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
  const [groupBy, setGroupBy] = useState<"client" | "type">("client");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthFilter, setMonthFilter] = useState(""); // YYYY-MM format
  
  // Dialog State
  const [selectedGroup, setSelectedGroup] = useState<{name: string, invoices: any[]} | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/invoices`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      } else {
        setError("Failed to fetch invoices");
        toast.error("Failed to load invoices from database");
      }
    } catch (err) {
      console.error(err);
      setError("Network error loading invoices");
      toast.error("Network error connecting to the server");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle month quick-select
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMonthFilter(val);
    if (val) {
      const startOfMonth = dayjs(val).startOf("month").format("YYYY-MM-DD");
      const endOfMonth = dayjs(val).endOf("month").format("YYYY-MM-DD");
      setDateFrom(startOfMonth);
      setDateTo(endOfMonth);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  };

  // Aggregation Logic
  const aggregatedData = useMemo(() => {
    // 1. Filter by Date Range and exclude Proforma for client ledger
    const filtered = invoices.filter((invoice) => {
      if (groupBy === "client" && invoice.invoiceType === "Proforma Invoice") {
        return false;
      }

      if (dateFrom || dateTo) {
        // Need to parse issueDate robustly. The DB stores it as "MMM DD, YYYY" or "YYYY-MM-DD".
        const issueDate = dayjs(invoice.issueDate);
        if (!issueDate.isValid()) return true; // skip invalid dates

        if (dateFrom && issueDate.isBefore(dayjs(dateFrom), 'day')) return false;
        if (dateTo && issueDate.isAfter(dayjs(dateTo), 'day')) return false;
      }
      return true;
    });

    // 2. Group & Aggregate
    const map = new Map<string, {
      name: string;
      count: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
      overdueAmount: number;
      invoices: any[];
    }>();

    filtered.forEach(invoice => {
      let key = "Unknown";
      if (groupBy === "client") {
        key = invoice.clientName || "Unknown Client";
      } else if (groupBy === "type") {
        key = invoice.invoiceType || "Tax Invoice";
      }

      if (!map.has(key)) {
        map.set(key, {
          name: key,
          count: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          invoices: [],
        });
      }

      const group = map.get(key)!;
      group.count += 1;
      group.invoices.push(invoice);
      const amt = invoice.total || 0;
      group.totalAmount += amt;

      const status = invoice.status || "Pending";
      if (status.toLowerCase() === "paid") {
        group.paidAmount += amt;
      } else if (status.toLowerCase() === "overdue") {
        group.overdueAmount += amt;
      } else {
        group.pendingAmount += amt;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount); // Sort by highest total amount
  }, [invoices, groupBy, dateFrom, dateTo]);

  const grandTotals = useMemo(() => {
    return aggregatedData.reduce((acc, curr) => {
      acc.totalAmount += curr.totalAmount;
      acc.paidAmount += curr.paidAmount;
      acc.pendingAmount += curr.pendingAmount;
      acc.overdueAmount += curr.overdueAmount;
      return acc;
    }, { totalAmount: 0, paidAmount: 0, pendingAmount: 0, overdueAmount: 0 });
  }, [aggregatedData]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Invoice Ledger" 
        description="View aggregated totals by brand (client) or invoice type over custom date ranges."
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="h-10 px-4 text-sm font-medium bg-white"
            onClick={() => {
              const exportData = aggregatedData.map(row => ({
                "Group Name": row.name,
                "Invoices Count": row.count,
                "Total Amount": `Rs. ${row.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "Total Paid": `Rs. ${row.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "Total Pending": `Rs. ${row.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "Total Overdue": `Rs. ${row.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              }));
              exportData.push({
                "Group Name": "GRAND TOTAL",
                "Invoices Count": aggregatedData.reduce((acc, curr) => acc + curr.count, 0),
                "Total Amount": `Rs. ${grandTotals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "Total Paid": `Rs. ${grandTotals.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "Total Pending": `Rs. ${grandTotals.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "Total Overdue": `Rs. ${grandTotals.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              });
              exportToPDF(exportData, 'invoice_ledger');
            }}
            disabled={aggregatedData.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Ledger
          </Button>
        </div>
      </PageHeader>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Filters Bar */}
        <div className="p-4 sm:p-6 border-b border-border bg-gray-50/50 flex flex-col sm:flex-row gap-6">
          
          {/* Group By Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Group By</label>
            <div className="flex bg-white border border-border rounded-lg overflow-hidden h-10 w-full sm:w-[250px]">
              <button
                onClick={() => setGroupBy("client")}
                className={cn(
                  "flex-1 text-sm font-bold transition-colors",
                  groupBy === "client" ? "bg-brand-teal text-white" : "hover:bg-gray-50 text-slate-600"
                )}
              >
                Brand / Client
              </button>
              <button
                onClick={() => setGroupBy("type")}
                className={cn(
                  "flex-1 text-sm font-bold transition-colors",
                  groupBy === "type" ? "bg-brand-teal text-white" : "hover:bg-gray-50 text-slate-600"
                )}
              >
                Invoice Type
              </button>
            </div>
          </div>

          <div className="h-full w-px bg-border hidden sm:block"></div>

          {/* Date Filters */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="space-y-2 flex-1 max-w-[200px]">
              <label className="text-xs font-bold text-muted-foreground uppercase">Quick Month</label>
              <Input 
                type="month" 
                value={monthFilter}
                onChange={handleMonthChange}
                className="bg-white border-border h-10" 
              />
            </div>
            <div className="space-y-2 flex-1 max-w-[200px]">
              <label className="text-xs font-bold text-muted-foreground uppercase">From Date</label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setMonthFilter(""); // clear quick month if custom date used
                }}
                className="bg-white border-border h-10" 
              />
            </div>
            <div className="space-y-2 flex-1 max-w-[200px]">
              <label className="text-xs font-bold text-muted-foreground uppercase">To Date</label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setMonthFilter(""); // clear quick month if custom date used
                }}
                className="bg-white border-border h-10" 
              />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground font-bold border-b border-border bg-white uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">{groupBy === "client" ? "Brand / Client" : "Invoice Type"}</th>
                <th className="px-6 py-4 text-center">Invoices Count</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-right">Total Paid</th>
                <th className="px-6 py-4 text-right text-amber-600">Total Pending</th>
                <th className="px-6 py-4 text-right text-red-600">Total Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                      <p className="font-semibold text-sm">Loading ledger data...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-red-500 font-semibold">
                    {error}
                  </td>
                </tr>
              ) : aggregatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground font-medium">
                    No data available for the selected filters.
                  </td>
                </tr>
              ) : (
                <>
                  {aggregatedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors bg-white">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        <button 
                          onClick={() => setSelectedGroup({ name: row.name, invoices: row.invoices })}
                          className="text-brand-teal hover:underline text-left outline-none"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-500 text-center">
                        {row.count}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800 text-right">
                        ₹ {row.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 text-right">
                        ₹ {row.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-bold text-amber-600 text-right">
                        ₹ {row.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-bold text-red-600 text-right">
                        ₹ {row.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Totals Row */}
                  <tr className="bg-gray-50/80 border-t-2 border-border">
                    <td className="px-6 py-4 font-black text-slate-900 uppercase text-xs tracking-wider">
                      Grand Total
                    </td>
                    <td className="px-6 py-4 font-black text-slate-700 text-center">
                      {aggregatedData.reduce((acc, curr) => acc + curr.count, 0)}
                    </td>
                    <td className="px-6 py-4 font-black text-brand-teal text-right text-base">
                      ₹ {grandTotals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-600 text-right">
                      ₹ {grandTotals.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-black text-amber-600 text-right">
                      ₹ {grandTotals.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-black text-red-600 text-right">
                      ₹ {grandTotals.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Ledger Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-4xl sm:max-w-4xl md:max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-gray-50">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-white shrink-0">
            <div className="flex items-start justify-between gap-4 pr-6">
              <div>
                <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-teal" />
                  Ledger details for {selectedGroup?.name}
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-500 mt-1">
                  Showing {selectedGroup?.invoices.length} invoices.
                </DialogDescription>
              </div>
              {selectedGroup?.invoices && selectedGroup.invoices.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const exportData = selectedGroup.invoices.map(inv => ({
                      "Invoice Number": inv.invoiceNumber,
                      "Date of Issue": inv.issueDate,
                      "Status": inv.status || "Pending",
                      "Total Amount": `Rs. ${(inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }));
                    const totalAmount = selectedGroup.invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
                    exportData.push({
                      "Invoice Number": "GRAND TOTAL",
                      "Date of Issue": "-",
                      "Status": "-",
                      "Total Amount": `Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    });
                    exportToPDF(exportData, `ledger_${selectedGroup.name.replace(/\s+/g, '_')}`);
                  }}
                  className="h-9 font-bold text-brand-teal border-brand-teal/20 hover:bg-brand-teal/5"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[11px] text-muted-foreground font-bold border-b border-border bg-gray-50/50 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Invoice No.</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedGroup?.invoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 font-medium text-slate-600">{inv.issueDate}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide",
                          inv.status === "Paid" ? "bg-emerald-100 text-emerald-700" :
                          inv.status === "Overdue" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {inv.status || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800 text-right">
                        ₹ {(inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
