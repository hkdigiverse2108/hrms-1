"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Award, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Users, 
  ShieldCheck, 
  Calculator,
  User,
  Sparkles
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { Spin, Tag, Tabs, Table, Avatar, Progress } from "antd";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

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
  status: string;
  electionMonth?: string;
  electionYear?: number;
  quota?: number;
  totalValidVotes: number;
  totalEligibleVoters: number;
  winner_candidate_id?: string;
  winner_name?: string;
  candidates: Candidate[];
}

interface TransferredVote {
  fromCandidateId: string;
  fromCandidateName: string;
  toCandidateId: string;
  toCandidateName: string;
  count: number;
}

interface ElectionRound {
  id: string;
  roundNumber: number;
  tally: Record<string, { candidateName: string; votes: number }>;
  eliminatedCandidateIds: string[];
  eliminatedCandidateNames: string[];
  transferredVotes: TransferredVote[];
  winnerCandidateId?: string;
  winnerName?: string;
  quota: number;
}

interface AdminVoterBallot {
  id: string;
  voterId: string;
  voterName: string;
  preferences: { candidateId: string; candidateName: string }[];
  submittedAt?: string;
}

export default function ElectionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const electionId = params.id as string;
  const { user, isLoading: userLoading } = useUser();

  const [election, setElection] = useState<Election | null>(null);
  const [rounds, setRounds] = useState<ElectionRound[]>([]);
  const [voterBallots, setVoterBallots] = useState<AdminVoterBallot[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningEngine, setRunningEngine] = useState(false);

  // Round Navigation State
  const [currentRoundIdx, setCurrentRoundIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (!userLoading && user) {
      const role = String(user.role || "").toLowerCase().trim();
      const isAdmin = ["admin", "super admin", "superadmin", "administrator", "founder"].includes(role) || user.name === "Admin Admin";
      if (!isAdmin) {
        toast.error("Only Administrators can view election audit and calculations.");
        router.push("/voting");
      }
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (electionId) {
      loadData();
    }
  }, [electionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";

      // Fetch election details
      const elRes = await fetch(`${API_URL}/elections/${electionId}`, {
        headers: { Authorization: authHeader },
      });
      if (elRes.ok) {
        const elData = await elRes.json();
        setElection(elData);
      }

      // Fetch rounds history
      const rRes = await fetch(`${API_URL}/elections/${electionId}/rounds`, {
        headers: { Authorization: authHeader },
      });
      if (rRes.ok) {
        const rData = await rRes.json();
        setRounds(rData || []);
        if (rData && rData.length > 0) {
          setCurrentRoundIdx(rData.length - 1);
        }
      }

      // Fetch individual voter ballots for Admin audit
      const vRes = await fetch(`${API_URL}/elections/${electionId}/voter-ballots`, {
        headers: { Authorization: authHeader },
      });
      if (vRes.ok) {
        const vData = await vRes.json();
        setVoterBallots(vData || []);
      }
    } catch (err) {
      console.error("Error loading election results:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSTV = async () => {
    setRunningEngine(true);
    try {
      const token = localStorage.getItem("token");
      const authHeader = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
      const res = await fetch(`${API_URL}/elections/${electionId}/run`, {
        method: "POST",
        headers: { Authorization: authHeader },
      });

      if (res.ok) {
        toast.success("STV calculation engine executed successfully!");
        loadData();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "Failed to calculate results");
      }
    } catch (err) {
      console.error("Error running STV engine:", err);
      toast.error("Error running STV calculation engine");
    } finally {
      setRunningEngine(false);
    }
  };

  // Auto-play timer effect
  useEffect(() => {
    let timer: any;
    if (isPlaying && rounds.length > 0) {
      timer = setInterval(() => {
        setCurrentRoundIdx((prev) => {
          if (prev >= rounds.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, rounds]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Spin size="large" />
        <p className="text-sm text-slate-500 mt-4">Loading election audit results...</p>
      </div>
    );
  }

  if (!election) return null;

  const currentRound = rounds[currentRoundIdx];
  const turnoutPercent = election.totalEligibleVoters > 0
    ? Math.round((election.totalValidVotes / election.totalEligibleVoters) * 100)
    : 0;

  // Columns for Admin Ballot Audit Table
  const auditColumns = [
    {
      title: "Voter Name",
      dataIndex: "voterName",
      key: "voterName",
      render: (text: string) => <span className="font-semibold text-slate-900 dark:text-white">{text}</span>,
    },
    {
      title: "Ranked Choice Ballot Preferences",
      dataIndex: "preferences",
      key: "preferences",
      render: (prefs: { candidateId: string; candidateName: string }[]) => (
        <div className="flex flex-wrap gap-1.5">
          {prefs.map((p, idx) => (
            <Tag key={idx} color="teal" className="rounded-lg text-xs py-0.5">
              <span className="font-bold opacity-75 mr-1">#{idx + 1}</span>
              {p.candidateName}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Submission Status",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (val: string) => (
        <Tag color="green" className="rounded-full text-xs">
          Locked ({val ? new Date(val).toLocaleDateString() : "Submitted"})
        </Tag>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto min-h-screen">
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
              Election Audit & STV Breakdown
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-round calculation history, vote transfers, and raw ballot choices
            </p>
          </div>
        </div>
      </div>

      {/* Header Info Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag color={election.status === "completed" ? "blue" : "green"} className="rounded-full px-3 py-0.5 font-semibold text-xs">
                {election.status === "completed" ? "Winner Declared" : "Calculation Pending"}
              </Tag>
              {election.electionMonth && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {election.electionMonth} {election.electionYear}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {election.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Multi-round Single Transferable Vote (STV) breakdown & audit trail
            </p>
          </div>

          <button
            onClick={handleRunSTV}
            disabled={runningEngine || election.totalValidVotes === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 shrink-0"
          >
            {runningEngine ? <Spin size="small" /> : <Calculator className="w-4 h-4" />}
            {rounds.length > 0 ? "Re-run STV Engine" : "Calculate STV Winner"}
          </button>
        </div>

        {/* Turnout & Quota Metric Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block mb-1">Total Submitted Cast Votes</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              {election.totalValidVotes} / {election.totalEligibleVoters} ({turnoutPercent}%)
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Calculations based strictly on submitted votes
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 block mb-1">STV Winning Quota</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {election.quota || Math.floor(election.totalValidVotes / 2) + 1} Votes Needed
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Formula: ⌊Submitted Votes / 2⌋ + 1
            </span>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mb-1">
              Election Status
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              {election.winner_name ? election.winner_name : "In Progress"}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {election.winner_name ? "Official Winner Declared" : "Voting / Calculation active"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: Interactive Rounds Audit vs Raw Voter Ballots */}
      <Tabs
        defaultActiveKey="rounds"
        items={[
          {
            key: "rounds",
            label: (
              <span className="flex items-center gap-2 px-2 py-1 font-semibold text-sm">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Round-by-Round Breakdown
              </span>
            ),
            children: (
              <div className="space-y-6">
                {rounds.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
                    <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      No Calculation History
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                      Click the "Calculate STV Winner" button above to run the multi-round Single Transferable Vote algorithm engine.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Round Step Controls & Story Player */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          Round {currentRoundIdx + 1} of {rounds.length}
                        </span>
                        <Tag color="teal" className="rounded-full font-semibold text-xs">
                          {currentRound?.winnerName ? `Winner: ${currentRound.winnerName}` : `Round Snapshot`}
                        </Tag>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentRoundIdx((prev) => Math.max(0, prev - 1))}
                          disabled={currentRoundIdx === 0}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors flex items-center gap-1.5"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          {isPlaying ? "Pause Player" : "Play Story"}
                        </button>

                        <button
                          onClick={() => setCurrentRoundIdx((prev) => Math.min(rounds.length - 1, prev + 1))}
                          disabled={currentRoundIdx === rounds.length - 1}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Current Round Tally Visualization */}
                    {currentRound && (
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-teal-600" />
                          Round #{currentRound.roundNumber} Candidate Tally
                        </h3>

                        {/* Progress Bars for candidates in this round — sorted by votes descending */}
                        <div className="space-y-4 mb-6">
                          {Object.entries(currentRound.tally)
                            .sort(([, a], [, b]) => b.votes - a.votes)
                            .map(([cid, data]) => {
                            const isEliminated = currentRound.eliminatedCandidateIds.includes(cid);
                            const isWinner = currentRound.winnerCandidateId === cid;
                            const votesCount = data.votes;
                            const maxVal = Math.max(currentRound.quota, election.totalValidVotes || 1);
                            const percent = Math.min(100, Math.round((votesCount / maxVal) * 100));
                            const candidate = election.candidates.find((c) => c.id === cid || c.employee_id === cid);

                            return (
                              <div
                                key={cid}
                                className={`p-4 rounded-2xl border transition-all duration-300 ${
                                  isWinner
                                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-500 shadow-md"
                                    : isEliminated
                                    ? "bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60"
                                    : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    {candidate?.avatar ? (
                                      <Avatar src={candidate.avatar} className="bg-teal-600" size="large" />
                                    ) : (
                                      <Avatar icon={<User />} className="bg-teal-600 text-white" size="large" />
                                    )}
                                    <div>
                                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                                        {data.candidateName}
                                      </span>
                                      {isWinner && (
                                        <Tag color="gold" className="ml-2 rounded-full font-bold text-[10px]">
                                          Quota Hit - Winner
                                        </Tag>
                                      )}
                                      {isEliminated && (
                                        <Tag color="red" className="ml-2 rounded-full font-bold text-[10px]">
                                          Eliminated
                                        </Tag>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                                      {votesCount}
                                    </span>
                                    <span className="text-xs text-slate-500 ml-1">votes</span>
                                  </div>
                                </div>

                                <Progress
                                  percent={percent}
                                  status={isWinner ? "success" : isEliminated ? "exception" : "active"}
                                  strokeColor={isWinner ? "#f59e0b" : "#0d9488"}
                                  showInfo={false}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Calculation Breakdown & Vote Transfers Panel */}
                        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-teal-600" />
                            Calculation Breakdown for Round #{currentRound.roundNumber}
                          </h4>

                          {currentRound.eliminatedCandidateNames.length > 0 ? (
                            <div className="mb-3 text-xs text-slate-600 dark:text-slate-300">
                              <span className="font-bold text-red-600">Elimination: </span>
                              {currentRound.eliminatedCandidateNames.join(", ")} eliminated in this round due to lowest vote tally / 0 votes.
                            </div>
                          ) : (
                            <div className="mb-3 text-xs text-slate-600 dark:text-slate-300">
                              No candidates eliminated in this round.
                            </div>
                          )}

                          {currentRound.transferredVotes && currentRound.transferredVotes.length > 0 && (
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-2">
                                Vote Transfer Log:
                              </span>
                              <div className="space-y-1.5">
                                {currentRound.transferredVotes.map((t, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                                  >
                                    <span>
                                      Vote transferred from <strong>{t.fromCandidateName}</strong> → <strong>{t.toCandidateName}</strong>
                                    </span>
                                    <Tag color="teal" className="rounded-full text-[10px]">
                                      +{t.count} Vote
                                    </Tag>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ),
          },
          {
            key: "ballots",
            label: (
              <span className="flex items-center gap-2 px-2 py-1 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Super Admin Voter Choices View
              </span>
            ),
            children: (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    Individual Voter Choice Audit Table
                  </h3>
                  <p className="text-xs text-slate-500">
                    Restricted view showing raw voter preferences cast by employees for audit compliance
                  </p>
                </div>

                <Table
                  dataSource={voterBallots}
                  columns={auditColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
