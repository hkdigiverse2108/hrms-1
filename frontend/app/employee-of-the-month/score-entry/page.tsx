"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft, Save, Calendar, CheckCircle2, AlertCircle, Award, Check, Sparkles, Info, ArrowUpDown } from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUser } from "@/hooks/useUser";
import { DatePicker, Spin, Tag, Tooltip } from "antd";
import { toast } from "sonner";

interface Criterion {
  id: string;
  name: string;
  maxScore: number;
  isFixed: boolean;
  assignedPersonIds: string[];
  category?: string;
}

export default function ScoreEntryPage() {
  const { user } = useUser();
  const now = new Date();
  const defaultMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(defaultMonthYear);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  // Store matrix scores as scoresMap[employeeId][criteriaId] = score
  const [scoresMap, setScoresMap] = useState<Record<string, Record<string, number | "">>>({});
  const [attendanceStats, setAttendanceStats] = useState<{
    totalWorkingDays: number;
    totalDaysInMonth?: number;
    sundays?: number;
    companyHolidays?: number;
    formula: string;
    employeeStats: Record<string, number>;
  }>({ totalWorkingDays: 26, formula: "", employeeStats: {} });
  
  const [loading, setLoading] = useState(true);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [sortBy, setSortBy] = useState<"total" | "name">("total");

  useEffect(() => {
    fetchData();
  }, [selectedMonthYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "" };

      // 1. Fetch Criteria
      const cRes = await fetch(`${API_URL}/eom/criteria?month_year=${selectedMonthYear}`, { headers });
      let accessibleCriteria: Criterion[] = [];
      if (cRes.ok) {
        const cData: Criterion[] = await cRes.json();
        
        const uId = String(user?.id || user?._id || "");
        const isAdmin = user && ["admin", "super admin", "superadmin", "administrator", "founder"].includes(String(user.role || "").toLowerCase().trim());

        accessibleCriteria = cData.filter(c => {
          if (isAdmin) return true;
          if (!c.assignedPersonIds || c.assignedPersonIds.length === 0) return true;
          return c.assignedPersonIds.includes(uId);
        });

        setCriteria(accessibleCriteria);
      }

      // 2. Fetch Employees
      const eRes = await fetch(`${API_URL}/employees`);
      let empData = [];
      if (eRes.ok) {
        empData = await eRes.json();
      }

      // Exclude Admins
      const isEmpAdmin = (e: any) => {
        const r = String(e.role || e.designation || "").toLowerCase().trim();
        return ["admin", "super admin", "superadmin", "administrator", "founder"].includes(r);
      };
      empData = empData.filter((e: any) => !isEmpAdmin(e));

      // Fetch Month Config for Participating Employees
      const cfgRes = await fetch(`${API_URL}/eom/month-config?month_year=${selectedMonthYear}`, { headers });
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.isConfigured && Array.isArray(cfgData.selectedEmployeeIds)) {
          const selIds: string[] = cfgData.selectedEmployeeIds;
          empData = empData.filter((e: any) => selIds.includes(String(e.id || e._id)));
        }
      }
      setEmployees(empData);

      // 3. Fetch Attendance Stats for Month
      const attCrit = accessibleCriteria.find(c => c.name.toLowerCase().includes("attendance"));
      const maxAttScore = attCrit ? attCrit.maxScore : 15.0;

      const attRes = await fetch(`${API_URL}/eom/attendance-stats?month_year=${selectedMonthYear}&maxScore=${maxAttScore}`, { headers });
      let attData: { totalWorkingDays: number; formula: string; employeeStats: Record<string, number> } = { totalWorkingDays: 26, formula: "", employeeStats: {} };
      if (attRes.ok) {
        attData = await attRes.json();
        setAttendanceStats(attData);
      }

      // 4. Fetch All Existing Scores for the Month
      const sRes = await fetch(`${API_URL}/eom/scores?month_year=${selectedMonthYear}`, { headers });
      if (sRes.ok) {
        const sData = await sRes.json();
        const map: Record<string, Record<string, number | "">> = {};
        sData.forEach((s: any) => {
          const eId = String(s.employeeId);
          const cId = String(s.criteriaId);
          if (!map[eId]) map[eId] = {};
          map[eId][cId] = s.score;
        });

        // Auto Sync/Calculate Attendance Scores based on HRMS attendance & approved leaves
        if (attCrit) {
          const isLowerIsBetter = attCrit.category === "-ve";
          empData.forEach((emp: any) => {
            const eId = String(emp.id || emp._id);
            const eName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim().toLowerCase();
            const presentDays = attData.employeeStats?.[eId] ?? attData.employeeStats?.[eName] ?? 0;

            if (!map[eId]) map[eId] = {};
            const totalDays = attData.totalWorkingDays || 26;
            const rawRatio = Math.min(1, Math.max(0, presentDays / totalDays));
            const ratio = isLowerIsBetter ? (1 - rawRatio) : rawRatio;
            const calcScore = Math.min(Math.round((ratio * attCrit.maxScore) * 10) / 10, attCrit.maxScore);
            map[eId][attCrit.id] = calcScore;
          });
        }

        setScoresMap(map);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load evaluator matrix data");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillAttendance = () => {
    const attCrit = criteria.find(c => c.name.toLowerCase().includes("attendance"));
    if (!attCrit) {
      toast.error("No Attendance criterion found");
      return;
    }

    const totalDays = attendanceStats.totalWorkingDays || 26;
    const nextMap = { ...scoresMap };
    const isLowerIsBetter = attCrit.category === "-ve";

    employees.forEach((emp) => {
      const eId = String(emp.id || emp._id);
      const eName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim().toLowerCase();
      const presentDays = attendanceStats.employeeStats?.[eId] ?? attendanceStats.employeeStats?.[eName] ?? 0;
      const rawRatio = Math.min(1, Math.max(0, presentDays / totalDays));
      const ratio = isLowerIsBetter ? (1 - rawRatio) : rawRatio;
      const calcScore = Math.min(Math.round((ratio * attCrit.maxScore) * 10) / 10, attCrit.maxScore);
      
      if (!nextMap[eId]) nextMap[eId] = {};
      nextMap[eId][attCrit.id] = calcScore;
    });

    setScoresMap(nextMap);
    toast.success(`Attendance scores auto-calculated (${isLowerIsBetter ? "-ve Lower is Better Mode" : "+ve Higher is Better Mode"})!`);
  };

  const handleScoreChange = (empId: string, critId: string, value: string) => {
    const val = value === "" ? "" : Number(value);
    setScoresMap(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [critId]: val
      }
    }));
  };

  const grandMaxScore = criteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);

  const getEmpTotalScore = (empId: string) => {
    const empScores = scoresMap[empId] || {};
    return criteria.reduce((sum, c) => {
      const val = Number(empScores[c.id]);
      if (isNaN(val)) return sum;
      if (c.category === "-ve") {
        return sum + Math.max(0, (Number(c.maxScore) || 0) - val);
      }
      return sum + val;
    }, 0);
  };

  // Sorted employees list (Default: Highest Total Score first)
  const sortedEmployees = [...employees].sort((a, b) => {
    const aId = String(a.id || a._id);
    const bId = String(b.id || b._id);

    if (sortBy === "total") {
      const scoreA = getEmpTotalScore(aId);
      const scoreB = getEmpTotalScore(bId);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
    }

    const nameA = (a.name || `${a.firstName || ''} ${a.lastName || ''}`).trim();
    const nameB = (b.name || `${b.firstName || ''} ${b.lastName || ''}`).trim();
    return nameA.localeCompare(nameB);
  });

  const handleSaveRow = async (empId: string) => {
    const empScores = scoresMap[empId] || {};
    
    // Check validation first
    for (const c of criteria) {
      const val = Number(empScores[c.id]);
      if (empScores[c.id] !== undefined && empScores[c.id] !== "" && val > c.maxScore) {
        toast.error(`${c.name} score (${val}) exceeds Max Score of ${c.maxScore}!`);
        return;
      }
    }

    setSavingMap(prev => ({ ...prev, [empId]: true }));
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
      };

      const savePromises = criteria.map(async (c) => {
        const sc = empScores[c.id];
        if (sc !== undefined && sc !== "") {
          await fetch(`${API_URL}/eom/scores`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              month_year: selectedMonthYear,
              criteriaId: c.id,
              employeeId: empId,
              score: Number(sc)
            })
          });
        }
      });

      await Promise.all(savePromises);
      toast.success("Scores saved successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Error saving scores");
    } finally {
      setSavingMap(prev => ({ ...prev, [empId]: false }));
    }
  };

  const handleSaveAll = async () => {
    // Check validation across all entries
    for (const emp of employees) {
      const empId = String(emp.id || emp._id);
      const empScores = scoresMap[empId] || {};
      const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || "Employee";

      for (const c of criteria) {
        const val = Number(empScores[c.id]);
        if (empScores[c.id] !== undefined && empScores[c.id] !== "" && val > c.maxScore) {
          toast.error(`${empName}: ${c.name} score (${val}) exceeds Max Score of ${c.maxScore}!`);
          return;
        }
      }
    }

    setSavingAll(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
      };

      const savePromises: Promise<any>[] = [];

      for (const emp of employees) {
        const empId = String(emp.id || emp._id);
        const empScores = scoresMap[empId] || {};
        for (const c of criteria) {
          const sc = empScores[c.id];
          if (sc !== undefined && sc !== "") {
            savePromises.push(
              fetch(`${API_URL}/eom/scores`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  month_year: selectedMonthYear,
                  criteriaId: c.id,
                  employeeId: empId,
                  score: Number(sc)
                })
              })
            );
          }
        }
      }

      await Promise.all(savePromises);
      toast.success("All matrix scores saved successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Error saving matrix scores");
    } finally {
      setSavingAll(false);
    }
  };

  const attendanceCritObj = criteria.find(c => c.name.toLowerCase().includes("attendance"));

  return (
    <div className="min-h-screen bg-slate-50/50 p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/employee-of-the-month"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Evaluator Score Submissions Table</h1>
            <p className="text-xs text-slate-500">Input parameter scores with automatic HRMS attendance calculation</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortBy(prev => prev === "total" ? "name" : "total")}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Click to toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
            Sort: {sortBy === "total" ? "Highest Total Score" : "Name A-Z"}
          </button>

          {attendanceCritObj && (
            <button
              onClick={handleAutoFillAttendance}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Auto-Calculate Attendance
            </button>
          )}

          {/* AntD Month Picker */}
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
            className="font-bold text-slate-700 text-xs sm:text-sm border-slate-200 rounded-xl"
            style={{ height: '36px' }}
          />

          <button
            onClick={handleSaveAll}
            disabled={savingAll || loading || employees.length === 0}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingAll ? "Saving All..." : "Save All Scores"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Spin size="large" /></div>
      ) : criteria.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 font-medium">
          No parameters assigned to you for {selectedMonthYear}.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                Score Submissions Matrix ({selectedMonthYear})
              </h2>
              <p className="text-xs text-slate-500">
                Max Total Score: <span className="font-bold text-amber-600">{grandMaxScore} pts</span> across {criteria.length} parameters. Automatically sorted by highest score.
              </p>
            </div>
          </div>

          {/* Sticky Frozen Matrix Table Container */}
          <div className="overflow-auto max-h-[72vh] rounded-xl border border-slate-200 relative touch-pan-x touch-pan-y">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="sticky top-0 z-30 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
                  {/* Sticky Frozen Header Columns */}
                  <th className="sticky top-0 left-0 z-40 bg-slate-100 px-2 py-3 w-[40px] min-w-[40px] max-w-[40px] text-center">
                    #
                  </th>
                  <th className="sticky top-0 left-[40px] z-40 bg-slate-100 px-3 sm:px-4 py-3 min-w-[140px] sm:min-w-[190px] border-r border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]">
                    Employee
                  </th>

                  {/* Scrollable Parameter Header Columns */}
                  {criteria.map((c) => {
                    const isAtt = c.name.toLowerCase().includes("attendance");
                    return (
                      <th key={c.id} className={`py-3 px-3 text-center min-w-[135px] border-r border-slate-200/40 ${isAtt ? 'bg-blue-50/70' : ''}`}>
                        <div className="flex items-center justify-center gap-1">
                          <span>{c.name}</span>
                          {isAtt && (
                            <Tooltip title={
                              <div className="p-2 space-y-2 text-xs max-w-[290px]">
                                <p className="font-bold text-amber-300 flex items-center gap-1">ℹ️ Attendance Calculation Formula:</p>
                                
                                {c.category === "-ve" ? (
                                  <div className="space-y-1">
                                    <p className="font-mono bg-slate-900 p-2 rounded text-[11px] text-rose-300 border border-rose-800/60">
                                      Penalty = ( Absent Days / {attendanceStats.totalWorkingDays || 26} ) × {c.maxScore} pts
                                    </p>
                                    <div className="p-1.5 bg-rose-950/60 border border-rose-800/40 rounded text-[10px] text-rose-200 space-y-0.5">
                                      <p className="font-bold text-rose-300">🔴 Mode: -ve (Lower is Better)</p>
                                      <p>• Entered value = Absent Days penalty points</p>
                                      <p>• Contributed to Total = (Max Score - Penalty)</p>
                                      <p>• 0 Penalty ➔ Full {c.maxScore} Pts added to Total!</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <p className="font-mono bg-slate-900 p-2 rounded text-[11px] text-emerald-300 border border-emerald-800/60">
                                      Score = ( Present Days / {attendanceStats.totalWorkingDays || 26} ) × {c.maxScore} pts
                                    </p>
                                    <div className="p-1.5 bg-emerald-950/60 border border-emerald-800/40 rounded text-[10px] text-emerald-200 space-y-0.5">
                                      <p className="font-bold text-emerald-300">🟢 Mode: +ve (Higher is Better)</p>
                                      <p>• Entered value = Attendance points</p>
                                      <p>• Contributed to Total = Direct Score</p>
                                      <p>• Full Present Days ➔ Full {c.maxScore} Pts added!</p>
                                    </div>
                                  </div>
                                )}

                                <div className="text-[10px] text-slate-300 space-y-0.5 pt-1 border-t border-slate-700">
                                  <p>• Total Days in Month: {attendanceStats.totalDaysInMonth || 31}</p>
                                  <p>• Sundays: -{attendanceStats.sundays || 4} days</p>
                                  <p>• Company Holidays: -{attendanceStats.companyHolidays || 0} days</p>
                                  <p className="font-bold text-amber-400">• Total Working Days: {attendanceStats.totalWorkingDays || 26} days</p>
                                </div>
                              </div>
                            }>
                              <Info className="w-3.5 h-3.5 text-blue-500 hover:text-blue-600 cursor-pointer inline shrink-0" />
                            </Tooltip>
                          )}
                          {c.category === "-ve" && !isAtt && (
                            <Tooltip title={
                              <div className="p-2 space-y-1 text-xs max-w-[240px]">
                                <p className="font-bold text-rose-300">🔴 Mode: -ve (Lower is Better)</p>
                                <p className="text-[11px] text-slate-200">Entered value represents penalty points. Lower score contributes MORE to total score!</p>
                                <p className="font-mono text-[10px] bg-slate-900 p-1.5 rounded text-amber-300">Total Contribution = {c.maxScore} - Entered Score</p>
                              </div>
                            }>
                              <Info className="w-3.5 h-3.5 text-rose-500 hover:text-rose-600 cursor-pointer inline shrink-0" />
                            </Tooltip>
                          )}
                        </div>
                        <span className="text-[10px] text-amber-600 font-bold lowercase block">(max {c.maxScore} pts)</span>
                      </th>
                    );
                  })}

                  <th className="py-3 px-4 text-center min-w-[120px] bg-amber-50/80 border-r border-slate-200/40">Total Score</th>
                  <th className="py-3 px-4 text-right min-w-[90px] sticky right-0 bg-slate-100 z-30">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sortedEmployees.map((emp, idx) => {
                  const empId = String(emp.id || emp._id);
                  const empName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim().toLowerCase();
                  const empScores = scoresMap[empId] || {};
                  const isSavingRow = savingMap[empId];
                  const totalScore = getEmpTotalScore(empId);
                  const presentDays = attendanceStats.employeeStats?.[empId] ?? attendanceStats.employeeStats?.[empName] ?? 0;

                  return (
                    <tr key={empId} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Sticky Frozen Cell # */}
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-100 px-2 py-3 w-[40px] min-w-[40px] max-w-[40px] text-center text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>

                      {/* Sticky Frozen Cell Employee Name */}
                      <td className="sticky left-[40px] z-20 bg-white group-hover:bg-slate-100 px-3 sm:px-4 py-3 font-bold text-slate-800 text-xs sm:text-sm border-r border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)] truncate max-w-[140px] sm:max-w-none">
                        {emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()}
                      </td>

                      {/* Dynamic Criteria Input Cells */}
                      {criteria.map((c) => {
                        const currentVal = empScores[c.id] ?? "";
                        const numVal = Number(currentVal);
                        const isExceeded = currentVal !== "" && !isNaN(numVal) && numVal > c.maxScore;
                        const isAttendanceCell = c.name.toLowerCase().includes("attendance");

                        return (
                          <td key={c.id} className={`py-3 px-2 text-center border-r border-slate-100 ${isAttendanceCell ? 'bg-blue-50/20' : ''}`}>
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={c.maxScore}
                                step="0.1"
                                value={currentVal}
                                onChange={(e) => handleScoreChange(empId, c.id, e.target.value)}
                                placeholder="0"
                                className={`w-20 sm:w-24 px-2 py-1.5 border rounded-lg text-center font-bold text-xs focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                  isExceeded
                                    ? "bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500"
                                    : isAttendanceCell
                                    ? "bg-blue-50/80 border-blue-300 text-blue-900 focus:border-blue-500"
                                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500"
                                }`}
                              />

                              {/* Present Days Badge Below Input */}
                              {isAttendanceCell && (
                                <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200 mt-0.5 inline-block whitespace-nowrap">
                                  📅 {presentDays} Present Days
                                </span>
                              )}

                              {isExceeded && (
                                <span className="text-[10px] text-rose-600 font-bold">
                                  ⚠️ Max {c.maxScore}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Live Total Score Cell */}
                      <td className="py-3.5 px-4 text-center bg-amber-50/40 font-extrabold text-amber-700 text-xs sm:text-sm border-r border-slate-200/40">
                        {totalScore} <span className="text-[11px] text-amber-600/70 font-semibold">/ {grandMaxScore}</span>
                      </td>

                      {/* Action Cell */}
                      <td className="py-3.5 px-4 text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-20">
                        <button
                          onClick={() => handleSaveRow(empId)}
                          disabled={isSavingRow}
                          className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
