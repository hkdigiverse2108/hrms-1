"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { 
  ArrowLeft,
  RotateCcw,
  Search,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import Link from "next/link";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DeletedInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  
  const { user } = useUser();
  const isAdmin = user?.role === "Admin";

  const fetchDeletedInvoices = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/invoices/deleted`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch deleted invoices");
      const data = await res.json();
      setInvoices(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchDeletedInvoices();
    } else if (user && !isAdmin) {
      setError("Unauthorized access");
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  const handleRestore = async (id: string) => {
    if (!confirm("Are you sure you want to restore this invoice?")) return;
    
    setIsRestoring(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/invoices/${id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success("Invoice restored successfully");
        fetchDeletedInvoices();
      } else {
        const err = await res.json();
        throw new Error(err.detail || "Failed to restore invoice");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsRestoring(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      inv.clientName?.toLowerCase().includes(s) ||
      inv.invoiceId?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col p-6 overflow-hidden">
      <PageHeader 
        title="Deleted Invoices" 
        description="View and restore deleted invoices"
        icon={RotateCcw}
      >
        <div className="flex items-center gap-3">
          <Link href="/invoice">
            <Button variant="outline" className="h-10 px-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto mt-6 bg-white rounded-xl border border-border shadow-sm flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search by client or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full bg-gray-50 border-border focus-visible:ring-brand-teal"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground font-bold border-b border-border bg-gray-50/30 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Date of Issue</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-teal mb-2" />
                    <p className="text-muted-foreground font-medium">Loading deleted invoices...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-red-500 font-medium">
                    {error}
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground font-medium">
                    No deleted invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{invoice.clientName}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-brand-blue">{invoice.invoiceId}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {invoice.invoiceType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{invoice.dateOfIssue}</td>
                    <td className="px-6 py-4 text-right font-bold">
                      ₹{invoice.total?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-brand-teal border-brand-teal/30 hover:bg-brand-teal hover:text-white"
                        onClick={() => handleRestore(invoice.id)}
                        disabled={isRestoring === invoice.id}
                      >
                        {isRestoring === invoice.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-1.5" />
                            Restore
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
