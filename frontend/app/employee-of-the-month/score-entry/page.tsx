"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft, Save, Calendar, CheckCircle2, AlertCircle, Award, Check, Sparkles, Info, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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

const getPresentDaysForEmp = (emp: any, stats: Record<string, number> = {}) => {
  if (!emp || !stats) return 0;
  const eId = String(emp.id || emp._id || '').trim();
  const rawName = String(emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim();
  const lowerName = rawName.toLowerCase();
  
  if (eId && stats[eId] !== undefined) return stats[eId];
  if (lowerName && stats[lowerName] !== undefined) return stats[lowerName];
  
  const firstName = String(emp.firstName || rawName.split(' ')[0] || '').trim().toLowerCase();
  const lastName = String(emp.lastName || rawName.split(' ').slice(-1)[0] || '').trim().toLowerCase();
  const firstLast = `${firstName} ${lastName}`.trim();
  if (firstLast && stats[firstLast] !== undefined) return stats[firstLast];

  const keys = Object.keys(stats);
  for (const k of keys) {
    const kLower = k.toLowerCase();
    if (kLower === lowerName || kLower === firstLast) return stats[k];
    if (firstName && lastName && kLower.includes(firstName) && kLower.includes(lastName)) {
      return stats[k];
    }
  }

  return 0;
};

export default function ScoreEntryPage() {
  const { user } = useUser();
  const now = new Date();
  const defaultMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(defaultMonthYear);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  // Store matrix scores as scoresMap[employeeId][criteriaId] = score
  const [scoresMap, setScoresMap] = useState<Record<string, Record<string, number | "">>>({});
  const [rawQuantityMap, setRawQuantityMap] = useState<Record<string, Record<string, number | "">>>({});
  const [calculatedRankMap, setCalculatedRankMap] = useState<Record<string, Record<string, number | "">>>({});
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
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"stepper" | "matrix">("stepper");

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
        const qMap: Record<string, Record<string, number | "">> = {};
        const rMap: Record<string, Record<string, number | "">> = {};
        sData.forEach((s: any) => {
          const eId = String(s.employeeId);
          const cId = String(s.criteriaId);
          if (!map[eId]) map[eId] = {};
          if (!qMap[eId]) qMap[eId] = {};
          if (!rMap[eId]) rMap[eId] = {};
          map[eId][cId] = s.score;
          if (s.rawQuantity !== undefined && s.rawQuantity !== null) qMap[eId][cId] = s.rawQuantity;
          if (s.calculatedRank !== undefined && s.calculatedRank !== null) rMap[eId][cId] = s.calculatedRank;
        });

        setScoresMap(map);
        setRawQuantityMap(qMap);
        setCalculatedRankMap(rMap);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load evaluator matrix data");
    } finally {
      setLoading(false);
    }
  };

  const computeHybridScoresForCriteria = (
    crit: Criterion,
    currentEmpList: any[],
    currentQtyMap: Record<string, Record<string, number | "">>,
    currentRankMap: Record<string, Record<string, number | "">>,
    currentScoresMap: Record<string, Record<string, number | "">>
  ) => {
    const maxScore = Number(crit.maxScore) || 20;
    const N = currentEmpList.length;
    if (N === 0) return { updatedScores: currentScoresMap, updatedRanks: currentRankMap };

    const interval = N > 1 ? maxScore / (N - 1) : 0;
    const isLowerIsBetter = crit.category === "-ve";

    const hasQuantity = currentEmpList.some((emp) => {
      const eId = String(emp.id || emp._id);
      const q = currentQtyMap[eId]?.[crit.id];
      return q !== undefined && q !== "" && !isNaN(Number(q));
    });

    const nextScores = { ...currentScoresMap };
    const nextRanks = { ...currentRankMap };

    if (hasQuantity) {
      const listWithQty = currentEmpList.map((emp) => {
        const eId = String(emp.id || emp._id);
        const qVal = currentQtyMap[eId]?.[crit.id];
        const parsedQty = qVal !== undefined && qVal !== "" && !isNaN(Number(qVal)) ? Number(qVal) : null;
        return { eId, qty: parsedQty };
      });

      listWithQty.sort((a, b) => {
        if (a.qty === null && b.qty === null) return 0;
        if (a.qty === null) return 1;
        if (b.qty === null) return -1;
        return isLowerIsBetter ? a.qty - b.qty : b.qty - a.qty;
      });

      currentEmpList.forEach((emp) => {
        const eId = String(emp.id || emp._id);
        if (!nextScores[eId]) nextScores[eId] = {};
        if (!nextRanks[eId]) nextRanks[eId] = {};

        const item = listWithQty.find((x) => x.eId === eId);
        if (item && item.qty !== null) {
          const idx = listWithQty.findIndex((x) => x.eId === eId);
          let rankIndex = idx;
          for (let j = 0; j < idx; j++) {
            if (listWithQty[j].qty === item.qty) {
              rankIndex = j;
              break;
            }
          }
          const calculatedRank = rankIndex + 1;
          const rawScore = maxScore - (rankIndex * interval);
          const calcScore = Math.max(0, Math.min(maxScore, Math.round(rawScore * 100) / 100));

          nextRanks[eId][crit.id] = calculatedRank;
          nextScores[eId][crit.id] = calcScore;
        }
      });
    } else {
      currentEmpList.forEach((emp) => {
        const eId = String(emp.id || emp._id);
        const manualRank = currentRankMap[eId]?.[crit.id];
        if (manualRank !== undefined && manualRank !== "" && !isNaN(Number(manualRank))) {
          const r = Number(manualRank);
          if (r > 0) {
            const rawScore = maxScore - ((r - 1) * interval);
            const calcScore = Math.max(0, Math.min(maxScore, Math.round(rawScore * 100) / 100));
            if (!nextScores[eId]) nextScores[eId] = {};
            nextScores[eId][crit.id] = calcScore;
          }
        }
      });
    }

    return { updatedScores: nextScores, updatedRanks: nextRanks };
  };

  const handleQuantityChange = (empId: string, crit: Criterion, valStr: string) => {
    const val: number | "" = valStr === "" ? "" : Number(valStr);
    const nextQtyMap: Record<string, Record<string, number | "">> = {
      ...rawQuantityMap,
      [empId]: {
        ...(rawQuantityMap[empId] || {}),
        [crit.id]: val
      }
    };
    setRawQuantityMap(nextQtyMap);

    const { updatedScores, updatedRanks } = computeHybridScoresForCriteria(
      crit,
      employees,
      nextQtyMap,
      calculatedRankMap,
      scoresMap
    );
    setScoresMap(updatedScores);
    setCalculatedRankMap(updatedRanks);
  };

  const handleRankChange = (empId: string, crit: Criterion, valStr: string) => {
    const val: number | "" = valStr === "" ? "" : Number(valStr);
    const nextRankMap: Record<string, Record<string, number | "">> = {
      ...calculatedRankMap,
      [empId]: {
        ...(calculatedRankMap[empId] || {}),
        [crit.id]: val
      }
    };
    setCalculatedRankMap(nextRankMap);

    const { updatedScores, updatedRanks } = computeHybridScoresForCriteria(
      crit,
      employees,
      rawQuantityMap,
      nextRankMap,
      scoresMap
    );
    setScoresMap(updatedScores);
    setCalculatedRankMap(updatedRanks);
  };

  const handleAutoFillVote = () => {
    const voteCrit = criteria.find(c => c.name.toLowerCase().includes("vote"));
    if (!voteCrit) {
      toast.error("No Vote criterion found");
      return;
    }
    if (employees.length === 0) return;

    const maxVoteScore = Number(voteCrit.maxScore) || 10;
    const isLowerBetter = voteCrit.category === "-ve";

    const listWithQty = employees.map(emp => {
      const eId = String(emp.id || emp._id);
      const qty = Number(rawQuantityMap[eId]?.[voteCrit.id]) || 0;
      return { eId, qty };
    });

    listWithQty.sort((a, b) => isLowerBetter ? a.qty - b.qty : b.qty - a.qty);

    const N = employees.length;
    const interval = N > 1 ? maxVoteScore / (N - 1) : 0;
    const nextMap = { ...scoresMap };

    employees.forEach(emp => {
      const eId = String(emp.id || emp._id);
      if (!nextMap[eId]) nextMap[eId] = {};
      const idx = listWithQty.findIndex(x => x.eId === eId);
      if (idx !== -1) {
        const item = listWithQty[idx];
        let rankIndex = idx;
        for (let j = 0; j < idx; j++) {
          if (listWithQty[j].qty === item.qty) {
            rankIndex = j;
            break;
          }
        }
        const rawScore = maxVoteScore - (rankIndex * interval);
        const calcScore = Math.max(0, Math.min(maxVoteScore, Math.round(rawScore * 100) / 100));
        nextMap[eId][voteCrit.id] = calcScore;
      }
    });

    setScoresMap(nextMap);
    toast.success(`Vote scores auto-calculated (${voteCrit.category || "+ve"} Rank Steps)!`);
  };

  const handleAutoFillAttendance = () => {
    const attCrit = criteria.find(c => c.name.toLowerCase().includes("attendance"));
    if (!attCrit) {
      toast.error("No Attendance criterion found");
      return;
    }
    if (employees.length === 0) return;

    const maxAttScore = Number(attCrit.maxScore) || 10;
    const isLowerBetter = attCrit.category === "-ve";

    const listWithDays = employees.map((emp) => {
      const eId = String(emp.id || emp._id);
      const presentDays = getPresentDaysForEmp(emp, attendanceStats.employeeStats);
      return { eId, presentDays };
    });

    listWithDays.sort((a, b) => isLowerBetter ? a.presentDays - b.presentDays : b.presentDays - a.presentDays);

    const N = employees.length;
    const interval = N > 1 ? maxAttScore / (N - 1) : 0;
    const nextMap = { ...scoresMap };

    employees.forEach((emp) => {
      const eId = String(emp.id || emp._id);
      if (!nextMap[eId]) nextMap[eId] = {};

      const idx = listWithDays.findIndex(x => x.eId === eId);
      if (idx !== -1) {
        const item = listWithDays[idx];
        let rankIndex = idx;
        for (let j = 0; j < idx; j++) {
          if (listWithDays[j].presentDays === item.presentDays) {
            rankIndex = j;
            break;
          }
        }
        const rawScore = maxAttScore - (rankIndex * interval);
        const calcScore = Math.max(0, Math.min(maxAttScore, Math.round(rawScore * 100) / 100));
        nextMap[eId][attCrit.id] = calcScore;
      }
    });

    setScoresMap(nextMap);
    toast.success(`Attendance scores auto-calculated (${attCrit.category || "+ve"} Rank Steps)!`);
  };

  const handleAutoFillDiscipline = async () => {
    const discCrit = criteria.find(c => c.name.toLowerCase().includes("discipline"));
    if (!discCrit) {
      toast.error("No Discipline criterion found");
      return;
    }
    if (employees.length === 0) return;

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "" };
      const maxDiscScore = Number(discCrit.maxScore) || 10;
      const isLowerBetter = (discCrit.category || "-ve") === "-ve";

      const res = await fetch(`${API_URL}/eom/discipline-stats?month_year=${selectedMonthYear}&maxScore=${maxDiscScore}`, { headers });
      if (!res.ok) {
        toast.error("Failed to fetch discipline penalty data");
        return;
      }
      const data = await res.json();
      const penaltyMap = data.employeePenaltyAmounts || {};

      const getEmpPenalty = (emp: any) => {
        const eId = String(emp.id || emp._id);
        const eName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim().toLowerCase();
        return penaltyMap[eId] ?? penaltyMap[eName] ?? 0;
      };

      const listWithPenalty = employees.map(emp => {
        const eId = String(emp.id || emp._id);
        const penalty = getEmpPenalty(emp);
        return { eId, penalty };
      });

      listWithPenalty.sort((a, b) => isLowerBetter ? a.penalty - b.penalty : b.penalty - a.penalty);

      const N = employees.length;
      const interval = N > 1 ? maxDiscScore / (N - 1) : 0;
      const nextMap = { ...scoresMap };

      employees.forEach(emp => {
        const eId = String(emp.id || emp._id);
        if (!nextMap[eId]) nextMap[eId] = {};

        const idx = listWithPenalty.findIndex(x => x.eId === eId);
        if (idx !== -1) {
          const item = listWithPenalty[idx];
          let rankIndex = idx;
          for (let j = 0; j < idx; j++) {
            if (listWithPenalty[j].penalty === item.penalty) {
              rankIndex = j;
              break;
            }
          }
          const rawScore = maxDiscScore - (rankIndex * interval);
          const calcScore = Math.max(0, Math.min(maxDiscScore, Math.round(rawScore * 100) / 100));
          nextMap[eId][discCrit.id] = calcScore;
        }
      });

      setScoresMap(nextMap);
      toast.success(`Discipline scores auto-calculated (${discCrit.category || "-ve"} Rank Steps)!`);
    } catch (e) {
      console.error(e);
      toast.error("Error auto-calculating Discipline scores");
    }
  };

  const handleAutoFillWorkCompletion = async () => {
    const workCrit = criteria.find(c => 
      c.name.toLowerCase().includes("work completion") || 
      c.name.toLowerCase().includes("work") || 
      c.name.toLowerCase().includes("task")
    );
    if (!workCrit) {
      toast.error("No Work Completion criterion found");
      return;
    }
    if (employees.length === 0) return;

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "" };
      const maxWorkScore = Number(workCrit.maxScore) || 10;
      const isLowerBetter = workCrit.category === "-ve";

      const res = await fetch(`${API_URL}/eom/work-completion-stats?month_year=${selectedMonthYear}&maxScore=${maxWorkScore}`, { headers });
      if (!res.ok) {
        toast.error("Failed to fetch work completion ratings data");
        return;
      }
      const data = await res.json();
      const statsMap = data.employeeStats || {};

      const getEmpWorkFactor = (emp: any) => {
        const eId = String(emp.id || emp._id);
        const eName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim().toLowerCase();
        const obj = statsMap[eId] || statsMap[eName];
        if (obj) {
          return Number(obj.factor) || (Number(obj.daysVerified || 0) * Number(obj.avgRating || 0));
        }
        return 0;
      };

      const listWithFactor = employees.map(emp => {
        const eId = String(emp.id || emp._id);
        const factor = getEmpWorkFactor(emp);
        return { eId, factor };
      });

      listWithFactor.sort((a, b) => isLowerBetter ? a.factor - b.factor : b.factor - a.factor);

      const N = employees.length;
      const interval = N > 1 ? maxWorkScore / (N - 1) : 0;
      const nextMap = { ...scoresMap };

      employees.forEach(emp => {
        const eId = String(emp.id || emp._id);
        if (!nextMap[eId]) nextMap[eId] = {};

        const idx = listWithFactor.findIndex(x => x.eId === eId);
        if (idx !== -1) {
          const item = listWithFactor[idx];
          let rankIndex = idx;
          for (let j = 0; j < idx; j++) {
            if (listWithFactor[j].factor === item.factor) {
              rankIndex = j;
              break;
            }
          }
          const rawScore = maxWorkScore - (rankIndex * interval);
          const calcScore = Math.max(0, Math.min(maxWorkScore, Math.round(rawScore * 100) / 100));
          nextMap[eId][workCrit.id] = calcScore;
        }
      });

      setScoresMap(nextMap);
      toast.success(`Work Completion scores auto-calculated (${workCrit.category || "+ve"} Rank Steps)!`);
    } catch (e) {
      console.error(e);
      toast.error("Error auto-calculating Work Completion scores");
    }
  };

  const handleAutoFillWorkDedication = async () => {
    const dedCrit = criteria.find(c => 
      c.name.toLowerCase().includes("work dedication") || 
      c.name.toLowerCase().includes("dedication")
    );
    if (!dedCrit) {
      toast.error("No Work Dedication criterion found");
      return;
    }
    if (employees.length === 0) return;

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "" };
      const maxDedScore = Number(dedCrit.maxScore) || 10;
      const isLowerBetter = dedCrit.category === "-ve";

      const res = await fetch(`${API_URL}/eom/work-dedication-stats?month_year=${selectedMonthYear}&maxScore=${maxDedScore}`, { headers });
      if (!res.ok) {
        toast.error("Failed to fetch work dedication hours data");
        return;
      }
      const data = await res.json();
      const hoursMap = data.employeeHours || {};

      const getEmpHours = (emp: any) => {
        const eId = String(emp.id || emp._id);
        const eName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim().toLowerCase();
        return hoursMap[eId] ?? hoursMap[eName] ?? 0;
      };

      const listWithHours = employees.map(emp => {
        const eId = String(emp.id || emp._id);
        const hours = getEmpHours(emp);
        return { eId, hours };
      });

      listWithHours.sort((a, b) => isLowerBetter ? a.hours - b.hours : b.hours - a.hours);

      const N = employees.length;
      const interval = N > 1 ? maxDedScore / (N - 1) : 0;
      const nextMap = { ...scoresMap };

      employees.forEach(emp => {
        const eId = String(emp.id || emp._id);
        if (!nextMap[eId]) nextMap[eId] = {};

        const idx = listWithHours.findIndex(x => x.eId === eId);
        if (idx !== -1) {
          const item = listWithHours[idx];
          let rankIndex = idx;
          for (let j = 0; j < idx; j++) {
            if (listWithHours[j].hours === item.hours) {
              rankIndex = j;
              break;
            }
          }
          const rawScore = maxDedScore - (rankIndex * interval);
          const calcScore = Math.max(0, Math.min(maxDedScore, Math.round(rawScore * 100) / 100));
          nextMap[eId][dedCrit.id] = calcScore;
        }
      });

      setScoresMap(nextMap);
      toast.success(`Work Dedication scores auto-calculated (${dedCrit.category || "+ve"} Rank Steps)!`);
    } catch (e) {
      console.error(e);
      toast.error("Error auto-calculating Work Dedication scores");
    }
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
    const sumVal = criteria.reduce((sum, c) => {
      const val = Number(empScores[c.id]);
      if (isNaN(val)) return sum;
      return sum + val;
    }, 0);
    return Math.round(sumVal * 100) / 100;
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
          const rawQty = rawQuantityMap[empId]?.[c.id];
          const calcRank = calculatedRankMap[empId]?.[c.id];

          await fetch(`${API_URL}/eom/scores`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              month_year: selectedMonthYear,
              criteriaId: c.id,
              employeeId: empId,
              score: Number(sc),
              rawQuantity: rawQty !== undefined && rawQty !== "" ? Number(rawQty) : null,
              calculatedRank: calcRank !== undefined && calcRank !== "" ? Number(calcRank) : null
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
            const rawQty = rawQuantityMap[empId]?.[c.id];
            const calcRank = calculatedRankMap[empId]?.[c.id];

            savePromises.push(
              fetch(`${API_URL}/eom/scores`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  month_year: selectedMonthYear,
                  criteriaId: c.id,
                  employeeId: empId,
                  score: Number(sc),
                  rawQuantity: rawQty !== undefined && rawQty !== "" ? Number(rawQty) : null,
                  calculatedRank: calcRank !== undefined && calcRank !== "" ? Number(calcRank) : null
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

  const voteCritObj = criteria.find(c => c.name.toLowerCase().includes("vote"));
  const attendanceCritObj = criteria.find(c => c.name.toLowerCase().includes("attendance"));
  const disciplineCritObj = criteria.find(c => c.name.toLowerCase().includes("discipline"));
  const workCompletionCritObj = criteria.find(c => 
    c.name.toLowerCase().includes("work completion") || 
    c.name.toLowerCase().includes("work") || 
    c.name.toLowerCase().includes("task")
  );
  const workDedicationCritObj = criteria.find(c => 
    c.name.toLowerCase().includes("work dedication") || 
    c.name.toLowerCase().includes("dedication")
  );

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
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Evaluator Score Submissions</h1>
            <p className="text-xs text-slate-500">Step-by-step evaluation per parameter with Category-aware Auto-Calculations</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {voteCritObj && (
            <button
              onClick={handleAutoFillVote}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Auto-Calculate Vote
            </button>
          )}

          {attendanceCritObj && (
            <button
              onClick={handleAutoFillAttendance}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Auto-Calculate Attendance
            </button>
          )}

          {disciplineCritObj && (
            <button
              onClick={handleAutoFillDiscipline}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              Auto-Calculate Discipline
            </button>
          )}

          {workCompletionCritObj && (
            <button
              onClick={handleAutoFillWorkCompletion}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Auto-Calculate Work Completion
            </button>
          )}

          {workDedicationCritObj && (
            <button
              onClick={handleAutoFillWorkDedication}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Auto-Calculate Work Dedication
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
                Score Submissions Evaluation ({selectedMonthYear})
              </h2>
              <p className="text-xs text-slate-500">
                Evaluating parameter: <span className="font-bold text-amber-600">{criteria[currentStepIndex]?.name}</span> ({criteria[currentStepIndex]?.maxScore} pts max)
              </p>
            </div>
          </div>

          {/* Stepper Navigation Banner */}
          {criteria.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                  {currentStepIndex + 1}/{criteria.length}
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Current Parameter ({currentStepIndex + 1} of {criteria.length})
                  </div>
                  <div className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>{criteria[currentStepIndex]?.name}</span>
                    <Tag color="gold" className="font-bold rounded-md text-xs">
                      Max {criteria[currentStepIndex]?.maxScore} pts
                    </Tag>
                    {criteria[currentStepIndex]?.category && (
                      <Tag color={criteria[currentStepIndex]?.category === "-ve" ? "rose" : "emerald"} className="font-bold rounded-md text-xs">
                        Category: {criteria[currentStepIndex]?.category}
                      </Tag>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentStepIndex === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(prev => Math.min(criteria.length - 1, prev + 1))}
                  disabled={currentStepIndex === criteria.length - 1}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-40 cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Stepper Table Container */}
          <div className="overflow-auto max-h-[72vh] rounded-xl border border-slate-200 relative touch-pan-x touch-pan-y">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="sticky top-0 z-30 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
                  <th className="sticky top-0 left-0 z-40 bg-slate-100 px-2 py-3 w-[40px] min-w-[40px] max-w-[40px] text-center">
                    #
                  </th>
                  <th className="sticky top-0 left-[40px] z-40 bg-slate-100 px-3 sm:px-4 py-3 min-w-[140px] sm:min-w-[190px] border-r border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]">
                    Employee
                  </th>

                  {/* Single Column for Current Stepper Parameter */}
                  {criteria.filter((_, idx) => idx === currentStepIndex).map((c) => {
                    const isAtt = c.name.toLowerCase().includes("attendance");
                    const isVote = c.name.toLowerCase().includes("vote");
                    return (
                      <th key={c.id} className={`py-3 px-3 text-center min-w-[145px] border-r border-slate-200/40 ${isVote ? 'bg-purple-50/70' : isAtt ? 'bg-blue-50/70' : ''}`}>
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-bold">{c.name}</span>
                          {isVote && <span className="text-[10px] text-purple-700 font-extrabold uppercase tracking-tight">Quantity & Rank Mode</span>}
                          <span className="text-[10px] text-amber-600 font-bold lowercase">(max {c.maxScore} pts)</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sortedEmployees.map((emp: any, idx: number) => {
                  const empId = String(emp.id || emp._id);
                  const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || "Employee";
                  const displayCriteria = criteria.filter((_, i) => i === currentStepIndex);

                  return (
                    <tr key={empId} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 px-2 py-3 w-[40px] text-center text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>

                      <td className="sticky left-[40px] z-20 bg-white group-hover:bg-slate-50/90 px-3 sm:px-4 py-3 border-r border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm truncate max-w-[130px] sm:max-w-none">{empName}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate">{emp.designation || emp.department || "Staff"}</div>
                      </td>

                      {displayCriteria.map((c) => {
                        const currentVal = scoresMap[empId]?.[c.id] ?? "";
                        const numVal = Number(currentVal);
                        const isExceeded = currentVal !== "" && !isNaN(numVal) && numVal > c.maxScore;
                        const isAttendanceCell = c.name.toLowerCase().includes("attendance");
                        const isVoteCell = c.name.toLowerCase().includes("vote");
                        const presentDays = getPresentDaysForEmp(emp, attendanceStats.employeeStats);

                        if (isVoteCell) {
                          const currentQty = rawQuantityMap[empId]?.[c.id] ?? "";
                          const currentRank = calculatedRankMap[empId]?.[c.id] ?? "";

                          return (
                            <td key={c.id} className="py-3 px-2 text-center border-r border-slate-100 bg-purple-50/20">
                              <div className="flex flex-col items-center gap-1.5 min-w-[145px]">
                                {/* Quantity (Votes) Input */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-purple-800 font-bold shrink-0">Votes:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={currentQty}
                                    onChange={(e) => handleQuantityChange(empId, c, e.target.value)}
                                    placeholder="0"
                                    className="w-16 px-1.5 py-1 border border-purple-300 rounded-md text-center font-bold text-xs bg-white text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-xs"
                                  />
                                </div>

                                {/* Rank & Score Info Badge Row */}
                                <div className="flex items-center justify-center gap-1.5">
                                  {currentRank !== "" && !isNaN(Number(currentRank)) ? (
                                    <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md shadow-2xs">
                                      #{currentRank}
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min="1"
                                      value={currentRank}
                                      onChange={(e) => handleRankChange(empId, c, e.target.value)}
                                      placeholder="Rank"
                                      className="w-12 px-1 py-0.5 border border-slate-200 rounded-md text-center text-[10px] font-bold bg-white text-slate-700"
                                    />
                                  )}

                                  <div className="flex items-center gap-0.5">
                                    <span className="text-[10px] text-slate-500 font-bold">Pts:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max={c.maxScore}
                                      step="0.01"
                                      value={currentVal}
                                      onChange={(e) => handleScoreChange(empId, c.id, e.target.value)}
                                      placeholder="0"
                                      className={`w-14 px-1 py-0.5 border rounded-md text-center font-bold text-xs focus:outline-none ${
                                        isExceeded
                                          ? "bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500"
                                          : "bg-white border-slate-300 text-slate-900 focus:border-amber-500"
                                      }`}
                                    />
                                  </div>
                                </div>

                                {isExceeded && (
                                  <span className="text-[10px] text-rose-600 font-bold">
                                    ⚠️ Max {c.maxScore}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={c.id} className="py-3 px-2 text-center border-r border-slate-100">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={c.maxScore}
                                step="0.01"
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

                              {isAttendanceCell && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200 mt-0.5 inline-block whitespace-nowrap">
                                  📅 {presentDays} Days
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
