"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Lock, 
  RotateCcw, 
  Sparkles, 
  User, 
  Info,
  ShieldCheck,
  Plus,
  Check
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { Spin, Tag, Avatar } from "antd";
import { toast } from "sonner";
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
  status: string;
  candidates: Candidate[];
}

export default function BallotVotePage() {
  const params = useParams();
  const router = useRouter();
  const electionId = params.id as string;

  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (electionId) {
      fetchElectionAndMyBallot();
    }
  }, [electionId]);

  const fetchElectionAndMyBallot = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";

      const elRes = await fetch(`${API_URL}/elections/${electionId}`, {
        headers: { Authorization: authHeader },
      });

      if (!elRes.ok) {
        toast.error("Election not found");
        router.push("/voting");
        return;
      }
      const elData = await elRes.json();
      setElection(elData);

      const bRes = await fetch(`${API_URL}/elections/${electionId}/my-ballot`, {
        headers: { Authorization: authHeader },
      });

      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData && bData.isSubmitted) {
          setIsAlreadySubmitted(true);
          setPreferences(bData.preferences || []);
        }
      }
    } catch (err) {
      console.error("Error fetching ballot:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePreference = (candidateId: string) => {
    if (isAlreadySubmitted || election?.status === "completed") return;

    const maxPref = election?.maxPreferences || 5;

    if (preferences.includes(candidateId)) {
      setPreferences(preferences.filter((id) => id !== candidateId));
    } else {
      if (preferences.length >= maxPref) {
        toast.warning(`Maximum ${maxPref} preferences allowed.`);
        return;
      }
      setPreferences([...preferences, candidateId]);
    }
  };

  const handleResetPreferences = () => {
    if (isAlreadySubmitted) return;
    setPreferences([]);
  };

  const handleSubmitVote = () => {
    const requiredCount = Math.min(election?.maxPreferences || 1, election?.candidates?.length || 1);
    if (preferences.length < requiredCount) {
      toast.error(`Please select all ${requiredCount} candidate preferences before submitting (પૂરા ${requiredCount} ઉમેદવારો પસંદ કરવા જરૂરી છે).`);
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmSubmitVote = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const res = await fetch(`${API_URL}/elections/${electionId}/ballots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ preferences }),
      });

      if (res.ok) {
        toast.success("Your ballot has been cast and locked!");
        setIsAlreadySubmitted(true);
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Failed to submit ballot");
      }
    } catch (err) {
      console.error("Error submitting ballot:", err);
      toast.error("Error submitting vote");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Spin size="large" />
        <p className="text-sm text-slate-500 mt-4">Loading ballot page...</p>
      </div>
    );
  }

  if (!election) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto min-h-screen">
      {/* Top Header */}
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
              Cast Your Ranked Ballot
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Rank candidate choices in order of preference
            </p>
          </div>
        </div>
      </div>

      {/* Main Ballot Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag color={isAlreadySubmitted ? "blue" : "green"} className="rounded-full px-3 py-0.5 font-semibold text-xs">
                {isAlreadySubmitted ? "Vote Cast & Locked" : "Voting Open"}
              </Tag>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                Must select exactly {election.maxPreferences} choices ({preferences.length} / {election.maxPreferences})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {election.title}
            </h2>
            {election.description && (
              <p className="text-sm text-slate-500 mt-1">
                {election.description}
              </p>
            )}
          </div>

          {isAlreadySubmitted && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-2xl flex items-center gap-2.5 shrink-0">
              <Lock className="w-5 h-5 text-blue-600" />
              <div className="text-xs">
                <div className="font-bold">Ballot Submitted</div>
                <div>Your vote is securely recorded</div>
              </div>
            </div>
          )}
        </div>

        {/* Voting Instructions */}
        {!isAlreadySubmitted ? (
          <div className="my-6 p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-start gap-3 text-xs text-teal-800 dark:text-teal-300">
            <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">How STV Ranked Voting Works:</span> Click or tap candidates in order of your preference. Your 1st choice receives priority rank. If your chosen candidate is eliminated or reaches quota, your vote transfers to your next available preference.
            </div>
          </div>
        ) : (
          <div className="my-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
            <span className="font-bold">Locked Ballot Summary:</span> Below are the preferences you submitted. You cannot modify your vote once cast.
          </div>
        )}

        {/* Selected Preferences Summary Bar */}
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Your Preference Order ({preferences.length} / {election.maxPreferences})
            </span>
            {!isAlreadySubmitted && preferences.length > 0 && (
              <button
                onClick={handleResetPreferences}
                className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>

          {preferences.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              No candidates selected yet. Click candidates below to rank your 1st, 2nd, 3rd... choice.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.map((candId, idx) => {
                const cand = election.candidates.find((c) => c.id === candId);
                return (
                  <div
                    key={candId}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold"
                  >
                    <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
                      #{idx + 1}
                    </span>
                    <span>{cand?.name || "Candidate"}</span>
                    {!isAlreadySubmitted && (
                      <button
                        onClick={() => handleTogglePreference(candId)}
                        className="hover:bg-white/20 p-0.5 rounded-full text-white/80 hover:text-white"
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Candidates Grid */}
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
          Candidate Pool (Select to Rank)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {election.candidates.map((cand) => {
            const rankIndex = preferences.indexOf(cand.id);
            const isSelected = rankIndex !== -1;

            return (
              <div
                key={cand.id}
                onClick={() => handleTogglePreference(cand.id)}
                className={`group p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20 border-teal-400 shadow-lg ring-2 ring-teal-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 hover:shadow-md"
                } ${isAlreadySubmitted ? "cursor-default opacity-90" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={cand.avatar}
                    icon={<User />}
                    className={`shrink-0 ${isSelected ? "bg-teal-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-600"} transition-colors`}
                    size="large"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {cand.name}
                    </div>
                    {cand.designation && (
                      <div className="text-xs text-slate-500">{cand.designation}</div>
                    )}
                    {cand.department && (
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                        {cand.department}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shrink-0 shadow-md">
                    <Check className="w-3.5 h-3.5" />
                    #{rankIndex + 1}
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 shrink-0 group-hover:border-teal-400 group-hover:text-teal-500 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/30 transition-all duration-200">
                    <Plus className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button Footer */}
        {!isAlreadySubmitted && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleSubmitVote}
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
            >
              {submitting ? <Spin size="small" /> : <CheckCircle2 className="w-5 h-5" />}
              {preferences.length < Math.min(election.maxPreferences || 1, election.candidates?.length || 1)
                ? `Select ${Math.min(election.maxPreferences || 1, election.candidates?.length || 1) - preferences.length} More Preference(s)`
                : "Submit & Lock Vote"}
            </button>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              Submit and Lock Your Ballot?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, your vote will be securely recorded and locked. You will not be able to edit your preferences afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 block mb-1">Your Ranked Preferences:</span>
            <ol className="list-decimal list-inside text-xs text-slate-800 dark:text-slate-200 space-y-1">
              {preferences.map((candId, idx) => {
                const cand = election?.candidates.find((c) => c.id === candId);
                return (
                  <li key={candId} className="font-semibold">
                    Preference #{idx + 1}: {cand?.name || "Candidate"}
                  </li>
                );
              })}
            </ol>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Choice</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSubmitVote}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Confirm & Lock Vote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
