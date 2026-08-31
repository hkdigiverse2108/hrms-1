"use client";

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Award, 
  Plus, 
  Calendar, 
  Users, 
  Save, 
  Trash2,
  Edit3,
  Settings,
  Sparkles,
  ArrowUpDown,
  UserPlus,
  Play
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUser } from "@/hooks/useUser";
import { Spin, Modal, Select, DatePicker, Tag, Tooltip } from "antd";
import { toast } from "sonner";

interface Topic {
  id?: string;
  name: string;
  maxMarks: number;
  order?: number;
}

interface Participant {
  id: string;
  name: string;
  designation?: string;
  department?: string;
  subDepartment?: string;
  role?: string;
  isTeamLeader?: boolean;
}

interface WeeklyEntry {
  employeeId: string;
  marksByTopic: Record<string, number>;
  sumMarks: number;
  focusTaskNote?: string;
  commitmentNote?: string;
}

export default function EmployeeOfWeekPage() {
  const router = useRouter();
  const { user } = useUser();
  const isRoleAdmin = Boolean(
    user && ["admin", "super admin", "superadmin", "administrator", "founder"].includes(String(user.role || "").toLowerCase().trim())
  );
  const isHR = Boolean(
    user && (
      ["hr", "hr manager", "hr lead", "hr executive", "human resources"].includes(String(user.role || "").toLowerCase().trim()) ||
      String(user.designation || "").toLowerCase().includes("hr") ||
      String(user.department || "").toLowerCase().includes("hr")
    )
  );
  const isAdmin = isRoleAdmin || isHR;

  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [meetingDetail, setMeetingDetail] = useState<any>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRowMap, setSavingRowMap] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<"total" | "name">("total");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Form states for meeting entries
  const [marksState, setMarksState] = useState<Record<string, Record<string, number>>>({}); // { empId: { topicId: score } }
  const [focusTaskNotes, setFocusTaskNotes] = useState<Record<string, string>>({});
  const [commitmentNotes, setCommitmentNotes] = useState<Record<string, string>>({});

  // New Meeting Modal State
  const [newMeetingModalVisible, setNewMeetingModalVisible] = useState(false);
  const [newMeetingDate, setNewMeetingDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [copyTopicsFromLast, setCopyTopicsFromLast] = useState<boolean>(true);

  // Edit Participants Modal State
  const [participantModalVisible, setParticipantModalVisible] = useState(false);
  const [editParticipantIds, setEditParticipantIds] = useState<string[]>([]);
  const [savingParticipants, setSavingParticipants] = useState(false);

  // Meeting Topic Config Modal State
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [topicsState, setTopicsState] = useState<Topic[]>([]);

  // Master Topics Template Modal State
  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [masterTopicsState, setMasterTopicsState] = useState<Topic[]>([]);

  // Delete Confirmation Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Declare Result Modal State
  const [declareModalVisible, setDeclareModalVisible] = useState(false);
  const [declareMonthYear, setDeclareMonthYear] = useState<string>(dayjs().format("YYYY-MM"));
  const [selectedMeetingIdsForDeclare, setSelectedMeetingIdsForDeclare] = useState<string[]>([]);
  const [declaring, setDeclaring] = useState(false);

  const handleDeclareResult = async () => {
    if (selectedMeetingIdsForDeclare.length === 0) {
      toast.error("Please select at least 1 weekly meeting to declare!");
      return;
    }
    setDeclaring(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/weekly-meetings/declare-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({
          weekMeetingIds: selectedMeetingIdsForDeclare,
          monthYear: declareMonthYear
        })
      });

      if (res.ok) {
        toast.success("Team Result Declared Successfully!");
        setDeclareModalVisible(false);
        router.push(`/team-of-the-month/reveal?month_year=${declareMonthYear}`);
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to declare team result");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error declaring team result");
    } finally {
      setDeclaring(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (selectedMeetingId) {
      fetchMeetingDetail(selectedMeetingId);
    }
  }, [selectedMeetingId]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        setAllEmployees(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/weekly-meetings`);
      if (res.ok) {
        const data = await res.json();
        // Sort chronologically date-wise (oldest date to newest date)
        data.sort((a: any, b: any) => (a.meetingDate || "").localeCompare(b.meetingDate || ""));
        setMeetings(data);
        if (data.length > 0 && !selectedMeetingId) {
          setSelectedMeetingId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load weekly meetings");
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingDetail = async (mId: string) => {
    try {
      const res = await fetch(`${API_URL}/weekly-meetings/${mId}`);
      if (res.ok) {
        const data = await res.json();
        setMeetingDetail(data);
        setTopicsState(data.topics || []);

        const marksMap: Record<string, Record<string, number>> = {};
        const focusMap: Record<string, string> = {};
        const commitMap: Record<string, string> = {};

        (data.entries || []).forEach((e: WeeklyEntry) => {
          marksMap[e.employeeId] = e.marksByTopic || {};
          focusMap[e.employeeId] = e.focusTaskNote || "";
          commitMap[e.employeeId] = e.commitmentNote || "";
        });

        setMarksState(marksMap);
        setFocusTaskNotes(focusMap);
        setCommitmentNotes(commitMap);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMasterTopics = async () => {
    try {
      const res = await fetch(`${API_URL}/weekly-meetings/master-topics`);
      if (res.ok) {
        const data = await res.json();
        setMasterTopicsState(data && data.length > 0 ? data : [
          { name: "Update Round", maxMarks: 20 },
          { name: "Focus Tasking", maxMarks: 20 },
          { name: "Challenge Discussion", maxMarks: 20 },
          { name: "English Speak", maxMarks: 10 },
          { name: "Innovation", maxMarks: 30 }
        ]);
      } else {
        setMasterTopicsState([
          { name: "Update Round", maxMarks: 20 },
          { name: "Focus Tasking", maxMarks: 20 },
          { name: "Challenge Discussion", maxMarks: 20 },
          { name: "English Speak", maxMarks: 10 },
          { name: "Innovation", maxMarks: 30 }
        ]);
      }
    } catch (e) {
      console.error(e);
      setMasterTopicsState([
        { name: "Update Round", maxMarks: 20 },
        { name: "Focus Tasking", maxMarks: 20 },
        { name: "Challenge Discussion", maxMarks: 20 },
        { name: "English Speak", maxMarks: 10 },
        { name: "Innovation", maxMarks: 30 }
      ]);
    } finally {
      setMasterModalVisible(true);
    }
  };

  const handleSaveMasterTopics = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/weekly-meetings/master-topics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({ topics: masterTopicsState })
      });

      if (res.ok) {
        toast.success("Master Topics Template saved!");
        setMasterModalVisible(false);
      } else {
        toast.error("Failed to save master topics template");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving master topics template");
    }
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

  // Open New Meeting Modal & Pre-select ONLY TLs + HR members automatically
  const openNewMeetingModal = () => {
    setNewMeetingDate(dayjs().format("YYYY-MM-DD"));

    // Auto-select ONLY TLs & HR members (Excludes Admins and Founders)
    const defaultSelected = allEmployees
      .filter((e) => {
        const badge = getEmployeeRoleBadge(e);
        return badge === "Team Leader" || badge === "HR";
      })
      .map((e) => String(e.id || e._id));

    setSelectedParticipantIds(defaultSelected);
    setNewMeetingModalVisible(true);
  };

  const handleCreateMeeting = async () => {
    if (!newMeetingDate) {
      toast.error("Please select a meeting date");
      return;
    }

    // Check for duplicate date in existing meetings list
    const isDuplicate = meetings.some(m => m.meetingDate === newMeetingDate);
    if (isDuplicate) {
      toast.error(`A weekly meeting block for date "${newMeetingDate}" already exists! You cannot create duplicate meetings for the same date.`);
      return;
    }

    if (selectedParticipantIds.length === 0) {
      toast.error("Please select at least one employee/TL participant");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const lastMeetingId = copyTopicsFromLast && meetings.length > 0 ? meetings[0].id : null;

      const res = await fetch(`${API_URL}/weekly-meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({
          meetingDate: newMeetingDate,
          participantEmployeeIds: selectedParticipantIds,
          copyFromMeetingId: lastMeetingId
        })
      });

      if (res.ok) {
        const newMeeting = await res.json();
        toast.success("New weekly meeting block created!");
        setNewMeetingModalVisible(false);
        fetchMeetings();
        setSelectedMeetingId(newMeeting.id);
      } else {
        const err = await res.json();
        toast.error(err.detail || "A meeting for this date already exists!");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error creating meeting");
    }
  };

  // Open Edit Participants Modal for Existing Meeting Block
  const openParticipantModal = () => {
    if (!meetingDetail) return;
    setEditParticipantIds(meetingDetail.participantEmployeeIds || []);
    setParticipantModalVisible(true);
  };

  const handleSaveParticipants = async () => {
    if (!selectedMeetingId) return;
    setSavingParticipants(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/weekly-meetings/${selectedMeetingId}/participants`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({ participantEmployeeIds: editParticipantIds })
      });

      if (res.ok) {
        toast.success("Meeting participants updated successfully!");
        setParticipantModalVisible(false);
        fetchMeetingDetail(selectedMeetingId);
        fetchMeetings();
      } else {
        toast.error("Failed to update participants");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error updating participants");
    } finally {
      setSavingParticipants(false);
    }
  };

  const handleMarksChange = (empId: string, topicId: string, value: number) => {
    setMarksState(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [topicId]: value
      }
    }));
  };

  const calculateEmployeeSum = (empId: string) => {
    const empMarks = marksState[empId] || {};
    return Object.values(empMarks).reduce((acc, val) => acc + (Number(val) || 0), 0);
  };

  const calculateTotalMaxMarks = () => {
    if (!meetingDetail || !meetingDetail.topics) return 100;
    return meetingDetail.topics.reduce((acc: number, t: Topic) => acc + (Number(t.maxMarks) || 0), 0);
  };

  // Check if participant is a Team Leader
  const isTL = (p: Participant) => {
    if (p.isTeamLeader) return true;
    const d = (p.designation || "").toLowerCase();
    const r = (p.role || "").toLowerCase();
    return ["team leader", "tl", "team lead", "lead", "head"].some(term => d.includes(term) || r.includes(term));
  };

  interface DepartmentGroup {
    department: string;
    teamLeaders: Participant[];
    members: Participant[];
    allParticipants: Participant[];
  }

  // Group participants by Department / Team
  const getGroupedParticipants = (): DepartmentGroup[] => {
    if (!meetingDetail || !meetingDetail.participants) return [];
    
    const map: Record<string, Participant[]> = {};
    meetingDetail.participants.forEach((p: Participant) => {
      const dept = (p.department || "General").trim();
      if (!map[dept]) map[dept] = [];
      map[dept].push(p);
    });

    const groupKeys = Object.keys(map).sort();
    return groupKeys.map(dept => {
      const rawList = map[dept];
      const teamLeaders = rawList.filter(isTL);
      const members = rawList.filter(p => !isTL(p));

      const sortFn = (a: Participant, b: Participant) => {
        const tlA = isTL(a) ? 1 : 0;
        const tlB = isTL(b) ? 1 : 0;
        if (tlB !== tlA) return tlB - tlA;

        if (sortBy === "total") {
          const scoreA = calculateEmployeeSum(a.id);
          const scoreB = calculateEmployeeSum(b.id);
          if (scoreB !== scoreA) return scoreB - scoreA;
        }
        return (a.name || "").localeCompare(b.name || "");
      };

      const sortedAll = [...rawList].sort(sortFn);
      return {
        department: dept,
        teamLeaders,
        members,
        allParticipants: sortedAll
      };
    });
  };

  // Sorted participants (Default: Highest Total Score first)
  const getSortedParticipants = () => {
    if (!meetingDetail || !meetingDetail.participants) return [];
    return [...meetingDetail.participants].sort((a: Participant, b: Participant) => {
      if (sortBy === "total") {
        const scoreA = calculateEmployeeSum(a.id);
        const scoreB = calculateEmployeeSum(b.id);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }
      return (a.name || "").localeCompare(b.name || "");
    });
  };

  const handleSaveSingleRow = async (empId: string) => {
    if (!selectedMeetingId || !meetingDetail) return;
    setSavingRowMap(prev => ({ ...prev, [empId]: true }));
    try {
      const token = localStorage.getItem("token");
      const currentEntry = {
        employeeId: empId,
        marksByTopic: marksState[empId] || {},
        focusTaskNote: focusTaskNotes[empId] || "",
        commitmentNote: commitmentNotes[empId] || ""
      };

      const res = await fetch(`${API_URL}/weekly-meetings/${selectedMeetingId}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({ entries: [currentEntry] })
      });

      if (res.ok) {
        toast.success("Row marks saved successfully!");
      } else {
        toast.error("Failed to save row marks");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving row");
    } finally {
      setSavingRowMap(prev => ({ ...prev, [empId]: false }));
    }
  };

  const handleSaveAllEntries = async () => {
    if (!selectedMeetingId || !meetingDetail) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const entriesPayload = (meetingDetail.participants || []).map((p: Participant) => {
        const empId = p.id;
        return {
          employeeId: empId,
          marksByTopic: marksState[empId] || {},
          focusTaskNote: focusTaskNotes[empId] || "",
          commitmentNote: commitmentNotes[empId] || ""
        };
      });

      const res = await fetch(`${API_URL}/weekly-meetings/${selectedMeetingId}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({ entries: entriesPayload })
      });

      if (res.ok) {
        toast.success("Weekly marks and notes saved successfully!");
        fetchMeetingDetail(selectedMeetingId);
      } else {
        toast.error("Failed to save entries");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving entries");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTopics = async () => {
    if (!selectedMeetingId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/weekly-meetings/${selectedMeetingId}/topics`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : ""
        },
        body: JSON.stringify({ topics: topicsState })
      });

      if (res.ok) {
        toast.success("Topics updated!");
        setTopicModalVisible(false);
        fetchMeetingDetail(selectedMeetingId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeleteMeeting = async () => {
    if (!selectedMeetingId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/weekly-meetings/${selectedMeetingId}`, {
        method: "DELETE",
        headers: { Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "" }
      });
      if (res.ok) {
        toast.success("Meeting block deleted successfully!");
        setDeleteModalVisible(false);
        fetchMeetings();
      } else {
        toast.error("Failed to delete meeting block");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting meeting block");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-3 sm:p-6 space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-xl shadow-md shadow-blue-500/20 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Employee of the Week</h1>
            <p className="text-xs sm:text-sm text-slate-500">TL Meeting points evaluation & dynamic weekly performance tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {isAdmin && (
            <>
              <button
                onClick={() => setDeclareModalVisible(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all border border-amber-300 uppercase tracking-wider cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                Declare Team Result
              </button>

              {!isHR && (
                <Link
                  href={`/team-of-the-month/reveal?month_year=${dayjs().format("YYYY-MM")}`}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-amber-400 text-xs sm:text-sm font-bold rounded-xl border border-amber-500/40 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 text-amber-400" />
                  Auditorium Reveal
                </Link>
              )}

              <button
                onClick={fetchMasterTopics}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all border border-slate-200 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-600" />
                Master Topics Template
              </button>

              <button
                onClick={openNewMeetingModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Weekly Meeting
              </button>
            </>
          )}
        </div>
      </div>

      {/* Horizontal Date Blocks Bar */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
        {meetings.map((m) => {
          const displayDate = dayjs(m.meetingDate).format("DD-MM-YYYY");
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMeetingId(m.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap border cursor-pointer ${
                selectedMeetingId === m.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{displayDate}</span>
              <Tag color={selectedMeetingId === m.id ? "blue" : "default"} className="ml-1 rounded-md text-[10px]">
                {m.participantEmployeeIds?.length || 0} Participants
              </Tag>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-20 text-center"><Spin size="large" /></div>
      ) : !meetingDetail ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 font-medium">
          No weekly meetings found. Click "New Weekly Meeting" to get started.
        </div>
      ) : (
        /* Transposed Evaluation Sheet Matrix */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                TL Meeting Evaluation ({dayjs(meetingDetail.meetingDate).format("DD-MM-YYYY")})
              </h2>
              <p className="text-xs text-slate-500">
                Total Max Score: <span className="font-bold text-blue-600">{calculateTotalMaxMarks()} pts</span> across {meetingDetail.topics?.length || 0} evaluation topics. ({meetingDetail.participants?.length || 0} Participants)
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Segmented Control */}
              <div className="flex items-center p-0.5 bg-slate-200/80 rounded-xl text-xs font-bold border border-slate-300">
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "grouped"
                      ? "bg-white text-blue-700 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🏢 Grouped by Team
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("flat")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "flat"
                      ? "bg-white text-blue-700 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📋 Flat List
                </button>
              </div>

              <button
                onClick={() => setSortBy(prev => prev === "total" ? "name" : "total")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
                Sort: {sortBy === "total" ? "Highest Score" : "Name A-Z"}
              </button>

              {isAdmin && (
                <button
                  onClick={openParticipantModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors border border-indigo-200 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                  Edit Participants ({meetingDetail.participants?.length || 0})
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => setTopicModalVisible(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Configure Topics
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => setDeleteModalVisible(true)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete meeting block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleSaveAllEntries}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Marks & Notes"}
              </button>
            </div>
          </div>

          {/* Sticky Transposed Matrix Table Container */}
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

                  {/* Scrollable Topics Columns */}
                  {meetingDetail.topics.map((t: Topic) => (
                    <th key={t.id} className="py-3 px-3 text-center min-w-[135px] border-r border-slate-200/40">
                      <div>{t.name}</div>
                      <span className="text-[10px] text-blue-600 font-bold lowercase block">(max {t.maxMarks} pts)</span>
                    </th>
                  ))}

                  {/* Total Sum Score Header */}
                  <th className="py-3 px-4 text-center min-w-[125px] bg-emerald-50/80 border-r border-slate-200/40 text-emerald-900 font-black">
                    TOTAL SUM
                  </th>

                  {/* Focus Task & Commitment Headers */}
                  <th className="py-3 px-4 min-w-[200px] border-r border-slate-200/40">Focus Task (Next Meet)</th>
                  <th className="py-3 px-4 min-w-[200px]">Commitment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(() => {
                  const renderRow = (p: Participant, idx: number) => {
                    const empId = p.id;
                    const empSum = calculateEmployeeSum(empId);
                    const isSavingRow = savingRowMap[empId];
                    const totalMax = calculateTotalMaxMarks();

                    return (
                      <tr key={empId} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Sticky Frozen Cell # */}
                        <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-100 px-2 py-3 w-[40px] min-w-[40px] max-w-[40px] text-center text-slate-400 font-mono text-xs">
                          {idx + 1}
                        </td>

                        {/* Sticky Frozen Cell Employee Name */}
                        <td className="sticky left-[40px] z-20 bg-white group-hover:bg-slate-100 px-3 sm:px-4 py-3 border-r border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]">
                          <div className="font-bold text-slate-800 text-xs sm:text-sm truncate max-w-[130px] sm:max-w-none flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isTL(p) && (
                              <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded-md font-black border border-amber-300 shrink-0 shadow-2xs">
                                👑 TL
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal truncate">{p.designation || p.department || "Staff"}</div>
                        </td>

                        {/* Topic Marks Input Cells */}
                        {meetingDetail.topics.map((t: Topic) => {
                          const topicId = String(t.id);
                          const rawVal = marksState[empId]?.[topicId];
                          const currentVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : "";
                          const numVal = currentVal !== "" ? Number(currentVal) : NaN;
                          const isExceeded = !isNaN(numVal) && numVal > Number(t.maxMarks);

                          return (
                            <td key={topicId} className="py-3 px-2 text-center border-r border-slate-100">
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  max={t.maxMarks}
                                  step="0.1"
                                  value={currentVal}
                                  onChange={(e) => handleMarksChange(empId, topicId, Number(e.target.value))}
                                  placeholder="0"
                                  className={`w-20 sm:w-24 px-2 py-1.5 border rounded-lg text-center font-bold text-xs focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    isExceeded
                                      ? "bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500"
                                      : "bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500"
                                  }`}
                                />
                                {isExceeded && (
                                  <span className="text-[10px] text-rose-600 font-bold">⚠️ Max {t.maxMarks}</span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Live Total Sum Cell */}
                        <td className="py-3.5 px-4 text-center bg-emerald-50/40 font-extrabold text-emerald-800 text-xs sm:text-sm border-r border-slate-200/40">
                          {empSum} <span className="text-[11px] text-emerald-600/70 font-semibold">/ {totalMax}</span>
                        </td>

                        {/* Focus Task Note Input */}
                        <td className="py-2 px-3 border-r border-slate-100">
                          <textarea
                            rows={2}
                            value={focusTaskNotes[empId] || ""}
                            onChange={(e) => setFocusTaskNotes({ ...focusTaskNotes, [empId]: e.target.value })}
                            placeholder="Focus task notes..."
                            className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                          />
                        </td>

                        {/* Commitment Note Input */}
                        <td className="py-2 px-3">
                          <textarea
                            rows={2}
                            value={commitmentNotes[empId] || ""}
                            onChange={(e) => setCommitmentNotes({ ...commitmentNotes, [empId]: e.target.value })}
                            placeholder="Commitment notes..."
                            className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                          />
                        </td>
                      </tr>
                    );
                  };

                  if (viewMode === "grouped") {
                    const groups = getGroupedParticipants();
                    const totalCols = 5 + (meetingDetail.topics?.length || 0);

                    return groups.map((group) => (
                      <React.Fragment key={`group-sec-${group.department}`}>
                        {/* Department Group Header Banner */}
                        <tr className="bg-slate-800 text-white font-bold border-y-2 border-slate-700 sticky z-10">
                          <td colSpan={totalCols} className="px-4 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-inner">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider">
                                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>{group.department} Team</span>
                                <span className="text-slate-300 font-medium text-xs normal-case">
                                  ({group.allParticipants.length} {group.allParticipants.length === 1 ? 'Member' : 'Members'})
                                </span>
                              </div>
                              {group.teamLeaders.length > 0 ? (
                                <div className="flex items-center gap-1.5 text-xs bg-amber-400 text-slate-950 px-3 py-1 rounded-full font-extrabold shadow-sm">
                                  <span>👑 Team Leader:</span>
                                  <span>{group.teamLeaders.map(tl => tl.name).join(", ")}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-normal italic">No assigned Team Leader</span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Team Member Rows */}
                        {group.allParticipants.map((p: Participant, idx: number) => renderRow(p, idx))}
                      </React.Fragment>
                    ));
                  }

                  return getSortedParticipants().map((p: Participant, idx: number) => renderRow(p, idx));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Weekly Meeting Modal with AntD DatePicker */}
      <Modal
        title="Create New Weekly TL Meeting Block"
        open={newMeetingModalVisible}
        onCancel={() => setNewMeetingModalVisible(false)}
        onOk={handleCreateMeeting}
        okText="Create Meeting"
        width={550}
      >
        <div className="py-4 space-y-4 text-sm">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Meeting Date</label>
            <DatePicker
              format="YYYY-MM-DD"
              allowClear={false}
              value={newMeetingDate ? dayjs(newMeetingDate, "YYYY-MM-DD") : null}
              onChange={(date, dateString) => {
                if (dateString) {
                  const formatted = Array.isArray(dateString) ? dateString[0] : dateString;
                  setNewMeetingDate(formatted);
                }
              }}
              style={{ width: "100%", height: "40px" }}
              className="rounded-xl border-slate-300 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Participants (TLs & HR Auto-Selected)
            </label>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label || "").toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: "100%" }}
              placeholder="Select team members..."
              value={selectedParticipantIds}
              onChange={(val) => setSelectedParticipantIds(val)}
              options={allEmployees.map(e => ({
                label: `${e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim()} (${getEmployeeRoleBadge(e)})`,
                value: String(e.id || e._id)
              }))}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              ⚡ All TLs and HR members are pre-selected by default. You can add or remove any employee.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="copyLast"
              checked={copyTopicsFromLast}
              onChange={(e) => setCopyTopicsFromLast(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="copyLast" className="font-semibold text-slate-700 text-xs cursor-pointer">
              Copy Topics & Max Marks from previous meeting (or load from Master Topics Template)
            </label>
          </div>
        </div>
      </Modal>

      {/* Edit Participants Modal for Existing Meeting */}
      <Modal
        title={`Edit Participants for ${meetingDetail ? dayjs(meetingDetail.meetingDate).format("DD-MM-YYYY") : ""}`}
        open={participantModalVisible}
        onCancel={() => setParticipantModalVisible(false)}
        onOk={handleSaveParticipants}
        okText="Save Participants"
        confirmLoading={savingParticipants}
        width={550}
      >
        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-500">
            Add or remove employees who should be evaluated in this specific meeting block ({meetingDetail ? dayjs(meetingDetail.meetingDate).format("DD-MM-YYYY") : ""}).
          </p>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              String(option?.label || "").toLowerCase().includes(input.toLowerCase())
            }
            style={{ width: "100%" }}
            placeholder="Search and select employees..."
            value={editParticipantIds}
            onChange={(val) => setEditParticipantIds(val)}
            options={allEmployees.map(e => ({
              label: `${e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim()} (${getEmployeeRoleBadge(e)})`,
              value: String(e.id || e._id)
            }))}
          />
        </div>
      </Modal>

      {/* Configure Topics Modal for Selected Meeting */}
      <Modal
        title={`Configure Topics for ${meetingDetail ? dayjs(meetingDetail.meetingDate).format("DD-MM-YYYY") : ""}`}
        open={topicModalVisible}
        onCancel={() => setTopicModalVisible(false)}
        onOk={handleSaveTopics}
        okText="Save Topics"
        width={550}
      >
        <div className="py-4 space-y-3">
          {topicsState.map((t, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 text-xs text-slate-400 font-mono">{idx + 1}</span>
              <input
                type="text"
                value={t.name}
                onChange={(e) => {
                  const next = [...topicsState];
                  next[idx].name = e.target.value;
                  setTopicsState(next);
                }}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                placeholder="Topic name"
              />
              <input
                type="number"
                value={t.maxMarks}
                onChange={(e) => {
                  const next = [...topicsState];
                  next[idx].maxMarks = Number(e.target.value);
                  setTopicsState(next);
                }}
                className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Max"
              />
              <span className="text-xs text-slate-400">pts</span>
              <button
                onClick={() => {
                  const next = topicsState.filter((_, i) => i !== idx);
                  setTopicsState(next);
                }}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={() => {
              setTopicsState([...topicsState, { name: `New Topic ${topicsState.length + 1}`, maxMarks: 20 }]);
            }}
            className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline pt-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Topic
          </button>
        </div>
      </Modal>

      {/* Master Topics Template Modal */}
      <Modal
        title="Master Weekly Topics Template (Global Defaults)"
        open={masterModalVisible}
        onCancel={() => setMasterModalVisible(false)}
        onOk={handleSaveMasterTopics}
        okText="Save Master Template"
        width={600}
      >
        <div className="py-4 space-y-4">
          <p className="text-xs text-slate-500">
            These default topics are loaded automatically whenever a new weekly meeting block is created. Editing this template does NOT affect existing meeting blocks.
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {masterTopicsState.map((mt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 text-xs text-slate-400 font-mono">{idx + 1}</span>
                <input
                  type="text"
                  value={mt.name}
                  onChange={(e) => {
                    const next = [...masterTopicsState];
                    next[idx].name = e.target.value;
                    setMasterTopicsState(next);
                  }}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                />
                <input
                  type="number"
                  value={mt.maxMarks}
                  onChange={(e) => {
                    const next = [...masterTopicsState];
                    next[idx].maxMarks = Number(e.target.value);
                    setMasterTopicsState(next);
                  }}
                  className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-slate-400">pts</span>
                <button
                  onClick={() => {
                    setMasterTopicsState(masterTopicsState.filter((_, i) => i !== idx));
                  }}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setMasterTopicsState([
                ...masterTopicsState,
                { name: `New Master Topic ${masterTopicsState.length + 1}`, maxMarks: 20 }
              ]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-lg border border-blue-200 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Master Topic
          </button>
        </div>
      </Modal>

      {/* Delete Weekly Meeting Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
            <Trash2 className="w-5 h-5" />
            Delete Weekly Meeting Block?
          </div>
        }
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        footer={[
          <button
            key="cancel"
            onClick={() => setDeleteModalVisible(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer mr-2"
          >
            Cancel
          </button>,
          <button
            key="delete"
            onClick={confirmDeleteMeeting}
            disabled={deleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Meeting Block"}
          </button>
        ]}
        width={480}
      >
        <div className="py-3 text-slate-600 text-sm space-y-2">
          <p>
            Are you sure you want to delete the weekly meeting block for date{" "}
            <strong className="text-slate-800 font-bold">
              {meetingDetail ? dayjs(meetingDetail.meetingDate).format("DD-MM-YYYY") : ""}
            </strong>
            ?
          </p>
          <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
            ⚠️ <strong>Warning:</strong> All evaluated marks, focus task notes, commitment notes, and topics for this meeting will be permanently deleted. This action cannot be undone.
          </div>
        </div>
      </Modal>

      {/* Declare Team Result Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Declare Team of the Month Result</span>
          </div>
        }
        open={declareModalVisible}
        onCancel={() => setDeclareModalVisible(false)}
        footer={null}
        destroyOnHidden
        centered
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Evaluation Month</label>
            <DatePicker
              picker="month"
              allowClear={false}
              value={dayjs(declareMonthYear, "YYYY-MM")}
              onChange={(date, dateString) => {
                if (dateString) {
                  const formatted = Array.isArray(dateString) ? dateString[0] : dateString;
                  setDeclareMonthYear(formatted);
                }
              }}
              className="w-full font-bold text-slate-700 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Weekly Meetings to Include ({selectedMeetingIdsForDeclare.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1.5 bg-slate-50">
              {meetings.length === 0 ? (
                <div className="text-xs text-slate-400 p-2 text-center">No weekly meetings available</div>
              ) : (
                meetings.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer text-xs font-medium"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMeetingIdsForDeclare.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMeetingIdsForDeclare([...selectedMeetingIdsForDeclare, m.id]);
                        } else {
                          setSelectedMeetingIdsForDeclare(selectedMeetingIdsForDeclare.filter((id) => id !== m.id));
                        }
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Meeting on {dayjs(m.meetingDate).format("DD-MM-YYYY")}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">({m.participantEmployeeIds?.length || 0} participants)</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeclareModalVisible(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeclareResult}
              disabled={declaring}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer"
            >
              {declaring ? "Declaring..." : "Confirm & Declare Result"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
