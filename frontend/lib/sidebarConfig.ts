export interface SidebarMainTab {
  key: string;
  name: string;
}

export const SIDEBAR_MAIN_TABS: SidebarMainTab[] = [
  { key: "dashboard", name: "Dashboard" },
  { key: "employee-list", name: "Employees" },
  { key: "employee-documents", name: "Documents" },
  { key: "payroll-processing", name: "Payroll" },
  { key: "hirings", name: "Recruitment" },
  { key: "company-finance-transactions", name: "Company Finance" },
  { key: "attendance", name: "Attendance" },
  { key: "leave", name: "Leave" },
  { key: "schedule", name: "Schedule" },
  { key: "workspace", name: "Workspace" },
  { key: "penalty", name: "Penalty" },
  { key: "remarks", name: "Remarks" },
  { key: "activity-tracker", name: "Activity Tracker" },
  { key: "invoice", name: "Invoice" },
  { key: "chat", name: "Chat" },
  { key: "tasks", name: "Tasks" },
  { key: "work-management", name: "Work Management" },
  { key: "training", name: "Training & Courses" },
  { key: "settings", name: "Settings" },
  { key: "restrictions", name: "Restrictions" },
  { key: "activity-logs", name: "Activity Logs" }
];
