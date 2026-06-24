"use client";
 
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ReactNode } from "react";
import { Layout, Modal } from "antd";
import { useAppEvent } from "@/hooks/useAppEvent";
import { useUserContext } from "@/context/UserContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/common/AccessDenied";
import { API_URL } from "@/lib/config";
import dayjs from "dayjs";
import { toast } from "sonner";

const { Content } = Layout;

// Inactivity timeout settings
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function getRequiredModuleForPath(pathname: string): string | null {
  if (pathname === "/") return null; // Always allow landing on the dashboard
  if (pathname.startsWith("/work-management/projects")) return "projects";
  if (pathname.startsWith("/work-management/tasks")) return "tasks";
  if (pathname.startsWith("/work-management/daily-progress")) return "daily-progress";
  if (pathname.startsWith("/work-management/sales")) return "sales";
  if (pathname.startsWith("/work-management/clients")) return "clients";
  if (pathname.startsWith("/work-management/digital-marketing")) return "marketing";
  if (pathname.startsWith("/work-management/smm")) return "creative";
  
  if (pathname.startsWith("/employees/organization")) return "org-structure";
  if (pathname.startsWith("/employees/attendance")) return "employee-attendance";
  if (pathname.startsWith("/employees/leave")) return "leave-requests";
  if (pathname.startsWith("/employees/documents/generate")) return "document-generator";
  if (pathname.startsWith("/employees/documents")) return "employee-documents";
  if (pathname.startsWith("/employees/edit") || pathname.startsWith("/employees/add") || pathname.startsWith("/employees/permissions")) {
    return "employee-list";
  }
  if (pathname === "/employees" || pathname.startsWith("/employees/")) return "employee-list";
  
  if (pathname.startsWith("/payroll/salary-structure")) return "salary-structure";
  if (pathname.startsWith("/payroll/payslips")) return "payslips";
  if (pathname.startsWith("/payroll/bonuses")) return "bonuses-deductions";
  if (pathname.startsWith("/payroll")) return "payroll-processing";
  
  if (pathname.startsWith("/recruitment/hiring-board")) return "interviews";
  if (pathname.startsWith("/recruitment")) return "hirings";
  
  if (pathname.startsWith("/attendance")) return "attendance";
  if (pathname.startsWith("/leave")) return "leave";
  
  if (pathname.startsWith("/workspace/blank-canvas")) return "blank-canvas";
  if (pathname.startsWith("/workspace/seating")) return "seating-arrangement";
  if (pathname.startsWith("/workspace/resource")) return "resource-management";
  
  if (pathname.startsWith("/remarks")) return "remarks";
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/invoice")) return "invoice";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/task")) return "personal-tasks";
  if (pathname.startsWith("/schedule")) return "schedule";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/activity-tracker")) return "activity-tracker";
  
  return null;
}
 
export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useUserContext();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const isPublicPage = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/feedback/");

  // Inactivity auto-punch-out and recovery states
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryRange, setRecoveryRange] = useState<{
    inactiveFrom: string;
    inactiveFromTimestamp: number;
    inactiveUntil: string;
    inactiveUntilTimestamp: number;
    isMeetingOnly?: boolean;
  } | null>(null);

  const [recoveryForm, setRecoveryForm] = useState({
    type: "meeting", // meeting, break, work
    startTime: "",
    endTime: "",
    reason: ""
  });
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);

  // Desktop auto-update states
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    downloadUrl: string;
    changelog: string[];
  } | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const lastActivityTimeRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetInactivityTimerRef = useRef<() => void>(() => {});

  // Check for desktop application updates
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).electronAPI) return;
    if (!user || isPublicPage) return;
    
    const checkForUpdates = async (showNoUpdateToast = false) => {
      try {
        const localVersion = await (window as any).electronAPI.getAppVersion();
        const res = await fetch(`${API_URL}/desktop/version`);
        if (res.ok) {
          const data = await res.json();
          const remoteVersion = data.version;
          
          const isNewerVersion = (remote: string, local: string) => {
            const r = remote.split('.').map(Number);
            const l = local.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
              if ((r[i] || 0) > (l[i] || 0)) return true;
              if ((r[i] || 0) < (l[i] || 0)) return false;
            }
            return false;
          };
          
          if (remoteVersion && isNewerVersion(remoteVersion, localVersion)) {
            setUpdateInfo({
              version: remoteVersion,
              downloadUrl: data.downloadUrl,
              changelog: data.changelog || []
            });
            setShowUpdateModal(true);
          } else if (showNoUpdateToast) {
            toast.success(`Your desktop app is up to date! (v${localVersion})`);
          }
        }
      } catch (err) {
        console.warn("Failed to check for desktop updates:", err);
        if (showNoUpdateToast) {
          toast.error("Failed to check for updates. Please try again later.");
        }
      }
    };
    
    checkForUpdates();

    const handleManualCheck = () => {
      checkForUpdates(true);
    };

    window.addEventListener("check-for-updates-manual", handleManualCheck);
    return () => {
      window.removeEventListener("check-for-updates-manual", handleManualCheck);
    };
  }, [user, isPublicPage]);

  // Monitor download progress from Electron IPC — subscribe on mount so we never miss events
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).electronAPI) return;
    
    const unsubscribe = (window as any).electronAPI.onUpdateProgress((progress: number) => {
      setDownloadProgress(progress);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const handleStartUpdate = async () => {
    if (!updateInfo) return;
    setIsDownloadingUpdate(true);
    setDownloadProgress(0);
    try {
      const result = await (window as any).electronAPI.startUpdate(updateInfo.downloadUrl);
      if (!result || !result.success) {
        toast.error(`Update failed: ${result?.error || 'Unknown error'}`);
        setIsDownloadingUpdate(false);
      }
    } catch (err: any) {
      toast.error(`Error launching update: ${err.message || err}`);
      setIsDownloadingUpdate(false);
    }
  };

  // Trigger retroactive punch-out due to inactivity
  const handleInactivityPunchOut = useCallback(async () => {
    if (!user || showRecoveryModal) return;

    // Double check if there was global PC activity (clicks/keypress/mouse movement)
    try {
      const activeRes = await fetch(`${API_URL}/activity/last-active?employee_id=${user.id || user.employeeId}`);
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        if (activeData && typeof activeData.last_active === 'number') {
          const globalLastActiveMs = activeData.last_active * 1000;
          if (Date.now() - globalLastActiveMs < INACTIVITY_TIMEOUT_MS) {
            // User was active globally, skip punch out and reset timer
            localStorage.setItem("last_activity_timestamp", globalLastActiveMs.toString());
            lastActivityTimeRef.current = globalLastActiveMs;
            resetInactivityTimerRef.current();
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Could not check global last active time:", e);
    }

    try {
      // 1. Fetch current status to check if punched in
      const statusRes = await fetch(`${API_URL}/attendance/status/${user.id || user.employeeId}`);
      if (!statusRes.ok) return;
      const statusData = await statusRes.json();
      
      const isCurrentlyOnBreak = statusData && statusData.status === "On Break";
      if (isCurrentlyOnBreak) {
        localStorage.setItem("last_activity_timestamp", Date.now().toString());
        lastActivityTimeRef.current = Date.now();
        resetInactivityTimerRef.current();
        return;
      }

      const isCurrentlyPunchedIn = statusData && statusData.checkIn && statusData.checkIn !== "--" && statusData.checkIn !== "--:--" && !statusData.checkOut;
      if (!isCurrentlyPunchedIn) return;

      const dateStr = typeof statusData.date === "string" ? statusData.date.split("T")[0] : dayjs(statusData.date).format("YYYY-MM-DD");
      const punchInTimeObj = dayjs(`${dateStr} ${statusData.checkIn}`);
      const punchInTs = punchInTimeObj.isValid() ? punchInTimeObj.valueOf() : Date.now();
      
      // Clamp last activity time to punch-in time
      if (lastActivityTimeRef.current < punchInTs) {
        lastActivityTimeRef.current = punchInTs;
        localStorage.setItem("last_activity_timestamp", punchInTs.toString());
      }

      // 2. Check for active scheduled meeting overlap
      const todayStr = dayjs().format("YYYY-MM-DD");
      const schedRes = await fetch(`${API_URL}/schedules?employeeId=${user.id || user.employeeId}&date=${todayStr}`);
      let hasActiveMeeting = false;
      if (schedRes.ok) {
        const schedules = await schedRes.json();
        const now = dayjs();
        hasActiveMeeting = schedules.some((s: any) => {
          if (s.type !== 'meeting') return false;
          const start = dayjs(`${todayStr} ${s.startTime}`);
          const end = dayjs(`${todayStr} ${s.endTime}`);
          return now.isAfter(start) && now.isBefore(end);
        });
      }

      if (hasActiveMeeting) {
        console.log("User has active scheduled meeting, skipping inactivity punch out.");
        // Reset activity tracking and timer
        localStorage.setItem("last_activity_timestamp", Date.now().toString());
        lastActivityTimeRef.current = Date.now();
        resetInactivityTimerRef.current();
        return;
      }

      // 3. Perform retroactive punch-out
      const punchOutTimeStr = dayjs(lastActivityTimeRef.current).format("HH:mm:ss");
      const res = await fetch(`${API_URL}/attendance/punch-out/${user.id || user.employeeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ punch_out_time: punchOutTimeStr })
      });

      if (res.ok) {
        toast.warning("You were punched out due to inactivity. Move your mouse or click to recover this time.");
        
        // Show OS desktop notification
        if ((window as any).electronAPI && typeof (window as any).electronAPI.showNotification === 'function') {
          (window as any).electronAPI.showNotification("Inactivity Alert", {
            body: "You were punched out due to inactivity. Move your mouse or click to recover this time.",
            icon: "/favicon.ico",
            clickUrl: "/attendance/recovery-requests"
          });
        } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const n = new Notification("Inactivity Alert", {
            body: "You were punched out due to inactivity. Move your mouse or click to recover this time.",
            icon: "/favicon.ico"
          });
          n.onclick = () => {
            window.focus();
            router.push("/attendance/recovery-requests");
          };
        }

        const inactiveUntilStr = dayjs().format("HH:mm:ss");
        
        const recData = {
          inactiveFrom: punchOutTimeStr,
          inactiveFromTimestamp: lastActivityTimeRef.current,
          inactiveUntil: inactiveUntilStr,
          inactiveUntilTimestamp: Date.now()
        };
        localStorage.setItem("inactivity_punch_out_recovery_pending", JSON.stringify(recData));
        setRecoveryRange(recData);
        setRecoveryForm({
          type: "meeting",
          startTime: dayjs(lastActivityTimeRef.current).format("HH:mm"),
          endTime: dayjs().format("HH:mm"),
          reason: ""
        });
        setShowRecoveryModal(true);
        window.dispatchEvent(new Event("attendance-update"));
      }
    } catch (err) {
      console.warn("Error during inactivity punch out:", err);
    }
  }, [user, showRecoveryModal]);

  const resetInactivityTimer = useCallback(() => {
    // Inactivity auto-punchout is disabled as requested by the user
    return;
    if (!user || showRecoveryModal) return;
    
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(handleInactivityPunchOut, INACTIVITY_TIMEOUT_MS);
  }, [user, handleInactivityPunchOut, showRecoveryModal]);

  // Sync ref with the actual callback
  resetInactivityTimerRef.current = resetInactivityTimer;

  // Check pending recovery status on mount and window focus
  const checkPendingRecovery = useCallback(async () => {
    if (!user || isPublicPage) return;


    // Fetch employee's current attendance status to check punch-in and break status first
    let isCurrentlyPunchedIn = false;
    let isCurrentlyOnBreak = false;
    let punchInTs = Date.now();
    try {
      const statusRes = await fetch(`${API_URL}/attendance/status/${user.id || user.employeeId}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        isCurrentlyPunchedIn = statusData && statusData.checkIn && statusData.checkIn !== "--" && statusData.checkIn !== "--:--" && !statusData.checkOut;
        isCurrentlyOnBreak = statusData && statusData.status === "On Break";

        if (isCurrentlyOnBreak) {
          localStorage.setItem("last_activity_timestamp", Date.now().toString());
          lastActivityTimeRef.current = Date.now();
          resetInactivityTimerRef.current();
          return;
        }

        if (isCurrentlyPunchedIn) {
          const dateStr = typeof statusData.date === "string" ? statusData.date.split("T")[0] : dayjs(statusData.date).format("YYYY-MM-DD");
          const punchInTimeObj = dayjs(`${dateStr} ${statusData.checkIn}`);
          if (punchInTimeObj.isValid()) {
            punchInTs = punchInTimeObj.valueOf();
          }
        }
      }
    } catch (err) {
      console.warn("Error fetching status during recovery check:", err);
    }

    // IF NOT PUNCHED IN, DO NOT SHOW POPUPS OR CHECK INACTIVITY!
    if (!isCurrentlyPunchedIn) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    const isToday = (ts: any) => {
      if (!ts) return false;
      const num = Number(ts);
      if (isNaN(num)) return false;
      return dayjs(num).isSame(dayjs(), 'day');
    };

    // 1. Check localStorage for already flagged states since they are active/punched in
    const pendingStr = localStorage.getItem("inactivity_punch_out_recovery_pending");
    const goingMeetingStr = localStorage.getItem("going_for_meeting_pending");

    if (pendingStr) {
      try {
        const parsed = JSON.parse(pendingStr);
        const ts = parsed.inactiveFromTimestamp || parsed.inactiveUntilTimestamp;
        if (ts && !isToday(ts)) {
          localStorage.removeItem("inactivity_punch_out_recovery_pending");
        } else {
          setRecoveryRange(parsed);
          setRecoveryForm({
            type: parsed.type || "meeting",
            startTime: dayjs(parsed.inactiveFromTimestamp).format("HH:mm"),
            endTime: dayjs(parsed.inactiveUntilTimestamp).format("HH:mm"),
            reason: ""
          });
          setShowRecoveryModal(true);
          return;
        }
      } catch (e) {
        localStorage.removeItem("inactivity_punch_out_recovery_pending");
      }
    }

    if (goingMeetingStr) {
      try {
        const parsed = JSON.parse(goingMeetingStr);
        if (parsed.startTime && !isToday(parsed.startTime)) {
          localStorage.removeItem("going_for_meeting_pending");
        } else {
          const recData = {
            inactiveFrom: parsed.startTimeStr,
            inactiveFromTimestamp: parsed.startTime,
            inactiveUntil: dayjs().format("HH:mm:ss"),
            inactiveUntilTimestamp: Date.now(),
            isMeetingOnly: true
          };
          setRecoveryRange(recData);
          setRecoveryForm({
            type: "meeting",
            startTime: dayjs(parsed.startTime).format("HH:mm"),
            endTime: dayjs().format("HH:mm"),
            reason: "Urgent Meeting"
          });
          setShowRecoveryModal(true);
          return;
        }
      } catch (e) {
        localStorage.removeItem("going_for_meeting_pending");
      }
    }

    let resolvedLastActivityTs = Number(localStorage.getItem("last_activity_timestamp") || Date.now());

    // If currently punched in, the last activity time cannot be before the punch-in time
    if (isCurrentlyPunchedIn && resolvedLastActivityTs < punchInTs) {
      resolvedLastActivityTs = punchInTs;
      localStorage.setItem("last_activity_timestamp", punchInTs.toString());
      lastActivityTimeRef.current = punchInTs;
      resetInactivityTimerRef.current();
    }

    // 2. Fetch last active time from local backend/tracker
    try {
      const activeRes = await fetch(`${API_URL}/activity/last-active?employee_id=${user.id || user.employeeId}`);
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        if (activeData && typeof activeData.last_active === 'number') {
          const globalLastActiveMs = activeData.last_active * 1000;
          
          // If the global PC activity is newer than our local localStorage timestamp, use it!
          if (globalLastActiveMs > resolvedLastActivityTs) {
            resolvedLastActivityTs = globalLastActiveMs;
            localStorage.setItem("last_activity_timestamp", globalLastActiveMs.toString());
            lastActivityTimeRef.current = globalLastActiveMs;
            resetInactivityTimerRef.current();
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch global last active time from local tracker:", e);
    }

    // 3. Check if user went inactive while away/sleep
    return; // Disabled inactivity check as requested by the user
    if (Date.now() - resolvedLastActivityTs > INACTIVITY_TIMEOUT_MS) {
      if (isCurrentlyPunchedIn) {
        try {
          // Check scheduled meeting overlap
          const todayStr = dayjs().format("YYYY-MM-DD");
          const schedRes = await fetch(`${API_URL}/schedules?employeeId=${user.id || user.employeeId}&date=${todayStr}`);
          let hasActiveMeeting = false;
          if (schedRes.ok) {
            const schedules = await schedRes.json();
            const now = dayjs();
            hasActiveMeeting = schedules.some((s: any) => {
              if (s.type !== 'meeting') return false;
              const start = dayjs(`${todayStr} ${s.startTime}`);
              const end = dayjs(`${todayStr} ${s.endTime}`);
              return now.isAfter(start) && now.isBefore(end);
            });
          }

          if (hasActiveMeeting) {
            localStorage.setItem("last_activity_timestamp", Date.now().toString());
            lastActivityTimeRef.current = Date.now();
            resetInactivityTimerRef.current();
            return;
          }

          // Retroactive punch out (cannot be earlier than punch-in)
          const punchOutTs = Math.max(resolvedLastActivityTs, punchInTs);
          const punchOutTimeStr = dayjs(punchOutTs).format("HH:mm:ss");
          await fetch(`${API_URL}/attendance/punch-out/${user.id || user.employeeId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ punch_out_time: punchOutTimeStr })
          });

          const recData = {
            inactiveFrom: punchOutTimeStr,
            inactiveFromTimestamp: punchOutTs,
            inactiveUntil: dayjs().format("HH:mm:ss"),
            inactiveUntilTimestamp: Date.now()
          };
          localStorage.setItem("inactivity_punch_out_recovery_pending", JSON.stringify(recData));
          setRecoveryRange(recData);
          setRecoveryForm({
            type: "meeting",
            startTime: dayjs(punchOutTs).format("HH:mm"),
            endTime: dayjs().format("HH:mm"),
            reason: ""
          });
          setShowRecoveryModal(true);
          window.dispatchEvent(new Event("attendance-update"));
        } catch (err) {
          console.warn("Focus sync error:", err);
        }
      }
    }
  }, [user, isPublicPage]);

  const handleRecoverySubmit = async () => {
    if (!user) return;
    if (!recoveryForm.reason.trim()) {
      toast.error("Please enter a reason.");
      return;
    }
    
    const startStr = recoveryForm.startTime;
    const endStr = recoveryForm.endTime;
    
    if (!startStr || !endStr) {
      toast.error("Please select start and end times.");
      return;
    }
    
    const startObj = dayjs(`${dayjs().format("YYYY-MM-DD")} ${startStr}`);
    const endObj = dayjs(`${dayjs().format("YYYY-MM-DD")} ${endStr}`);
    
    if (endObj.isBefore(startObj) || endObj.isSame(startObj)) {
      toast.error("End time must be after start time.");
      return;
    }

    setIsSubmittingRecovery(true);
    try {
      const recRes = await fetch(`${API_URL}/time-recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: user.id || user.employeeId,
          employee_name: user.name || "Employee",
          date: dayjs().format("YYYY-MM-DD"),
          late_minutes: 0,
          recovery_minutes: endObj.diff(startObj, 'minute'),
          recovery_type: recoveryForm.type,
          start_time: `${startStr}:00`,
          end_time: `${endStr}:00`,
          reason: `${recoveryForm.type.toUpperCase()}: ${recoveryForm.reason}`,
          status: "pending"
        })
      });

      if (recRes.ok) {
        await fetch(`${API_URL}/attendance/punch-in/${user.id || user.employeeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ punch_in_time: `${endStr}:00` })
        });

        toast.success("Time recovery request submitted and punched in!");
        localStorage.removeItem("inactivity_punch_out_recovery_pending");
        localStorage.removeItem("going_for_meeting_pending");
        
        setShowRecoveryModal(false);
        setRecoveryRange(null);
        
        localStorage.setItem("last_activity_timestamp", Date.now().toString());
        lastActivityTimeRef.current = Date.now();
        resetInactivityTimer();
        
        window.dispatchEvent(new Event("attendance-update"));
      } else {
        toast.error("Failed to submit recovery request.");
      }
    } catch (err) {
      console.warn("Error submitting recovery:", err);
      toast.error("Failed to connect to the server.");
    } finally {
      setIsSubmittingRecovery(false);
    }
  };

  // Setup inactivity tracking & pending recovery check
  useEffect(() => {
    if (!user || isPublicPage) return;


    // 1. All users listen to window focus and attendance updates to check pending recovery
    const handleFocus = () => { checkPendingRecovery().catch(e => console.warn("Recovery check error:", e)); };
    window.addEventListener("focus", handleFocus);

    const handleAttendanceUpdate = () => {
      localStorage.setItem("last_activity_timestamp", Date.now().toString());
      lastActivityTimeRef.current = Date.now();
      resetInactivityTimer();
      checkPendingRecovery().catch(e => console.warn("Recovery check error:", e));
    };
    window.addEventListener("attendance-update", handleAttendanceUpdate);

    // Initial check on mount
    checkPendingRecovery().catch(e => console.warn("Recovery check error:", e));

    // 2. Track OS/browser activity and set inactivity timeouts
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];
    const handleActivity = () => {
      if (showRecoveryModal) return;
      localStorage.setItem("last_activity_timestamp", Date.now().toString());
      lastActivityTimeRef.current = Date.now();
      resetInactivityTimer();
    };

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetInactivityTimer();

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("attendance-update", handleAttendanceUpdate);
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [user, isPublicPage, resetInactivityTimer, checkPendingRecovery, showRecoveryModal]);

  // Listen for global WebSocket broadcast alerts
  useAppEvent("system_alert", (data) => {
    // If running in Electron, request window focus so it pops up in foreground
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.focusWindow();
    }
    Modal.warning({
      title: data.title || "System Announcement",
      content: data.message,
      okText: "Dismiss",
      centered: true,
      maskClosable: false,
    });
  });

  // Listen for attendance updates to trigger status reloads (e.g. on approved/rejected time recovery requests)
  useAppEvent("attendance_update", () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("attendance-update"));
    }
  });

  // Request Desktop Notification Permission globally on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        console.log("Desktop notification permission status:", permission);
      });
    }
  }, []);

  // Authentication Guard
  useEffect(() => {
    if (!isLoading && !user && !isPublicPage) {
      router.push("/login");
    }
  }, [user, isLoading, isPublicPage, router]);
 
  if (isPublicPage) {
    return <main className="flex-1 w-full h-screen bg-white">{children}</main>;
  }
 
  if (isLoading || (!user && !isPublicPage) || (user && permissionsLoading)) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white">
        <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const requiredModule = getRequiredModuleForPath(pathname);
  const hasAccess = !requiredModule || isAdmin || checkPermission(requiredModule, 'canView');
 
  return (
    <Layout hasSider className="h-screen overflow-hidden w-full">
      <Sidebar />
      <Layout className="site-layout h-screen overflow-y-auto relative custom-scrollbar">
        <Header />
        <Content 
          className="px-4 sm:px-6 lg:px-8 mx-auto w-full max-w-[1600px]"
          style={{ paddingBottom: '24px' }}
        >
          {hasAccess ? children : <AccessDenied />}
          <div style={{ height: '24px', width: '100%', clear: 'both' }}></div>
        </Content>
      </Layout>

      {/* Time Recovery Modal */}
      {showRecoveryModal && recoveryRange && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "32px 32px 28px",
              maxWidth: "460px",
              width: "90%",
              boxShadow: "0 25px 70px rgba(0,0,0,0.3)",
              position: "relative",
              animation: "inactivity-pop 0.25s ease",
            }}
          >
            {/* Header Icon */}
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0d9488, #0f766e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1f2937", textAlign: "center", marginBottom: "4px" }}>
              {recoveryRange.isMeetingOnly ? "Meeting Time Recovery" : "Recover Inactivity Time"}
            </h2>
            <p style={{ fontSize: "13.5px", color: "#6b7280", textAlign: "center", marginBottom: "24px", lineHeight: 1.5 }}>
              {recoveryRange.isMeetingOnly 
                ? "Please record the details of your meeting to add it to your work hours." 
                : "You were inactive while punched in. Request to recover this time."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
              {/* Range Info */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 16px", fontSize: "13.5px", color: "#475569" }}>
                <div style={{ fontWeight: 700, marginBottom: "4px", color: "#334155" }}>Inactive Duration:</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#0d9488" }}>{dayjs(recoveryRange.inactiveFromTimestamp).format("hh:mm A")}</span>
                  <span>to</span>
                  <span style={{ fontWeight: 600, color: "#0d9488" }}>{dayjs(recoveryRange.inactiveUntilTimestamp).format("hh:mm A")}</span>
                </div>
              </div>

              {/* Category selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>Activity Type</label>
                <select
                  value={recoveryForm.type}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, type: e.target.value })}
                  disabled={!!recoveryRange.isMeetingOnly}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    color: "#1e293b",
                    background: recoveryRange.isMeetingOnly ? "#f1f5f9" : "#fff",
                    cursor: recoveryRange.isMeetingOnly ? "not-allowed" : "pointer",
                    width: "100%",
                    outline: "none"
                  }}
                >
                  <option value="meeting">Meeting</option>
                  <option value="work">Official Work (Offline)</option>
                  <option value="break">Break / Tea Break</option>
                </select>
              </div>

              {/* Time Inputs */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>Start Time</label>
                  <input
                    type="time"
                    value={recoveryForm.startTime}
                    onChange={(e) => setRecoveryForm({ ...recoveryForm, startTime: e.target.value })}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#1e293b",
                      width: "100%",
                      outline: "none"
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>End Time</label>
                  <input
                    type="time"
                    value={recoveryForm.endTime}
                    onChange={(e) => setRecoveryForm({ ...recoveryForm, endTime: e.target.value })}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#1e293b",
                      width: "100%",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              {/* Reason */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>Reason / Notes</label>
                <textarea
                  placeholder="e.g., Weekly planning meeting with client..."
                  value={recoveryForm.reason}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, reason: e.target.value })}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    color: "#1e293b",
                    minHeight: "80px",
                    resize: "none",
                    width: "100%",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: "24px" }}>
              <button
                onClick={handleRecoverySubmit}
                disabled={isSubmittingRecovery}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #0d9488, #0f766e)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: isSubmittingRecovery ? "not-allowed" : "pointer",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  boxShadow: "0 4px 12px rgba(13,148,136,0.3)",
                }}
              >
                {isSubmittingRecovery ? "Submitting..." : "✓ Submit Request"}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes inactivity-pop {
              from { opacity: 0; transform: scale(0.92); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* Desktop Update Modal */}
      {showUpdateModal && updateInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            backgroundColor: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)"
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "480px",
              width: "90%",
              boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0f766e, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px"
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>
              New Version Available!
            </h2>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
              An update (v{updateInfo.version}) is ready for download. Please update to get the latest features and security improvements.
            </p>

            {updateInfo.changelog && updateInfo.changelog.length > 0 && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "16px",
                  marginBottom: "24px",
                  textAlign: "left"
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  What's New:
                </div>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13.5px", color: "#334155", lineHeight: "1.6" }}>
                  {updateInfo.changelog.map((item, index) => (
                    <li key={index} style={{ marginBottom: "4px" }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {isDownloadingUpdate ? (
              <div style={{ width: "100%", marginTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>
                  <span>Downloading update...</span>
                  <span>{downloadProgress > 0 ? `${downloadProgress}%` : downloadProgress === -1 ? '...' : '0%'}</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                  {downloadProgress > 0 ? (
                    <div
                      style={{
                        width: `${downloadProgress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #0d9488, #0f766e)",
                        transition: "width 0.3s ease"
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "30%",
                        height: "100%",
                        background: "linear-gradient(90deg, #0d9488, #0f766e)",
                        borderRadius: "4px",
                        animation: "indeterminate 1.5s ease-in-out infinite"
                      }}
                    />
                  )}
                </div>
                <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px", fontStyle: "italic" }}>
                  The app will automatically close and restart when download finishes.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "background 0.15s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  Later
                </button>
                <button
                  onClick={handleStartUpdate}
                  style={{
                    flex: 1.5,
                    padding: "12px 20px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #0d9488, #0f766e)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(13,148,136,0.25)",
                    transition: "transform 0.1s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
                >
                  Update Now
                </button>
              </div>
            )}
          </div>
          <style>{`
            @keyframes indeterminate {
              0% { margin-left: -30%; width: 30%; }
              50% { margin-left: 50%; width: 30%; }
              100% { margin-left: 100%; width: 30%; }
            }
          `}</style>
        </div>
      )}
    </Layout>
  );
}
