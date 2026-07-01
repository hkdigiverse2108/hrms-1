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
  CheckCircle2,
  X,
  RotateCcw,
  IndianRupee
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useConfirm } from "@/context/ConfirmContext";

const getStatusStyles = (status: string) => {
  switch (status) {
    case "Paid": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Pending": return "bg-amber-100 text-amber-700 border-amber-200";
    case "Overdue": return "bg-red-100 text-red-700 border-red-200";
    case "Cancelled": return "bg-slate-100 text-slate-700 border-slate-300";
    case "Payment Approval": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function AllInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  
  // Follow Up Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  
  // Advanced Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMode, setPaymentMode] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [taxTypeFilter, setTaxTypeFilter] = useState("All");
  const { confirm } = useConfirm();
  
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
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const isAdmin = currentUser?.role?.toLowerCase() === "admin" || currentUser?.role?.toLowerCase() === "hr" || currentUser?.name === "Admin Admin";

      const [res, leadsRes] = await Promise.all([
        fetch(`${API_URL}/invoices`),
        !isAdmin ? fetch(`${API_URL}/leads`) : Promise.resolve(null)
      ]);

      if (res.ok) {
        let data = await res.json();

        if (!isAdmin && leadsRes && leadsRes.ok) {
          const leadsData = await leadsRes.json();
          const userClientNames = leadsData
            .filter((l: any) => {
               if (l.status !== "Client Won") return false;
               const assigned = Array.isArray(l.assignedTo) ? l.assignedTo : (l.assignedTo ? [l.assignedTo] : []);
               return assigned.some((a: any) => {
                 const aName = typeof a === 'object' ? (a.value || a.label || "") : a;
                 return aName.toLowerCase() === currentUser?.name?.toLowerCase();
               });
            })
            .flatMap((l: any) => [l.company?.toLowerCase(), l.contact?.toLowerCase()])
            .filter(Boolean);

          data = data.filter((inv: any) => {
            if (inv.createdById) {
              return inv.createdById === currentUser.id;
            }
            const cName = inv.clientName?.toLowerCase() || "";
            return userClientNames.includes(cName);
          });
        }

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
    const isConfirmed = await confirm({
      title: "Delete Invoice",
      message: `Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`,
      destructive: true,
      confirmText: "Delete"
    });
    if (!isConfirmed) return;

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

  const handleUpdateFollowUp = async () => {
    if (!activeInvoiceId) return;
    setIsUpdatingFollowUp(true);
    try {
      const res = await fetch(`${API_URL}/invoices/${activeInvoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endDate: endDate || null,
          followUp: followUp || null
        })
      });

      if (!res.ok) throw new Error("Failed to update invoice");
      
      const updatedInvoice = await res.json();
      setInvoices(prev => prev.map(inv => inv.id === activeInvoiceId ? updatedInvoice : inv));
      toast.success("Follow-up details updated successfully");
      setShowFollowUpModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Network error updating invoice");
    } finally {
      setIsUpdatingFollowUp(false);
    }
  };

  const handleMarkAsPaid = async (invoice: any) => {
    const isConfirmed = await confirm({
      title: "Mark as Paid",
      message: `Are you sure you want to mark invoice ${invoice.invoiceNumber} as Paid?`,
      confirmText: "Confirm",
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Paid" })
      });

      if (res.ok) {
        const updated = await res.json();
        setInvoices(invoices.map(inv => inv.id === invoice.id ? updated : inv));
        toast.success(`Invoice marked as Paid!`);
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error updating status");
    }
  };

  const handleMarkAsUnpaid = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Pending" })
      });

      if (res.ok) {
        const updated = await res.json();
        setInvoices(invoices.map(inv => inv.id === id ? updated : inv));
        toast.success(`Invoice marked as Unpaid!`);
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error updating status");
    }
  };

  const handleConvertToTaxInvoice = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Convert to Tax Invoice",
      message: "Are you sure you want to convert this Proforma Invoice to a Tax Invoice? This will assign a new Tax Invoice number.",
      confirmText: "Convert"
    });
    if (!isConfirmed) return;
    
    try {
      const res = await fetch(`${API_URL}/invoices/${id}/convert-to-tax`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const newInvoice = await res.json();
        setInvoices([newInvoice, ...invoices]);
        toast.success("Successfully converted to Tax Invoice!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to convert invoice");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error converting invoice");
    }
  };

  // Filter invoices based on Search and Status Tab selection
  let filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      (invoice.invoiceNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (invoice.clientName?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      
    let matchesStatus = false;
    if (selectedStatus === "All") {
      matchesStatus = true;
    } else if (selectedStatus === "Upcoming") {
      matchesStatus = !!invoice.endDate;
    } else {
      matchesStatus = invoice.status?.toLowerCase() === selectedStatus.toLowerCase();
    }

    const matchesType = 
      selectedType === "All" || 
      (invoice.invoiceType || "Tax Invoice") === selectedType;

    const matchesClient = clientFilter === "All" || invoice.clientName === clientFilter;
    const matchesPaymentMode = paymentMode === "All" || invoice.paymentMode === paymentMode;
    const matchesTaxType = taxTypeFilter === "All" || invoice.taxType === taxTypeFilter;
    
    const amt = invoice.total || 0;
    const matchesMinAmount = minAmount === "" || amt >= parseFloat(minAmount);
    const matchesMaxAmount = maxAmount === "" || amt <= parseFloat(maxAmount);

    let matchesDateFrom = true;
    let matchesDateTo = true;
    if (dateFrom || dateTo) {
      const issueDate = new Date(invoice.issueDate);
      if (dateFrom) matchesDateFrom = issueDate >= new Date(dateFrom);
      if (dateTo) matchesDateTo = issueDate <= new Date(dateTo);
    }

    return matchesSearch && matchesStatus && matchesType && matchesClient && 
           matchesPaymentMode && matchesTaxType && matchesMinAmount && matchesMaxAmount && 
           matchesDateFrom && matchesDateTo;
  });

  if (selectedStatus === "Upcoming") {
    filteredInvoices.sort((a, b) => {
      if (!a.endDate) return 1;
      if (!b.endDate) return -1;
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });
  }

  const uniqueClients = Array.from(new Set(invoices.map(inv => inv.clientName).filter(Boolean)));
  
  const activeFiltersCount = [
    dateFrom, dateTo, 
    paymentMode !== "All" ? paymentMode : "",
    clientFilter !== "All" ? clientFilter : "",
    minAmount, maxAmount,
    taxTypeFilter !== "All" ? taxTypeFilter : ""
  ].filter(Boolean).length;
  
  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPaymentMode("All");
    setClientFilter("All");
    setMinAmount("");
    setMaxAmount("");
    setTaxTypeFilter("All");
  };

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
  }, [searchTerm, selectedStatus, selectedType]);

  const statuses = ["All", "Paid", "Pending", "Overdue", "Upcoming", "Cancelled", "Payment Approval"];

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

          <div className="flex gap-3 w-full sm:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-gray-50/50 border border-border rounded-lg h-10 px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-teal text-slate-700 cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Tax Invoice">Tax Invoices</option>
              <option value="Proforma Invoice">Proforma Invoices</option>
            </select>
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-pulse" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by client or ID..." 
                className="pl-9 bg-gray-50/50 border-border rounded-lg h-10 font-medium" 
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 px-3 bg-white hover:bg-gray-50", activeFiltersCount > 0 && "border-brand-teal text-brand-teal")}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 bg-brand-teal text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">Advanced Filters</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 px-2 text-xs text-muted-foreground hover:text-red-500">
                      Clear All
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Client Name</label>
                    <select 
                      value={clientFilter} 
                      onChange={(e) => setClientFilter(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-border text-sm font-medium bg-white focus:ring-1 focus:ring-brand-teal focus:outline-none"
                    >
                      <option value="All">All Clients</option>
                      {uniqueClients.map(c => (
                        <option key={c as string} value={c as string}>{c as string}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">From Date</label>
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">To Date</label>
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm font-medium" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Min Amount</label>
                      <Input type="number" placeholder="₹0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="h-9 text-sm font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">Max Amount</label>
                      <Input type="number" placeholder="₹99999" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="h-9 text-sm font-medium" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Mode of Payment</label>
                    <select 
                      value={paymentMode} 
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-border text-sm font-medium bg-white focus:ring-1 focus:ring-brand-teal focus:outline-none"
                    >
                      <option value="All">All Modes</option>
                      <option value="Current Account">Current Account</option>
                      <option value="Cash with GST">Cash with GST</option>
                      <option value="Cash">Cash</option>
                      <option value="Other Account">Other Account</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Tax Type</label>
                    <select 
                      value={taxTypeFilter} 
                      onChange={(e) => setTaxTypeFilter(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-border text-sm font-medium bg-white focus:ring-1 focus:ring-brand-teal focus:outline-none"
                    >
                      <option value="All">All Tax Types</option>
                      <option value="CGST+SGST">CGST + SGST</option>
                      <option value="IGST">IGST</option>
                      <option value="No Tax">No Tax</option>
                    </select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Table View */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground font-bold border-b border-border bg-gray-50/30 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Date of Issue</th>
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
                      <div 
                        className="flex items-center gap-3 cursor-pointer group/client"
                        onClick={() => router.push(`/invoice/${invoice.id}`)}
                        title="View Invoice"
                      >
                        <div className="w-8 h-8 rounded-full bg-brand-teal/5 flex items-center justify-center border border-brand-teal/15 font-bold text-xs text-brand-teal uppercase group-hover/client:bg-brand-teal group-hover/client:text-white transition-colors">
                          {invoice.clientName ? invoice.clientName[0] : "C"}
                        </div>
                        <span className="font-bold text-slate-700 group-hover/client:text-brand-teal transition-colors hover:underline">
                          {invoice.clientName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-500">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-brand-teal uppercase tracking-wide">
                      {invoice.invoiceType || "Tax Invoice"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-[13px]">
                      {invoice.issueDate}
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
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => router.push(`/invoice/edit/${invoice.id}`)}
                          title="Edit Invoice"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {invoice.status !== "Paid" && (
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleMarkAsPaid(invoice)}
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.status === "Paid" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleMarkAsUnpaid(invoice.id)}
                            title="Mark as Unpaid"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.invoiceType === "Proforma Invoice" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-brand-teal hover:bg-brand-teal/10"
                              onClick={() => {
                                setActiveInvoiceId(invoice.id);
                                setEndDate(invoice.endDate || "");
                                setFollowUp(invoice.followUp || "");
                                setShowFollowUpModal(true);
                              }}
                              title="Set End Date & Follow Up"
                            >
                              <CalendarIcon className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-brand-teal hover:bg-brand-teal/10"
                              onClick={() => handleConvertToTaxInvoice(invoice.id)}
                              title="Convert to Tax Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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


      {/* Follow Up Dialog */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Follow Up Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="followUp">Follow Up Remarks</Label>
              <Input
                id="followUp"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Enter follow up details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateFollowUp} disabled={isUpdatingFollowUp} className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium">
              {isUpdatingFollowUp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
