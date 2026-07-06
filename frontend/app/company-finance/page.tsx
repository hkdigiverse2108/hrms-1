"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Transaction {
  _id?: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  paymentMethod: "bank" | "cash";
  date: string;
  reference?: string;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
}

function TransactionList({
  transactions,
  loading,
  searchTerm,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  transactions: Transaction[];
  loading: boolean;
  searchTerm: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const filtered = transactions.filter(
    (t) =>
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.reference || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <EmptyIcon className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
        <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_120px_140px_100px_50px] gap-3 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span>Description</span>
        <span>Category</span>
        <span>Date</span>
        <span className="text-right">Amount</span>
        <span></span>
      </div>
      {filtered.map((t, idx) => (
        <div
          key={t._id || idx}
          className="grid grid-cols-[1fr_120px_140px_100px_50px] gap-3 items-center px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          {/* Description */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                t.type === "credit"
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {t.type === "credit" ? (
                <ArrowDownLeft className="w-4 h-4" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {t.description || "Untitled"}
              </p>
              {t.reference && (
                <p className="text-xs text-muted-foreground truncate">
                  Ref: {t.reference}
                </p>
              )}
            </div>
          </div>

          {/* Category */}
          <span className="text-xs text-muted-foreground">
            {t.category || "General"}
          </span>

          {/* Date */}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            {t.date ? new Date(t.date).toLocaleDateString("en-IN") : "—"}
          </span>

          {/* Amount */}
          <span
            className={`text-sm font-semibold text-right ${
              t.type === "credit" ? "text-green-600" : "text-red-600"
            }`}
          >
            {t.type === "credit" ? "+" : "-"}₹
            {(t.amount || 0).toLocaleString("en-IN")}
          </span>

          {/* Actions */}
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CompanyFinanceTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("bank");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/company-finance/transactions`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const bankTransactions = transactions.filter(
    (t) => t.paymentMethod === "bank"
  );
  const cashTransactions = transactions.filter(
    (t) => t.paymentMethod === "cash"
  );

  // Summary stats for current tab
  const currentTransactions =
    activeTab === "bank" ? bankTransactions : cashTransactions;
  const totalCredit = currentTransactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDebit = currentTransactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Transactions"
        description="Track all company financial transactions"
      >
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Total Credit
          </p>
          <p className="text-xl font-bold text-green-600">
            +₹{totalCredit.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Total Debit
          </p>
          <p className="text-xl font-bold text-red-600">
            -₹{totalDebit.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Net Balance
          </p>
          <p
            className={`text-xl font-bold ${
              totalCredit - totalDebit >= 0 ? "text-blue-600" : "text-red-600"
            }`}
          >
            ₹{(totalCredit - totalDebit).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Tabs: Bank / Cash */}
      <Tabs
        defaultValue="bank"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 h-10">
            <TabsTrigger
              value="bank"
              className="gap-2 rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Landmark className="w-4 h-4" />
              Bank Transactions
            </TabsTrigger>
            <TabsTrigger
              value="cash"
              className="gap-2 rounded-lg px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Banknote className="w-4 h-4" />
              Cash Transactions
            </TabsTrigger>
          </TabsList>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <TabsContent value="bank" className="mt-4">
          <TransactionList
            transactions={bankTransactions}
            loading={loading}
            searchTerm={searchTerm}
            emptyIcon={Landmark}
            emptyTitle="No bank transactions"
            emptyDescription="Add a bank transaction to start tracking bank-related finances."
          />
        </TabsContent>

        <TabsContent value="cash" className="mt-4">
          <TransactionList
            transactions={cashTransactions}
            loading={loading}
            searchTerm={searchTerm}
            emptyIcon={Banknote}
            emptyTitle="No cash transactions"
            emptyDescription="Add a cash transaction to start tracking cash-related finances."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
