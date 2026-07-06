"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { API_URL } from "@/lib/config";
import {
  Plus,
  Loader2,
  Target,
  Calendar as CalendarIcon,
  IndianRupee,
  TrendingUp,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CompanyFinancePlanPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/company-finance/plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Financial Plan"
        description="Budget planning and financial goals for the company"
      >
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </PageHeader>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No financial plans</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a financial plan to set budgets and track goals.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => (
            <div key={plan._id || idx} className="border rounded-lg p-5 hover:shadow-md transition-shadow bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{plan.title || "Untitled Plan"}</h3>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{plan.description || "No description"}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : "—"}
                </span>
                <span className="flex items-center gap-1 font-semibold">
                  <IndianRupee className="w-3.5 h-3.5" />
                  {(plan.budget || 0).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
