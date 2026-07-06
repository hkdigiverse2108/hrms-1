"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { API_URL } from "@/lib/config";
import {
  Loader2,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CompanyFinanceSummaryPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/company-finance/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Total Income",
      value: summary?.totalIncome || 0,
      icon: ArrowDownLeft,
      color: "text-green-600",
      bg: "bg-green-50",
      trend: summary?.incomeTrend,
    },
    {
      label: "Total Expenses",
      value: summary?.totalExpenses || 0,
      icon: ArrowUpRight,
      color: "text-red-600",
      bg: "bg-red-50",
      trend: summary?.expenseTrend,
    },
    {
      label: "Net Balance",
      value: (summary?.totalIncome || 0) - (summary?.totalExpenses || 0),
      icon: IndianRupee,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: null,
    },
    {
      label: "Pending Payments",
      value: summary?.pendingPayments || 0,
      icon: BarChart3,
      color: "text-amber-600",
      bg: "bg-amber-50",
      trend: null,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Financial Summary"
        description="Overview of company financial health and key metrics"
      >
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="border rounded-lg p-5 bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                    <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">₹{card.value.toLocaleString()}</p>
                  {card.trend !== null && card.trend !== undefined && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${card.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {card.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(card.trend)}% from last month
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state when no summary data exists */}
          {!summary && (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
              <BarChart3 className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No financial data</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Start adding transactions to see your financial summary here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
