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

const { Content } = Layout;

// Inactivity timeout settings
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_COUNTDOWN_SEC = 60; // 60 second countdown before logout

function getRequiredModuleForPath(pathname: string): string | null {
  if (pathname === "/") return null; // Always allow landing on the dashboard
  if (pathname.startsWith("/work-management/projects")) return "projects";
  if (pathname.startsWith("/work-management/tasks")) return "tasks";
  if (pathname.startsWith("/work-management/daily-progress")) return "daily-progress";
  if (pathname.startsWith("/work-management/sales")) return "sales";
  if (pathname.startsWith("/work-management/clients")) return "clients";
  if (pathname.startsWith("/work-management/marketing-reports")) return "marketing";
  
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
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/activity-tracker")) return null;
  
  return null;
}
 
export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useUserContext();
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Inactivity auto-logout state
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN_SEC);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWarningVisibleRef = useRef(false);

  // Force logout handler
  const forceLogout = useCallback(() => {
    setShowInactivityWarning(false);
    isWarningVisibleRef.current = false;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    logout();
    router.push("/login");
  }, [logout, router]);

  // Start countdown after warning appears
  const startCountdown = useCallback(() => {
    setCountdown(WARNING_COUNTDOWN_SEC);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          // Force logout when countdown reaches 0
          setTimeout(() => forceLogout(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [forceLogout]);

  // Show the inactivity warning
  const showWarning = useCallback(() => {
    if (isWarningVisibleRef.current) return;
    isWarningVisibleRef.current = true;
    setShowInactivityWarning(true);
    startCountdown();
  }, [startCountdown]);

  // Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    // If warning is already visible, don't reset (user must click "Stay Logged In")
    if (isWarningVisibleRef.current) return;

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(showWarning, INACTIVITY_TIMEOUT_MS);
  }, [showWarning]);

  // Stay logged in handler
  const handleStayLoggedIn = useCallback(() => {
    setShowInactivityWarning(false);
    isWarningVisibleRef.current = false;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(WARNING_COUNTDOWN_SEC);
    // Restart inactivity timer
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Setup inactivity tracking
  useEffect(() => {
    if (!user || isAuthPage) return;

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];

    const handleActivity = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    // Start the initial timer
    resetInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, isAuthPage, resetInactivityTimer]);

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
    if (!isLoading && !user && !isAuthPage) {
      router.push("/login");
    }
  }, [user, isLoading, isAuthPage, router]);
 
  if (isAuthPage) {
    return <main className="flex-1 w-full h-screen bg-white">{children}</main>;
  }
 
  if (isLoading || (!user && !isAuthPage) || (user && permissionsLoading)) {
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
        <Content className="px-4 sm:px-6 lg:px-8 pb-8 mx-auto w-full max-w-[1600px]">
          {hasAccess ? children : <AccessDenied />}
        </Content>
      </Layout>

      {/* Inactivity Warning Modal */}
      {showInactivityWarning && (
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
              borderRadius: "16px",
              padding: "40px 36px 32px",
              maxWidth: "420px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              position: "relative",
              animation: "inactivity-pop 0.25s ease",
            }}
          >
            {/* Clock icon */}
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>

            {/* Title */}
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a2e", marginBottom: "8px" }}>
              Still there?
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px", lineHeight: 1.6 }}>
              You've been inactive for a while. For your security, you'll be automatically logged out in:
            </p>

            {/* Countdown circle */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: `5px solid ${countdown <= 10 ? "#ef4444" : "#f59e0b"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 28px",
                transition: "border-color 0.3s ease",
              }}
            >
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: countdown <= 10 ? "#ef4444" : "#f59e0b",
                  fontVariantNumeric: "tabular-nums",
                  transition: "color 0.3s ease",
                }}
              >
                {countdown}
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={handleStayLoggedIn}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  boxShadow: "0 4px 12px rgba(2,132,199,0.3)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 16px rgba(2,132,199,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(2,132,199,0.3)";
                }}
              >
                ✓ Stay Logged In
              </button>
              <button
                onClick={forceLogout}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "2px solid #e5e7eb",
                  background: "#fff",
                  color: "#4b5563",
                  fontWeight: 600,
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444";
                  (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
                  (e.currentTarget as HTMLButtonElement).style.color = "#4b5563";
                }}
              >
                Logout
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
    </Layout>
  );
}
