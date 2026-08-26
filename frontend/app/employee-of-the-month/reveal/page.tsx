"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, ArrowLeft, Sparkles, Crown, Flame, ShieldAlert, Zap, RefreshCw, Maximize, Minimize, ArrowUpRight, TrendingUp } from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUser } from "@/hooks/useUser";
import { Spin } from "antd";
// @ts-ignore
import { motion } from "framer-motion";
import dayjs from "dayjs";

// Canvas Confetti Generator for Grand Finale & Visual Effects
const triggerConfetti = (isGrandFinale = false) => {
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
    const colors = ["#22D3EE", "#FBBF24", "#A855F7", "#EC4899", "#10B981", "#3B82F6", "#FFFFFF"];
    const count = isGrandFinale ? 450 : 140;

    for (let i = 0; i < count; i++) {
      pieces.push({
        x: isGrandFinale ? Math.random() * canvas.width : canvas.width / 2,
        y: isGrandFinale ? canvas.height : canvas.height / 2,
        vx: (Math.random() - 0.5) * (isGrandFinale ? 32 : 20),
        vy: (Math.random() - (isGrandFinale ? 0.95 : 0.8)) * (isGrandFinale ? 28 : 20),
        size: Math.random() * 10 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 14,
        opacity: 1
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.opacity -= 0.007;
        p.rotation += p.rSpeed;

        if (p.opacity > 0) {
          alive = true;
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
      if (alive && frame < 300) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    animate();
  } catch (e) {
    console.error(e);
  }
};

const triggerGrandFinaleConfetti10s = () => {
  try {
    const endTime = Date.now() + 10 * 1000;
    const interval: any = setInterval(() => {
      if (Date.now() > endTime) {
        clearInterval(interval);
        return;
      }
      triggerConfetti(true);
    }, 1100);
    triggerConfetti(true);
  } catch (e) {
    console.error(e);
  }
};

interface Criterion {
  id: string;
  name: string;
  maxScore: number;
  entryType?: string;
  category?: string;
}

interface Candidate {
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  totalScore: number;
  rank: number;
  avatar?: string;
  criteriaScores: Record<string, number>;
  role?: string;
}

export interface DynamicIntermissionData {
  categoryKey: string;
  roleName: string;
  emoji: string;
  jokeText: string;
  candidateName: string;
  candidateAvatar?: string;
  candidateDesignation?: string;
}

// Joke Category to Employee Role Mapping Config
export const JOKE_CATEGORY_ROLE_MAP: Record<string, string> = {
  "Developer": "Developer",
  "Graphic Designer": "Graphic Designer",
  "Digital Marketing": "Digital Marketing",
  "Video Editor": "Video Editor",
  "HR": "HR",
  "Project Manager": "Developer", // PM jokes pick dynamic name from Developer list!
  "Team Leader": "Team Leader",
  "Sales / BDE": "Sales / BDE",
  "CEO": "Admin",                // CEO jokes pick dynamic name from Admin list!
  "COO": "Admin"                 // COO jokes pick dynamic name from Admin list!
};

// Gujarati Joke Lines Pool (3 Punchy Lines Per Role Category = 30 Total)
export const GUJARATI_JOKES: Record<string, { roleName: string; emoji: string; lines: string[] }> = {
  "Developer": {
    roleName: "Developer 👨‍💻",
    emoji: "👨‍💻",
    lines: [
      "{name} ne pucho 'code ready chhe?' — jawab male 'haa, 90% thai gayu' — chhella 2 athvadiya thi e j 90%.",
      "{name} nu motto: 'It\\'s not a bug, it\\'s a feature' — client nu motto: 'to salary pan feature gano ne'.",
      "{name} server restart kare etle aakhi office ne lunch break mali jay — 'server down chhe' na name e."
    ]
  },
  "Graphic Designer": {
    roleName: "Graphic Designer 🎨",
    emoji: "🎨",
    lines: [
      "{name} e logo na 50 versions banavya — client e finalize karyu version number 1.",
      "{name} ne 'font thodo change karo' kaho etle e 3 kalak Google Fonts ma khovai jay.",
      "{name} nu favorite shabd: 'aa font best lagshe' — client nu favorite shabd: 'na, teano nahi'."
    ]
  },
  "Digital Marketing": {
    roleName: "Digital Marketing 📱",
    emoji: "📱",
    lines: [
      "{name} na campaign nu reach 200 hatu — 150 to potana family group mathi.",
      "{name} roj 'trending topic' shodhe chhe — office ni gapsap karta trending kai nathi hotu.",
      "{name} nu report kahe 'growth 20%' — CEO puche 'growth ka 20% ya excuse ka 20%?'"
    ]
  },
  "Video Editor": {
    roleName: "Video Editor 🎬",
    emoji: "🎬",
    lines: [
      "{name} export button dabave etle laptop e potanu resignation mangi le.",
      "{name} ne 'fakt 2 second kapo' kaho etle aakhu video pachi edit kare.",
      "{name} nu render 99% par atke chhe — barabar lunch time aave tyare."
    ]
  },
  "HR": {
    roleName: "HR 📋",
    emoji: "📋",
    lines: [
      "{name} badhani leave manzur kare — potani leave ni file 'system ma issue chhe' kahine tale.",
      "{name} interview le tyare candidate ne lage e pote interview api rahya chhe.",
      "{name} nu favorite sawal: 'tamari weakness shu chhe?' — badha nu jawab: 'tame'."
    ]
  },
  "Project Manager": {
    roleName: "Project Manager 📊",
    emoji: "📊",
    lines: [
      "{name} roj puche 'ETA shu chhe?' — potanu lunch order 2 kalak thi 'ETA 10 min' chhe.",
      "{name} deadline set kare 'Friday' — team samje 'next Friday'.",
      "{name} meeting bolave 'quick sync' karva — 1 kalak pachi pan sync nathi thayu."
    ]
  },
  "Team Leader": {
    roleName: "Team Leader 🧑‍💼",
    emoji: "🧑‍💼",
    lines: [
      "{name} kahe 'team ma unity hovi joiye' — potana lunch order ma koine call j nathi karta.",
      "{name} ni review meeting ma sauthi vadhare 'good job' khud potane j aape.",
      "{name} target aape 100, achieve 60 kare, credit 100% le."
    ]
  },
  "Sales / BDE": {
    roleName: "Sales / BDE 📞",
    emoji: "📞",
    lines: [
      "{name} client ne kahe 'aa last price chhe' — 5 var 'last price' badlayo.",
      "{name} no follow-up etlo persistent k client have unknown number j block kari de.",
      "{name} target achieve kare mahina na last divase — 11:59 PM ni deal thi."
    ]
  },
  "CEO": {
    roleName: "CEO 👑",
    emoji: "👑",
    lines: [
      "{name} no phone aave etle badha SIDHA thai jay — call 'wrong number' hoy to pan.",
      "{name} kahe 'hard work no substitute nathi' — pote 3 vagye j nikli jay.",
      "{name} vision statement lakhe 5 paana nu — team ne 1 line pan yaad nathi."
    ]
  },
  "COO": {
    roleName: "COO 🏢",
    emoji: "🏢",
    lines: [
      "{name} kahe 'discipline sauthi important chhe' — potani meeting j 20 minute late shuru thay.",
      "{name} efficiency ni vaat kare, potanu inbox '999+ unread' rakhe.",
      "{name} process follow karva kahe — potani chai ni process kadi skip nathi thati."
    ]
  }
};

export default function AuditoriumRevealPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const monthYearParam = searchParams.get("month_year") || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [criteriaList, setCriteriaList] = useState<Criterion[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Fullscreen Presentation Mode State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Stage Management
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const totalStages = criteriaList.length > 0 ? criteriaList.length : 1;
  const isFinalStage = activeStageIndex === totalStages - 1;

  // Grand Finale Step-by-Step Reveal State & Highlight Tracker
  const [finaleRevealedIds, setFinaleRevealedIds] = useState<Set<string>>(new Set());
  const [finaleRevealQueue, setFinaleRevealQueue] = useState<Candidate[]>([]);
  const [justRevealedEmpId, setJustRevealedEmpId] = useState<string | null>(null);
  // Candidate currently mid-suspense-oscillation — position is teasing, score is still HIDDEN
  const [oscillatingEmpId, setOscillatingEmpId] = useState<string | null>(null);
  const [prevRanksMap, setPrevRanksMap] = useState<Record<string, number>>({});
  // Suspense Slot Machine Position Tease State
  const [animOverride, setAnimOverride] = useState<{ employeeId: string; rank: number } | null>(null);
  const [isStepFlash, setIsStepFlash] = useState(false);
  // Pre-Blast Golden Glow Pulse Wait State (candidate landed on real position, 600ms hold before BOOM)
  const [isGoldenGlowActive, setIsGoldenGlowActive] = useState(false);
  // Increments on every oscillation step-land, used to re-trigger a quick landing flash pulse
  const [oscillationFlashKey, setOscillationFlashKey] = useState(0);

  const [isTop2Showdown, setIsTop2Showdown] = useState(false);
  const [isWinnerAnnounced, setIsWinnerAnnounced] = useState(false);

  // Dynamic Gujarati Humor Intermission State
  const [activeIntermission, setActiveIntermission] = useState<DynamicIntermissionData | null>(null);
  const [showIntermissionPunchline, setShowIntermissionPunchline] = useState(false);
  const [usedCategoryKeys, setUsedCategoryKeys] = useState<Set<string>>(new Set());
  const [triggeredBreakStages, setTriggeredBreakStages] = useState<Set<number>>(new Set());

  // Drumroll & Dimmed Screen FX
  const [isDrumrollActive, setIsDrumrollActive] = useState(false);

  // Table Row DOM References for Auto-Scroll
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const tableScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const handleNextStepRef = useRef<() => void>(() => {});

  // Admin Role Permission Check
  const isAdmin = user && ["admin", "super admin", "superadmin", "administrator", "founder"].includes(String(user.role || "").toLowerCase().trim());

  // Scheduled Reveal Time Locking State
  const [scheduledRevealTime, setScheduledRevealTime] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);
  const [countdownText, setCountdownText] = useState<string>("");

  // Helper to generate Grand Finale Reveal Sequence:
  // Non-Top-5 candidates (Rank 6..N) are revealed in a completely RANDOM order so no one can predict who comes next.
  // Top 5 candidates are held back and revealed at the very end in countdown order (Rank 5 -> 4 -> 3 -> Top 2 Showdown).
  const generateRevealQueue = (candList: Candidate[]): Candidate[] => {
    if (!candList || candList.length === 0) return [];
    const sorted = [...candList].sort((a, b) => b.totalScore - a.totalScore);

    if (sorted.length <= 5) {
      return sorted.slice(2).reverse();
    }

    // Top 5 are sorted[0..4] (Ranks 1 to 5)
    // Non-top 5 are sorted[5..] (Ranks 6 to N)
    const nonTop5 = [...sorted.slice(5)];
    // Fisher-Yates shuffle for non-top-5 candidates
    for (let i = nonTop5.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonTop5[i], nonTop5[j]] = [nonTop5[j], nonTop5[i]];
    }

    // Top 5 countdown: Rank 5 (index 4), Rank 4 (index 3), Rank 3 (index 2)
    const top5Countdown = [sorted[4], sorted[3], sorted[2]];

    return [...nonTop5, ...top5Countdown];
  };

  useEffect(() => {
    if (!scheduledRevealTime || adminUnlocked) return;
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(scheduledRevealTime).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setIsLocked(false);
        setCountdownText("");
      } else {
        setIsLocked(true);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownText(`${String(hours).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scheduledRevealTime, adminUnlocked]);

  useEffect(() => {
    fetchLeaderboardAndCriteria();
  }, [monthYearParam]);

  // Sync Fullscreen mode state & handle ESC key navigation back to dashboard
  useEffect(() => {
    // Attempt auto fullscreen on load
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    const handleFSChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
      if (!isFS) {
        // Exiting fullscreen returns user to dashboard!
        router.push("/employee-of-the-month");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          router.push("/employee-of-the-month");
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFSChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  // Smooth Auto-Scroll to Just Revealed Candidate Row in Grand Finale
  useEffect(() => {
    if (justRevealedEmpId) {
      setTimeout(() => {
        const targetRow = rowRefs.current[justRevealedEmpId];
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [justRevealedEmpId, finaleRevealedIds]);

  // Brief landing flash pulse on every oscillation step (visible "beat" so each pause reads clearly)
  useEffect(() => {
    if (oscillationFlashKey === 0) return;
    setIsStepFlash(true);
    const t = setTimeout(() => setIsStepFlash(false), 260);
    return () => clearTimeout(t);
  }, [oscillationFlashKey]);

  // Scroll-Follow: keep candidate row centered in viewport on EVERY suspense oscillation step
  useEffect(() => {
    if (isFinalStage && animOverride) {
      const t = setTimeout(() => {
        const targetRow = rowRefs.current[animOverride.employeeId];
        const container = tableScrollContainerRef.current;
        if (targetRow && container) {
          const rowTop = targetRow.offsetTop;
          const rowHeight = targetRow.offsetHeight;
          const containerHeight = container.clientHeight;
          const scrollToY = Math.max(0, rowTop - (containerHeight / 2) + (rowHeight / 2));
          container.scrollTo({ top: scrollToY, behavior: "smooth" });
        } else if (targetRow) {
          targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 30);
      return () => clearTimeout(t);
    }
  }, [isFinalStage, animOverride]);

  // When the Grand Finale winner is announced, snap the standings scroll back to the TOP
  // (rank #1 / the winner) so the audience sees the champion, not wherever the list last scrolled to.
  useEffect(() => {
    if (isWinnerAnnounced) {
      setTimeout(() => {
        if (tableScrollContainerRef.current) {
          tableScrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 150);
    }
  }, [isWinnerAnnounced]);

  // When top 5 unrevealed contenders mode is active, keep view focused on top unrevealed contenders
  useEffect(() => {
    if (isFinalStage && !animOverride && (candidates.length - finaleRevealedIds.size) <= 5) {
      setTimeout(() => {
        if (tableScrollContainerRef.current) {
          tableScrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    }
  }, [isFinalStage, finaleRevealedIds.size, animOverride]);

  // Spacebar Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.key === " " || e.keyCode === 32) && !loading) {
        e.preventDefault();
        handleNextStepRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading]);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeaderboardAndCriteria = async () => {
    setLoading(true);
    try {
      const cfgRes = await fetch(`${API_URL}/eom/month-config?month_year=${monthYearParam}`);
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.revealDateTime) {
          setScheduledRevealTime(cfgData.revealDateTime);
          if (new Date() < new Date(cfgData.revealDateTime)) {
            setIsLocked(true);
          }
        }
      }

      const res = await fetch(`${API_URL}/eom/leaderboard?month_year=${monthYearParam}`);
      if (res.ok) {
        const data = await res.json();
        const rawCriteria: Criterion[] = data.criteria || [];
        const rawLeaderboard: Candidate[] = data.leaderboard || [];

        setCriteriaList(rawCriteria);
        setCandidates(rawLeaderboard);
        setFinaleRevealQueue(generateRevealQueue(rawLeaderboard));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const finaleTargetOrder = [...candidates].sort((a, b) => b.totalScore - a.totalScore);

  // Trigger Dynamic Role-Based Gujarati Intermission
  const triggerGujaratiIntermission = () => {
    const allKeys = Object.keys(GUJARATI_JOKES);
    let availableKeys = allKeys.filter(k => !usedCategoryKeys.has(k));
    if (availableKeys.length === 0) availableKeys = allKeys;

    const selectedCategory = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    const categoryData = GUJARATI_JOKES[selectedCategory];

    const nextUsed = new Set(usedCategoryKeys);
    nextUsed.add(selectedCategory);
    setUsedCategoryKeys(nextUsed);

    // Map joke category to name source role
    const nameSourceRole = JOKE_CATEGORY_ROLE_MAP[selectedCategory] || selectedCategory;

    // Filter candidate list by nameSourceRole substring match
    let candidatePool = candidates.filter(c => {
      const desig = (c.designation || "").toLowerCase();
      const dept = (c.department || "").toLowerCase();
      const target = nameSourceRole.toLowerCase();
      if (target === "admin") {
        return desig.includes("admin") || desig.includes("director") || desig.includes("founder") || desig.includes("manager") || dept.includes("management");
      }
      return desig.includes(target) || dept.includes(target);
    });

    if (candidatePool.length === 0) {
      candidatePool = candidates;
    }

    const selectedCandidate = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    const selectedLine = categoryData.lines[Math.floor(Math.random() * categoryData.lines.length)];

    const jokeText = selectedLine.replace("{name}", selectedCandidate ? selectedCandidate.name : "Employee");

    setActiveIntermission({
      categoryKey: selectedCategory,
      roleName: categoryData.roleName,
      emoji: categoryData.emoji,
      jokeText,
      candidateName: selectedCandidate ? selectedCandidate.name : "Office RockStar",
      candidateAvatar: selectedCandidate ? selectedCandidate.avatar : undefined,
      candidateDesignation: selectedCandidate ? (selectedCandidate.designation || selectedCandidate.department) : "HK DigiVerse Team"
    });

    setShowIntermissionPunchline(false);
    setTimeout(() => {
      setShowIntermissionPunchline(true);
    }, 2400);
  };

  // Next Button Click Handler
  const handleNextStep = () => {
    if (criteriaList.length === 0 || candidates.length === 0) return;

    // Prevent double-fire (rapid spacebar/click) while a suspense oscillation or golden
    // glow pause is already running — otherwise scores can end up revealed out of order.
    if (oscillatingEmpId || isGoldenGlowActive) return;

    // Auto request fullscreen on presentation click if not active
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    // Spacebar / click dismisses intermissions!
    if (activeIntermission) {
      setActiveIntermission(null);
      return;
    }

    if (!isFinalStage) {
      // Regular criteria columns (Stage 0..N-2): Smooth reveal without position tease oscillations
      const nextStage = activeStageIndex + 1;
      setActiveStageIndex(nextStage);
      setJustRevealedEmpId(null);
      setTimeout(() => {
        triggerConfetti(false);
      }, 400);
    } else {
      // LAST STAGE (Final Column / Grand Finale): Random reveal for ranks 6..N, then Top 5 countdown!
      if (isWinnerAnnounced) return;

      const N = finaleTargetOrder.length;
      const currentRevealedCount = finaleRevealedIds.size;

      // Capture pre-reveal rank snapshot of all candidates
      const currentStandings = getDisplayList();
      const rankMap: Record<string, number> = {};
      currentStandings.forEach(item => {
        rankMap[item.employeeId] = item.rank;
      });
      setPrevRanksMap(rankMap);

      // Ensure reveal queue is populated
      const queue = finaleRevealQueue.length > 0 ? finaleRevealQueue : generateRevealQueue(candidates);
      if (finaleRevealQueue.length === 0 && queue.length > 0) {
        setFinaleRevealQueue(queue);
      }

      if (currentRevealedCount < N - 2) {
        const targetCandidateToReveal = queue[currentRevealedCount];
        if (targetCandidateToReveal) {
          const startRank = rankMap[targetCandidateToReveal.employeeId] || N;
          const targetFinalRank = finaleTargetOrder.findIndex(c => c.employeeId === targetCandidateToReveal.employeeId) + 1;

          // Trigger slot machine suspense oscillation (5 random rank jumps -> targetFinalRank)!
          triggerSuspenseOscillation(targetCandidateToReveal.employeeId, startRank, targetFinalRank, () => {
            const nextSet = new Set(finaleRevealedIds);
            nextSet.add(targetCandidateToReveal.employeeId);
            setFinaleRevealedIds(nextSet);
            setJustRevealedEmpId(targetCandidateToReveal.employeeId);

            if (nextSet.size === N - 2) {
              setIsTop2Showdown(true);
            }

            triggerConfetti(false);
          });
        }
      } else if (isTop2Showdown || currentRevealedCount === N - 2) {
        const nextSet = new Set(finaleRevealedIds);
        if (finaleTargetOrder[0]) nextSet.add(finaleTargetOrder[0].employeeId);
        if (finaleTargetOrder[1]) nextSet.add(finaleTargetOrder[1].employeeId);

        setFinaleRevealedIds(nextSet);
        if (finaleTargetOrder[0]) setJustRevealedEmpId(finaleTargetOrder[0].employeeId);
        setIsTop2Showdown(false);
        setIsWinnerAnnounced(true);

        // Continuous 10-Second Finale Confetti Blast!
        triggerGrandFinaleConfetti10s();
      }
    }
  };

  handleNextStepRef.current = handleNextStep;

  const handleResetStage = () => {
    setActiveStageIndex(0);
    setFinaleRevealedIds(new Set());
    setJustRevealedEmpId(null);
    setOscillatingEmpId(null);
    setAnimOverride(null);
    setIsGoldenGlowActive(false);
    setPrevRanksMap({});
    setIsTop2Showdown(false);
    setIsWinnerAnnounced(false);
    setActiveIntermission(null);
    setUsedCategoryKeys(new Set());
    setTriggeredBreakStages(new Set());
    setIsDrumrollActive(false);
    setFinaleRevealQueue(generateRevealQueue(candidates));
  };

  const getDisplayedEmployeeData = (emp: Candidate) => {
    if (!isFinalStage) {
      const revealedCols = criteriaList.slice(0, activeStageIndex + 1);
      let stageTotal = 0;
      const colScores: Record<string, string | number> = {};

      revealedCols.forEach(col => {
        const sc = emp.criteriaScores?.[col.id] ?? 0;
        colScores[col.id] = sc.toFixed(2);
        stageTotal += sc;
      });

      return {
        stageTotal: Number(stageTotal.toFixed(2)),
        colScores
      };
    } else {
      const prevCols = criteriaList.slice(0, criteriaList.length - 1);
      const finalCol = criteriaList[criteriaList.length - 1];

      let prevSum = 0;
      const colScores: Record<string, string | number> = {};

      prevCols.forEach(col => {
        const sc = emp.criteriaScores?.[col.id] ?? 0;
        colScores[col.id] = sc.toFixed(2);
        prevSum += sc;
      });

      const isFinaleRevealed = finaleRevealedIds.has(emp.employeeId);

      if (isFinaleRevealed) {
        const finalSc = emp.criteriaScores?.[finalCol.id] ?? 0;
        colScores[finalCol.id] = finalSc.toFixed(2);
        return {
          stageTotal: Number((prevSum + finalSc).toFixed(2)),
          colScores,
          isFinaleRevealed: true
        };
      } else {
        colScores[finalCol.id] = "???";
        return {
          stageTotal: Number(prevSum.toFixed(2)),
          colScores,
          isFinaleRevealed: false
        };
      }
    }
  };

  const triggerSuspenseOscillation = (employeeId: string, startRank: number, targetRank: number, onComplete: () => void) => {
    const N = candidates.length || 20;
    
    // Generate 5 completely RANDOM position jumps across 1..N range
    const randomSteps: number[] = [];
    let prev = startRank;
    while (randomSteps.length < 5) {
      const r = Math.floor(Math.random() * N) + 1;
      if (r !== prev) {
        randomSteps.push(r);
        prev = r;
      }
    }
    // 6th step is always the true target rank landing!
    const steps = [...randomSteps, targetRank];

    setOscillatingEmpId(employeeId);
    const STEP_DURATION_MS = 2000; // 2.0 full seconds per tease step for crystal-clear auditorium visibility!
    const GOLDEN_GLOW_HOLD_MS = 1200; // 1.2 seconds pre-blast golden glow hold

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setAnimOverride({ employeeId, rank: steps[stepIndex] });
        setOscillationFlashKey(prev => prev + 1);
        stepIndex++;
      } else {
        clearInterval(interval);
        setAnimOverride(null);
        setOscillatingEmpId(null);
        setIsGoldenGlowActive(true);
        setTimeout(() => {
          setIsGoldenGlowActive(false);
          onComplete();
        }, GOLDEN_GLOW_HOLD_MS);
      }
    }, STEP_DURATION_MS);
  };

  const getDisplayList = () => {
    const list = candidates.map(emp => {
      const data = getDisplayedEmployeeData(emp);
      return {
        ...emp,
        ...data
      };
    });

    let resultList = list;

    if (!isFinalStage) {
      list.sort((a, b) => b.stageTotal - a.stageTotal);
      list.forEach((item, idx) => {
        item.rank = idx + 1;
      });
      resultList = list;
    } else {
      const combined = [...list];
      combined.sort((a, b) => {
        if (a.isFinaleRevealed && b.isFinaleRevealed) {
          return b.totalScore - a.totalScore;
        }
        if (a.isFinaleRevealed && !b.isFinaleRevealed) {
          return a.totalScore > b.stageTotal ? -1 : 1;
        }
        if (!a.isFinaleRevealed && b.isFinaleRevealed) {
          return b.totalScore > a.stageTotal ? 1 : -1;
        }
        return b.stageTotal - a.stageTotal;
      });

      combined.forEach((item, idx) => {
        item.rank = idx + 1;
      });
      resultList = combined;
    }

    if (animOverride) {
      const targetEmpIndex = resultList.findIndex(e => e.employeeId === animOverride.employeeId);
      if (targetEmpIndex !== -1) {
        const item = resultList.splice(targetEmpIndex, 1)[0];
        const targetIndex = Math.max(0, Math.min(resultList.length, animOverride.rank - 1));
        resultList.splice(targetIndex, 0, item);
        resultList.forEach((e, i) => {
          e.rank = i + 1;
        });
      }
    }

    return resultList;
  };

  const displayList = getDisplayList();
  const top1 = displayList[0];
  const top2 = displayList[1];
  const top3 = displayList[2];

  const currentRevealedCols = !isFinalStage
    ? criteriaList.slice(0, activeStageIndex + 1)
    : criteriaList;

  // Access Guard
  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0D18] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl backdrop-blur-xl">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-black text-white">ACCESS RESTRICTED</h2>
          <p className="text-xs text-slate-400">
            Only Admins and Super Admins have authorization to view the LIVE Auditorium Reveal presentation engine.
          </p>
          <Link
            href="/employee-of-the-month"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isLocked && !adminUnlocked) {
    return (
      <div className="fixed inset-0 z-[999999] bg-[#0A0D18] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6 relative overflow-hidden">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-400/20 shadow-inner">
            <Trophy className="w-10 h-10 text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-400/30 uppercase tracking-widest">
              🔒 Auditorium Reveal Locked
            </span>
            <h2 className="text-2xl font-black text-white">Event Scheduled</h2>
            <p className="text-sm text-slate-400">
              The Grand Auditorium Reveal for <span className="text-amber-400 font-bold">{monthYearParam}</span> is locked until the scheduled time.
            </p>
          </div>

          {scheduledRevealTime && (
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Scheduled Date & Time</div>
              <div className="text-base font-black text-amber-300">
                {dayjs(scheduledRevealTime).format("DD MMMM YYYY • hh:mm A")}
              </div>
              {countdownText && (
                <div className="text-lg font-mono font-bold text-cyan-400 mt-2">
                  Reveals in: {countdownText}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
            {isAdmin && (
              <button
                onClick={() => setAdminUnlocked(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all uppercase tracking-wider cursor-pointer"
              >
                🔓 Override Unlock (Admin Access)
              </button>
            )}
            <Link
              href="/employee-of-the-month"
              className="inline-flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`text-white p-4 sm:p-8 space-y-6 relative select-none font-sans transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-[999999] bg-[#0A0D18] overflow-y-auto w-screen h-screen"
          : "min-h-screen bg-gradient-to-b from-[#0A0D18] via-[#120F2B] to-[#0A0D18]"
      }`}
    >
      {/* Background Tech Conference Glow Grid & Code Snippet Binary Dust */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-purple-500/5 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Floating Binary Dust Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <div className="absolute top-12 left-10 text-cyan-400/40 text-xs font-mono animate-pulse">01001000 01001011</div>
        <div className="absolute top-1/3 right-12 text-purple-400/30 text-xs font-mono animate-pulse">const winner = true;</div>
        <div className="absolute bottom-20 left-1/4 text-amber-400/30 text-xs font-mono animate-pulse">&lt;reveal_stage index={activeStageIndex} /&gt;</div>
      </div>

      {/* Auditorium Top Bar Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/employee-of-the-month"
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700/60 backdrop-blur-md transition-all shadow-lg hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-amber-300 to-purple-400 uppercase">
                EMPLOYEE OF THE MONTH
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-widest uppercase">
              HK DIGIVERSE LLP • {monthYearParam}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Fullscreen Mode Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-2xl border transition-all shadow-lg hover:scale-105 ${
              isFullscreen
                ? "bg-amber-500/20 text-amber-300 border-amber-400"
                : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/60"
            }`}
            title="Toggle Auditorium Fullscreen Presentation Mode (F11)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN SHOW"}</span>
          </button>

          <div className="px-3.5 py-2 bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-xs font-mono font-bold rounded-2xl shadow-inner backdrop-blur-md">
            Stage {activeStageIndex + 1} of {totalStages}
          </div>

          <button
            onClick={handleResetStage}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-slate-700/60 backdrop-blur-md transition-all shadow-lg hover:scale-105"
            title="Reset Reveal Stage"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {(!isFinalStage || !isWinnerAnnounced) && (
            <button
              onClick={handleNextStep}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-400 via-purple-600 to-amber-400 hover:from-cyan-300 hover:to-amber-300 text-slate-950 text-xs sm:text-sm font-black rounded-2xl transition-all shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              NEXT
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-32 text-center"><Spin size="large" /></div>
      ) : (
        <div className="space-y-6 relative z-10">
          {/* Glassmorphism 3D Podium Container */}
          <div className="bg-gradient-to-b from-[#13192B]/90 via-[#0F1426]/90 to-[#0A0D18]/90 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-full max-w-lg h-40 bg-gradient-to-b from-cyan-500/15 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-2xl mx-auto pt-6 pb-2 relative z-10">
              {/* 2nd Place Glass Stand (Cyan-Silver Glow) */}
              <div className="text-center space-y-2">
                {top2 ? (
                  <div className="space-y-1 transition-all duration-500">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 text-cyan-300 font-black flex items-center justify-center mx-auto text-base border-2 border-cyan-400 shadow-lg shadow-cyan-500/30">
                      {top2.name.charAt(0)}
                    </div>
                    <p className="text-xs font-extrabold text-slate-200 truncate max-w-[100px] mx-auto">{top2.name}</p>
                    <span className="inline-block px-2.5 py-0.5 bg-slate-900/90 text-cyan-400 font-mono font-bold text-xs rounded-lg border border-cyan-500/40">
                      {top2.stageTotal.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-slate-800/50 rounded-full mx-auto" />
                )}
                <div className="h-28 sm:h-32 bg-gradient-to-t from-slate-900/90 via-slate-800/80 to-cyan-950/40 rounded-t-2xl border-t-2 border-x border-cyan-400/80 shadow-2xl shadow-cyan-500/20 backdrop-blur-md flex items-center justify-center">
                  <span className="text-3xl font-black text-cyan-300/80">2</span>
                </div>
              </div>

              {/* 1st Place Glass Stand (Gold Spotlight & Glowing Ring) */}
              <div className="text-center space-y-2 -translate-y-4">
                {top1 ? (
                  <div className="space-y-1 transition-all duration-500 relative">
                    <Crown className="w-8 h-8 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                    
                    {/* Top Spotlight Beam */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-32 bg-gradient-to-b from-amber-400/25 to-transparent blur-md pointer-events-none" />

                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-950 text-amber-300 font-black flex items-center justify-center mx-auto text-xl border-4 border-amber-400 shadow-2xl shadow-amber-500/50 ring-4 ring-amber-500/20 animate-pulse">
                      {top1.name.charAt(0)}
                    </div>
                    <p className="text-xs sm:text-sm font-black text-amber-200 truncate max-w-[120px] mx-auto drop-shadow-md">
                      {top1.name}
                    </p>
                    <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 font-mono font-black text-xs sm:text-sm rounded-xl border border-amber-400/80 shadow-lg shadow-amber-500/30">
                      {top1.stageTotal.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full mx-auto" />
                )}
                <div className="h-36 sm:h-44 bg-gradient-to-t from-amber-950/90 via-amber-900/40 to-yellow-500/20 rounded-t-2xl border-t-4 border-x border-amber-400 shadow-2xl shadow-amber-500/30 backdrop-blur-xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                  <span className="text-4xl font-black text-amber-300/90">1</span>
                </div>
              </div>

              {/* 3rd Place Glass Stand (Bronze-Orange Glow) */}
              <div className="text-center space-y-2">
                {top3 ? (
                  <div className="space-y-1 transition-all duration-500">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 text-orange-300 font-black flex items-center justify-center mx-auto text-base border-2 border-orange-400 shadow-lg shadow-orange-500/30">
                      {top3.name.charAt(0)}
                    </div>
                    <p className="text-xs font-extrabold text-slate-200 truncate max-w-[100px] mx-auto">{top3.name}</p>
                    <span className="inline-block px-2.5 py-0.5 bg-slate-900/90 text-orange-400 font-mono font-bold text-xs rounded-lg border border-orange-500/40">
                      {top3.stageTotal.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-slate-800/50 rounded-full mx-auto" />
                )}
                <div className="h-24 sm:h-28 bg-gradient-to-t from-slate-900/90 via-slate-800/80 to-orange-950/40 rounded-t-2xl border-t-2 border-x border-orange-400/80 shadow-2xl shadow-orange-500/20 backdrop-blur-md flex items-center justify-center">
                  <span className="text-3xl font-black text-orange-300/80">3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 2 Showdown Glowing Modal Banner */}
          {isTop2Showdown && (
            <div className="p-4 bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 border-2 border-purple-400 rounded-2xl text-center space-y-1 shadow-2xl shadow-purple-500/40">
              <p className="text-xs font-black uppercase tracking-widest text-purple-300 flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-purple-400 animate-bounce" /> TOP 2 SIMULTANEOUS SHOWDOWN <Zap className="w-5 h-5 text-purple-400 animate-bounce" />
              </p>
              <p className="text-xs text-purple-200 font-bold">
                Press NEXT CRITERIA (Spacebar) for simultaneous 1st & 2nd place coronation reveal!
              </p>
            </div>
          )}

          {/* Winner Announcement Banner */}
          {isWinnerAnnounced && top1 && (
            <div className="p-6 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400 rounded-3xl text-center space-y-2 animate-bounce shadow-2xl shadow-amber-500/50 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-widest text-amber-300 flex items-center justify-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> HK DIGIVERSE EMPLOYEE OF THE MONTH <Crown className="w-5 h-5 text-amber-400" />
              </p>
              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-lg">{top1.name}</h3>
              <p className="text-xs sm:text-sm text-slate-300 font-bold">{top1.designation} • {top1.department}</p>
            </div>
          )}

          {/* Dynamic Live Standings Glass Table */}
          <div className="bg-[#111625]/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 border-b border-slate-800/80 pb-3 gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> DASHBOARD
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* {activeStageIndex >= totalStages - 1 && top1 && top2 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-rose-500/20 border border-rose-500/50 rounded-full text-[11px] font-black text-rose-300 animate-pulse shadow-lg">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    HIGH STAKES SHOWDOWN — LEADER MARGIN: {(top1.stageTotal - top2.stageTotal).toFixed(2)} PTS!
                  </span>
                )} */}
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800 px-3 py-1 rounded-full font-bold shadow-inner">
                  {currentRevealedCols.length} OF {totalStages} CRITERIA REVEALED
                </span>
              </div>
            </div>

            <div ref={tableScrollContainerRef} className="overflow-x-auto rounded-2xl border border-slate-800 max-h-[580px] overflow-y-auto scroll-smooth">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 w-[70px] text-center">RANK</th>
                    <th className="py-3.5 px-4 min-w-[200px]">EMPLOYEE</th>

                    {currentRevealedCols.map((c) => (
                      <th key={c.id} className="py-3.5 px-4 text-center min-w-[130px] border-l border-slate-800/60 bg-slate-900/40">
                        <span className="text-slate-200 font-black block">{c.name.toUpperCase()}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({c.maxScore})</span>
                      </th>
                    ))}

                    <th className="py-3.5 px-4 text-right min-w-[130px] border-l border-slate-800 bg-slate-900/80">
                      PROGRESSIVE TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {displayList.map((emp) => {
                    const isRank1 = emp.rank === 1;
                    const isRank2 = emp.rank === 2;
                    const isRank3 = emp.rank === 3;
                    const isJustRevealed = justRevealedEmpId === emp.employeeId;

                    const prevRank = prevRanksMap[emp.employeeId];
                    const rankShifted = prevRank && prevRank !== emp.rank;
                    const climbedUp = prevRank && prevRank > emp.rank;

                    const isTeasingRow = animOverride?.employeeId === emp.employeeId || oscillatingEmpId === emp.employeeId;
                    const unrevealedCount = candidates.length - finaleRevealedIds.size;
                    const isTop5Unrevealed = isFinalStage && !emp.isFinaleRevealed && unrevealedCount <= 5;

                    return (
                      <motion.tr
                        layout="position"
                        transition={{ type: "spring", stiffness: 260, damping: 30 }}
                        key={emp.employeeId}
                        ref={(el: HTMLTableRowElement | null) => {
                          rowRefs.current[emp.employeeId] = el as any;
                        }}
                        className={`${
                          isTeasingRow
                            ? "bg-gradient-to-r from-amber-500/40 via-yellow-400/35 to-amber-500/40 border-l-4 border-l-amber-300 border-r-4 border-r-amber-300 shadow-2xl shadow-amber-500/40 text-amber-100 font-black z-50 relative ring-2 ring-amber-400/90 brightness-125"
                            : isJustRevealed && rankShifted
                            ? climbedUp
                              ? "bg-gradient-to-r from-emerald-500/30 via-amber-500/25 to-emerald-500/30 border-l-4 border-l-emerald-400 border-r-4 border-r-emerald-400 shadow-2xl z-30 relative font-bold text-emerald-100"
                              : "bg-gradient-to-r from-rose-500/30 via-amber-500/25 to-rose-500/30 border-l-4 border-l-rose-400 border-r-4 border-r-rose-400 shadow-2xl z-30 relative font-bold text-rose-100"
                            : isJustRevealed
                            ? "bg-gradient-to-r from-amber-500/30 via-yellow-500/25 to-amber-500/30 border-l-4 border-l-amber-400 border-r-4 border-r-amber-400 shadow-2xl z-30 relative font-bold text-amber-100"
                            : isTop5Unrevealed
                            ? "bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border-l-4 border-l-amber-400 border-r-4 border-r-amber-400 font-extrabold text-amber-100 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/60 animate-pulse z-20 relative"
                            : isRank1
                            ? "bg-amber-500/10 border-l-4 border-l-amber-400 hover:bg-amber-500/20 font-bold"
                            : isRank2
                            ? "bg-cyan-500/5 hover:bg-cyan-500/10"
                            : isRank3
                            ? "bg-orange-500/5 hover:bg-orange-500/10"
                            : "hover:bg-slate-800/40"
                        } ${
                          isGoldenGlowActive && isJustRevealed
                            ? "ring-2 ring-amber-300 ring-inset animate-pulse"
                            : isStepFlash && isTeasingRow
                            ? "ring-2 ring-cyan-300 ring-inset brightness-125"
                            : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs font-mono ${
                              isJustRevealed
                                ? "bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/50"
                                : isRank1
                                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/50"
                                : isRank2
                                ? "bg-cyan-400 text-slate-950"
                                : isRank3
                                ? "bg-orange-400 text-slate-950"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {emp.rank}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                isJustRevealed || isRank1
                                  ? "bg-amber-400 text-slate-950 font-black"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {emp.name.charAt(0)}
                            </div>
                            <div className="truncate max-w-[150px] sm:max-w-[240px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`font-bold text-xs sm:text-sm truncate ${isJustRevealed ? "text-amber-200 font-black" : isRank1 ? "text-amber-200 font-extrabold" : "text-slate-200"}`}>
                                  {emp.name}
                                </p>
                                {isTeasingRow && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-md uppercase tracking-wider shadow-md shadow-amber-400/50 animate-pulse">
                                    <Zap className="w-3 h-3 text-slate-950 fill-slate-950" /> JUMPED TO #{emp.rank}
                                  </span>
                                )}
                                {isJustRevealed && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-md uppercase tracking-wider shadow-md">
                                    <Sparkles className="w-3 h-3 text-slate-950" /> REVEALED
                                  </span>
                                )}
                                {isJustRevealed && rankShifted && (
                                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${
                                    climbedUp ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"
                                  }`}>
                                    <TrendingUp className="w-3 h-3" /> #{prevRank} ➔ #{emp.rank}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">{emp.designation || emp.department}</p>
                            </div>
                          </div>
                        </td>

                        {currentRevealedCols.map((c, colIndex) => {
                          const sc = emp.colScores?.[c.id];
                          const isUnrevealed = sc === "???";
                          const isLastColumnCell = isFinalStage && colIndex === currentRevealedCols.length - 1;

                          return (
                            <td
                              key={c.id}
                              className={`py-3.5 px-4 text-center border-l border-slate-800/60 font-mono text-xs sm:text-sm font-bold ${
                                isJustRevealed && isLastColumnCell
                                  ? "bg-amber-400/25 text-amber-300 font-black border-amber-400"
                                  : ""
                              }`}
                            >
                              {isUnrevealed ? (
                                <span className="px-2 py-0.5 bg-slate-900 text-slate-500 rounded font-mono border border-slate-800">
                                  ???
                                </span>
                              ) : (
                                <span className={isJustRevealed || isRank1 ? "text-amber-300 font-black text-sm" : "text-slate-200"}>
                                  {sc}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-4 text-right border-l border-slate-800 font-mono font-black text-sm sm:text-base">
                          <span
                            className={`px-3 py-1 rounded-xl border ${
                              isJustRevealed
                                ? "bg-amber-400 text-slate-950 border-amber-300 shadow-xl font-black"
                                : isRank1
                                ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20"
                                : isRank2
                                ? "bg-cyan-500/10 border-cyan-400/50 text-cyan-300"
                                : isRank3
                                ? "bg-orange-500/10 border-orange-400/50 text-orange-300"
                                : "bg-slate-900 border-slate-700 text-slate-300"
                            }`}
                          >
                            {emp.stageTotal.toFixed(2)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Blast Golden Glow Pulse Wait (600ms hold right after candidate lands on real position, before BOOM confetti) */}
      {isGoldenGlowActive && (
        <div className="fixed inset-0 z-[99997] pointer-events-none flex items-center justify-center">
          <div className="w-80 h-80 bg-amber-400/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute inset-0 bg-amber-400/5 animate-pulse" />
        </div>
      )}

      {/* Drumroll Overlay FX */}
      {isDrumrollActive && (
        <div className="fixed inset-0 z-[99998] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="text-6xl">🥁</div>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-300 uppercase tracking-widest drop-shadow-xl">
              DRUMROLL... STANDINGS SHAKING UP!
            </h2>
            <p className="text-xs text-slate-300 font-mono">Calculating rank shifts...</p>
          </div>
        </div>
      )}

      {/* Role-Based Gujarati Fun Intermission Overlay Modal */}
      {activeIntermission && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="max-w-md w-full bg-gradient-to-b from-rose-950 via-slate-900 to-indigo-950 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-rose-500/30 relative overflow-hidden transform scale-105 transition-all">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Suspense Header Question Box */}
            <div className="space-y-3">
              <span className="inline-block px-3.5 py-1 bg-rose-500/20 text-rose-300 font-mono font-bold text-xs rounded-full border border-rose-500/40 uppercase tracking-widest">
                {activeIntermission.roleName}
              </span>

              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase drop-shadow-md leading-snug">
                "તમને શું લાગે છે, આ મંથ નો <span className="text-amber-400">Employee of the Month</span> કોણ બનશે?"
              </h2>

              {/* Dynamic Candidate Avatar + Full Name Card */}
              <div className="flex items-center justify-center gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl max-w-xs mx-auto shadow-inner">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                  {activeIntermission.candidateName.charAt(0)}
                </div>
                <div className="text-left truncate">
                  <p className="text-xs font-black text-cyan-300 truncate">{activeIntermission.candidateName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{activeIntermission.candidateDesignation}</p>
                </div>
              </div>
            </div>

            {/* Punchline Gujarati Joke Box (Reveals after 2.4s pause) */}
            {showIntermissionPunchline ? (
              <div className="p-4 bg-slate-950/90 border border-amber-400/60 rounded-2xl shadow-xl animate-fade-in space-y-1">
                <div className="text-3xl">{activeIntermission.emoji}</div>
                <p className="text-xs sm:text-sm font-bold italic text-amber-200 leading-relaxed font-serif">
                  "{activeIntermission.jokeText}"
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-xs font-mono text-slate-400 animate-pulse flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" /> Unveiling role secrets...
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setActiveIntermission(null)}
                className="w-full py-4 bg-gradient-to-r from-cyan-400 via-purple-600 to-amber-400 text-slate-950 font-black text-sm rounded-2xl hover:scale-105 transition-all shadow-xl shadow-cyan-500/30 uppercase tracking-wider cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                RESUME THE SHOW (Spacebar)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 border-t border-slate-900 pt-4 font-mono">
        HK DigiVerse HRMS • Keynote Auditorium Presentation Engine
      </div>
    </div>
  );
}
