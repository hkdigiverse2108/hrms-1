"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { API_URL } from "@/lib/config";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Plus,
  Loader2,
  IndianRupee,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Wallet,
  Coins,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClientTransaction {
  id?: string;
  _id?: string;
  personName: string;
  date: string;
  amount: number;
  type: "inflow" | "outflow";
  description?: string;
  paymentMethod?: string;
  remarks?: string;
}

interface Client {
  id: string;
  clientName: string;
}

interface ClientSummary {
  personName: string;
  totalInflow: number;
  totalOutflow: number;
  netBalance: number;
  transactions: ClientTransaction[];
}

export default function ClientTransactionsPage() {
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedClients, setExpandedClients] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<ClientTransaction | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    personName: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    type: "inflow" as "inflow" | "outflow",
    description: "",
    paymentMethod: "bank",
    remarks: "",
  });

  const [settings, setSettings] = useState<any>(null);

  const formatVal = (val: any, unit: string = "INR") => {
    if (val === undefined || val === null || val === "") return "-";
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);
    const decimals = settings?.financeDecimalScaling !== undefined ? settings.financeDecimalScaling : 0;
    if (unit === "INR") {
      return "₹" + num.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, clientsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/client-transactions`),
        fetch(`${API_URL}/clients`),
        fetch(`${API_URL}/system-settings`),
      ]);

      let scale = 1;
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        const decimals = settingsData?.financeDecimalScaling !== undefined ? settingsData.financeDecimalScaling : 0;
        scale = Math.pow(10, decimals);
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        const scaledTx = txData.map((t: any) => ({
          ...t,
          amount: (Number(t.amount) || 0) / scale
        }));
        setTransactions(scaledTx);
      } else {
        toast.error("Failed to load client transactions");
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading data from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = tx.personName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (tx.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.remarks || "").toLowerCase().includes(searchTerm.toLowerCase());

      const txDate = new Date(tx.date);
      const matchStart = !startDate || txDate >= new Date(startDate);
      const matchEnd = !endDate || txDate <= new Date(endDate);

      return matchSearch && matchStart && matchEnd;
    });
  }, [transactions, searchTerm, startDate, endDate]);

  // Client Wise Summary Aggregation
  const clientSummaries = useMemo(() => {
    const groups: { [name: string]: ClientTransaction[] } = {};
    filteredTransactions.forEach((tx) => {
      const name = tx.personName || "Unknown";
      if (!groups[name]) groups[name] = [];
      groups[name].push(tx);
    });

    return Object.keys(groups).map((name) => {
      const txs = groups[name];
      let totalInflow = 0;
      let totalOutflow = 0;
      txs.forEach((t) => {
        if (t.type === "inflow") {
          totalInflow += t.amount;
        } else {
          totalOutflow += t.amount;
        }
      });
      return {
        personName: name,
        totalInflow,
        totalOutflow,
        netBalance: totalInflow - totalOutflow,
        transactions: txs,
      };
    });
  }, [filteredTransactions]);

  // KPI Calculations
  const metrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === "inflow") {
        totalInflow += tx.amount;
      } else {
        totalOutflow += tx.amount;
      }
    });

    return {
      totalInflow,
      totalOutflow,
      netBalance: totalInflow - totalOutflow,
    };
  }, [filteredTransactions]);

  // Suggestion list combining existing clients & previously typed manual names
  const clientSuggestions = useMemo(() => {
    const names = new Set<string>();
    clients.forEach((c) => {
      if (c.clientName) names.add(c.clientName.trim());
    });
    transactions.forEach((tx) => {
      if (tx.personName) names.add(tx.personName.trim());
    });
    return Array.from(names).sort();
  }, [clients, transactions]);


  // Handle Edit/Open
  const handleOpenAddModal = (defaultName = "") => {
    setEditingTx(null);
    setForm({
      personName: defaultName,
      date: new Date().toISOString().split("T")[0],
      amount: "",
      type: "inflow",
      description: "",
      paymentMethod: "bank",
      remarks: "",
    });
    setIsModalOpen(true);
    setTimeout(() => {
      if (defaultName) {
        amountInputRef.current?.focus();
      } else {
        nameInputRef.current?.focus();
      }
    }, 150);
  };

  const handleOpenEditModal = (tx: ClientTransaction) => {
    setEditingTx(tx);
    
    const getFormattedDateForInput = (dateStr: any): string => {
      if (!dateStr) return new Date().toISOString().split("T")[0];
      const str = String(dateStr).trim();
      
      const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}/;
      if (yyyymmddRegex.test(str)) {
        return str.substring(0, 10);
      }

      const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
      const match = str.match(dmyRegex);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      }

      try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split("T")[0];
        }
      } catch (e) {}

      return new Date().toISOString().split("T")[0];
    };

    const normalizedDate = getFormattedDateForInput(tx.date);
    setForm({
      personName: tx.personName,
      date: normalizedDate,
      amount: String(tx.amount),
      type: tx.type,
      description: tx.description || "",
      paymentMethod: tx.paymentMethod || "bank",
      remarks: tx.remarks || "",
    });
    setIsModalOpen(true);
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 150);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personName.trim()) {
      toast.error("Please enter or select a person's name");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const scale = Math.pow(10, settings?.financeDecimalScaling !== undefined ? settings.financeDecimalScaling : 0);
    try {
      setFormLoading(true);
      const payload = {
        personName: form.personName.trim(),
        date: form.date,
        amount: Number(form.amount) * scale,
        type: form.type,
        description: form.description.trim() || undefined,
        paymentMethod: form.paymentMethod || undefined,
        remarks: form.remarks.trim() || undefined,
      };

      const url = editingTx
        ? `${API_URL}/client-transactions/${editingTx._id || editingTx.id}`
        : `${API_URL}/client-transactions`;
      const method = editingTx ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingTx ? "Transaction updated" : "Transaction recorded successfully");
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to save transaction");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("An error occurred while saving");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Transaction
  const handleDelete = async (txId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const res = await fetch(`${API_URL}/client-transactions/${txId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Transaction deleted successfully");
        fetchData();
      } else {
        toast.error("Failed to delete transaction");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("An error occurred while deleting");
    }
  };

  // Toggle Row Expansion
  const toggleExpand = (name: string) => {
    setExpandedClients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          title="Client Transactions"
          description="Keep aggregated records of manual payments (inflow/outflow) grouped by client/person."
        />
        <Button onClick={() => handleOpenAddModal("")} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inflow Card */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Inflow</p>
            <h3 className="text-3xl font-bold mt-1 text-emerald-700 dark:text-emerald-300 flex items-center">
              <IndianRupee className="w-7 h-7" />
              {formatVal(metrics.totalInflow, "none")}
            </h3>
          </div>
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Outflow Card */}
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Total Outflow</p>
            <h3 className="text-3xl font-bold mt-1 text-rose-700 dark:text-rose-300 flex items-center">
              <IndianRupee className="w-7 h-7" />
              {formatVal(metrics.totalOutflow, "none")}
            </h3>
          </div>
          <div className="p-4 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Net Balance</p>
            <h3 className="text-3xl font-bold mt-1 text-indigo-700 dark:text-indigo-300 flex items-center">
              <IndianRupee className="w-7 h-7" />
              {formatVal(metrics.netBalance, "none")}
            </h3>
          </div>
          <div className="p-4 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search client/person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-50 dark:bg-gray-800/50"
            />
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1 bg-gray-50 dark:bg-gray-800/50 border-gray-200"
            />
            <span className="text-gray-400 text-sm">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1 bg-gray-50 dark:bg-gray-800/50 border-gray-200"
            />
          </div>

          {/* Clear Filters */}
          {(searchTerm || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStartDate("");
                setEndDate("");
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Grouped Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center flex-col gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-500">Loading client transactions...</p>
          </div>
        ) : clientSummaries.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Coins className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Records Found</h4>
            <p className="text-sm text-gray-500 max-w-sm mt-1">
              There are no transactions recorded. Try adding a new manual record or adjusting the search/dates filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 w-12"></th>
                  <th className="p-4">Person/Client Name</th>
                  <th className="p-4 text-emerald-600 dark:text-emerald-400">Total Inflow</th>
                  <th className="p-4 text-rose-600 dark:text-rose-400">Total Outflow</th>
                  <th className="p-4 text-indigo-600 dark:text-indigo-400">Net Balance</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {clientSummaries.map((summary) => {
                  const isExpanded = expandedClients.includes(summary.personName);
                  return (
                    <React.Fragment key={summary.personName}>
                      {/* Summary Row */}
                      <tr 
                        onClick={() => toggleExpand(summary.personName)}
                        className="hover:bg-gray-50/70 dark:hover:bg-gray-800/10 cursor-pointer transition-colors"
                      >
                        <td className="p-4 text-center">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                        <td className="p-4 font-semibold text-gray-900 dark:text-white">
                          {summary.personName}
                          <span className="ml-2 text-xs font-normal text-gray-400">
                            ({summary.transactions.length} entries)
                          </span>
                        </td>
                        <td className="p-4 font-medium text-emerald-600 dark:text-emerald-400">
                          {formatVal(summary.totalInflow)}
                        </td>
                        <td className="p-4 font-medium text-rose-600 dark:text-rose-400">
                          {formatVal(summary.totalOutflow)}
                        </td>
                        <td className="p-4 font-bold">
                          <span 
                            className={cn(
                              summary.netBalance >= 0 
                                ? "text-emerald-600 dark:text-emerald-400" 
                                : "text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {formatVal(summary.netBalance)}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAddModal(summary.personName)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border-indigo-200/50"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add entry
                          </Button>
                        </td>
                      </tr>

                      {/* Detail / Transaction List Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50/50 dark:bg-gray-900/40 p-4">
                            <div className="border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden shadow-inner bg-white dark:bg-gray-900/80">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-gray-100/50 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-850 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                                    <th className="p-3 pl-6">Date</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3">Method</th>
                                    <th className="p-3">Remarks</th>
                                    <th className="p-3 text-right pr-6">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-600 dark:text-gray-300">
                                  {summary.transactions.map((tx) => (
                                    <tr key={tx._id || tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                                      <td className="p-3 pl-6 whitespace-nowrap font-medium flex items-center gap-1.5">
                                        <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                        {tx.date}
                                      </td>
                                      <td className="p-3 whitespace-nowrap">
                                        <span
                                          className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                                            tx.type === "inflow"
                                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                                          )}
                                        >
                                          {tx.type}
                                        </span>
                                      </td>
                                      <td className="p-3 whitespace-nowrap font-bold">
                                        <span className={tx.type === "inflow" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                          {tx.type === "inflow" ? "+" : "-"} {formatVal(tx.amount)}
                                        </span>
                                      </td>
                                      <td className="p-3 max-w-xs truncate">{tx.description || "-"}</td>
                                      <td className="p-3 whitespace-nowrap capitalize">
                                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] border border-gray-200/50">
                                          {tx.paymentMethod || "bank"}
                                        </span>
                                      </td>
                                      <td className="p-3 max-w-xs truncate text-gray-400">{tx.remarks || "-"}</td>
                                      <td className="p-3 text-right pr-6 whitespace-nowrap space-x-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleOpenEditModal(tx)}
                                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDelete(tx._id || tx.id || "")}
                                          className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-600" />
              {editingTx ? "Edit Client Transaction" : "New Client Transaction"}
            </DialogTitle>
            <DialogDescription>
              {editingTx
                ? "Modify the manual transaction details below."
                : "Fill out the fields to log a manual transaction for a person/client."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Person Name Input & Suggestion List */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Person / Client Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  ref={nameInputRef}
                  type="text"
                  required
                  placeholder="Type name (e.g. John Doe, HK Client)"
                  value={form.personName}
                  onChange={(e) => setForm({ ...form, personName: e.target.value })}
                  list="client-suggestions"
                  className="w-full"
                />
                <datalist id="client-suggestions">
                  {clientSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <p className="text-xs text-gray-400">Select an existing client or type any name manually.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type Select */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transaction Type</label>
                <select
                  value={form.type}
                  onChange={(e: any) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="inflow">Inflow (Received)</option>
                  <option value="outflow">Outflow (Paid)</option>
                </select>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date</label>
                <Input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Amount (INR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₹</span>
                  <Input
                    ref={amountInputRef}
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="pl-7"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[1000, 5000, 10000, 20000, 50000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm({ ...form, amount: String(val) })}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 rounded border border-indigo-200/45 dark:border-indigo-850/45 transition-colors"
                      >
                        +{val.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 animate-none"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / GPay / Paytm</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Particulars / Description</label>
              <Input
                type="text"
                placeholder="e.g. Extra payment for server migration"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Remarks / Private Notes</label>
              <textarea
                placeholder="Any additional notes..."
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[80px]">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
