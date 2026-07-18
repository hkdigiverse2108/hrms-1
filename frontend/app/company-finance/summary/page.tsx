"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { API_URL } from "@/lib/config";
import {
  Loader2,
  Calendar as CalendarIcon,
  Download,
  Eye,
  Info,
  Users,
  Briefcase,
  Laptop,
  Coins,
  Plus,
  Trash2,
  RotateCcw,
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

interface RowDefinition {
  id: string;
  category: string;
  subCategory: string;
  metric: string;
  unit: string;
  type: "field" | "formula" | "select" | "multiple";
  formula?: (vals: Record<string, any>) => number | string;
  options?: string[];
}

const PLAN_ROWS: RowDefinition[] = [
  // FINANCIAL - REVENUE
  { id: "rev_bef_revenue", category: "FINANCIAL - REVENUE", subCategory: "BEF", metric: "Monthly Revenue", unit: "INR", type: "field" },
  { id: "rev_bef_acquisitions", category: "FINANCIAL - REVENUE", subCategory: "BEF", metric: "Customer Acquisitions", unit: "Number", type: "field" },
  { id: "rev_bef_avg_rev", category: "FINANCIAL - REVENUE", subCategory: "BEF", metric: "Avg Revenue per Customer", unit: "INR", type: "formula",
    formula: (v) => {
      const rev = parseFloat(v.rev_bef_revenue) || 0;
      const acq = parseFloat(v.rev_bef_acquisitions) || 0;
      return acq > 0 ? (rev / acq).toFixed(2) : 0;
    }
  },
  { id: "rev_erp_revenue", category: "FINANCIAL - REVENUE", subCategory: "AI ERP", metric: "Monthly Revenue", unit: "INR", type: "field" },
  { id: "rev_erp_acquisitions", category: "FINANCIAL - REVENUE", subCategory: "AI ERP", metric: "Customer Acquisitions", unit: "Number", type: "field" },
  { id: "rev_erp_avg_rev", category: "FINANCIAL - REVENUE", subCategory: "AI ERP", metric: "Avg Revenue per Customer", unit: "INR", type: "formula",
    formula: (v) => {
      const rev = parseFloat(v.rev_erp_revenue) || 0;
      const acq = parseFloat(v.rev_erp_acquisitions) || 0;
      return acq > 0 ? (rev / acq).toFixed(2) : 0;
    }
  },
  { id: "rev_course_revenue", category: "FINANCIAL - REVENUE", subCategory: "HK Course/Client", metric: "Monthly Revenue", unit: "INR", type: "field" },
  { id: "rev_course_acquisitions", category: "FINANCIAL - REVENUE", subCategory: "HK Course/Client", metric: "Customer Acquisitions", unit: "Number", type: "field" },
  { id: "rev_course_avg_rev", category: "FINANCIAL - REVENUE", subCategory: "HK Course/Client", metric: "Avg Revenue per Customer", unit: "INR", type: "formula",
    formula: (v) => {
      const rev = parseFloat(v.rev_course_revenue) || 0;
      const acq = parseFloat(v.rev_course_acquisitions) || 0;
      return acq > 0 ? (rev / acq).toFixed(2) : 0;
    }
  },
  { id: "rev_combined", category: "FINANCIAL - REVENUE", subCategory: "Total", metric: "Combined Revenue", unit: "INR", type: "formula",
    formula: (v) => {
      return (parseFloat(v.rev_bef_revenue) || 0) + (parseFloat(v.rev_erp_revenue) || 0) + (parseFloat(v.rev_course_revenue) || 0);
    }
  },
  { id: "rev_total_customers", category: "FINANCIAL - REVENUE", subCategory: "Total", metric: "Total Customer Base", unit: "Number", type: "formula",
    formula: (v) => {
      return (parseFloat(v.rev_bef_acquisitions) || 0) + (parseFloat(v.rev_erp_acquisitions) || 0) + (parseFloat(v.rev_course_acquisitions) || 0);
    }
  },

  // FINANCIAL - EXPENSES
  { id: "exp_capex_digital_onetime", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Digital Assets (One-time)", unit: "INR", type: "multiple" },
  { id: "exp_capex_architecture_onetime", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Architecture & Facilities (One-time)", unit: "INR", type: "multiple" },
  { id: "exp_capex_digital", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Digital Assets", unit: "INR", type: "multiple" },
  { id: "exp_capex_architecture", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Architecture & Facilities", unit: "INR", type: "multiple" },
  { id: "exp_capex_total", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Total CAPEX", unit: "INR", type: "formula",
    formula: (v) => {
      return (parseFloat(v.exp_capex_digital_onetime) || 0) + (parseFloat(v.exp_capex_architecture_onetime) || 0) + (parseFloat(v.exp_capex_digital) || 0) + (parseFloat(v.exp_capex_architecture) || 0);
    }
  },
  { id: "exp_opex_rent", category: "FINANCIAL - EXPENSES", subCategory: "Fixed OPEX", metric: "Office Rent", unit: "INR", type: "field" },
  { id: "exp_opex_maintenance", category: "FINANCIAL - EXPENSES", subCategory: "Fixed OPEX", metric: "Office Maintenance", unit: "INR", type: "multiple" },
  { id: "exp_opex_electricity", category: "FINANCIAL - EXPENSES", subCategory: "Fixed OPEX", metric: "Electricity", unit: "INR", type: "field" },
  { id: "exp_opex_internet", category: "FINANCIAL - EXPENSES", subCategory: "Fixed OPEX", metric: "Internet & Communication", unit: "INR", type: "multiple" },
  { id: "exp_opex_refreshments", category: "FINANCIAL - EXPENSES", subCategory: "Fixed OPEX", metric: "Office Refreshments", unit: "INR", type: "multiple" },
  { id: "exp_opex_cleaning", category: "FINANCIAL - EXPENSES", subCategory: "Fixed OPEX", metric: "Cleaning Services", unit: "INR", type: "field" },
  { id: "exp_opex_total", category: "FINANCIAL - EXPENSES", subCategory: "Fixed OPEX", metric: "Total OPEX", unit: "INR", type: "formula",
    formula: (v) => {
      return (parseFloat(v.exp_opex_rent) || 0) + (parseFloat(v.exp_opex_maintenance) || 0) + (parseFloat(v.exp_opex_electricity) || 0) + (parseFloat(v.exp_opex_internet) || 0) + (parseFloat(v.exp_opex_refreshments) || 0) + (parseFloat(v.exp_opex_cleaning) || 0);
    }
  },
  { id: "exp_salary_current", category: "FINANCIAL - EXPENSES", subCategory: "Salary", metric: "Current Team Salaries", unit: "INR", type: "field" },
  { id: "exp_salary_new", category: "FINANCIAL - EXPENSES", subCategory: "Salary", metric: "New Hires Salaries", unit: "INR", type: "field" },
  { id: "exp_salary_total", category: "FINANCIAL - EXPENSES", subCategory: "Salary", metric: "Total Payroll", unit: "INR", type: "formula",
    formula: (v) => {
      return (parseFloat(v.exp_salary_current) || 0) + (parseFloat(v.exp_salary_new) || 0);
    }
  },
  { id: "exp_mkt_digital", category: "FINANCIAL - EXPENSES", subCategory: "Marketing", metric: "Digital Marketing Spend", unit: "INR", type: "multiple" },
  { id: "exp_mkt_collab", category: "FINANCIAL - EXPENSES", subCategory: "Marketing", metric: "Collaborations", unit: "INR", type: "multiple" },
  { id: "exp_ops_misc", category: "FINANCIAL - EXPENSES", subCategory: "Operations", metric: "Miscellaneous", unit: "INR", type: "multiple" },
  { id: "exp_ops_travel", category: "FINANCIAL - EXPENSES", subCategory: "Operations", metric: "Travel & Conveyance", unit: "INR", type: "multiple" },
  { id: "exp_mo_total", category: "FINANCIAL - EXPENSES", subCategory: "MO Total", metric: "Marketing+Operations", unit: "INR", type: "formula",
    formula: (v) => {
      return (parseFloat(v.exp_mkt_digital) || 0) + (parseFloat(v.exp_mkt_collab) || 0) + (parseFloat(v.exp_ops_misc) || 0) + (parseFloat(v.exp_ops_travel) || 0);
    }
  },
  { id: "exp_total", category: "FINANCIAL - EXPENSES", subCategory: "Total Expenses", metric: "Monthly Total", unit: "INR", type: "formula",
    formula: (v) => {
      const capex = (parseFloat(v.exp_capex_digital_onetime) || 0) + (parseFloat(v.exp_capex_architecture_onetime) || 0) + (parseFloat(v.exp_capex_digital) || 0) + (parseFloat(v.exp_capex_architecture) || 0);
      const opex = (parseFloat(v.exp_opex_rent) || 0) + (parseFloat(v.exp_opex_maintenance) || 0) + (parseFloat(v.exp_opex_electricity) || 0) + (parseFloat(v.exp_opex_internet) || 0) + (parseFloat(v.exp_opex_refreshments) || 0) + (parseFloat(v.exp_opex_cleaning) || 0);
      const payroll = (parseFloat(v.exp_salary_current) || 0) + (parseFloat(v.exp_salary_new) || 0);
      const mktOps = (parseFloat(v.exp_mkt_digital) || 0) + (parseFloat(v.exp_mkt_collab) || 0) + (parseFloat(v.exp_ops_misc) || 0) + (parseFloat(v.exp_ops_travel) || 0);
      return capex + opex + payroll + mktOps;
    }
  },

  // FINANCIAL - PROFITABILITY
  { id: "prof_ebitda", category: "FINANCIAL - PROFITABILITY", subCategory: "EBITDA", metric: "Monthly EBITDA (Revenue-Expenses)", unit: "INR", type: "formula",
    formula: (v) => {
      const rev = (parseFloat(v.rev_bef_revenue) || 0) + (parseFloat(v.rev_erp_revenue) || 0) + (parseFloat(v.rev_course_revenue) || 0);
      const exp = (parseFloat(v.exp_capex_digital_onetime) || 0) + (parseFloat(v.exp_capex_architecture_onetime) || 0) + (parseFloat(v.exp_capex_digital) || 0) + (parseFloat(v.exp_capex_architecture) || 0) +
                  (parseFloat(v.exp_opex_rent) || 0) + (parseFloat(v.exp_opex_maintenance) || 0) + (parseFloat(v.exp_opex_electricity) || 0) + (parseFloat(v.exp_opex_internet) || 0) + (parseFloat(v.exp_opex_refreshments) || 0) + (parseFloat(v.exp_opex_cleaning) || 0) +
                  (parseFloat(v.exp_salary_current) || 0) + (parseFloat(v.exp_salary_new) || 0) +
                  (parseFloat(v.exp_mkt_digital) || 0) + (parseFloat(v.exp_mkt_collab) || 0) + (parseFloat(v.exp_ops_misc) || 0) + (parseFloat(v.exp_ops_travel) || 0);
      return rev - exp;
    }
  },

  // FINANCIAL - CASH FLOW
  { id: "cf_opening", category: "FINANCIAL - CASH FLOW", subCategory: "Bank Balance", metric: "Opening Balance", unit: "INR", type: "field" },
  { id: "cf_closing", category: "FINANCIAL - CASH FLOW", subCategory: "Bank Balance", metric: "Closing Balance", unit: "INR", type: "formula",
    formula: (v) => {
      const op = parseFloat(v.cf_opening) || 0;
      const rev = (parseFloat(v.rev_bef_revenue) || 0) + (parseFloat(v.rev_erp_revenue) || 0) + (parseFloat(v.rev_course_revenue) || 0);
      const exp = (parseFloat(v.exp_capex_digital_onetime) || 0) + (parseFloat(v.exp_capex_architecture_onetime) || 0) + (parseFloat(v.exp_capex_digital) || 0) + (parseFloat(v.exp_capex_architecture) || 0) +
                  (parseFloat(v.exp_opex_rent) || 0) + (parseFloat(v.exp_opex_maintenance) || 0) + (parseFloat(v.exp_opex_electricity) || 0) + (parseFloat(v.exp_opex_internet) || 0) + (parseFloat(v.exp_opex_refreshments) || 0) + (parseFloat(v.exp_opex_cleaning) || 0) +
                  (parseFloat(v.exp_salary_current) || 0) + (parseFloat(v.exp_salary_new) || 0) +
                  (parseFloat(v.exp_mkt_digital) || 0) + (parseFloat(v.exp_mkt_collab) || 0) + (parseFloat(v.exp_ops_misc) || 0) + (parseFloat(v.exp_ops_travel) || 0);
      return op + rev - exp;
    }
  },
  { id: "cf_cash", category: "FINANCIAL - CASH FLOW", subCategory: "Cash in Hand", metric: "Current Cash", unit: "INR", type: "field" },
  { id: "cf_inflow", category: "FINANCIAL - CASH FLOW", subCategory: "Investment", metric: "Required In flow", unit: "INR", type: "field" },

  // STAFFING
  { id: "stf_devs", category: "STAFFING", subCategory: "Headcount", metric: "Developers", unit: "Number", type: "field" },
  { id: "stf_creative", category: "STAFFING", subCategory: "Headcount", metric: "Creative Team", unit: "Number", type: "field" },
  { id: "stf_mkt", category: "STAFFING", subCategory: "Headcount", metric: "Digital Marketing", unit: "Number", type: "field" },
  { id: "stf_bde", category: "STAFFING", subCategory: "Headcount", metric: "BDE Team", unit: "Number", type: "field" },
  { id: "stf_call", category: "STAFFING", subCategory: "Headcount", metric: "Telecalling Team", unit: "Number", type: "field" },
  { id: "stf_qa", category: "STAFFING", subCategory: "Headcount", metric: "QA Team", unit: "Number", type: "field" },
  { id: "stf_hr", category: "STAFFING", subCategory: "Headcount", metric: "HR", unit: "Number", type: "field" },
  { id: "stf_total_team", category: "STAFFING", subCategory: "Headcount", metric: "Total Team Size", unit: "Number", type: "formula",
    formula: (v) => {
      return (parseFloat(v.stf_devs) || 0) + (parseFloat(v.stf_creative) || 0) + (parseFloat(v.stf_mkt) || 0) + (parseFloat(v.stf_bde) || 0) + (parseFloat(v.stf_call) || 0) + (parseFloat(v.stf_qa) || 0) + (parseFloat(v.stf_hr) || 0);
    }
  },
  { id: "stf_open", category: "STAFFING", subCategory: "Recruitment", metric: "Open Positions", unit: "Number", type: "field" },
  { id: "stf_payroll", category: "STAFFING", subCategory: "Payroll", metric: "Monthly Payroll", unit: "INR", type: "field" },
  { id: "stf_avg_salary", category: "STAFFING", subCategory: "Payroll", metric: "Average Salary", unit: "INR", type: "formula",
    formula: (v) => {
      const payroll = parseFloat(v.stf_payroll) || 0;
      const size = (parseFloat(v.stf_devs) || 0) + (parseFloat(v.stf_creative) || 0) + (parseFloat(v.stf_mkt) || 0) + (parseFloat(v.stf_bde) || 0) + (parseFloat(v.stf_call) || 0) + (parseFloat(v.stf_qa) || 0) + (parseFloat(v.stf_hr) || 0);
      return size > 0 ? (payroll / size).toFixed(2) : 0;
    }
  },

  // ASSETS - Physical
  { id: "ast_phy_ac", category: "ASSETS", subCategory: "Physical", metric: "AC", unit: "Number", type: "field" },
  { id: "ast_phy_chair", category: "ASSETS", subCategory: "Physical", metric: "CHAIR", unit: "Number", type: "field" },
  { id: "ast_phy_table", category: "ASSETS", subCategory: "Physical", metric: "TABLE", unit: "Number", type: "field" },
  { id: "ast_phy_fans", category: "ASSETS", subCategory: "Physical", metric: "FANS", unit: "Number", type: "field" },
  { id: "ast_phy_cards", category: "ASSETS", subCategory: "Physical", metric: "Parking Cards", unit: "Number", type: "field" },
  { id: "ast_phy_tv", category: "ASSETS", subCategory: "Physical", metric: "Tripod TV", unit: "Number", type: "field" },

  // ASSETS - Digital
  { id: "ast_dig_cpu", category: "ASSETS", subCategory: "Digital", metric: "CPU", unit: "Number", type: "field" },
  { id: "ast_dig_display", category: "ASSETS", subCategory: "Digital", metric: "DISPLAY", unit: "Number", type: "field" },
  { id: "ast_dig_keyboard", category: "ASSETS", subCategory: "Digital", metric: "KEYBOARD MOUSE", unit: "Number", type: "field" },
  { id: "ast_dig_phone", category: "ASSETS", subCategory: "Digital", metric: "MOBILE PHONE", unit: "Number", type: "field" },
  { id: "ast_dig_headset", category: "ASSETS", subCategory: "Digital", metric: "HEADSET", unit: "Number", type: "field" },
  { id: "ast_dig_laptop", category: "ASSETS", subCategory: "Digital", metric: "LAPTOP", unit: "Number", type: "field" },

  // ASSETS - Software
  { id: "ast_sw_chatgpt_go", category: "ASSETS", subCategory: "Software", metric: "CHAT GPT GO", unit: "Active", type: "select", options: ["Active", "Inactive"] },
  { id: "ast_sw_google_ai", category: "ASSETS", subCategory: "Software", metric: "GOOGLE AI", unit: "Active", type: "select", options: ["Active", "Inactive"] },
  { id: "ast_sw_heygen", category: "ASSETS", subCategory: "Software", metric: "HEYGEN", unit: "Active", type: "select", options: ["Active", "Inactive"] },
  { id: "ast_sw_vasyerp", category: "ASSETS", subCategory: "Software", metric: "VASYERP", unit: "Active", type: "select", options: ["Active", "Inactive"] },
  { id: "ast_sw_filmora", category: "ASSETS", subCategory: "Software", metric: "FILMORA", unit: "Active", type: "select", options: ["Active", "Inactive"] },
  { id: "ast_sw_suno_ai", category: "ASSETS", subCategory: "Software", metric: "SUNO AI", unit: "Active", type: "select", options: ["Active", "Inactive"] },
  { id: "ast_sw_vps", category: "ASSETS", subCategory: "Software", metric: "VPS", unit: "Active", type: "select", options: ["Active", "Inactive"] },
  { id: "ast_sw_chatgpt_plus", category: "ASSETS", subCategory: "Software", metric: "CHAT GPT PLUS", unit: "Active", type: "select", options: ["Active", "Inactive"] },
];

export default function CompanyFinanceSummaryPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });

  const [planValues, setPlanValues] = useState<Record<string, any>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<RowDefinition[]>(PLAN_ROWS);
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);
  const [formCategory, setFormCategory] = useState("");
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formMetric, setFormMetric] = useState("");
  const [formUnit, setFormUnit] = useState("INR");
  const [formType, setFormType] = useState<"field" | "multiple">("field");

  const getPreviousMonthString = (monthStr: string): string => {
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 2, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, "0");
    return `${prevYear}-${prevMonth}`;
  };

  const existingCategories = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.category)));
  }, [rows]);

  const handleAddRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = formCategory === "CUSTOM" ? formCustomCategory.trim() : formCategory;
    if (!finalCategory || !formSubCategory.trim() || !formMetric.trim() || !formUnit.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newId = "custom_" + Date.now();
    const newRow: RowDefinition = {
      id: newId,
      category: finalCategory.toUpperCase(),
      subCategory: formSubCategory.trim(),
      metric: formMetric.trim(),
      unit: formUnit.trim(),
      type: formType,
    };

    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    
    try {
      const res = await fetch(`${API_URL}/company-finance/row-definitions/${selectedMonth}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: updatedRows.map(({ formula, ...r }) => r) }),
      });
      if (res.ok) {
        toast.success("Category/Row added successfully!");
        setIsAddRowOpen(false);
        setFormSubCategory("");
        setFormMetric("");
        setFormCustomCategory("");
      } else {
        toast.error("Failed to save updated row configuration");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving category/row");
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category/row?")) return;

    const updatedRows = rows.filter((r) => r.id !== id);
    setRows(updatedRows);

    try {
      const res = await fetch(`${API_URL}/company-finance/row-definitions/${selectedMonth}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: updatedRows.map(({ formula, ...r }) => r) }),
      });
      if (res.ok) {
        toast.success("Category/Row removed successfully");
      } else {
        toast.error("Failed to save updated row configuration");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting category/row");
    }
  };

  const handleRestoreDefaults = async () => {
    if (!confirm("Are you sure you want to restore all categories/rows to system defaults? Any custom categories will be lost.")) return;

    try {
      const res = await fetch(`${API_URL}/company-finance/row-definitions/${selectedMonth}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: PLAN_ROWS.map(({ formula, ...r }) => r) }),
      });
      if (res.ok) {
        toast.success("Categories restored to system defaults!");
        setRows(PLAN_ROWS);
      } else {
        toast.error("Failed to restore defaults");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error restoring defaults");
    }
  };

  // Drilldown Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalType, setModalType] = useState<"employees" | "jobs" | "assets" | "multi_plan" | null>(null);

  const monthOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let month = 1; month <= 12; month++) {
        const mm = String(month).padStart(2, "0");
        const value = `${year}-${mm}`;
        const date = new Date(year, month - 1);
        const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        options.push({ value, label });
      }
    }
    return options;
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch row definitions
      try {
        const rowDefsRes = await fetch(`${API_URL}/company-finance/row-definitions/${selectedMonth}`);
        if (rowDefsRes.ok) {
          const rowDefsData = await rowDefsRes.json();
          if (rowDefsData && Array.isArray(rowDefsData.rows) && rowDefsData.rows.length > 0) {
            const activeRows = rowDefsData.rows.map((r: any) => {
              const defaultRow = PLAN_ROWS.find((dr) => dr.id === r.id);
              if (defaultRow && defaultRow.formula) {
                return { ...r, formula: defaultRow.formula };
              }
              return r;
            });
            setRows(activeRows);
          }
        }
      } catch (err) {
        console.error("Error fetching row definitions:", err);
      }

      const [planRes, txRes, empRes, astRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/company-finance/monthly-plans/${selectedMonth}`),
        fetch(`${API_URL}/company-finance/transactions`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/assets`),
        fetch(`${API_URL}/job-openings`),
      ]);

      if (planRes.ok) {
        const planData = await planRes.json();
        setPlanValues(planData?.values || {});
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData || []);
      }
      if (astRes.ok) {
        const astData = await astRes.json();
        setAssets(astData || []);
      }
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobOpenings(jobsData || []);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      toast.error("Failed to load summary values");
    } finally {
      setLoading(false);
    }
  };

  // Helper to format values as currency/number
  const formatVal = (val: any, unit: string) => {
    if (val === undefined || val === null || val === "") return "-";
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);
    if (unit === "INR") {
      return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    }
    return num.toLocaleString();
  };

  // Calculate actuals dynamically for a row based on database listings
  const actualValues = useMemo(() => {
    const computed: Record<string, any> = {};
    const [targetYear, targetMonth] = selectedMonth.split("-").map(Number);
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    const targetMonthStr = selectedMonth;

    // Filter transactions for selected month
    const monthlyTxs = transactions.filter((tx) => tx.date && tx.date.substring(0, 7) === targetMonthStr);

    // Active employees in target month
    const activeEmployees = employees.filter((emp) => {
      if (emp.status === "inactive") {
        const resignationDate = emp.resignationDate ? new Date(emp.resignationDate) : null;
        if (resignationDate && resignationDate < monthStart) return false;
      }
      const joinDate = emp.joinDate ? new Date(emp.joinDate) : null;
      if (joinDate && joinDate > monthEnd) return false;
      return true;
    });

    // New hire employees (joined in target month)
    const newHires = activeEmployees.filter((emp) => {
      if (!emp.joinDate) return false;
      const joinDate = new Date(emp.joinDate);
      return joinDate >= monthStart && joinDate <= monthEnd;
    });

    const activeAssets = assets.filter((ast) => (ast.status || "").toLowerCase() !== "maintenance");

    // Headcount variables
    let devs = 0, creative = 0, mkt = 0, bde = 0, call = 0, qa = 0, hr = 0, payroll = 0, newHiresPayroll = 0;
    activeEmployees.forEach((emp) => {
      const dept = (emp.department || "").toLowerCase().trim();
      const salary = parseFloat(emp.salary) || 0;
      payroll += salary;

      if (dept.includes("dev")) devs++;
      else if (dept.includes("creative") || dept.includes("design") || dept.includes("graphics")) creative++;
      else if (dept.includes("market") || dept.includes("mkt") || dept.includes("smm")) mkt++;
      else if (dept.includes("bde") || dept.includes("sales") || dept.includes("business")) bde++;
      else if (dept.includes("call") || dept.includes("telecall")) call++;
      else if (dept.includes("qa") || dept.includes("test")) qa++;
      else if (dept.includes("hr") || dept.includes("recruiter")) hr++;
    });

    newHires.forEach((emp) => {
      newHiresPayroll += parseFloat(emp.salary) || 0;
    });

    // Asset variables
    let ac = 0, chair = 0, table = 0, fans = 0, cards = 0, tv = 0;
    let cpu = 0, display = 0, keyboard = 0, phone = 0, headset = 0, laptop = 0;
    let sw_chatgpt_go = "Inactive", sw_google_ai = "Inactive", sw_heygen = "Inactive",
        sw_vasyerp = "Inactive", sw_filmora = "Inactive", sw_suno_ai = "Inactive",
        sw_vps = "Inactive", sw_chatgpt_plus = "Inactive";

    activeAssets.forEach((asset) => {
      const name = (asset.name || "").toLowerCase();
      const cat = (asset.category || "").toLowerCase();
      const text = `${name} ${cat}`;

      if (text.includes("air conditioner") || cat === "ac" || name === "ac") ac++;
      else if (text.includes("chair")) chair++;
      else if (text.includes("table") || text.includes("desk")) table++;
      else if (text.includes("fan")) fans++;
      else if (text.includes("parking card")) cards++;
      else if (text.includes("tv") || text.includes("television")) tv++;
      else if (text.includes("cpu")) cpu++;
      else if (text.includes("display") || text.includes("monitor")) display++;
      else if (text.includes("keyboard") || text.includes("mouse")) keyboard++;
      else if (text.includes("phone") || text.includes("mobile")) phone++;
      else if (text.includes("headset") || text.includes("headphone")) headset++;
      else if (text.includes("laptop")) laptop++;

      if (text.includes("chatgpt go") || text.includes("chat gpt go")) sw_chatgpt_go = "Active";
      else if (text.includes("google ai")) sw_google_ai = "Active";
      else if (text.includes("heygen")) sw_heygen = "Active";
      else if (text.includes("vasyerp") || text.includes("vasy erp")) sw_vasyerp = "Active";
      else if (text.includes("filmora")) sw_filmora = "Active";
      else if (text.includes("suno")) sw_suno_ai = "Active";
      else if (text.includes("vps")) sw_vps = "Active";
      else if (text.includes("chatgpt plus") || text.includes("chat gpt plus")) sw_chatgpt_plus = "Active";
    });

    // Populate calculations for actual values
    rows.forEach((row) => {
      if (row.id.startsWith("rev_bef_revenue")) {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "credit" && t.category?.toLowerCase().includes("bef")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id.startsWith("rev_bef_acquisitions")) {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "credit" && t.category?.toLowerCase().includes("bef")).length;
      } else if (row.id.startsWith("rev_erp_revenue")) {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "credit" && (t.category?.toLowerCase().includes("erp") || t.category?.toLowerCase().includes("ai"))).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id.startsWith("rev_erp_acquisitions")) {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "credit" && (t.category?.toLowerCase().includes("erp") || t.category?.toLowerCase().includes("ai"))).length;
      } else if (row.id.startsWith("rev_course_revenue")) {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "credit" && (t.category?.toLowerCase().includes("course") || t.category?.toLowerCase().includes("client") || t.category?.toLowerCase().includes("hk"))).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id.startsWith("rev_course_acquisitions")) {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "credit" && (t.category?.toLowerCase().includes("course") || t.category?.toLowerCase().includes("client") || t.category?.toLowerCase().includes("hk"))).length;
      }

      // Expenses actual computation
      else if (row.id === "exp_capex_digital_onetime") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("capex") && t.category?.toLowerCase().includes("digital") && t.category?.toLowerCase().includes("one")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_capex_architecture_onetime") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("capex") && t.category?.toLowerCase().includes("architecture") && t.category?.toLowerCase().includes("one")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_capex_digital") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("capex") && t.category?.toLowerCase().includes("digital") && !t.category?.toLowerCase().includes("one")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_capex_architecture") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("capex") && t.category?.toLowerCase().includes("architecture") && !t.category?.toLowerCase().includes("one")).reduce((sum, t) => sum + (t.amount || 0), 0);
      }
      
      else if (row.id === "exp_opex_rent") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("rent")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_opex_maintenance") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("maintenance")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_opex_electricity") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("electricity")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_opex_internet") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && (t.category?.toLowerCase().includes("internet") || t.category?.toLowerCase().includes("communication"))).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_opex_refreshments") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("refreshment")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_opex_cleaning") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("cleaning")).reduce((sum, t) => sum + (t.amount || 0), 0);
      }
      
      else if (row.id === "exp_salary_current") computed[row.id] = payroll;
      else if (row.id === "exp_salary_new") computed[row.id] = newHiresPayroll;
      
      else if (row.id === "exp_mkt_digital") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("marketing") && t.category?.toLowerCase().includes("digital")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_mkt_collab") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("collaboration")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_ops_misc") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("miscellaneous")).reduce((sum, t) => sum + (t.amount || 0), 0);
      } else if (row.id === "exp_ops_travel") {
        computed[row.id] = monthlyTxs.filter((t) => t.type === "debit" && t.category?.toLowerCase().includes("travel")).reduce((sum, t) => sum + (t.amount || 0), 0);
      }
      
      else if (row.id === "cf_opening") {
        // Find previous month closing
        const prevMonthStr = getPreviousMonthString(selectedMonth);
        const prevMonthTxs = transactions.filter((t) => t.date && t.date.substring(0, 7) === prevMonthStr);
        const prevCredits = prevMonthTxs.filter((t) => t.type === "credit").reduce((sum, t) => sum + (t.amount || 0), 0);
        const prevDebits = prevMonthTxs.filter((t) => t.type === "debit").reduce((sum, t) => sum + (t.amount || 0), 0);
        computed[row.id] = prevCredits - prevDebits;
      }
      else if (row.id === "cf_cash") {
        // Simply filter cash ledger transactions of target month
        computed[row.id] = monthlyTxs.filter((t) => t.paymentMethod?.toLowerCase() === "cash").reduce((sum, t) => sum + (t.type === "credit" ? t.amount : -t.amount), 0);
      }
      
      // Staffing actual counts
      else if (row.id === "stf_devs") computed[row.id] = devs;
      else if (row.id === "stf_creative") computed[row.id] = creative;
      else if (row.id === "stf_mkt") computed[row.id] = mkt;
      else if (row.id === "stf_bde") computed[row.id] = bde;
      else if (row.id === "stf_call") computed[row.id] = call;
      else if (row.id === "stf_qa") computed[row.id] = qa;
      else if (row.id === "stf_hr") computed[row.id] = hr;
      else if (row.id === "stf_open") computed[row.id] = jobOpenings.filter((job) => (job.status || "").toLowerCase() === "active").length;
      else if (row.id === "stf_payroll") computed[row.id] = payroll;
      
      // Assets counts
      else if (row.id === "ast_phy_ac") computed[row.id] = ac;
      else if (row.id === "ast_phy_chair") computed[row.id] = chair;
      else if (row.id === "ast_phy_table") computed[row.id] = table;
      else if (row.id === "ast_phy_fans") computed[row.id] = fans;
      else if (row.id === "ast_phy_cards") computed[row.id] = cards;
      else if (row.id === "ast_phy_tv") computed[row.id] = tv;
      
      else if (row.id === "ast_dig_cpu") computed[row.id] = cpu;
      else if (row.id === "ast_dig_display") computed[row.id] = display;
      else if (row.id === "ast_dig_keyboard") computed[row.id] = keyboard;
      else if (row.id === "ast_dig_phone") computed[row.id] = phone;
      else if (row.id === "ast_dig_headset") computed[row.id] = headset;
      else if (row.id === "ast_dig_laptop") computed[row.id] = laptop;
      
      else if (row.id === "ast_sw_chatgpt_go") computed[row.id] = sw_chatgpt_go;
      else if (row.id === "ast_sw_google_ai") computed[row.id] = sw_google_ai;
      else if (row.id === "ast_sw_heygen") computed[row.id] = sw_heygen;
      else if (row.id === "ast_sw_vasyerp") computed[row.id] = sw_vasyerp;
      else if (row.id === "ast_sw_filmora") computed[row.id] = sw_filmora;
      else if (row.id === "ast_sw_suno_ai") computed[row.id] = sw_suno_ai;
      else if (row.id === "ast_sw_vps") computed[row.id] = sw_vps;
      else if (row.id === "ast_sw_chatgpt_plus") computed[row.id] = sw_chatgpt_plus;
    });

    // Calculate actual formulas
    for (let pass = 0; pass < 3; pass++) {
      rows.forEach((row) => {
        if (row.type === "formula" && row.formula) {
          computed[row.id] = row.formula(computed);
        }
      });
    }

    return computed;
  }, [transactions, employees, assets, jobOpenings, selectedMonth, rows]);

  // Plan Values including evaluated formulas
  const evaluatedPlanValues = useMemo(() => {
    const computed = { ...planValues };
    for (let pass = 0; pass < 3; pass++) {
      rows.forEach((row) => {
        if (row.type === "formula" && row.formula) {
          computed[row.id] = row.formula(computed);
        }
      });
    }
    return computed;
  }, [planValues, rows]);

  // Group by category
  const groupedRows = useMemo(() => {
    const groups: Record<string, RowDefinition[]> = {};
    rows.forEach((row) => {
      if (!groups[row.category]) {
        groups[row.category] = [];
      }
      groups[row.category].push(row);
    });
    return groups;
  }, [rows]);

  // Export to Excel-like CSV format
  const handleExportCSV = () => {
    const headers = ["Category", "Sub-Category", "Metric", "Unit", `${selectedMonth} Plan`, `${selectedMonth} Actual`, "Variance"];
    const rowsList: any[] = [];

    Object.entries(groupedRows).forEach(([categoryName, items]) => {
      rowsList.push([categoryName.toUpperCase(), "", "", "", "", "", ""]);
      items.forEach((row) => {
        const plan = evaluatedPlanValues[row.id] || 0;
        const actual = actualValues[row.id] || 0;
        let variance = "-";
        if (row.unit === "INR" || row.unit === "Number") {
          const numPlan = parseFloat(plan) || 0;
          const numActual = parseFloat(actual) || 0;
          variance = String(numActual - numPlan);
        }
        rowsList.push([
          row.category,
          row.subCategory,
          row.metric,
          row.type === "select" ? (evaluatedPlanValues[row.id] || "Active") : row.unit,
          plan,
          actual,
          variance,
        ]);
      });
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rowsList.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Finance_Summary_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger details view when clicking/hovering details cells
  const handleDrilldown = (row: RowDefinition) => {
    if (row.category === "STAFFING" && row.subCategory === "Headcount") {
      let filtered = employees;
      if (row.id !== "stf_total_team") {
        const keyword = row.metric.toLowerCase().replace("team", "").replace("size", "").trim();
        filtered = employees.filter((emp) => {
          const dept = (emp.department || "").toLowerCase();
          return dept.includes(keyword);
        });
      }
      setModalTitle(`Active Employees - ${row.metric}`);
      setModalData(filtered);
      setModalType("employees");
      setActiveModal(row.id);
    } else if (row.id === "stf_payroll" || row.id === "exp_salary_current") {
      setModalTitle(`Salaried Employees & Joining Dates`);
      setModalData(employees);
      setModalType("employees");
      setActiveModal(row.id);
    } else if (row.id === "stf_open") {
      setModalTitle("Active Recruitment Vacancies");
      setModalData(jobOpenings.filter((j) => (j.status || "").toLowerCase() === "active"));
      setModalType("jobs");
      setActiveModal(row.id);
    } else if (row.category === "ASSETS") {
      const keyword = row.metric.toLowerCase().trim();
      const filtered = assets.filter((ast) => {
        const text = `${ast.name} ${ast.category}`.toLowerCase();
        return text.includes(keyword);
      });
      setModalTitle(`Asset Registry - ${row.metric}`);
      setModalData(filtered);
      setModalType("assets");
      setActiveModal(row.id);
    } else if (row.type === "multiple") {
      const items = planValues[row.id];
      if (Array.isArray(items)) {
        setModalTitle(`Planned Cost Items - ${row.metric}`);
        setModalData(items);
        setModalType("multi_plan");
        setActiveModal(row.id);
      } else {
        toast.info("No planned item breakdowns configured for this metric");
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        title="Finance & Operational Summary"
        description="Spreadsheet-style summary comparing targets against computed database actuals"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-xs font-bold text-slate-700">
            <CalendarIcon className="w-4 h-4 text-[#cc0000]" />
            <span>Select Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer font-extrabold text-[#cc0000]"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (existingCategories.length > 0 && !formCategory) {
                setFormCategory(existingCategories[0]);
              } else if (existingCategories.length === 0) {
                setFormCategory("CUSTOM");
              }
              setIsAddRowOpen(true);
            }}
            className="h-9 font-bold border-blue-600 text-blue-600 hover:bg-blue-50 shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRestoreDefaults}
            className="h-9 font-bold border-slate-300 text-slate-600 hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Restore Defaults
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="h-9 font-bold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-[#cc0000]" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#cc0000]" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Info className="w-4 h-4 text-[#cc0000]" />
            <span>Hover or click highlighted values (e.g., Headcount, Assets, OPEX Items) to view live employee listings, vacancies, or planned item breakdowns.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
              <thead className="bg-[#cc0000] text-white font-extrabold uppercase border-b border-red-800">
                <tr>
                  <th className="px-4 py-3 border-r border-red-800/30">Category</th>
                  <th className="px-4 py-3 border-r border-red-800/30">Sub-Category</th>
                  <th className="px-4 py-3 border-r border-red-800/30">Metric</th>
                  <th className="px-4 py-3 border-r border-red-800/30">Unit</th>
                  <th className="px-4 py-3 text-right border-r border-red-800/30 w-[180px]">{selectedMonth} Plan</th>
                  <th className="px-4 py-3 text-right border-r border-red-800/30 w-[180px]">{selectedMonth} Actual</th>
                  <th className="px-4 py-3 text-right border-r border-red-800/30 w-[150px]">Variance</th>
                  <th className="px-4 py-3 w-[60px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.entries(groupedRows).map(([categoryName, rows]) => (
                  <React.Fragment key={categoryName}>
                    <tr className="bg-slate-100/90 font-extrabold text-slate-700">
                      <td colSpan={8} className="px-4 py-2 uppercase tracking-wide border-y border-slate-300">
                        {categoryName}
                      </td>
                    </tr>

                    {rows.map((row) => {
                      const isTotal = row.subCategory.toLowerCase() === "total" ||
                                      row.metric.toLowerCase().includes("total") ||
                                      row.subCategory === "MO Total" ||
                                      row.subCategory === "EBITDA";

                      const planVal = evaluatedPlanValues[row.id];
                      const actualVal = actualValues[row.id];

                      let varianceVal: any = "-";
                      let varianceColor = "text-slate-500";
                      
                      if (row.unit === "INR" || row.unit === "Number") {
                        const pNum = parseFloat(planVal) || 0;
                        const aNum = parseFloat(actualVal) || 0;
                        const diff = aNum - pNum;
                        varianceVal = diff;

                        if (row.category === "FINANCIAL - REVENUE" || row.id === "prof_ebitda") {
                          varianceColor = diff >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold";
                        } else {
                          varianceColor = diff <= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold";
                        }
                      }

                      const isDrillable = row.category === "STAFFING" || 
                                          row.category === "ASSETS" || 
                                          row.id === "exp_salary_current" ||
                                          row.type === "multiple";

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isTotal ? "font-bold bg-slate-50/70 text-slate-900" : "text-slate-600"
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium border-r border-slate-100 text-[10px] text-slate-400 uppercase tracking-wide">
                            {row.category}
                          </td>
                          <td className="px-4 py-2.5 font-semibold border-r border-slate-100 text-slate-800">
                            {row.subCategory}
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-100 font-medium">
                            {row.metric}
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-100 font-bold text-slate-500">
                            {row.type === "select" ? (planVal || "Active") : row.unit}
                          </td>
                          
                          <td className="px-4 py-2.5 text-right border-r border-slate-100 font-bold text-slate-800">
                            {row.type === "multiple" && Array.isArray(planVal) ? (
                              <button
                                onClick={() => handleDrilldown(row)}
                                className="underline hover:text-[#cc0000] text-blue-600 flex items-center gap-1 ml-auto text-right"
                              >
                                {formatVal(planVal.reduce((sum: number, it: any) => sum + (parseFloat(it.qty) * parseFloat(it.rate) || 0), 0), row.unit)}
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              formatVal(planVal, row.unit)
                            )}
                          </td>

                          <td className={`px-4 py-2.5 text-right border-r border-slate-100 font-extrabold ${isDrillable ? "text-blue-600 hover:underline cursor-pointer" : "text-slate-950"}`}
                              onClick={() => isDrillable && handleDrilldown(row)}>
                            <div className="flex items-center justify-end gap-1">
                              {formatVal(actualVal, row.unit)}
                              {isDrillable && <Eye className="w-3 h-3 text-blue-400" />}
                            </div>
                          </td>

                          <td className={`px-4 py-2.5 text-right ${varianceColor}`}>
                            {typeof varianceVal === "number" ? (
                              <>
                                {varianceVal > 0 ? "+" : ""}
                                {formatVal(varianceVal, row.unit)}
                              </>
                            ) : (
                              varianceVal
                            )}
                          </td>
                          <td className="px-4 py-1.5 text-center w-[60px]">
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drilldown Modal dialogs */}
      <Dialog open={activeModal !== null} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#cc0000] text-xl font-bold flex items-center gap-2">
              {modalType === "employees" && <Users className="w-5 h-5" />}
              {modalType === "jobs" && <Briefcase className="w-5 h-5" />}
              {modalType === "assets" && <Laptop className="w-5 h-5" />}
              {modalType === "multi_plan" && <Coins className="w-5 h-5" />}
              {modalTitle}
            </DialogTitle>
            <DialogDescription>
              Drilldown list of matching records currently stored in the system.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {modalType === "employees" && (
              <div className="border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b font-bold text-slate-700">
                    <tr>
                      <th className="p-3">Employee Code</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Join Date</th>
                      <th className="p-3 text-right">Salary</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600">
                    {modalData.map((emp, i) => (
                      <tr key={emp._id || emp.id || i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{emp.employeeCode || emp.code || "-"}</td>
                        <td className="p-3">{emp.name || emp.fullName || "-"}</td>
                        <td className="p-3 capitalize">{emp.department || "-"}</td>
                        <td className="p-3">{emp.joinDate ? new Date(emp.joinDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-"}</td>
                        <td className="p-3 text-right font-bold text-slate-900">₹{parseFloat(emp.salary || 0).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {modalData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">No active employees found in this criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {modalType === "jobs" && (
              <div className="border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b font-bold text-slate-700">
                    <tr>
                      <th className="p-3">Job Title</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Total Openings</th>
                      <th className="p-3">Experience</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600">
                    {modalData.map((job, i) => (
                      <tr key={job._id || job.id || i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{job.title || "-"}</td>
                        <td className="p-3 capitalize">{job.department || "-"}</td>
                        <td className="p-3 font-bold">{job.vacancies || 1}</td>
                        <td className="p-3">{job.experience || "Not specified"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            job.priority === "High" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {job.priority || "Medium"}
                          </span>
                        </td>
                        <td className="p-3 capitalize">{job.status}</td>
                      </tr>
                    ))}
                    {modalData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">No active job openings found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {modalType === "assets" && (
              <div className="border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b font-bold text-slate-700">
                    <tr>
                      <th className="p-3">Asset Code</th>
                      <th className="p-3">Asset Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Serial / ID</th>
                      <th className="p-3 text-right">Value / Cost</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600">
                    {modalData.map((ast, i) => (
                      <tr key={ast._id || ast.id || i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{ast.assetCode || ast.code || "-"}</td>
                        <td className="p-3">{ast.name || "-"}</td>
                        <td className="p-3 capitalize">{ast.category || "-"}</td>
                        <td className="p-3">{ast.serialNumber || "-"}</td>
                        <td className="p-3 text-right font-bold text-slate-900">₹{parseFloat(ast.value || ast.cost || 0).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ast.status === "active" || ast.status === "Allocated" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {ast.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {modalData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">No matching assets in stock.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {modalType === "multi_plan" && (
              <div className="border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b font-bold text-slate-700">
                    <tr>
                      <th className="p-3">Item Description</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Rate (INR)</th>
                      <th className="p-3 text-right">Total Planned Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600">
                    {modalData.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{item.description}</td>
                        <td className="p-3 text-right">{item.qty}</td>
                        <td className="p-3 text-right">₹{parseFloat(item.rate || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-extrabold text-slate-900">
                          ₹{(parseFloat(item.qty || 0) * parseFloat(item.rate || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {modalData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">No planned items found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* --- ADD ROW POPUP DIALOG --- */}
      <Dialog open={isAddRowOpen} onOpenChange={setIsAddRowOpen}>
        <DialogContent className="max-w-md bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Add Category/Row
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define a new category, sub-category, or custom financial/operational metric.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRowSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-9 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="CUSTOM">+ Create Custom Category...</option>
              </select>
            </div>

            {formCategory === "CUSTOM" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Custom Category Name</label>
                <Input
                  required
                  placeholder="e.g. OPERATIONAL EXPENSES"
                  value={formCustomCategory}
                  onChange={(e) => setFormCustomCategory(e.target.value)}
                  className="h-9 font-semibold text-slate-700 bg-white border-slate-200 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sub-Category</label>
              <Input
                required
                placeholder="e.g. Digital Marketing, SaaS, Office Rent"
                value={formSubCategory}
                onChange={(e) => setFormSubCategory(e.target.value)}
                className="h-9 font-semibold text-slate-700 bg-white border-slate-200 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Metric / Item Name</label>
              <Input
                required
                placeholder="e.g. Facebook Ads, Google Suite, Internet"
                value={formMetric}
                onChange={(e) => setFormMetric(e.target.value)}
                className="h-9 font-semibold text-slate-700 bg-white border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Unit</label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full h-9 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="INR">INR (Currency)</option>
                  <option value="Number">Number (Count)</option>
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Active">Active/Inactive</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Entry Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full h-9 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="field">Single Value Input</option>
                  <option value="multiple">Itemized List (Quantity & Rate)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddRowOpen(false)}
                className="font-bold border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add Category/Row
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
