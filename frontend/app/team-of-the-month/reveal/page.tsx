"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, ArrowLeft, Sparkles, Crown, Users, Play, RefreshCw, ChevronRight, Award, ShieldCheck, Zap } from "lucide-react";
import { API_URL } from "@/lib/config";
import { Spin, DatePicker, Modal } from "antd";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";

// Custom Confetti Particle System
const triggerConfetti = (isWinner = false) => {
  try {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces: any[] = [];
    const colors = ["#FBBF24", "#3B82F6", "#10B981", "#EC4899", "#A855F7", "#F59E0B", "#FFFFFF"];
    const count = isWinner ? 400 : 150;

    for (let i = 0; i < count; i++) {
      pieces.push({
        x: isWinner ? Math.random() * canvas.width : canvas.width / 2,
        y: isWinner ? canvas.height : canvas.height / 2,
        vx: (Math.random() - 0.5) * (isWinner ? 28 : 18),
        vy: (Math.random() - (isWinner ? 0.9 : 0.75)) * (isWinner ? 24 : 16),
        size: Math.random() * 9 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach(p => {
        if (p.opacity > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.45; // gravity
          p.rotation += p.rSpeed;
          if (frame > 60) p.opacity -= 0.015;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      frame++;
      if (alive && frame < 200) {
        requestAnimationFrame(animate);
      } else {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
    animate();
  } catch (e) {
    console.error("Confetti error:", e);
  }
};

export default function TeamOfMonthRevealPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const monthParam = searchParams.get("month_year") || dayjs().format("YYYY-MM");
  const viewModeParam = searchParams.get("mode") || "monthly"; // "monthly" | "weekly"

  const [selectedMonth, setSelectedMonth] = useState<string>(monthParam);
  const [declaredData, setDeclaredData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reveal Animation Stage: 0=Init, 1=Weekly Totals, 2=EOM Averages, 3=Teams Ranked, 4=Champion Reveal
  const [stage, setStage] = useState<number>(0);
  const [revealedTeamCount, setRevealedTeamCount] = useState<number>(0);

  useEffect(() => {
    fetchDeclaredResults(selectedMonth);
  }, [selectedMonth]);

  const fetchDeclaredResults = async (mYear: string) => {
    setLoading(true);
    setStage(0);
    setRevealedTeamCount(0);
    try {
      const res = await fetch(`${API_URL}/weekly-meetings/declared-results/${mYear}`);
      if (res.ok) {
        const data = await res.json();
        setDeclaredData(data);
      } else {
        setDeclaredData(null);
      }
    } catch (e) {
      console.error(e);
      setDeclaredData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStage = () => {
    if (stage === 0) {
      setStage(1);
    } else if (stage === 1) {
      setStage(2);
    } else if (stage === 2) {
      setStage(3);
      setRevealedTeamCount(1);
    } else if (stage === 3) {
      const totalTeams = declaredData?.teams?.length || 0;
      if (revealedTeamCount < totalTeams) {
        const nextCount = revealedTeamCount + 1;
        setRevealedTeamCount(nextCount);
        if (nextCount === totalTeams) {
          setStage(4);
          triggerConfetti(true);
        } else {
          triggerConfetti(false);
        }
      } else {
        setStage(4);
        triggerConfetti(true);
      }
    }
  };

  const isWeeklyView = viewModeParam === "weekly";
  const headerTitle = isWeeklyView
    ? "Team Leader of the Week — Auditorium Reveal"
    : "Team of the Month — Grand Finale Auditorium Reveal";

  return (
    <div className="min-h-screen bg-[#070913] text-white p-4 sm:p-8 space-y-6 relative overflow-hidden select-none font-sans">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/employee-of-the-week"
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all border border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{isWeeklyView ? "Weekly Evaluation" : "Monthly Team Aggregation"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {headerTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <DatePicker
            picker="month"
            allowClear={false}
            value={dayjs(selectedMonth, "YYYY-MM")}
            onChange={(date, dateString) => {
              if (dateString) {
                const formatted = Array.isArray(dateString) ? dateString[0] : dateString;
                setSelectedMonth(formatted);
              }
            }}
            className="bg-slate-800 text-white font-bold border-slate-700 rounded-2xl py-2"
          />

          <button
            onClick={() => fetchDeclaredResults(selectedMonth)}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all border border-slate-700 cursor-pointer"
            title="Reload Results"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-32 text-center relative z-10"><Spin size="large" /></div>
      ) : !declaredData || !declaredData.teams || declaredData.teams.length === 0 ? (
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-16 text-center text-slate-400 space-y-4 max-w-2xl mx-auto my-12 relative z-10">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto" />
          <h2 className="text-2xl font-bold text-white">No Declared Results Found for {selectedMonth}</h2>
          <p className="text-sm text-slate-400">
            Please go to the <Link href="/employee-of-the-week" className="text-blue-400 underline font-bold">Employee of the Week</Link> page, select weekly meetings, and click <strong>"Declare Team Result"</strong> first.
          </p>
        </div>
      ) : (
        <div className="space-y-6 relative z-10 max-w-7xl mx-auto">
          {/* Action & Controls Toolbar */}
          <div className="bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm font-semibold text-slate-300">
              Evaluation Month: <span className="text-amber-400 font-extrabold">{selectedMonth}</span> | Teams Competing: <span className="text-blue-400 font-extrabold">{declaredData.teams.length}</span>
            </div>

            <div className="flex items-center gap-3">
              {stage < 4 ? (
                <button
                  onClick={handleNextStage}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-wider text-xs sm:text-sm"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  {stage === 0 ? "Start Auditorium Reveal" : stage === 1 ? "Reveal EOM Averages" : stage === 2 ? "Reveal Team Standings" : "Reveal Next Rank"}
                </button>
              ) : (
                <button
                  onClick={() => { setStage(0); setRevealedTeamCount(0); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-2xl transition-all border border-amber-500/30 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Replay Reveal Animation
                </button>
              )}
            </div>
          </div>

          {/* Grand Finale Champion Spotlight Banner */}
          {stage === 4 && declaredData.teams.length > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 15 }}
              className="bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400/80 p-8 sm:p-12 rounded-3xl text-center space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Crown className="w-12 h-12 fill-slate-950" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-black text-amber-300 uppercase tracking-widest">
                  🏆 TEAM OF THE MONTH CHAMPION 🏆
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  {declaredData.teams[0].department} TEAM
                </h2>
              </div>

              {declaredData.teams[0].teamLeaders?.length > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/20 border border-amber-400/50 rounded-full text-amber-200 text-sm sm:text-base font-bold">
                  👑 Team Leader: {declaredData.teams[0].teamLeaders.map((tl: any) => tl.name).join(", ")}
                </div>
              )}

              <div className="text-2xl sm:text-3xl font-black text-amber-400">
                Grand Total Score: {declaredData.teams[0].grandTotal} pts
              </div>
            </motion.div>
          )}

          {/* 4-Week Breakdown & Standings Table */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Team Standings Breakdown ({declaredData.teams.length} Teams)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <th className="py-4 px-4 text-center w-16">Rank</th>
                    <th className="py-4 px-6 min-w-[200px]">Team / Department</th>
                    <th className="py-4 px-6 min-w-[180px]">Team Leader(s)</th>
                    <th className="py-4 px-4 text-center min-w-[130px]">4-Week Total</th>
                    <th className="py-4 px-4 text-center min-w-[150px] bg-blue-950/40 text-blue-300">Team EOM Avg</th>
                    <th className="py-4 px-6 text-center min-w-[140px] bg-amber-950/40 text-amber-300 font-extrabold">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold">
                  {declaredData.teams.map((team: any, index: number) => {
                    const totalTeams = declaredData.teams.length;
                    const reverseIdx = totalTeams - index;
                    const isVisible = stage >= 3 ? reverseIdx <= revealedTeamCount : stage > 0;
                    const isWinner = index === 0 && stage === 4;

                    return (
                      <tr
                        key={team.department}
                        className={`transition-all ${
                          isWinner
                            ? "bg-amber-500/20 text-white border-l-4 border-l-amber-400"
                            : isVisible
                            ? "hover:bg-slate-800/50 text-slate-200"
                            : "opacity-25 blur-xs"
                        }`}
                      >
                        <td className="py-4 px-4 text-center font-black text-sm">
                          {isWinner ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black shadow-md">
                              1
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">#{team.rank || index + 1}</span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-extrabold text-sm sm:text-base text-white">{team.department} Team</div>
                          <div className="text-xs text-slate-400 font-normal">
                            {(team.members?.length || 0) + (team.teamLeaders?.length || 0)} Total Members
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          {team.teamLeaders?.length > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold">
                              <span>👑</span>
                              <span>{team.teamLeaders.map((tl: any) => tl.name).join(", ")}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">No TL</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center font-bold text-slate-300">
                          {stage >= 1 ? `${team.weeklyTotal} pts` : "•••"}
                        </td>

                        <td className="py-4 px-4 text-center font-extrabold text-blue-300 bg-blue-950/20">
                          {stage >= 2 ? `${team.eomAverage} pts` : "•••"}
                        </td>

                        <td className="py-4 px-6 text-center font-black text-amber-400 text-base bg-amber-950/20">
                          {isVisible ? `${team.grandTotal} pts` : "•••"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
