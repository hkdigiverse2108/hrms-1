"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_URL } from "@/lib/config";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Plus,
  Download,
  Loader2,
  IndianRupee,
  Landmark,
  Banknote,
  Calendar as CalendarIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  FileText,
  Paperclip,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Wallet,
  Sparkles,
  ArrowRight,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";
import { cn } from "@/lib/utils";

interface Transaction {
  id?: string;
  _id?: string;
  description?: string;
  descriptions?: string;
  amount: number;
  type: "credit" | "debit";
  category?: string;
  paymentMethod: "bank" | "cash";
  date: string;
  invoiceNumber?: string;
  services?: string;
  remarks?: string;
  expenseNo?: string;
  things?: string;
  narrative?: string;
  billAttachment?: string;
  isSyncedInvoice?: boolean;
  invoiceId?: string;
}

interface BalanceData {
  id?: string;
  bankOpeningBalance: number;
  cashOpeningBalance: number;
  year?: string;
}

export default function CompanyFinanceTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<BalanceData>({
    bankOpeningBalance: 0,
    cashOpeningBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"bank" | "cash">("bank");

  // Filters state
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSynced, setFilterSynced] = useState("all");

  // Categories helper
  const categories = useMemo(() => {
    const list = transactions
      .filter((t) => t.paymentMethod === activeTab && t.category)
      .map((t) => t.category || "");
    return Array.from(new Set(list));
  }, [transactions, activeTab]);

  // All existing categories list (from all transactions in the system)
  const allExistingCategories = useMemo(() => {
    const list = transactions
      .map((t) => t.category || "")
      .filter((cat) => cat.trim() !== "");
    return Array.from(new Set(list)).sort();
  }, [transactions]);

  const [showCreditCatDropdown, setShowCreditCatDropdown] = useState(false);
  const [showDebitCatDropdown, setShowDebitCatDropdown] = useState(false);
  const [showFilterCatDropdown, setShowFilterCatDropdown] = useState(false);
  const [filterCatSearch, setFilterCatSearch] = useState("");
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterCatDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Invoices for auto-completion in Credit modal
  const [invoicesList, setInvoicesList] = useState<any[]>([]);

  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        // Clear/Reset sorting to default
        setSortColumn(null);
        setSortDirection("desc");
      }
    } else {
      setSortColumn(columnName);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (columnName: string) => {
    if (sortColumn !== columnName) return <span className="text-slate-300 ml-1">↕</span>;
    return sortDirection === "asc" ? <span className="text-slate-700 font-bold ml-1">↑</span> : <span className="text-slate-700 font-bold ml-1">↓</span>;
  };

  // Modals state
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isDebitModalOpen, setIsDebitModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Form states
  const [creditForm, setCreditForm] = useState({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    category: "",
    descriptions: "",
    services: "",
    remarks: "",
    paymentMethod: "bank" as "bank" | "cash",
  });

  const [debitForm, setDebitForm] = useState({
    expenseNo: "", // Left empty for automatic generation
    date: new Date().toISOString().split("T")[0],
    amount: "",
    category: "",
    things: "",
    narrative: "",
    billAttachment: "",
    paymentMethod: "bank" as "bank" | "cash",
  });

  const [balanceForm, setBalanceForm] = useState({
    bankOpeningBalance: "0",
    cashOpeningBalance: "0",
  });

  useEffect(() => {
    fetchData();
    fetchInvoicesForDropdown();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, balRes] = await Promise.all([
        fetch(`${API_URL}/company-finance/transactions`),
        fetch(`${API_URL}/company-finance/balances`),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }
      if (balRes.ok) {
        const balData = await balRes.json();
        setBalances({
          bankOpeningBalance: Number(balData.bankOpeningBalance) || 0,
          cashOpeningBalance: Number(balData.cashOpeningBalance) || 0,
        });
        setBalanceForm({
          bankOpeningBalance: String(balData.bankOpeningBalance || 0),
          cashOpeningBalance: String(balData.cashOpeningBalance || 0),
        });
      }
    } catch (err) {
      console.error("Error fetching finance data:", err);
      toast.error("Failed to load financial ledger data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicesForDropdown = async () => {
    try {
      const res = await fetch(`${API_URL}/invoices`);
      if (res.ok) {
        const data = await res.json();
        setInvoicesList(data || []);
      }
    } catch (err) {
      console.error("Error fetching invoices list:", err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetchData();
    setSyncing(false);
    toast.success("Invoices and ledger synchronized automatically!");
  };

  // Filtered transactions for current tab (latest first) with filters applied
  const currentTransactions = useMemo(() => {
    return [...transactions]
      .filter((t) => {
        if (t.paymentMethod !== activeTab) return false;

        if (searchTerm.trim() !== "") {
          const query = searchTerm.toLowerCase();
          const matchInvoice = t.invoiceNumber?.toLowerCase().includes(query);
          const matchExpense = t.expenseNo?.toLowerCase().includes(query);
          const matchDesc = (t.description || t.descriptions || "").toLowerCase().includes(query);
          const matchThings = t.things?.toLowerCase().includes(query);
          const matchNarrative = t.narrative?.toLowerCase().includes(query);
          const matchCategory = t.category?.toLowerCase().includes(query);
          if (!matchInvoice && !matchExpense && !matchDesc && !matchThings && !matchNarrative && !matchCategory) {
            return false;
          }
        }

        if (filterCategory !== "all" && t.category !== filterCategory) {
          return false;
        }

        if (filterStartDate) {
          if (!t.date || new Date(t.date) < new Date(filterStartDate)) return false;
        }
        if (filterEndDate) {
          if (!t.date || new Date(t.date) > new Date(filterEndDate)) return false;
        }

        if (filterSynced !== "all") {
          if (filterSynced === "synced" && !t.isSyncedInvoice) return false;
          if (filterSynced === "manual" && t.isSyncedInvoice) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortColumn) {
          let valA: any = "";
          let valB: any = "";

          if (sortColumn === "invoice") {
            valA = a.invoiceNumber || a.expenseNo || "";
            valB = b.invoiceNumber || b.expenseNo || "";
          } else if (sortColumn === "date") {
            valA = a.date ? new Date(a.date).getTime() : 0;
            valB = b.date ? new Date(b.date).getTime() : 0;
          } else if (sortColumn === "amount") {
            valA = Number(a.amount) || 0;
            valB = Number(b.amount) || 0;
          } else if (sortColumn === "category") {
            valA = a.category || "";
            valB = b.category || "";
          }

          if (valA < valB) return sortDirection === "asc" ? -1 : 1;
          if (valA > valB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        }

        // Default sort: date desc
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
  }, [transactions, activeTab, searchTerm, filterCategory, filterStartDate, filterEndDate, filterSynced, sortColumn, sortDirection]);

  const creditTransactions = useMemo(() => {
    return currentTransactions.filter((t) => t.type === "credit");
  }, [currentTransactions]);

  const debitTransactions = useMemo(() => {
    return currentTransactions.filter((t) => t.type === "debit");
  }, [currentTransactions]);

  // Totals calculations
  const totalCredit = useMemo(() => {
    return creditTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [creditTransactions]);

  const totalDebit = useMemo(() => {
    return debitTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [debitTransactions]);

  const openingBalance =
    activeTab === "bank"
      ? balances.bankOpeningBalance
      : balances.cashOpeningBalance;

  const closingBalance = openingBalance + totalCredit - totalDebit;

  // Handlers for Credit Modal
  const handleOpenCreditModal = () => {
    setEditingTx(null);
    setCreditForm({
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0],
      amount: "",
      category: "",
      descriptions: "",
      services: "",
      remarks: "",
      paymentMethod: activeTab,
    });
    setIsCreditModalOpen(true);
  };

  const handleSelectInvoice = (invNum: string) => {
    const found = invoicesList.find((i) => i.invoiceNumber === invNum || i.id === invNum);
    if (found) {
      const lineItems = found.lineItems || [];
      const descs = lineItems.map((li: any) => li.description).filter(Boolean).join(", ");
      const srvs = lineItems.map((li: any) => li.subDescription || li.description).filter(Boolean).join(", ");
      setCreditForm((prev) => ({
        ...prev,
        invoiceNumber: found.invoiceNumber || prev.invoiceNumber,
        amount: String(found.total || 0),
        category: found.clientName || prev.category,
        descriptions: descs || found.clientName || "",
        services: srvs || "Services",
        remarks: found.notes || found.remarks || `Status: ${found.status || "Paid"}`,
      }));
    }
  };

  const handleSaveCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditForm.amount || Number(creditForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      const payload = {
        ...creditForm,
        amount: Number(creditForm.amount),
        type: "credit",
        description: creditForm.descriptions || creditForm.category || "Credit",
      };

      const url = editingTx
        ? `${API_URL}/company-finance/transactions/${editingTx._id || editingTx.id}`
        : `${API_URL}/company-finance/transactions`;
      const method = editingTx ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingTx ? "Credit updated" : "Credit transaction added");
        setIsCreditModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to save credit transaction");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving credit transaction");
    }
  };

  // Handlers for Debit Modal
  const handleOpenDebitModal = () => {
    setEditingTx(null);
    setDebitForm({
      expenseNo: "",
      date: new Date().toISOString().split("T")[0],
      amount: "",
      category: "",
      things: "",
      narrative: "",
      billAttachment: "",
      paymentMethod: activeTab,
    });
    setIsDebitModalOpen(true);
  };

  const handleSaveDebit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitForm.amount || Number(debitForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      const payload = {
        ...debitForm,
        amount: Number(debitForm.amount),
        type: "debit",
        description: debitForm.things || debitForm.narrative || "Expense",
      };

      const url = editingTx
        ? `${API_URL}/company-finance/transactions/${editingTx._id || editingTx.id}`
        : `${API_URL}/company-finance/transactions`;
      const method = editingTx ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingTx ? "Expense updated" : "Expense recorded with automatic numbering!");
        setIsDebitModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to save expense");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving expense");
    }
  };

  // Delete Transaction
  const handleDeleteTx = async (tx: Transaction) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await fetch(
        `${API_URL}/company-finance/transactions/${tx._id || tx.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Transaction deleted");
        fetchData();
      } else {
        toast.error("Failed to delete transaction");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting transaction");
    }
  };

  // Edit Transaction
  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    if (tx.type === "credit") {
      setCreditForm({
        invoiceNumber: tx.invoiceNumber || "",
        date: tx.date || new Date().toISOString().split("T")[0],
        amount: String(tx.amount || 0),
        category: tx.category || "",
        descriptions: tx.descriptions || tx.description || "",
        services: tx.services || "",
        remarks: tx.remarks || "",
        paymentMethod: tx.paymentMethod || activeTab,
      });
      setIsCreditModalOpen(true);
    } else {
      setDebitForm({
        expenseNo: tx.expenseNo || "",
        date: tx.date || new Date().toISOString().split("T")[0],
        amount: String(tx.amount || 0),
        category: tx.category || "",
        things: tx.things || tx.description || "",
        narrative: tx.narrative || "",
        billAttachment: tx.billAttachment || "",
        paymentMethod: tx.paymentMethod || activeTab,
      });
      setIsDebitModalOpen(true);
    }
  };

  // Save Balances
  const handleSaveBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/company-finance/balances`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankOpeningBalance: Number(balanceForm.bankOpeningBalance) || 0,
          cashOpeningBalance: Number(balanceForm.cashOpeningBalance) || 0,
        }),
      });
      if (res.ok) {
        toast.success("Opening balances updated successfully!");
        setIsBalanceModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to update balances");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating balances");
    }
  };

  // Export ledger
  const handleExport = (format: "pdf" | "excel") => {
    const exportData = currentTransactions.map((t) => ({
      "Type": t.type.toUpperCase(),
      "Number / Invoice / Expense": t.invoiceNumber || t.expenseNo || "-",
      "Date": t.date,
      "Amount": `Rs. ${t.amount.toLocaleString("en-IN")}`,
      "Category / Client": t.category || "-",
      "Descriptions / Things": t.descriptions || t.things || t.description || "-",
      "Services / Narrative": t.services || t.narrative || "-",
      "Remarks / Bill": t.remarks || t.billAttachment || "-",
    }));

    exportData.push({
      "Type": "SUMMARY",
      "Number / Invoice / Expense": "OPENING BALANCE",
      "Date": "-",
      "Amount": `Rs. ${openingBalance.toLocaleString("en-IN")}`,
      "Category / Client": "-",
      "Descriptions / Things": "-",
      "Services / Narrative": "-",
      "Remarks / Bill": "-",
    });

    exportData.push({
      "Type": "SUMMARY",
      "Number / Invoice / Expense": "TOTAL CREDIT",
      "Date": "-",
      "Amount": `Rs. ${totalCredit.toLocaleString("en-IN")}`,
      "Category / Client": "-",
      "Descriptions / Things": "-",
      "Services / Narrative": "-",
      "Remarks / Bill": "-",
    });

    exportData.push({
      "Type": "SUMMARY",
      "Number / Invoice / Expense": "TOTAL DEBT",
      "Date": "-",
      "Amount": `Rs. ${totalDebit.toLocaleString("en-IN")}`,
      "Category / Client": "-",
      "Descriptions / Things": "-",
      "Services / Narrative": "-",
      "Remarks / Bill": "-",
    });

    exportData.push({
      "Type": "SUMMARY",
      "Number / Invoice / Expense": activeTab === "bank" ? "CLOSING BALANCE IN BANK" : "CASH IN HAND",
      "Date": "-",
      "Amount": `Rs. ${closingBalance.toLocaleString("en-IN")}`,
      "Category / Client": "-",
      "Descriptions / Things": "-",
      "Services / Narrative": "-",
      "Remarks / Bill": "-",
    });

    const fileName = `${activeTab === "bank" ? "Bank_Account" : "Cash_Transaction"}_Ledger`;
    if (format === "pdf") {
      exportToPDF(exportData, fileName);
    } else {
      exportToExcel(exportData, fileName);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        title="Financial Ledger Management"
        description="Track Credit (Invoices) and Debt (Expenses) with dynamic balance calculations"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="h-9 font-semibold bg-white shadow-sm hover:bg-slate-50 border-slate-200"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-2 text-brand-teal", syncing && "animate-spin")} />
            Sync Invoices
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBalanceModalOpen(true)}
            className="h-9 font-semibold bg-white shadow-sm hover:bg-slate-50 border-slate-200"
          >
            <Wallet className="w-3.5 h-3.5 mr-2 text-amber-600" />
            Opening Balances
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 font-semibold bg-white shadow-sm border-slate-200">
                <Download className="w-3.5 h-3.5 mr-2 text-blue-600" />
                Export Ledger
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 font-medium">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileText className="w-4 h-4 mr-2 text-red-500" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileText className="w-4 h-4 mr-2 text-green-600" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={handleOpenCreditModal}
            className="h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Credit (Invoice)
          </Button>

          <Button
            size="sm"
            onClick={handleOpenDebitModal}
            className="h-9 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Debt (Expense)
          </Button>
        </div>
      </PageHeader>

      {/* Main Ledger Tabs */}
      <Tabs
        defaultValue="bank"
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "bank" | "cash")}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
          <TabsList className="bg-transparent h-11 p-0 gap-1.5">
            <TabsTrigger
              value="bank"
              className="gap-2.5 rounded-xl px-6 font-bold text-sm h-11 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:scale-[1.01]"
            >
              <Landmark className="w-4 h-4 text-emerald-600" />
              Bank Acc Management
            </TabsTrigger>
            <TabsTrigger
              value="cash"
              className="gap-2.5 rounded-xl px-6 font-bold text-sm h-11 transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:scale-[1.01]"
            >
              <Banknote className="w-4 h-4 text-amber-600" />
              Cash Transaction
            </TabsTrigger>
          </TabsList>

          {/* Search bar */}
          <div className="relative flex-1 max-w-sm px-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search invoices, expenses, narratives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200/80 rounded-xl shadow-sm text-sm"
            />
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <Filter className="w-4 h-4 text-slate-500" />
            Filters:
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">From:</span>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="h-9 w-36 bg-white border-slate-200/80 rounded-xl text-xs px-2.5"
            />
            <span className="text-xs font-semibold text-slate-500">To:</span>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="h-9 w-36 bg-white border-slate-200/80 rounded-xl text-xs px-2.5"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 relative" ref={filterDropdownRef}>
            <span className="text-xs font-semibold text-slate-500">Category:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterCatDropdown(!showFilterCatDropdown)}
                className="h-9 min-w-[140px] max-w-[200px] bg-white border border-slate-200/80 rounded-xl text-xs px-2.5 flex items-center justify-between text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span className="truncate">{filterCategory === "all" ? "All Categories" : filterCategory}</span>
                <span className="text-[10px] ml-1 text-slate-400">▼</span>
              </button>

              {showFilterCatDropdown && (
                <div className="absolute z-50 left-0 mt-1 w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="relative">
                    <Input
                      placeholder="Search category..."
                      value={filterCatSearch}
                      onChange={(e) => setFilterCatSearch(e.target.value)}
                      className="h-8 text-xs pr-6"
                      autoFocus
                    />
                    {filterCatSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterCatSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterCategory("all");
                        setShowFilterCatDropdown(false);
                        setFilterCatSearch("");
                      }}
                      className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors ${
                        filterCategory === "all"
                          ? "bg-slate-100 text-slate-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      All Categories
                    </button>
                    {categories
                      .filter((cat) =>
                        cat.toLowerCase().includes(filterCatSearch.toLowerCase())
                      )
                      .map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFilterCategory(cat);
                            setShowFilterCatDropdown(false);
                            setFilterCatSearch("");
                          }}
                          className={`w-full px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors ${
                            filterCategory === cat
                              ? "bg-slate-100 text-slate-900 font-bold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    {categories.filter((cat) =>
                      cat.toLowerCase().includes(filterCatSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-2.5 py-1.5 text-[11px] text-slate-400 text-center">
                        No matches found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Synced status filter */}
          {activeTab === "bank" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Sync Status:</span>
              <select
                value={filterSynced}
                onChange={(e) => setFilterSynced(e.target.value)}
                className="h-9 bg-white border border-slate-200/80 rounded-xl text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-700"
              >
                <option value="all">All Entries</option>
                <option value="synced">Auto-Synced Invoices</option>
                <option value="manual">Manual Entries</option>
              </select>
            </div>
          )}

          {/* Reset Filters button */}
          {(filterStartDate || filterEndDate || filterCategory !== "all" || filterSynced !== "all" || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStartDate("");
                setFilterEndDate("");
                setFilterCategory("all");
                setFilterSynced("all");
                setSearchTerm("");
              }}
              className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>

        {/* Balance Cards Header matching spreadsheet metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-slate-200/80 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-300 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {activeTab === "bank" ? "Opening Balance" : "Opening Cash Balance"}
              </p>
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                ₹{openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </p>
              <button
                onClick={() => setIsBalanceModalOpen(true)}
                className="text-xs text-amber-600 font-bold hover:underline mt-1 flex items-center gap-1"
              >
                Configure Opening Balance <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="border border-slate-200/80 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Transaction Total Credit
              </p>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center font-bold">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600">
                +₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {creditTransactions.length} credit entries synced
              </p>
            </div>
          </div>

          <div className="border border-slate-200/80 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-rose-300 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Transaction Total Debt
              </p>
              <div className="w-8 h-8 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-rose-600">
                -₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {debitTransactions.length} expense entries recorded
              </p>
            </div>
          </div>

          <div className={cn(
            "border rounded-2xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden transition-all",
            closingBalance >= 0 
              ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700"
              : "bg-gradient-to-br from-rose-900 via-rose-800 to-rose-900 text-white border-rose-700"
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {activeTab === "bank" ? "Closing Balance in Bank" : "Cash in Hand"}
              </p>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight">
                ₹{closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </p>
              <p className="text-[11px] text-slate-300 font-medium mt-1">
                Opening Balance + Total Credit - Total Debt
              </p>
            </div>
          </div>
        </div>

        {/* Side-by-side Credit and Debt Tables matching Excel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* CREDIT TABLE SECTION */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm font-bold">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Credit (Income / Invoices)</h3>
                  <p className="text-xs text-slate-500 font-medium">Auto-synced invoices and income</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleOpenCreditModal}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Credit
              </Button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    {activeTab === "bank" && (
                      <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("invoice")}>
                        Invoice {renderSortIndicator("invoice")}
                      </th>
                    )}
                    <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("date")}>
                      Date {renderSortIndicator("date")}
                    </th>
                    <th className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("amount")}>
                      Amount {renderSortIndicator("amount")}
                    </th>
                    {activeTab === "bank" && (
                      <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("category")}>
                        Category {renderSortIndicator("category")}
                      </th>
                    )}
                    <th className="px-3.5 py-3">Descriptions</th>
                    <th className="px-3.5 py-3">Services</th>
                    <th className="px-3.5 py-3">Remarks</th>
                    <th className="px-3.5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                        <span className="text-xs text-slate-400 font-medium">Loading credit ledger...</span>
                      </td>
                    </tr>
                  ) : creditTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <p className="font-bold text-slate-600 text-sm">No credit transactions</p>
                        <p className="text-xs text-slate-400 mt-1">Invoices will automatically sync and appear here</p>
                      </td>
                    </tr>
                  ) : (
                    creditTransactions.map((t, idx) => (
                      <tr key={t._id || t.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        {activeTab === "bank" && (
                          <td className="px-3.5 py-3 font-bold text-slate-800">
                            {t.isSyncedInvoice ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-mono">
                                {t.invoiceNumber || "INV"}
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              </span>
                            ) : (
                              <span className="font-mono text-slate-700">{t.invoiceNumber || "-"}</span>
                            )}
                          </td>
                        )}
                        <td className="px-3.5 py-3 font-medium text-slate-600">
                          {t.date ? new Date(t.date).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="px-3.5 py-3 font-black text-emerald-600 text-right">
                          ₹{(Number(t.amount) || 0).toLocaleString("en-IN")}
                        </td>
                        {activeTab === "bank" && (
                          <td className="px-3.5 py-3 font-semibold text-slate-700">
                            {t.category || "General"}
                          </td>
                        )}
                        <td className="px-3.5 py-3 font-medium text-slate-800 max-w-[180px] truncate" title={t.descriptions || t.description}>
                          {t.descriptions || t.description || "-"}
                        </td>
                        <td className="px-3.5 py-3 font-medium text-slate-600 max-w-[150px] truncate" title={t.services}>
                          {t.services || "-"}
                        </td>
                        <td className="px-3.5 py-3 text-slate-500 max-w-[150px] truncate" title={t.remarks}>
                          {t.remarks || "-"}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTx(t)}
                              className="h-7 w-7 text-slate-500 hover:text-slate-800"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {!t.isSyncedInvoice && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTx(t)}
                                className="h-7 w-7 text-rose-500 hover:text-rose-700"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Credit Table Footer matching Excel Transaction Total Credit */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
              <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
                Transaction Total Credit
              </span>
              <span className="font-black text-emerald-600 text-base">
                ₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          </div>

          {/* DEBT (EXPENSE) TABLE SECTION */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm font-bold">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Debt (Expenses / Bills)</h3>
                  <p className="text-xs text-slate-500 font-medium">Automatic numbering (YYMMXXX format)</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleOpenDebitModal}
                className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Debt
              </Button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("invoice")}>
                      Expense No. {renderSortIndicator("invoice")}
                    </th>
                    <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("date")}>
                      Date {renderSortIndicator("date")}
                    </th>
                    <th className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("amount")}>
                      Amount {renderSortIndicator("amount")}
                    </th>
                    {activeTab === "bank" && (
                      <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("category")}>
                        Category {renderSortIndicator("category")}
                      </th>
                    )}
                    <th className="px-3.5 py-3">Things</th>
                    <th className="px-3.5 py-3">Narrative</th>
                    <th className="px-3.5 py-3">Bill Attachment</th>
                    <th className="px-3.5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-rose-600 mx-auto mb-2" />
                        <span className="text-xs text-slate-400 font-medium">Loading debt ledger...</span>
                      </td>
                    </tr>
                  ) : debitTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <p className="font-bold text-slate-600 text-sm">No debt transactions</p>
                        <p className="text-xs text-slate-400 mt-1">Record company expenses and bills here</p>
                      </td>
                    </tr>
                  ) : (
                    debitTransactions.map((t, idx) => (
                      <tr key={t._id || t.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-3 font-bold text-slate-800">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                            {t.expenseNo || `EXP-${idx + 1}`}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-medium text-slate-600">
                          {t.date ? new Date(t.date).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="px-3.5 py-3 font-black text-rose-600 text-right">
                          ₹{(Number(t.amount) || 0).toLocaleString("en-IN")}
                        </td>
                        {activeTab === "bank" && (
                          <td className="px-3.5 py-3 font-semibold text-slate-700">
                            {t.category || "General"}
                          </td>
                        )}
                        <td className="px-3.5 py-3 font-medium text-slate-800 max-w-[160px] truncate" title={t.things || t.description}>
                          {t.things || t.description || "-"}
                        </td>
                        <td className="px-3.5 py-3 font-medium text-slate-600 max-w-[160px] truncate" title={t.narrative}>
                          {t.narrative || "-"}
                        </td>
                        <td className="px-3.5 py-3">
                          {t.billAttachment ? (
                            <a
                              href={t.billAttachment}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> View Bill
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTx(t)}
                              className="h-7 w-7 text-slate-500 hover:text-slate-800"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTx(t)}
                              className="h-7 w-7 text-rose-500 hover:text-rose-700"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Debt Table Footer matching Excel Transaction Total Debt */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
              <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
                Transaction Total Debt
              </span>
              <span className="font-black text-rose-600 text-base">
                ₹{totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Banner showing Net Result */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
          <div>
            <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              {activeTab === "bank" ? "Bank Account Summary Overview" : "Cash Ledger Summary Overview"}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Opening Balance (₹{openingBalance.toLocaleString()}) + Total Credit (₹{totalCredit.toLocaleString()}) - Total Debt (₹{totalDebit.toLocaleString()})
            </p>
          </div>
          <div className="text-right sm:text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activeTab === "bank" ? "Closing Balance in Bank" : "Cash in Hand"}
            </p>
            <p className={cn("text-3xl font-black mt-0.5", closingBalance >= 0 ? "text-emerald-400" : "text-rose-400")}>
              ₹{closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </p>
          </div>
        </div>
      </Tabs>

      {/* --- ADD / EDIT CREDIT MODAL --- */}
      <Dialog open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-emerald-50/60">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
              {editingTx ? "Edit Credit Transaction" : "Add Credit (Income / Invoice)"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record incoming funds. You can link an existing invoice or enter details manually.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCredit} className="p-6 space-y-4">
            {/* Invoice auto-complete selector */}
            {!editingTx && invoicesList.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-teal" /> Quick Select from Existing Invoices
                </label>
                <select
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  defaultValue=""
                >
                  <option value="">-- Select an invoice to auto-fill --</option>
                  {invoicesList.map((inv: any) => (
                    <option key={inv.id || inv._id} value={inv.invoiceNumber || inv.id}>
                      {inv.invoiceNumber} — {inv.clientName} (₹{(inv.total || 0).toLocaleString()}) [{inv.status || "Pending"}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Invoice Number / Ref</label>
                <Input
                  placeholder="e.g. INV-001"
                  value={creditForm.invoiceNumber}
                  onChange={(e) => setCreditForm({ ...creditForm, invoiceNumber: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Date *</label>
                <Input
                  type="date"
                  required
                  value={creditForm.date}
                  onChange={(e) => setCreditForm({ ...creditForm, date: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Amount (₹) *</label>
                <Input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                  className="h-9 text-xs font-bold text-emerald-600"
                />
              </div>

              {activeTab === "bank" && (
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-700">Category / Client Name</label>
                  <div className="relative">
                    <Input
                      placeholder="e.g. HK DigiVerse LLP"
                      value={creditForm.category}
                      onChange={(e) => setCreditForm({ ...creditForm, category: e.target.value })}
                      onFocus={() => setShowCreditCatDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCreditCatDropdown(false), 200)}
                      className="h-9 text-xs pr-8"
                    />
                    {creditForm.category && (
                      <button
                        type="button"
                        onClick={() => setCreditForm({ ...creditForm, category: "" })}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {showCreditCatDropdown && (
                    <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                      {creditForm.category && !allExistingCategories.includes(creditForm.category) && (
                        <button
                          type="button"
                          onMouseDown={() => setCreditForm({ ...creditForm, category: creditForm.category })}
                          className="w-full px-3 py-2 text-left text-xs text-emerald-600 font-bold hover:bg-slate-50 flex items-center justify-between"
                        >
                          <span>Add new: "{creditForm.category}"</span>
                          <span className="text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">New</span>
                        </button>
                      )}
                      {allExistingCategories
                        .filter((cat) =>
                          cat.toLowerCase().includes((creditForm.category || "").toLowerCase())
                        )
                        .map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onMouseDown={() => setCreditForm({ ...creditForm, category: cat })}
                            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            {cat}
                          </button>
                        ))}
                      {allExistingCategories.filter((cat) =>
                        cat.toLowerCase().includes((creditForm.category || "").toLowerCase())
                      ).length === 0 && !creditForm.category && (
                        <div className="px-3 py-2 text-xs text-slate-400 text-center">
                          No categories found. Type to add new.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Descriptions (Items / Scope)</label>
              <Input
                placeholder="e.g. Amrutam Tattva Pvt. Ltd."
                value={creditForm.descriptions}
                onChange={(e) => setCreditForm({ ...creditForm, descriptions: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Services</label>
                <Input
                  placeholder="e.g. SMM, Web Dev"
                  value={creditForm.services}
                  onChange={(e) => setCreditForm({ ...creditForm, services: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Remarks / Notes</label>
                <Input
                  placeholder="e.g. Advance received"
                  value={creditForm.remarks}
                  onChange={(e) => setCreditForm({ ...creditForm, remarks: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {editingTx ? "Update Credit" : "Save Credit Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- ADD / EDIT DEBT (EXPENSE) MODAL --- */}
      <Dialog open={isDebitModalOpen} onOpenChange={setIsDebitModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-rose-50/60">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-rose-600" />
              {editingTx ? "Edit Debt (Expense)" : "Add Debt (Expense / Bill)"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record company expenditure. Expense No. is automatically generated sequentially in YYMMXXX format.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDebit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Expense No.</label>
                <Input
                  placeholder={editingTx ? "" : "Auto-generated (e.g. 2509001)"}
                  disabled={!editingTx && !debitForm.expenseNo}
                  value={debitForm.expenseNo}
                  onChange={(e) => setDebitForm({ ...debitForm, expenseNo: e.target.value })}
                  className="h-9 text-xs font-mono bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Date *</label>
                <Input
                  type="date"
                  required
                  value={debitForm.date}
                  onChange={(e) => setDebitForm({ ...debitForm, date: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Amount (₹) *</label>
                <Input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1500"
                  value={debitForm.amount}
                  onChange={(e) => setDebitForm({ ...debitForm, amount: e.target.value })}
                  className="h-9 text-xs font-bold text-rose-600"
                />
              </div>

              {activeTab === "bank" && (
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <div className="relative">
                    <Input
                      placeholder="e.g. Office Rent, Hardware"
                      value={debitForm.category}
                      onChange={(e) => setDebitForm({ ...debitForm, category: e.target.value })}
                      onFocus={() => setShowDebitCatDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDebitCatDropdown(false), 200)}
                      className="h-9 text-xs pr-8"
                    />
                    {debitForm.category && (
                      <button
                        type="button"
                        onClick={() => setDebitForm({ ...debitForm, category: "" })}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {showDebitCatDropdown && (
                    <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                      {debitForm.category && !allExistingCategories.includes(debitForm.category) && (
                        <button
                          type="button"
                          onMouseDown={() => setDebitForm({ ...debitForm, category: debitForm.category })}
                          className="w-full px-3 py-2 text-left text-xs text-rose-600 font-bold hover:bg-slate-50 flex items-center justify-between"
                        >
                          <span>Add new: "{debitForm.category}"</span>
                          <span className="text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">New</span>
                        </button>
                      )}
                      {allExistingCategories
                        .filter((cat) =>
                          cat.toLowerCase().includes((debitForm.category || "").toLowerCase())
                        )
                        .map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onMouseDown={() => setDebitForm({ ...debitForm, category: cat })}
                            className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          >
                            {cat}
                          </button>
                        ))}
                      {allExistingCategories.filter((cat) =>
                        cat.toLowerCase().includes((debitForm.category || "").toLowerCase())
                      ).length === 0 && !debitForm.category && (
                        <div className="px-3 py-2 text-xs text-slate-400 text-center">
                          No categories found. Type to add new.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Things (Items Purchased)</label>
                <Input
                  placeholder="e.g. Deposit for Property, Server"
                  value={debitForm.things}
                  onChange={(e) => setDebitForm({ ...debitForm, things: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Narrative / Reason</label>
                <Input
                  placeholder="e.g. Advance paid to vendor"
                  value={debitForm.narrative}
                  onChange={(e) => setDebitForm({ ...debitForm, narrative: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Bill Attachment (URL or Filename)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. https://... or invoice_bill.pdf"
                  value={debitForm.billAttachment}
                  onChange={(e) => setDebitForm({ ...debitForm, billAttachment: e.target.value })}
                  className="h-9 text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs shrink-0"
                  onClick={() => {
                    // Simple simulated file upload alert / prompt
                    const url = prompt("Enter online link or Google Drive URL for Bill Attachment:");
                    if (url) setDebitForm({ ...debitForm, billAttachment: url });
                  }}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" /> Attach
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDebitModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                {editingTx ? "Update Expense" : "Save Debt Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- EDIT OPENING BALANCES MODAL --- */}
      <Dialog open={isBalanceModalOpen} onOpenChange={setIsBalanceModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-amber-50/60">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-600" />
              Configure Opening Balances
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set the starting baseline balance for Bank Accounts and Cash in Hand.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBalances} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Bank Opening Balance (₹)</label>
              <Input
                type="number"
                step="any"
                required
                value={balanceForm.bankOpeningBalance}
                onChange={(e) => setBalanceForm({ ...balanceForm, bankOpeningBalance: e.target.value })}
                className="h-10 text-sm font-bold text-emerald-700"
              />
              <p className="text-[11px] text-slate-400">Baseline opening balance for bank accounts (e.g. 506.1652)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Cash Opening Balance (₹)</label>
              <Input
                type="number"
                step="any"
                required
                value={balanceForm.cashOpeningBalance}
                onChange={(e) => setBalanceForm({ ...balanceForm, cashOpeningBalance: e.target.value })}
                className="h-10 text-sm font-bold text-amber-700"
              />
              <p className="text-[11px] text-slate-400">Baseline opening balance for cash in hand</p>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBalanceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Save Opening Balances
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
