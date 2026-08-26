"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  Edit,
  Trash2,
  Play,
  Award,
  ChevronRight,
  ShieldCheck,
  History,
  Settings,
  Search,
  Check,
  UserCheck,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUser } from "@/hooks/useUser";
import dayjs from "dayjs";
import { Spin, Modal, Select, Tag, Drawer, DatePicker } from "antd";
import { toast } from "sonner";

interface Criterion {
  id?: string;
  name: string;
  maxScore: number;
  isFixed: boolean;
  order?: number;
  assignedPersonIds: string[];
  entryType?: "direct" | "multi_admin";
  category?: "+ve" | "-ve";
}

export default function EmployeeOfMonthPage() {
  const router = useRouter();
  const { user } = useUser();
  const [modal, contextHolder] = Modal.useModal();

  const isAdmin = Boolean(user && ["admin", "super admin", "superadmin", "administrator", "founder"].includes(String(user.role || "").toLowerCase().trim()));
  const isHR = Boolean(
    user && (
      ["hr", "hr manager", "hr lead", "hr executive", "human resources"].includes(String(user.role || "").toLowerCase().trim()) ||
      String(user.designation || "").toLowerCase().includes("hr") ||
      String(user.department || "").toLowerCase().includes("hr")
    )
  );

  const isEmpAdmin = (emp: any) => {
    const r = String(emp.role || emp.designation || "").toLowerCase().trim();
    return ["admin", "super admin", "superadmin", "administrator", "founder"].includes(r);
  };

  const getEmployeeRoleBadge = (e: any) => {
    const desig = (e.designation || "").trim();
    const role = (e.role || "").trim();
    const dept = (e.department || "").trim();
    const combined = `${role} ${desig} ${dept}`.toLowerCase();

    if (combined.includes("founder")) return "Founder";
    if (combined.includes("admin") || combined.includes("administrator") || combined.includes("superadmin")) return "Admin";
    if (combined.includes("hr")) return "HR";
    if (combined.includes("tl") || combined.includes("team lead") || combined.includes("teamleader") || combined.includes("leader")) return "Team Leader";

    if (desig) return desig;
    if (role) return role;
    if (dept) return dept;
    return "Staff";
  };

  // Date State: Default Current Month/Year (YYYY-MM)
  const now = new Date();
  const defaultMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(defaultMonthYear);

  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [revealDateTime, setRevealDateTime] = useState<string | null>(null);
  const [savingRevealTime, setSavingRevealTime] = useState(false);
  const [masterCriteria, setMasterCriteria] = useState<Criterion[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [monthHistory, setMonthHistory] = useState<any[]>([]);

  // Participating Employees selection per month
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [participantModalVisible, setParticipantModalVisible] = useState(false);
  const [savingParticipants, setSavingParticipants] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [activeTab, setActiveTab] = useState<"criteria" | "leaderboard">("criteria");

  // Modals / Drawers
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedCriterionIndex, setSelectedCriterionIndex] = useState<number | null>(null);
  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchMonthHistory();
  }, []);

  useEffect(() => {
    fetchCriteriaAndLeaderboard();
  }, [selectedMonthYear]);

  const handleSaveRevealSchedule = async (dateTimeStr: string) => {
    setSavingRevealTime(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
      };
      const res = await fetch(`${API_URL}/eom/reveal-schedule`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          month_year: selectedMonthYear,
          revealDateTime: dateTimeStr
        })
      });
      if (res.ok) {
        setRevealDateTime(dateTimeStr);
        toast.success(`Auditorium Reveal scheduled for ${dayjs(dateTimeStr).format("DD-MMM-YYYY hh:mm A")}`);
      } else {
        toast.error("Failed to save reveal schedule");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving reveal schedule");
    } finally {
      setSavingRevealTime(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const empList = await res.json();
        setEmployees(empList);

        // Also sync initial default selection if unconfigured
        const cfgRes = await fetch(`${API_URL}/eom/month-config?month_year=${selectedMonthYear}`);
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          if (cfgData.isConfigured && Array.isArray(cfgData.selectedEmployeeIds)) {
            setSelectedEmpIds(cfgData.selectedEmployeeIds);
          } else {
            const nonAdmins = empList.filter((e: any) => !isEmpAdmin(e));
            setSelectedEmpIds(nonAdmins.map((e: any) => String(e.id || e._id)));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMonthHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/eom/month-history`);
      if (res.ok) {
        setMonthHistory(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCriteriaAndLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "" };

      // Fetch Per-Month Criteria
      const cRes = await fetch(`${API_URL}/eom/criteria?month_year=${selectedMonthYear}`, { headers });
      if (cRes.ok) {
        const cData = await cRes.json();
        setCriteria(cData);
      }

      // Fetch Participating Employees Config for Month
      const cfgRes = await fetch(`${API_URL}/eom/month-config?month_year=${selectedMonthYear}`, { headers });
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setRevealDateTime(cfgData.revealDateTime || null);
        if (cfgData.isConfigured && Array.isArray(cfgData.selectedEmployeeIds)) {
          setSelectedEmpIds(cfgData.selectedEmployeeIds);
        } else {
          // Default unconfigured: all non-admin active employees selected
          const nonAdmins = (employees || []).filter(e => !isEmpAdmin(e));
          setSelectedEmpIds(nonAdmins.map(e => String(e.id || e._id)));
        }
      }

      // Fetch Leaderboard for Selected Month
      const lRes = await fetch(`${API_URL}/eom/leaderboard?month_year=${selectedMonthYear}`, { headers });
      if (lRes.ok) {
        const lData = await lRes.json();
        setLeaderboard(lData.leaderboard || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load EOM data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterCriteria = async () => {
    try {
      const res = await fetch(`${API_URL}/eom/master-criteria`);
      if (res.ok) {
        setMasterCriteria(await res.json());
        setMasterModalVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate Running Total Max Score for current month criteria
  const totalMaxScore = criteria.reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0);

  const handleMaxScoreChange = (index: number, val: number) => {
    const next = [...criteria];
    next[index].maxScore = val;
    setCriteria(next);
  };

  const handleNameChange = (index: number, val: string) => {
    const next = [...criteria];
    next[index].name = val;
    setCriteria(next);
  };

  const handleAddCriterion = () => {
    setCriteria([
      ...criteria,
      {
        name: `New Parameter ${criteria.length + 1}`,
        maxScore: 0,
        isFixed: false,
        order: criteria.length + 1,
        assignedPersonIds: []
      }
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    const target = criteria[index];
    modal.confirm({
      title: "Remove Parameter for this Month?",
      content: `Are you sure you want to remove "${target.name}" for ${selectedMonthYear}? Click "Save Month Criteria" afterwards to persist this change.`,
      okText: "Remove Parameter",
      okType: "danger",
      cancelText: "Cancel",
      onOk() {
        const next = criteria.filter((_, i) => i !== index);
        setCriteria(next);
        toast.success(`Removed "${target.name}" for ${selectedMonthYear}. Click "Save Month Criteria" to persist.`);
      }
    });
  };

  // Save criteria FOR THIS SPECIFIC MONTH (Independent of Master Template)
  const handleSaveCriteria = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/eom/criteria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({
          month_year: selectedMonthYear,
          criteria
        })
      });

      if (res.ok) {
        toast.success(`Criteria for ${selectedMonthYear} saved successfully!`);
        fetchCriteriaAndLeaderboard();
        fetchMonthHistory();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save criteria");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving criteria");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMasterCriteria = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/eom/master-criteria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({ criteria: masterCriteria })
      });

      if (res.ok) {
        toast.success("Master Parameters Template saved!");
        setMasterModalVisible(false);
      } else {
        toast.error("Failed to save master template");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveMonthConfig = async (empIds: string[]) => {
    setSavingParticipants(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/eom/month-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({
          month_year: selectedMonthYear,
          selectedEmployeeIds: empIds
        })
      });

      if (res.ok) {
        toast.success(`Updated participating employees for ${selectedMonthYear}!`);
        setSelectedEmpIds(empIds);
        setParticipantModalVisible(false);
        fetchCriteriaAndLeaderboard();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save participating employees");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving participating employees");
    } finally {
      setSavingParticipants(false);
    }
  };

  const handleCloneLastMonth = async () => {
    setCloning(true);
    try {
      const [year, month] = selectedMonthYear.split("-").map(Number);
      const prevDate = new Date(year, month - 2, 1);
      const prevMonthYear = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/eom/clone-criteria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({
          from_month_year: prevMonthYear,
          to_month_year: selectedMonthYear
        })
      });

      if (res.ok) {
        toast.success(`Copied criteria structure from ${prevMonthYear}!`);
        fetchCriteriaAndLeaderboard();
      } else {
        toast.error("Failed to copy criteria from previous month");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error cloning criteria");
    } finally {
      setCloning(false);
    }
  };

  const openAssignModal = (index: number) => {
    setSelectedCriterionIndex(index);
    setAssignModalVisible(true);
  };

  const handleSaveAssignedPersons = (personIds: string[]) => {
    if (selectedCriterionIndex !== null) {
      const next = [...criteria];
      next[selectedCriterionIndex].assignedPersonIds = personIds;
      setCriteria(next);
    }
  };

  // Render ALL active employees in the modal list (Admins + Non-Admins)
  const filteredEmployeesForModal = employees.filter(emp => {
    if (!empSearchQuery.trim()) return true;
    const q = empSearchQuery.toLowerCase();
    const name = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const role = (emp.role || emp.designation || '').toLowerCase();
    return name.includes(q) || dept.includes(q) || role.includes(q);
  });

  const currentUserId = String(user?.id || user?._id || "");
  const assignedCriteriaForUser = criteria.filter(c => 
    c.assignedPersonIds && c.assignedPersonIds.includes(currentUserId)
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {contextHolder}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Employee of the Month (EOM)</h1>
            <p className="text-xs text-slate-500">Configure parameters, evaluate scores, and reveal monthly winners</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Employee Selection Button */}
          {(isAdmin || isHR) && (
            <button
              onClick={() => setParticipantModalVisible(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl transition-all border border-amber-200/80 shadow-sm cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-600" />
              Employee Selection ({selectedEmpIds.length} / {employees.length} Selected)
            </button>
          )}

          {/* Month History Button */}
          <button
            onClick={() => setHistoryDrawerVisible(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all border border-slate-200"
          >
            <History className="w-4 h-4 text-slate-600" />
            Month History ({monthHistory.length})
          </button>

          {/* Master Template Button */}
          {(isAdmin || isHR) && (
            <button
              onClick={fetchMasterCriteria}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all border border-slate-200"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              Master Template
            </button>
          )}

          {/* Month Year Selector */}
          <DatePicker
            picker="month"
            allowClear={false}
            value={dayjs(selectedMonthYear, "YYYY-MM")}
            onChange={(date, dateString) => {
              if (dateString) {
                const formatted = Array.isArray(dateString) ? dateString[0] : dateString;
                setSelectedMonthYear(formatted);
              }
            }}
            className="font-bold text-slate-700 text-sm border-slate-200 rounded-xl"
            style={{ height: '38px' }}
          />

          <Link
            href={`/employee-of-the-month/score-entry?month_year=${selectedMonthYear}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 transition-all shadow-sm"
          >
            <Edit className="w-4 h-4" />
            Score Submissions
          </Link>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <DatePicker
                showTime={{ format: 'hh:mm A', use12Hours: true }}
                format="YYYY-MM-DD hh:mm A"
                placeholder="Schedule Reveal Time"
                value={revealDateTime ? dayjs(revealDateTime) : null}
                onChange={(date, dateString) => {
                  const val = Array.isArray(dateString) ? dateString[0] : dateString;
                  if (val) {
                    handleSaveRevealSchedule(dayjs(val, "YYYY-MM-DD hh:mm A").toISOString());
                  }
                }}
                className="font-bold text-slate-700 text-xs border-amber-300 rounded-xl bg-amber-50/50"
                style={{ height: '38px' }}
              />
              <Link
                href={`/employee-of-the-month/reveal?month_year=${selectedMonthYear}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 border border-amber-300 uppercase tracking-wider cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                Auditorium Reveal
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Criteria Alert Banner for Current Evaluator / HR */}
      {assignedCriteriaForUser.length > 0 && (
        <div className="p-4 rounded-xl border bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-blue-200 text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-sm">
                You are assigned to evaluate {assignedCriteriaForUser.length} parameter{assignedCriteriaForUser.length > 1 ? "s" : ""} in {selectedMonthYear}:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {assignedCriteriaForUser.map((c, i) => (
                  <Tag key={i} color="blue" className="font-bold text-xs rounded-md">
                    {c.name} ({c.maxScore} pts)
                  </Tag>
                ))}
              </div>
            </div>
          </div>
          <Link
            href={`/employee-of-the-month/score-entry?month_year=${selectedMonthYear}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            Enter Assigned Scores Now
          </Link>
        </div>
      )}

      {/* Max Score Total Banner for Selected Month */}
      <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold text-sm">
              Current Month ({selectedMonthYear}) Total Parameters Max Score: {totalMaxScore} pts
            </span>
            <span className="text-xs ml-2 font-medium text-emerald-700">
              (Edits here apply ONLY to {selectedMonthYear} without affecting Master Template)
            </span>
          </div>
        </div>

        {(isAdmin || isHR) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCloneLastMonth()}
              disabled={cloning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              {cloning ? "Copying..." : "Copy Criteria from Last Month"}
            </button>
            <button
              onClick={handleSaveCriteria}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? "Saving..." : `Save Month Criteria (${selectedMonthYear})`}
            </button>
          </div>
        )}
      </div>

      {/* Tabs View */}
      <div className="flex items-center border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("criteria")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === "criteria"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
        >
          Parameters Configuration ({selectedMonthYear})
        </button>
        {(isAdmin || isHR) && (
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === "leaderboard"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            Month Standings ({leaderboard.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center"><Spin size="large" /></div>
      ) : activeTab === "criteria" || (!isAdmin && !isHR) ? (
        /* Criteria Setup Table for Selected Month */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">Parameters Configuration ({selectedMonthYear})</h2>
              <span className="text-xs text-slate-500 font-medium">(Drag & Drop rows to reorder parameters)</span>
            </div>
            {(isAdmin || isHR) && (
              <button
                onClick={handleAddCriterion}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold rounded-lg border border-amber-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Dynamic Parameter
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Criteria Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Entry Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Max Score</th>
                  <th className="py-3 px-4">Assigned Evaluators</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {criteria.map((item, idx) => (
                  <tr
                    key={idx}
                    draggable={!!(isAdmin || isHR)}
                    onDragStart={(e) => {
                      setDraggedIndex(idx);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIndex === null || draggedIndex === idx) return;
                      const updated = [...criteria];
                      const [movedItem] = updated.splice(draggedIndex, 1);
                      updated.splice(idx, 0, movedItem);
                      const reindexed = updated.map((cItem, i) => ({ ...cItem, order: i + 1 }));
                      setCriteria(reindexed);
                      setDraggedIndex(null);
                      toast.success("Criteria reordered! Click 'Save Month Criteria' to save changes.");
                    }}
                    className={`hover:bg-amber-50/40 transition-colors ${draggedIndex === idx ? "opacity-40 bg-amber-100 border-2 border-dashed border-amber-400" : ""}`}
                  >
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs cursor-grab active:cursor-grabbing select-none" title="Drag to reorder">
                      {(isAdmin || isHR) && <span className="mr-1.5 text-slate-400 font-bold">⋮⋮</span>}
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {item.isFixed && !isAdmin && !isHR ? (
                          <span className="font-bold text-slate-800">{item.name}</span>
                        ) : (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleNameChange(idx, e.target.value)}
                            disabled={!isAdmin && !isHR}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-amber-500 w-52"
                          />
                        )}
                        {item.assignedPersonIds?.includes(currentUserId) && (
                          <Tag color="blue" className="font-bold text-[10px] rounded-md shrink-0">
                            Assigned to You
                          </Tag>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {(isAdmin || isHR) ? (
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...criteria];
                            next[idx].isFixed = !next[idx].isFixed;
                            setCriteria(next);
                          }}
                          title="Click to toggle Fixed Core / Dynamic type"
                          className="focus:outline-none cursor-pointer"
                        >
                          {item.isFixed ? (
                            <Tag color="gold" className="rounded-full px-2.5 py-0.5 font-bold text-[11px] hover:opacity-80">🔒 Fixed Core</Tag>
                          ) : (
                            <Tag color="blue" className="rounded-full px-2.5 py-0.5 font-bold text-[11px] hover:opacity-80">⚡ Dynamic</Tag>
                          )}
                        </button>
                      ) : (
                        item.isFixed ? (
                          <Tag color="gold" className="rounded-full px-2.5 py-0.5 font-bold text-[11px]">Fixed Core</Tag>
                        ) : (
                          <Tag color="blue" className="rounded-full px-2.5 py-0.5 font-bold text-[11px]">Dynamic</Tag>
                        )
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-inner">
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...criteria];
                            next[idx].entryType = "direct";
                            setCriteria(next);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            (item.entryType || "direct") === "direct"
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                          }`}
                        >
                          <UserCheck className="w-3 h-3" />
                          Direct entry
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...criteria];
                            next[idx].entryType = "multi_admin";
                            setCriteria(next);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            item.entryType === "multi_admin"
                              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          Multi-admin average
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-inner">
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...criteria];
                            next[idx].category = "+ve";
                            setCriteria(next);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            (item.category || "+ve") === "+ve"
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                          }`}
                        >
                          <TrendingUp className="w-3 h-3 text-emerald-200" />
                          +ve (higher is better)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...criteria];
                            next[idx].category = "-ve";
                            setCriteria(next);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            item.category === "-ve"
                              ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                          }`}
                        >
                          <TrendingDown className="w-3 h-3 text-rose-200" />
                          -ve (lower is better)
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.maxScore}
                          onChange={(e) => handleMaxScoreChange(idx, Number(e.target.value))}
                          disabled={!isAdmin && !isHR}
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-xs text-slate-400">pts</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.entryType === "multi_admin" ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.assignedPersonIds && item.assignedPersonIds.length > 0 ? (
                            item.assignedPersonIds.map(pid => {
                              const emp = employees.find(e => String(e.id || e._id) === String(pid));
                              return (
                                <Tag key={pid} className="rounded-md bg-slate-100 border-slate-200 text-slate-700 text-xs font-semibold">
                                  {emp ? emp.name || emp.firstName : pid}
                                </Tag>
                              );
                            })
                          ) : (
                            <span className="text-xs text-slate-400 italic">All Admins</span>
                          )}
                          {(isAdmin || isHR) && (
                            <button
                              onClick={() => openAssignModal(idx)}
                              className="text-xs text-amber-600 hover:text-amber-700 underline ml-1 font-semibold cursor-pointer"
                            >
                              + Assign
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic bg-slate-100 px-2 py-1 rounded-md border border-slate-200/60">
                          N/A (Direct Entry)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {(isAdmin || isHR) && (
                        <button
                          onClick={() => handleRemoveCriterion(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete parameter for this month"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Leaderboard Preview Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800">Month Standings ({selectedMonthYear})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  {criteria.map(c => (
                    <th key={c.id || c.name} className="py-3 px-4 text-center">{c.name} ({c.maxScore})</th>
                  ))}
                  <th className="py-3 px-4 text-right">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {leaderboard.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      {row.rank === 1 ? (
                        <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-900 font-extrabold flex items-center justify-center text-xs shadow-sm">1</span>
                      ) : row.rank === 2 ? (
                        <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-extrabold flex items-center justify-center text-xs shadow-sm">2</span>
                      ) : row.rank === 3 ? (
                        <span className="w-7 h-7 rounded-full bg-amber-700 text-white font-extrabold flex items-center justify-center text-xs shadow-sm">3</span>
                      ) : (
                        <span className="font-bold text-slate-500 pl-2">#{row.rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{row.name}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">{row.department}</td>
                    {criteria.map(c => {
                      const cid = String(c.id);
                      const sc = row.criteriaScores?.[cid] ?? 0;
                      return (
                        <td key={cid} className="py-3.5 px-4 text-center font-semibold text-slate-600">
                          {sc}
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-right font-extrabold text-amber-600 text-base">
                      {row.totalScore} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Participating Employee Selection Modal */}
      <Modal
        title={`Select Participating Employees for ${selectedMonthYear}`}
        open={participantModalVisible}
        onCancel={() => setParticipantModalVisible(false)}
        footer={null}
        width={680}
      >
        <div className="py-2 space-y-4">
          <p className="text-xs text-slate-500">
            Select active team members (HR, Admin, Managers, Staff) eligible for Employee of the Month for <b>{selectedMonthYear}</b>. Admins are unchecked by default, but can be selected manually.
          </p>

          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, role, department..."
                value={empSearchQuery}
                onChange={(e) => setEmpSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nonAdmins = employees.filter(e => !isEmpAdmin(e));
                  setSelectedEmpIds(nonAdmins.map(e => String(e.id || e._id)));
                }}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                title="Select all staff members (excluding admins)"
              >
                Select Non-Admins
              </button>
              <button
                type="button"
                onClick={() => setSelectedEmpIds(employees.map(e => String(e.id || e._id)))}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelectedEmpIds([])}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
            {filteredEmployeesForModal.map((emp) => {
              const empId = String(emp.id || emp._id);
              const isChecked = selectedEmpIds.includes(empId);
              const isAdminUser = isEmpAdmin(emp);
              const name = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
              const role = getEmployeeRoleBadge(emp);
              const dept = emp.department || 'General';

              return (
                <label
                  key={empId}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-white shadow-xs border border-amber-200/50' : 'hover:bg-slate-100/60'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (!selectedEmpIds.includes(empId)) {
                            setSelectedEmpIds([...selectedEmpIds, empId]);
                          }
                        } else {
                          setSelectedEmpIds(selectedEmpIds.filter(id => id !== empId));
                        }
                      }}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">{name}</p>
                        {isAdminUser && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{role} • <span className="text-slate-500">{dept}</span></p>
                    </div>
                  </div>
                  <Tag color={isChecked ? "gold" : "default"} className="text-[10px] font-bold">
                    {isChecked ? "Participating" : "Excluded"}
                  </Tag>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Total Participating: <b>{selectedEmpIds.length}</b> / {employees.length}
            </span>
            <button
              type="button"
              disabled={savingParticipants}
              onClick={() => handleSaveMonthConfig(selectedEmpIds)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              {savingParticipants ? "Saving..." : "Save Employee Selection"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Person Modal */}
      <Modal
        title={`Assign Evaluators for ${selectedCriterionIndex !== null ? criteria[selectedCriterionIndex]?.name : ''}`}
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        onOk={() => setAssignModalVisible(false)}
        footer={null}
      >
        <div className="py-4 space-y-4">
          <p className="text-xs text-slate-500">
            Select specific team members or managers who have permission to input scores for this criteria. If empty, all admins can input.
          </p>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              String(option?.label || "").toLowerCase().includes(input.toLowerCase())
            }
            style={{ width: '100%' }}
            placeholder="Select evaluators..."
            value={selectedCriterionIndex !== null ? criteria[selectedCriterionIndex]?.assignedPersonIds : []}
            onChange={(val) => handleSaveAssignedPersons(val)}
            options={employees.map(e => ({ label: `${e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim()} (${getEmployeeRoleBadge(e)})`, value: String(e.id || e._id) }))}
          />
        </div>
      </Modal>

      {/* Master Template Config Modal */}
      <Modal
        title="Master Parameters Template (Global Defaults)"
        open={masterModalVisible}
        onCancel={() => setMasterModalVisible(false)}
        onOk={handleSaveMasterCriteria}
        okText="Save Master Template"
        width={720}
      >
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              These default parameters are copied automatically whenever a new month is created. Editing this template does NOT affect past or existing months.
            </p>
            <button
              type="button"
              onClick={() => {
                setMasterCriteria([
                  ...masterCriteria,
                  {
                    name: `New Parameter ${masterCriteria.length + 1}`,
                    maxScore: 10,
                    isFixed: false,
                    assignedPersonIds: []
                  }
                ]);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold rounded-lg border border-amber-200 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Master Parameter
            </button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {masterCriteria.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 text-xs text-slate-400 font-mono">{idx + 1}</span>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => {
                    const next = [...masterCriteria];
                    next[idx].name = e.target.value;
                    setMasterCriteria(next);
                  }}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = [...masterCriteria];
                    next[idx].isFixed = !next[idx].isFixed;
                    setMasterCriteria(next);
                  }}
                  className="px-2 py-1 text-xs font-bold rounded-md border cursor-pointer"
                >
                  {m.isFixed ? <span className="text-amber-600">🔒 Fixed</span> : <span className="text-blue-600">⚡ Dynamic</span>}
                </button>
                <input
                  type="number"
                  value={m.maxScore}
                  onChange={(e) => {
                    const next = [...masterCriteria];
                    next[idx].maxScore = Number(e.target.value);
                    setMasterCriteria(next);
                  }}
                  className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center"
                />
                <span className="text-xs text-slate-400">pts</span>
                <button
                  type="button"
                  onClick={() => {
                    const target = masterCriteria[idx];
                    modal.confirm({
                      title: "Delete Master Parameter?",
                      content: `Are you sure you want to remove "${target.name}" from the Master Template?`,
                      okText: "Delete",
                      okType: "danger",
                      cancelText: "Cancel",
                      onOk() {
                        setMasterCriteria(masterCriteria.filter((_, i) => i !== idx));
                        toast.success(`Removed "${target.name}" from Master Template.`);
                      }
                    });
                  }}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete master parameter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Month History Drawer */}
      <Drawer
        title="Employee of the Month History & Tracking"
        placement="right"
        styles={{ wrapper: { width: 450 } }}
        open={historyDrawerVisible}
        onClose={() => setHistoryDrawerVisible(false)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Historical overview of all created monthly EOM events. Click any month to load its specific criteria and standings.
          </p>
          <div className="divide-y divide-slate-100">
            {monthHistory.map((mh) => (
              <div
                key={mh.month_year}
                onClick={() => {
                  setSelectedMonthYear(mh.month_year);
                  setHistoryDrawerVisible(false);
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between hover:bg-amber-50/50 ${selectedMonthYear === mh.month_year ? "bg-amber-50 border border-amber-200" : ""
                  }`}
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{mh.month_year}</h4>
                  <p className="text-xs text-slate-500">{mh.criteriaCount} Parameters Configured</p>
                </div>
                <div className="text-right">
                  <Tag color="amber" className="font-bold text-xs">Winner: {mh.winner}</Tag>
                  <p className="text-[10px] text-slate-400 mt-0.5">{mh.winnerScore} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
