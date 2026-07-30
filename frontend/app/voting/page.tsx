"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Vote, 
  Plus, 
  Filter, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Trash2, 
  Award, 
  BarChart3,
  Lock,
  Sparkles
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";
import { Select, Spin, Tag } from "antd";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Candidate {
  id: string;
  employee_id: string;
  name: string;
  department?: string;
  designation?: string;
  avatar?: string;
}

interface Election {
  id: string;
  title: string;
  description?: string;
  maxPreferences: number;
  electionMonth?: string;
  electionYear?: number;
  status: "active" | "completed" | "draft" | string;
  candidates: Candidate[];
  totalValidVotes: number;
  totalEligibleVoters: number;
  quota?: number;
  winner_candidate_id?: string;
  winner_name?: string;
  createdAt?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ElectionsListPage() {
  const router = useRouter();
  const { user } = useUser();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const isAdminOrHR = user && ["admin", "super admin", "superadmin", "administrator", "founder", "hr", "hr manager", "hr lead"]
    .includes(String(user.role || "").toLowerCase().trim());

  const fetchElections = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      let url = `${API_URL}/elections`;
      const params = new URLSearchParams();
      if (selectedMonth) params.append("month", selectedMonth);
      if (selectedYear) params.append("year", String(selectedYear));
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: authHeader,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setElections(Array.isArray(data) ? data : []);
      } else {
        console.warn("Elections API response status:", res.status);
        setElections([]);
      }
    } catch (err) {
      console.error("Error fetching elections:", err);
      setElections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, [selectedMonth, selectedYear]);

  const handleDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const res = await fetch(`${API_URL}/elections/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
        },
      });
      if (res.ok) {
        fetchElections();
      }
    } catch (err) {
      console.error("Error deleting election:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      {/* Standard Header Section matching HRMS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20">
              <Vote className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Elections & Voting
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Single Transferable Vote (STV) ranked choice voting system
              </p>
            </div>
          </div>
        </div>

        {isAdminOrHR && (
          <Link
            href="/voting/create"
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-teal-500/20 hover:from-teal-700 hover:to-emerald-700 transition-all duration-200 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Create Election
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-sm">
          <Filter className="w-4 h-4 text-teal-600" />
          <span>Filter Elections:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select
            placeholder="Select Month"
            allowClear
            className="w-36"
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            options={MONTHS.map((m) => ({ label: m, value: m }))}
          />

          <Select
            placeholder="Select Year"
            allowClear
            className="w-32"
            value={selectedYear}
            onChange={(val) => setSelectedYear(val)}
            options={yearOptions.map((y) => ({ label: String(y), value: y }))}
          />

          {(selectedMonth || selectedYear) && (
            <button
              onClick={() => {
                setSelectedMonth(undefined);
                setSelectedYear(undefined);
              }}
              className="text-xs text-teal-600 hover:underline font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Elections Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spin size="large" />
          <p className="text-sm text-slate-500 mt-4">Loading elections...</p>
        </div>
      ) : elections.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <Vote className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No Elections Found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            {selectedMonth || selectedYear
              ? "No elections match the selected month/year filters."
              : "No voting events have been created yet."}
          </p>
          {isAdminOrHR && (
            <Link
              href="/voting/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              Create First Election
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elections.map((election) => {
            const isCompleted = election.status === "completed";
            const turnoutPercent = election.totalEligibleVoters > 0
              ? Math.round((election.totalValidVotes / election.totalEligibleVoters) * 100)
              : 0;

            return (
              <div
                key={election.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div className="p-6">
                  {/* Top Bar with Tag */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Tag color={isCompleted ? "blue" : "green"} className="rounded-full px-3 py-0.5 text-xs font-semibold">
                        {isCompleted ? "Completed" : "Active Voting"}
                      </Tag>
                      {election.electionMonth && (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {election.electionMonth} {election.electionYear}
                        </span>
                      )}
                    </div>

                    {isAdminOrHR && (
                      <button
                        onClick={() => handleDelete(election.id, election.title)}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete Election"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-2">
                    {election.title}
                  </h3>
                  {election.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                      {election.description}
                    </p>
                  )}

                  {/* Winner Banner if Completed */}
                  {isCompleted && election.winner_name && (
                    <div className="mt-3 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 text-amber-600 rounded-lg shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
                          Declared Winner
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {election.winner_name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Turnout Progress Bar */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                        Votes Cast
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {election.totalValidVotes} / {election.totalEligibleVoters} ({turnoutPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(turnoutPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Candidate Count */}
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{election.candidates?.length || 0} Candidates in pool</span>
                    <span className="text-slate-300">•</span>
                    <span>Max {election.maxPreferences} choices</span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {!isCompleted ? (
                    <Link
                      href={`/voting/${election.id}/vote`}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors"
                    >
                      <Vote className="w-3.5 h-3.5" />
                      Cast / View My Vote
                    </Link>
                  ) : (
                    <div className="text-xs text-slate-400 flex items-center gap-1 font-medium px-2">
                      <Lock className="w-3.5 h-3.5" /> Voting Closed
                    </div>
                  )}

                  {isAdminOrHR && (
                    <Link
                      href={`/voting/${election.id}/results`}
                      className="inline-flex items-center gap-1 py-2 px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Results & Audit
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Election?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? Data will be archived safely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
