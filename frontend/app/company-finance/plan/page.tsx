"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { API_URL } from "@/lib/config";
import {
  Save,
  Loader2,
  Calendar as CalendarIcon,
  Info,
  Plus,
  Trash2,
  ListPlus,
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

interface MultipleItem {
  description: string;
  qty: string;
  rate: string;
}

interface RowDefinition {
  id: string;
  category: string;
  subCategory: string;
  metric: string;
  unit: string;
  type: "field" | "formula" | "select" | "multiple";
  formula?: (vals: Record<string, any>) => number | string;
  options?: string[];
  isHeader?: boolean;
}

// Utility to sum values. Handles both numeric inputs and array of items
const getRowSum = (id: string, values: Record<string, any>) => {
  const val = values[id];
  if (Array.isArray(val)) {
    return val.reduce((sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0), 0);
  }
  return parseFloat(val) || 0;
};

const PLAN_ROWS: RowDefinition[] = [
  // FINANCIAL - REVENUE
  { id: "rev_bef_revenue", category: "FINANCIAL - REVENUE", subCategory: "BEF", metric: "Monthly Revenue", unit: "INR", type: "field" },
  { id: "rev_bef_acquisitions", category: "FINANCIAL - REVENUE", subCategory: "BEF", metric: "Customer Acquisitions", unit: "Number", type: "field" },
  { id: "rev_bef_avg_rev", category: "FINANCIAL - REVENUE", subCategory: "BEF", metric: "Avg Revenue per Customer", unit: "INR", type: "formula",
    formula: (v) => {
      const rev = getRowSum("rev_bef_revenue", v);
      const acq = getRowSum("rev_bef_acquisitions", v);
      return acq > 0 ? (rev / acq).toFixed(2) : 0;
    }
  },
  { id: "rev_erp_revenue", category: "FINANCIAL - REVENUE", subCategory: "AI ERP", metric: "Monthly Revenue", unit: "INR", type: "field" },
  { id: "rev_erp_acquisitions", category: "FINANCIAL - REVENUE", subCategory: "AI ERP", metric: "Customer Acquisitions", unit: "Number", type: "field" },
  { id: "rev_erp_avg_rev", category: "FINANCIAL - REVENUE", subCategory: "AI ERP", metric: "Avg Revenue per Customer", unit: "INR", type: "formula",
    formula: (v) => {
      const rev = getRowSum("rev_erp_revenue", v);
      const acq = getRowSum("rev_erp_acquisitions", v);
      return acq > 0 ? (rev / acq).toFixed(2) : 0;
    }
  },
  { id: "rev_course_revenue", category: "FINANCIAL - REVENUE", subCategory: "HK Course/Client", metric: "Monthly Revenue", unit: "INR", type: "field" },
  { id: "rev_course_acquisitions", category: "FINANCIAL - REVENUE", subCategory: "HK Course/Client", metric: "Customer Acquisitions", unit: "Number", type: "field" },
  { id: "rev_course_avg_rev", category: "FINANCIAL - REVENUE", subCategory: "HK Course/Client", metric: "Avg Revenue per Customer", unit: "INR", type: "formula",
    formula: (v) => {
      const rev = getRowSum("rev_course_revenue", v);
      const acq = getRowSum("rev_course_acquisitions", v);
      return acq > 0 ? (rev / acq).toFixed(2) : 0;
    }
  },
  { id: "rev_combined", category: "FINANCIAL - REVENUE", subCategory: "Total", metric: "Combined Revenue", unit: "INR", type: "formula",
    formula: (v) => {
      return getRowSum("rev_bef_revenue", v) + getRowSum("rev_erp_revenue", v) + getRowSum("rev_course_revenue", v);
    }
  },
  { id: "rev_total_customers", category: "FINANCIAL - REVENUE", subCategory: "Total", metric: "Total Customer Base", unit: "Number", type: "formula",
    formula: (v) => {
      return getRowSum("rev_bef_acquisitions", v) + getRowSum("rev_erp_acquisitions", v) + getRowSum("rev_course_acquisitions", v);
    }
  },

  // FINANCIAL - EXPENSES
  { id: "exp_capex_digital_onetime", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Digital Assets (One-time)", unit: "INR", type: "multiple" },
  { id: "exp_capex_architecture_onetime", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Architecture & Facilities (One-time)", unit: "INR", type: "multiple" },
  { id: "exp_capex_digital", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Digital Assets", unit: "INR", type: "multiple" },
  { id: "exp_capex_architecture", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Architecture & Facilities", unit: "INR", type: "multiple" },
  { id: "exp_capex_total", category: "FINANCIAL - EXPENSES", subCategory: "CAPEX", metric: "Total CAPEX", unit: "INR", type: "formula",
    formula: (v) => {
      return getRowSum("exp_capex_digital_onetime", v) + getRowSum("exp_capex_architecture_onetime", v) + getRowSum("exp_capex_digital", v) + getRowSum("exp_capex_architecture", v);
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
      return getRowSum("exp_opex_rent", v) + getRowSum("exp_opex_maintenance", v) + getRowSum("exp_opex_electricity", v) + getRowSum("exp_opex_internet", v) + getRowSum("exp_opex_refreshments", v) + getRowSum("exp_opex_cleaning", v);
    }
  },
  { id: "exp_salary_current", category: "FINANCIAL - EXPENSES", subCategory: "Salary", metric: "Current Team Salaries", unit: "INR", type: "field" },
  { id: "exp_salary_new", category: "FINANCIAL - EXPENSES", subCategory: "Salary", metric: "New Hires Salaries", unit: "INR", type: "field" },
  { id: "exp_salary_total", category: "FINANCIAL - EXPENSES", subCategory: "Salary", metric: "Total Payroll", unit: "INR", type: "formula",
    formula: (v) => {
      return getRowSum("exp_salary_current", v) + getRowSum("exp_salary_new", v);
    }
  },
  { id: "exp_mkt_digital", category: "FINANCIAL - EXPENSES", subCategory: "Marketing", metric: "Digital Marketing Spend", unit: "INR", type: "multiple" },
  { id: "exp_mkt_collab", category: "FINANCIAL - EXPENSES", subCategory: "Marketing", metric: "Collaborations", unit: "INR", type: "multiple" },
  { id: "exp_ops_misc", category: "FINANCIAL - EXPENSES", subCategory: "Operations", metric: "Miscellaneous", unit: "INR", type: "multiple" },
  { id: "exp_ops_travel", category: "FINANCIAL - EXPENSES", subCategory: "Operations", metric: "Travel & Conveyance", unit: "INR", type: "multiple" },
  { id: "exp_mo_total", category: "FINANCIAL - EXPENSES", subCategory: "MO Total", metric: "Marketing+Operations", unit: "INR", type: "formula",
    formula: (v) => {
      const mkt = getRowSum("exp_mkt_digital", v) + getRowSum("exp_mkt_collab", v);
      const ops = getRowSum("exp_ops_misc", v) + getRowSum("exp_ops_travel", v);
      return mkt + ops;
    }
  },
  { id: "exp_total", category: "FINANCIAL - EXPENSES", subCategory: "Total Expenses", metric: "Monthly Total", unit: "INR", type: "formula",
    formula: (v) => {
      const capex = getRowSum("exp_capex_digital_onetime", v) + getRowSum("exp_capex_architecture_onetime", v) + getRowSum("exp_capex_digital", v) + getRowSum("exp_capex_architecture", v);
      const fixedOpex = getRowSum("exp_opex_total", v);
      const payroll = getRowSum("exp_salary_current", v) + getRowSum("exp_salary_new", v);
      const mkt = getRowSum("exp_mkt_digital", v) + getRowSum("exp_mkt_collab", v);
      const ops = getRowSum("exp_ops_misc", v) + getRowSum("exp_ops_travel", v);
      return capex + fixedOpex + payroll + mkt + ops;
    }
  },

  // FINANCIAL - PROFITABILITY
  { id: "prof_ebitda", category: "FINANCIAL - PROFITABILITY", subCategory: "EBITDA", metric: "Monthly EBITDA (Revenue-Expenses)", unit: "INR", type: "formula",
    formula: (v) => {
      const revCombined = getRowSum("rev_bef_revenue", v) + getRowSum("rev_erp_revenue", v) + getRowSum("rev_course_revenue", v);
      const expTotal = getRowSum("exp_capex_digital_onetime", v) + getRowSum("exp_capex_architecture_onetime", v) + getRowSum("exp_capex_digital", v) + getRowSum("exp_capex_architecture", v) +
                       getRowSum("exp_opex_rent", v) + getRowSum("exp_opex_maintenance", v) + getRowSum("exp_opex_electricity", v) + getRowSum("exp_opex_internet", v) + getRowSum("exp_opex_refreshments", v) + getRowSum("exp_opex_cleaning", v) +
                       getRowSum("exp_salary_current", v) + getRowSum("exp_salary_new", v) +
                       getRowSum("exp_mkt_digital", v) + getRowSum("exp_mkt_collab", v) +
                       getRowSum("exp_ops_misc", v) + getRowSum("exp_ops_travel", v);
      return revCombined - expTotal;
    }
  },

  // FINANCIAL - CASH FLOW
  { id: "cf_opening", category: "FINANCIAL - CASH FLOW", subCategory: "Bank Balance", metric: "Opening Balance", unit: "INR", type: "field" },
  { id: "cf_closing", category: "FINANCIAL - CASH FLOW", subCategory: "Bank Balance", metric: "Closing Balance", unit: "INR", type: "formula",
    formula: (v) => {
      const opening = getRowSum("cf_opening", v);
      const revCombined = getRowSum("rev_bef_revenue", v) + getRowSum("rev_erp_revenue", v) + getRowSum("rev_course_revenue", v);
      const expTotal = getRowSum("exp_capex_digital_onetime", v) + getRowSum("exp_capex_architecture_onetime", v) + getRowSum("exp_capex_digital", v) + getRowSum("exp_capex_architecture", v) +
                       getRowSum("exp_opex_rent", v) + getRowSum("exp_opex_maintenance", v) + getRowSum("exp_opex_electricity", v) + getRowSum("exp_opex_internet", v) + getRowSum("exp_opex_refreshments", v) + getRowSum("exp_opex_cleaning", v) +
                       getRowSum("exp_salary_current", v) + getRowSum("exp_salary_new", v) +
                       getRowSum("exp_mkt_digital", v) + getRowSum("exp_mkt_collab", v) +
                       getRowSum("exp_ops_misc", v) + getRowSum("exp_ops_travel", v);
      return opening + revCombined - expTotal;
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
      return getRowSum("stf_devs", v) + getRowSum("stf_creative", v) + getRowSum("stf_mkt", v) + getRowSum("stf_bde", v) + getRowSum("stf_call", v) + getRowSum("stf_qa", v) + getRowSum("stf_hr", v);
    }
  },
  { id: "stf_open", category: "STAFFING", subCategory: "Recruitment", metric: "Open Positions", unit: "Number", type: "field" },
  { id: "stf_payroll", category: "STAFFING", subCategory: "Payroll", metric: "Monthly Payroll", unit: "INR", type: "field" },
  { id: "stf_avg_salary", category: "STAFFING", subCategory: "Payroll", metric: "Average Salary", unit: "INR", type: "formula",
    formula: (v) => {
      const payroll = getRowSum("stf_payroll", v);
      const size = getRowSum("stf_devs", v) + getRowSum("stf_creative", v) + getRowSum("stf_mkt", v) + getRowSum("stf_bde", v) + getRowSum("stf_call", v) + getRowSum("stf_qa", v) + getRowSum("stf_hr", v);
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

export default function CompanyFinancePlanPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });

  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "idle">("idle");

  // States for nested multiple items modal
  const [activeMultipleId, setActiveMultipleId] = useState<string | null>(null);
  const [modalItems, setModalItems] = useState<MultipleItem[]>([]);
  const [isAllMultiModalOpen, setIsAllMultiModalOpen] = useState(false);

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
    fetchMonthlyPlan();
  }, [selectedMonth]);

  const getPreviousMonthString = (monthStr: string): string => {
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 2, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, "0");
    return `${prevYear}-${prevMonth}`;
  };

  const fetchMonthlyPlan = async () => {
    try {
      setLoading(true);
      setIsInitialLoad(true);
      
      const res = await fetch(`${API_URL}/company-finance/monthly-plans/${selectedMonth}`);
      let targetValues: Record<string, any> = {};
      if (res.ok) {
        const data = await res.json();
        targetValues = data?.values || {};
      }

      // Fetch actual transactions and balances from the ledger database
      const txsRes = await fetch(`${API_URL}/company-finance/transactions`);
      const balRes = await fetch(`${API_URL}/company-finance/balances`);
      
      if (txsRes.ok && balRes.ok) {
        const txsData = await txsRes.json();
        const balancesData = await balRes.json();
        
        const allTransactions = txsData.transactions || [];
        const bankOpeningGlobal = parseFloat(balancesData.bankOpeningBalance) || 0;
        const cashOpeningGlobal = parseFloat(balancesData.cashOpeningBalance) || 0;
        
        // Define start of selected month
        const targetMonthStart = new Date(`${selectedMonth}-01T00:00:00`);
        
        let bankCreditsBefore = 0;
        let bankDebitsBefore = 0;
        let cashCreditsBefore = 0;
        let cashDebitsBefore = 0;
        
        allTransactions.forEach((tx: any) => {
          if (!tx.date) return;
          const txDate = new Date(tx.date);
          if (txDate < targetMonthStart) {
            const amount = parseFloat(tx.amount) || 0;
            const isBank = tx.paymentMethod?.toLowerCase() === "bank";
            const isCash = tx.paymentMethod?.toLowerCase() === "cash";
            
            if (isBank) {
              if (tx.type === "credit") bankCreditsBefore += amount;
              else if (tx.type === "debit") bankDebitsBefore += amount;
            } else if (isCash) {
              if (tx.type === "credit") cashCreditsBefore += amount;
              else if (tx.type === "debit") cashDebitsBefore += amount;
            }
          }
        });
        
        const actualPrevClosingBank = bankOpeningGlobal + bankCreditsBefore - bankDebitsBefore;
        const actualPrevClosingCash = cashOpeningGlobal + cashCreditsBefore - cashDebitsBefore;
        
        if (!targetValues.cf_opening) {
          targetValues.cf_opening = String(actualPrevClosingBank);
        }
        if (!targetValues.cf_cash) {
          targetValues.cf_cash = String(actualPrevClosingCash);
        }
      }

      // Fetch employees to calculate current headcount and payroll
      const empRes = await fetch(`${API_URL}/employees`);
      if (empRes.ok) {
        const employees = await empRes.json();
        
        const [targetYear, targetMonth] = selectedMonth.split("-").map(Number);
        const monthStart = new Date(targetYear, targetMonth - 1, 1);
        const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        // Filter employees expected to be active during the target month
        const activeEmployees = employees.filter((emp: any) => {
          if (emp.status === "inactive") {
            const resignationDate = emp.resignationDate ? new Date(emp.resignationDate) : null;
            if (resignationDate && resignationDate < monthStart) {
              return false;
            }
            if (!resignationDate) {
              return false;
            }
          }

          const joinDate = emp.joinDate ? new Date(emp.joinDate) : null;
          if (joinDate && joinDate > monthEnd) {
            return false;
          }

          const resignationDate = emp.resignationDate ? new Date(emp.resignationDate) : null;
          if (resignationDate && resignationDate < monthStart) {
            return false;
          }

          return true;
        });

        let devs = 0;
        let creative = 0;
        let mkt = 0;
        let bde = 0;
        let call = 0;
        let qa = 0;
        let hr = 0;
        let totalPayroll = 0;

        activeEmployees.forEach((emp: any) => {
          const dept = (emp.department || "").toLowerCase().trim();
          const salary = parseFloat(emp.salary) || 0;
          totalPayroll += salary;

          if (dept.includes("dev")) {
            devs++;
          } else if (dept.includes("creative") || dept.includes("design") || dept.includes("graphics")) {
            creative++;
          } else if (dept.includes("market") || dept.includes("mkt") || dept.includes("smm") || dept.includes("social")) {
            mkt++;
          } else if (dept.includes("bde") || dept.includes("sales") || dept.includes("business")) {
            bde++;
          } else if (dept.includes("call") || dept.includes("telecall") || dept.includes("support")) {
            call++;
          } else if (dept.includes("qa") || dept.includes("test") || dept.includes("quality")) {
            qa++;
          } else if (dept.includes("hr") || dept.includes("recruiter") || dept.includes("human")) {
            hr++;
          }
        });

        if (targetValues.stf_devs === undefined || targetValues.stf_devs === "") targetValues.stf_devs = String(devs);
        if (targetValues.stf_creative === undefined || targetValues.stf_creative === "") targetValues.stf_creative = String(creative);
        if (targetValues.stf_mkt === undefined || targetValues.stf_mkt === "") targetValues.stf_mkt = String(mkt);
        if (targetValues.stf_bde === undefined || targetValues.stf_bde === "") targetValues.stf_bde = String(bde);
        if (targetValues.stf_call === undefined || targetValues.stf_call === "") targetValues.stf_call = String(call);
        if (targetValues.stf_qa === undefined || targetValues.stf_qa === "") targetValues.stf_qa = String(qa);
        if (targetValues.stf_hr === undefined || targetValues.stf_hr === "") targetValues.stf_hr = String(hr);
        if (targetValues.stf_payroll === undefined || targetValues.stf_payroll === "") targetValues.stf_payroll = String(totalPayroll);
        if (targetValues.exp_salary_current === undefined || targetValues.exp_salary_current === "") targetValues.exp_salary_current = String(totalPayroll);
      }

      // Fetch assets to calculate physical/digital/software inventory
      const assetsRes = await fetch(`${API_URL}/assets`);
      if (assetsRes.ok) {
        const assets = await assetsRes.json();
        
        let ac = 0;
        let chair = 0;
        let table = 0;
        let fans = 0;
        let cards = 0;
        let tv = 0;
        let cpu = 0;
        let display = 0;
        let keyboard = 0;
        let phone = 0;
        let headset = 0;
        let laptop = 0;

        let sw_chatgpt_go = "Inactive";
        let sw_google_ai = "Inactive";
        let sw_heygen = "Inactive";
        let sw_vasyerp = "Inactive";
        let sw_filmora = "Inactive";
        let sw_suno_ai = "Inactive";
        let sw_vps = "Inactive";
        let sw_chatgpt_plus = "Inactive";

        assets.forEach((asset: any) => {
          const name = (asset.name || "").toLowerCase();
          const category = (asset.category || "").toLowerCase();
          const status = (asset.status || "").toLowerCase();

          const text = `${name} ${category}`;

          if (status === "maintenance") return;

          if (text.includes("air conditioner") || category === "ac" || name === "ac") {
            ac++;
          } else if (text.includes("chair")) {
            chair++;
          } else if (text.includes("table") || text.includes("desk")) {
            table++;
          } else if (text.includes("fan")) {
            fans++;
          } else if (text.includes("parking card") || (text.includes("card") && text.includes("parking"))) {
            cards++;
          } else if (text.includes("tv") || text.includes("television")) {
            tv++;
          } else if (text.includes("cpu")) {
            cpu++;
          } else if (text.includes("display") || text.includes("monitor")) {
            display++;
          } else if (text.includes("keyboard") || text.includes("mouse")) {
            keyboard++;
          } else if (text.includes("phone") || text.includes("mobile")) {
            phone++;
          } else if (text.includes("headset") || text.includes("headphone")) {
            headset++;
          } else if (text.includes("laptop")) {
            laptop++;
          }

          // Software
          if (text.includes("chatgpt go") || text.includes("chat gpt go")) {
            sw_chatgpt_go = "Active";
          } else if (text.includes("google ai")) {
            sw_google_ai = "Active";
          } else if (text.includes("heygen")) {
            sw_heygen = "Active";
          } else if (text.includes("vasyerp") || text.includes("vasy erp")) {
            sw_vasyerp = "Active";
          } else if (text.includes("filmora")) {
            sw_filmora = "Active";
          } else if (text.includes("suno")) {
            sw_suno_ai = "Active";
          } else if (text.includes("vps")) {
            sw_vps = "Active";
          } else if (text.includes("chatgpt plus") || text.includes("chat gpt plus")) {
            sw_chatgpt_plus = "Active";
          }
        });

        if (targetValues.ast_phy_ac === undefined || targetValues.ast_phy_ac === "") targetValues.ast_phy_ac = String(ac);
        if (targetValues.ast_phy_chair === undefined || targetValues.ast_phy_chair === "") targetValues.ast_phy_chair = String(chair);
        if (targetValues.ast_phy_table === undefined || targetValues.ast_phy_table === "") targetValues.ast_phy_table = String(table);
        if (targetValues.ast_phy_fans === undefined || targetValues.ast_phy_fans === "") targetValues.ast_phy_fans = String(fans);
        if (targetValues.ast_phy_cards === undefined || targetValues.ast_phy_cards === "") targetValues.ast_phy_cards = String(cards);
        if (targetValues.ast_phy_tv === undefined || targetValues.ast_phy_tv === "") targetValues.ast_phy_tv = String(tv);
        
        if (targetValues.ast_dig_cpu === undefined || targetValues.ast_dig_cpu === "") targetValues.ast_dig_cpu = String(cpu);
        if (targetValues.ast_dig_display === undefined || targetValues.ast_dig_display === "") targetValues.ast_dig_display = String(display);
        if (targetValues.ast_dig_keyboard === undefined || targetValues.ast_dig_keyboard === "") targetValues.ast_dig_keyboard = String(keyboard);
        if (targetValues.ast_dig_phone === undefined || targetValues.ast_dig_phone === "") targetValues.ast_dig_phone = String(phone);
        if (targetValues.ast_dig_headset === undefined || targetValues.ast_dig_headset === "") targetValues.ast_dig_headset = String(headset);
        if (targetValues.ast_dig_laptop === undefined || targetValues.ast_dig_laptop === "") targetValues.ast_dig_laptop = String(laptop);

        if (targetValues.ast_sw_chatgpt_go === undefined || targetValues.ast_sw_chatgpt_go === "") targetValues.ast_sw_chatgpt_go = sw_chatgpt_go;
        if (targetValues.ast_sw_google_ai === undefined || targetValues.ast_sw_google_ai === "") targetValues.ast_sw_google_ai = sw_google_ai;
        if (targetValues.ast_sw_heygen === undefined || targetValues.ast_sw_heygen === "") targetValues.ast_sw_heygen = sw_heygen;
        if (targetValues.ast_sw_vasyerp === undefined || targetValues.ast_sw_vasyerp === "") targetValues.ast_sw_vasyerp = sw_vasyerp;
        if (targetValues.ast_sw_filmora === undefined || targetValues.ast_sw_filmora === "") targetValues.ast_sw_filmora = sw_filmora;
        if (targetValues.ast_sw_suno_ai === undefined || targetValues.ast_sw_suno_ai === "") targetValues.ast_sw_suno_ai = sw_suno_ai;
        if (targetValues.ast_sw_vps === undefined || targetValues.ast_sw_vps === "") targetValues.ast_sw_vps = sw_vps;
        if (targetValues.ast_sw_chatgpt_plus === undefined || targetValues.ast_sw_chatgpt_plus === "") targetValues.ast_sw_chatgpt_plus = sw_chatgpt_plus;
      }

      setValues(targetValues);
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 300);
    } catch (err) {
      console.error("Error loading monthly plan:", err);
      toast.error("Failed to load monthly plan sheet");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, val: string) => {
    setValues((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  // Multiple Items Modal Handlers
  const handleOpenMultipleModal = (id: string) => {
    const currentVal = values[id];
    const initialItems = Array.isArray(currentVal) ? [...currentVal] : [];
    setModalItems(initialItems);
    setActiveMultipleId(id);
  };

  const handleAddModalRow = () => {
    setModalItems((prev) => [...prev, { description: "", qty: "", rate: "" }]);
  };

  const handleRemoveModalRow = (idx: number) => {
    setModalItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleModalItemChange = (idx: number, field: keyof MultipleItem, val: string) => {
    setModalItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveModalItems = () => {
    if (activeMultipleId) {
      setValues((prev) => ({
        ...prev,
        [activeMultipleId]: modalItems.filter((item) => item.description.trim() !== ""),
      }));
    }
    setActiveMultipleId(null);
  };

  const autoSave = async (currentValues: Record<string, any>) => {
    try {
      setSaveStatus("saving");
      const res = await fetch(`${API_URL}/company-finance/monthly-plans/${selectedMonth}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: currentValues }),
      });
      if (res.ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("unsaved");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("unsaved");
    }
  };

  useEffect(() => {
    if (loading || isInitialLoad) return;

    setSaveStatus("unsaved");
    const timer = setTimeout(() => {
      autoSave(values);
    }, 2000);

    return () => clearTimeout(timer);
  }, [values, loading, isInitialLoad]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus("saving");
      const res = await fetch(`${API_URL}/company-finance/monthly-plans/${selectedMonth}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (res.ok) {
        toast.success("Plan saved successfully!");
        setSaveStatus("saved");
      } else {
        toast.error("Failed to save plan");
        setSaveStatus("unsaved");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving plan");
      setSaveStatus("unsaved");
    } finally {
      setSaving(false);
    }
  };

  const computedValues = useMemo(() => {
    const computed: Record<string, any> = { ...values };
    for (let pass = 0; pass < 3; pass++) {
      PLAN_ROWS.forEach((row) => {
        if (row.type === "formula" && row.formula) {
          computed[row.id] = row.formula(computed);
        }
      });
    }
    return computed;
  }, [values]);

  const activeRowDetails = useMemo(() => {
    if (!activeMultipleId) return null;
    return PLAN_ROWS.find((row) => row.id === activeMultipleId) || null;
  }, [activeMultipleId]);

  const modalTotal = useMemo(() => {
    return modalItems.reduce(
      (sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0),
      0
    );
  }, [modalItems]);

  const groupedRows = useMemo(() => {
    const groups: Record<string, RowDefinition[]> = {};
    PLAN_ROWS.forEach((row) => {
      if (!groups[row.category]) {
        groups[row.category] = [];
      }
      groups[row.category].push(row);
    });
    return groups;
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        title="Interactive Planning Sheet"
        description="Configure target metric values, budget caps, headcounts, and software assets"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-xs font-bold text-slate-700">
            <CalendarIcon className="w-4 h-4 text-brand-teal" />
            <span>Target Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer font-extrabold text-brand-teal"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {saveStatus === "saving" && (
            <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1.5 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-teal" />
              Saving changes...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-1.5 shadow-sm">
              ✓ All changes saved
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="text-[11px] text-amber-500 font-bold flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-1.5 shadow-sm">
              ⚠ Unsaved changes
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAllMultiModalOpen(true)}
            disabled={loading}
            className="h-9 font-bold border-brand-teal text-brand-teal hover:bg-brand-light shadow-sm flex items-center gap-1.5"
          >
            <ListPlus className="w-4 h-4" />
            All Multi-Entries
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="h-9 font-bold bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Plan
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Fields marked with count or totals are automatically calculated. Click 'Manage Items' to enter multiple line items.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
              <thead className="bg-[#cc0000] text-white font-extrabold uppercase border-b border-red-800">
                <tr>
                  <th className="px-4 py-3 border-r border-red-800/30">Category</th>
                  <th className="px-4 py-3 border-r border-red-800/30">Sub-Category</th>
                  <th className="px-4 py-3 border-r border-red-800/30">Metric</th>
                  <th className="px-4 py-3 border-r border-red-800/30">Unit</th>
                  <th className="px-4 py-3 w-[240px] text-right">Plan Target Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.entries(groupedRows).map(([categoryName, rows]) => (
                  <React.Fragment key={categoryName}>
                    <tr className="bg-slate-100/90 font-extrabold text-slate-700">
                      <td colSpan={5} className="px-4 py-2 uppercase tracking-wide border-y border-slate-300">
                        {categoryName}
                      </td>
                    </tr>

                    {rows.map((row) => {
                      const isFormula = row.type === "formula";
                      const isTotal = row.subCategory.toLowerCase() === "total" || row.metric.toLowerCase().startsWith("total") || row.subCategory === "MO Total" || row.subCategory === "EBITDA";
                      
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/50 transition-colors ${
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
                            {row.type === "select" ? (values[row.id] || "Active") : row.unit}
                          </td>
                          <td className="px-4 py-1.5 text-right w-[240px]">
                            {row.type === "field" && (
                              <Input
                                type="number"
                                step="any"
                                value={values[row.id] || ""}
                                onChange={(e) => handleInputChange(row.id, e.target.value)}
                                className="h-8 text-right font-bold text-slate-800 bg-white max-w-[200px] ml-auto border-slate-300/80 rounded-lg text-xs"
                                placeholder="Enter value..."
                              />
                            )}

                            {row.type === "select" && (
                              <select
                                value={values[row.id] || "Active"}
                                onChange={(e) => handleInputChange(row.id, e.target.value)}
                                className="h-8 font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-xs px-2.5 max-w-[200px] w-full ml-auto focus:outline-none focus:ring-1 focus:ring-brand-teal"
                              >
                                {row.options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}

                            {row.type === "multiple" && (
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-extrabold text-slate-700 text-xs">
                                  ₹{getRowSum(row.id, values).toLocaleString("en-IN")}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenMultipleModal(row.id)}
                                  className="h-8 text-[11px] font-bold border-brand-teal text-brand-teal hover:bg-brand-light flex items-center gap-1"
                                >
                                  <ListPlus className="w-3.5 h-3.5" />
                                  Manage ({Array.isArray(values[row.id]) ? values[row.id].length : 0})
                                </Button>
                              </div>
                            )}

                            {isFormula && (
                              <span className={`text-sm font-extrabold ${isTotal ? "text-emerald-700" : "text-slate-700"}`}>
                                {row.unit === "INR" ? "₹" : ""}
                                {Number(computedValues[row.id] || 0).toLocaleString("en-IN")}
                              </span>
                            )}
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

      {/* --- MULTIPLE ITEMS POPUP DIALOG --- */}
      <Dialog open={activeMultipleId !== null} onOpenChange={(open) => !open && setActiveMultipleId(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50">
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-brand-teal" />
              Manage Items: {activeRowDetails?.metric}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add multiple items with descriptions, quantities, and rates. The estimated total amount will update automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 max-h-[380px] overflow-y-auto space-y-4">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="pb-2 w-[45%]">Description</th>
                  <th className="pb-2 w-[15%] text-right">Qty</th>
                  <th className="pb-2 w-[20%] text-right">Rate (L1)</th>
                  <th className="pb-2 w-[20%] text-right">Est. Amount</th>
                  <th className="pb-2 w-[10%] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modalItems.map((item, idx) => {
                  const amt = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 pr-2">
                        <Input
                          placeholder="e.g. Mobile phone for BDE"
                          value={item.description}
                          onChange={(e) => handleModalItemChange(idx, "description", e.target.value)}
                          className="h-8 font-semibold text-slate-700 bg-white border-slate-200 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.qty}
                          onChange={(e) => handleModalItemChange(idx, "qty", e.target.value)}
                          className="h-8 text-right font-bold text-slate-700 bg-white border-slate-200 text-xs w-20 ml-auto"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => handleModalItemChange(idx, "rate", e.target.value)}
                          className="h-8 text-right font-bold text-slate-700 bg-white border-slate-200 text-xs w-28 ml-auto"
                        />
                      </td>
                      <td className="py-2 pl-2 text-right font-extrabold text-slate-800">
                        ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveModalRow(idx)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {modalItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      No items added yet. Click "+ Add Row" below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddModalRow}
              className="w-full h-9 font-bold border-dashed border-brand-teal text-brand-teal hover:bg-brand-light flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Row
            </Button>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wide">
              Estimated Total Amount
            </span>
            <span className="font-black text-emerald-700 text-base">
              ₹{modalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-slate-100 bg-slate-50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveMultipleId(null)}
              className="font-bold border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveModalItems}
              className="font-bold bg-brand-teal hover:bg-brand-teal/90 text-white"
            >
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ALL MULTI-ENTRIES POPUP DIALOG --- */}
      <Dialog open={isAllMultiModalOpen} onOpenChange={setIsAllMultiModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white max-h-[85vh] flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-brand-teal" />
              All Multi-Entry Items Summary
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Overview of all categorized multi-entry items for {selectedMonth}.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {PLAN_ROWS.filter((row) => row.type === "multiple").map((row) => {
              const items: MultipleItem[] = Array.isArray(values[row.id]) ? values[row.id] : [];
              const total = items.reduce(
                (sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0),
                0
              );

              return (
                <div key={row.id} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="p-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {row.category} / {row.subCategory}
                      </span>
                      <span className="font-extrabold text-slate-800 text-xs">
                        {row.metric}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-700 text-xs">
                        Total: ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAllMultiModalOpen(false);
                          handleOpenMultipleModal(row.id);
                        }}
                        className="h-7 text-[10px] font-bold border-brand-teal text-brand-teal hover:bg-brand-light px-2"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>

                  <div className="p-3">
                    {items.length > 0 ? (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="pb-1 w-[50%]">Description</th>
                            <th className="pb-1 w-[15%] text-right">Qty</th>
                            <th className="pb-1 w-[15%] text-right">Rate</th>
                            <th className="pb-1 w-[20%] text-right">Est. Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, idx) => {
                            const amt = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                            return (
                              <tr key={idx} className="text-slate-600 font-medium">
                                <td className="py-1.5">{item.description}</td>
                                <td className="py-1.5 text-right font-bold">{item.qty}</td>
                                <td className="py-1.5 text-right font-bold">₹{parseFloat(item.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="py-1.5 text-right font-extrabold text-slate-800">
                                  ₹{amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-4 text-slate-400 font-medium text-xs">
                        No entries.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAllMultiModalOpen(false)}
              className="font-bold border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
