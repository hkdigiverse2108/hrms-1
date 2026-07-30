"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Vote, Users, Calendar, Sparkles, Check } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Select, Input, Spin } from "antd";
import { toast } from "sonner";

interface Employee {
  id?: string;
  _id?: string;
  employee_id?: string;
  employeeId?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  departmentName?: string;
  designation?: string;
  profilePicture?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CreateElectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxPreferences, setMaxPreferences] = useState<number>(5);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    MONTHS[new Date().getMonth()]
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const res = await fetch(`${API_URL}/employees`, {
        headers: { Authorization: authHeader },
      });
      if (res.ok) {
        const data = await res.json();
        const empList = Array.isArray(data) ? data : (data.employees || []);
        setEmployees(empList);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter an election title");
      return;
    }

    if (selectedCandidateIds.length < 2) {
      toast.error("Please select at least 2 candidates for the voting pool");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        maxPreferences,
        electionMonth: selectedMonth,
        electionYear: selectedYear,
        candidate_employee_ids: selectedCandidateIds,
        status: "active",
      };

      const res = await fetch(`${API_URL}/elections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Election created successfully!");
        router.push("/voting");
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Failed to create election");
      }
    } catch (err) {
      console.error("Error creating election:", err);
      toast.error("Network error while creating election");
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto min-h-screen">
      {/* Top Header matching standard HRMS style */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/voting"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-teal-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Create New Election
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Set up candidate pool, voting month tagging, and preference limit
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Election Title <span className="text-red-500">*</span>
            </label>
            <Input
              size="large"
              placeholder="e.g. Employee of the Month - August 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Description / Notes (Optional)
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Brief description or guidelines for voters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Grid for Month, Year, Max Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                Election Month
              </label>
              <Select
                size="large"
                className="w-full"
                value={selectedMonth}
                onChange={(val) => setSelectedMonth(val)}
                options={MONTHS.map((m) => ({ label: m, value: m }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                Election Year
              </label>
              <Select
                size="large"
                className="w-full"
                value={selectedYear}
                onChange={(val) => setSelectedYear(val)}
                options={yearOptions.map((y) => ({ label: String(y), value: y }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Max Preferences
              </label>
              <Select
                size="large"
                className="w-full"
                value={maxPreferences}
                onChange={(val) => setMaxPreferences(val)}
                options={Array.from({ length: 10 }, (_, i) => ({
                  label: `${i + 1} Preference${i > 0 ? "s" : ""}`,
                  value: i + 1,
                }))}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Limit maximum candidate choices allowed per voter
              </span>
            </div>
          </div>

          {/* Candidate Pool Multi-Select */}
          <div className="pt-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Candidate Pool (ઉમેદવાર યાદી) <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              ઈલેક્શનમાં કયા કર્મચારીઓ ઉમેદવાર તરીકે ઊભા રહેવાના છે તેમની યાદી સિલેક્ટ કરો (ઓછામાં ઓછા 2 સિલેક્ટ કરવા).
            </p>

            {employeesLoading ? (
              <div className="p-6 text-center">
                <Spin />
                <span className="ml-2 text-sm text-slate-500">Loading candidate list...</span>
              </div>
            ) : (
              <Select
                mode="multiple"
                size="large"
                allowClear
                placeholder="Search and select candidates from employees..."
                className="w-full"
                value={selectedCandidateIds}
                onChange={(vals) => setSelectedCandidateIds(vals)}
                optionFilterProp="label"
                options={employees.map((emp) => {
                  const empId = String(emp.id || emp._id || emp.employee_id || emp.employeeId || "");
                  const empName = emp.name || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || "Employee";
                  const dept = emp.department || emp.departmentName || "";
                  const label = `${empName}${dept ? ` (${dept})` : ''}`;
                  return {
                    label,
                    value: empId,
                  };
                })}
              />
            )}
            <div className="mt-2 text-xs text-teal-600 font-medium">
              {selectedCandidateIds.length} candidate(s) selected
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <Link
              href="/voting"
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
            >
              {loading ? <Spin size="small" /> : <Check className="w-4 h-4" />}
              Create Election Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
