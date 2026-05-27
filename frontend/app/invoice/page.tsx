"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Download,
  Filter,
  Calendar as CalendarIcon,
  MoreVertical,
  FileText,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TablePagination } from "@/components/common/TablePagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getStatusStyles = (status: string) => {
  switch (status) {
    case "Paid": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Pending": return "bg-amber-100 text-amber-700 border-amber-200";
    case "Overdue": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function AllInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/invoices/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setInvoices(invoices.filter(inv => inv.id !== id));
        toast.success(`Invoice ${invoiceNumber} deleted successfully`);
      } else {
        toast.error("Failed to delete the invoice");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error deleting the invoice");
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Paid" })
      });

      if (res.ok) {
        const updated = await res.json();
        setInvoices(invoices.map(inv => inv.id === id ? updated : inv));
        toast.success(`Invoice marked as Paid!`);
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error updating status");
    }
  };

  // Filter invoices based on Search and Status Tab selection
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      (invoice.invoiceNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (invoice.clientName?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      
    const matchesStatus = 
      selectedStatus === "All" || 
      invoice.status?.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate items for current page
  const totalItems = filteredInvoices.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus]);

  const statuses = ["All", "Paid", "Pending", "Overdue"];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="All Invoices" 
        description="Manage and track all your client invoices."
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="h-10 px-4 text-sm font-medium bg-white"
            onClick={() => exportToCSV(invoices, 'invoices')}
            disabled={invoices.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF Report
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
        {/* Search and Filters Bar */}
        <div className="p-4 sm:p-6 border-b border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg border transition-all whitespace-nowrap",
                  selectedStatus === status
                    ? "bg-brand-teal text-white border-brand-teal shadow-sm"
                    : "bg-white text-muted-foreground border-border hover:bg-gray-50 hover:text-slate-700"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-pulse" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client or invoice ID..." 
              className="pl-9 bg-gray-50/50 border-border rounded-lg h-10 font-medium" 
            />
          </div>
        </div>
        
        {/* Table View */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground font-bold border-b border-border bg-gray-50/30 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Date of Issue</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                      <p className="font-semibold text-sm">Loading invoices from database...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-red-500 font-semibold">
                    {error}
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground font-medium">
                    No invoices found. Click "Create Invoice" to add a new record.
                  </td>
                </tr>
              ) : (
                currentItems.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-teal/5 flex items-center justify-center border border-brand-teal/15 font-bold text-xs text-brand-teal uppercase">
                          {invoice.clientName ? invoice.clientName[0] : "C"}
                        </div>
                        <span className="font-bold text-slate-700">{invoice.clientName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-500">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-[13px]">
                      {invoice.issueDate}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-[13px]">
                      {invoice.dueDate}
                    </td>
                    <td className="px-6 py-4 font-black text-slate-800 text-right">
                      ₹ {(invoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wide", getStatusStyles(invoice.status))}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-brand-teal">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem 
                              onClick={() => router.push(`/invoice/${invoice.id}`)}
                              className="cursor-pointer font-medium"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Invoice
                            </DropdownMenuItem>
                            {invoice.status !== "Paid" && (
                              <DropdownMenuItem 
                                onClick={() => handleMarkAsPaid(invoice.id)}
                                className="cursor-pointer font-medium text-emerald-600 focus:text-emerald-700"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                              className="cursor-pointer font-medium text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Section */}
        <TablePagination 
          totalItems={totalItems} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage} 
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          itemName="invoices" 
        />
      </div>
    </div>
  );
}
