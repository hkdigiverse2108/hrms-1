"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  ClipboardList,
  MonitorPlay,
  Settings,
  ShieldHalf,
  MessagesSquare,
  Star,
  FileText,
  Briefcase,
  DollarSign,
  GraduationCap,
  Landmark,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { API_URL } from "@/lib/config";

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: "group"
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/system-settings`);
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error fetching sidebar settings:", err);
    }
  };

  const isAdmin = user?.role?.toLowerCase() === "admin" || user?.name === "Admin Admin";

  const showClients = () => {
    if (isAdmin) return true;
    if (!settings) return true; // Show by default while loading
    if (!settings.clientVisibilityAdminOnly) return true;
    return false;
  };

  const items = React.useMemo(() => {
    const isSalesDept = user?.department?.toLowerCase() === "sales";
    const isMarketingDept = user?.department?.toLowerCase() === "marketing";
    const isAdminRole = user?.role?.toLowerCase() === "admin" || user?.name === "Admin Admin";

    const workManagementChildren: MenuItem[] = [];

    // All employees (including Sales/Marketing) see Daily Progress
    if (isSalesDept && !isAdminRole) {
      workManagementChildren.push(getItem(<Link href="/work-management/sales">Sales</Link>, "/work-management/sales"));
    } else if (isMarketingDept && !isAdminRole) {
      workManagementChildren.push(getItem(<Link href="/work-management/marketing-reports">Marketing Reports</Link>, "/work-management/marketing-reports"));
    } else {
      workManagementChildren.push(
        getItem(<Link href="/work-management/projects">Projects</Link>, "/work-management/projects"),
        getItem(<Link href="/work-management/tasks">Tasks</Link>, "/work-management/tasks")
      );
    }

    // Common for all departments in Work Management
    workManagementChildren.push(getItem(<Link href="/work-management/daily-progress">Daily Progress</Link>, "/work-management/daily-progress"));
    
    // Admin specific additions
    if (isAdminRole) {
      if (!isSalesDept) workManagementChildren.push(getItem(<Link href="/work-management/sales">Sales</Link>, "/work-management/sales"));
      workManagementChildren.push(getItem(<Link href="/work-management/clients">Clients</Link>, "/work-management/clients"));
      if (!isMarketingDept) workManagementChildren.push(getItem(<Link href="/work-management/marketing-reports">Marketing Reports</Link>, "/work-management/marketing-reports"));
    }

    return [
      getItem(<Link href="/">Dashboard</Link>, "/", <LayoutDashboard className="w-5 h-5" />),
      getItem("Employees", "employees-sub", <Users className="w-5 h-5" />, [
        getItem(<Link href="/employees">Employee List</Link>, "/employees"),
        getItem(<Link href="/employees/designations">Designations</Link>, "/employees/designations"),
        getItem(<Link href="/employees/attendance">Employee Attendance List</Link>, "/employees/attendance"),
        getItem(<Link href="/employees/add">Add Employee</Link>, "/employees/add"),
        getItem(<Link href="/employees/leave">Leave Requests</Link>, "/employees/leave"),
        getItem(<Link href="/employees/documents">Employee Documents</Link>, "/employees/documents"),
      ]),
      getItem("Payroll", "payroll-sub", <DollarSign className="w-5 h-5" />, [
        getItem(<Link href="/payroll/salary-structure">Salary Structure</Link>, "/payroll/salary-structure"),
        getItem(<Link href="/payroll">Payroll Processing</Link>, "/payroll"),
        getItem(<Link href="/payroll/payslips">Payslips</Link>, "/payroll/payslips"),
        getItem(<Link href="/payroll/bonuses">Bonuses & Deductions</Link>, "/payroll/bonuses"),
      ]),
      getItem("Recruitment", "recruitment-sub", <Briefcase className="w-5 h-5" />, [
        getItem(<Link href="/recruitment/hiring-board">Interviews</Link>, "/recruitment/hiring-board"),
        getItem(<Link href="/recruitment">Hirings</Link>, "/recruitment"),
        getItem(<Link href="/recruitment/applications">Applications</Link>, "/recruitment/applications"),
      ]),
      getItem(<Link href="/attendance">Attendance</Link>, "/attendance", <Clock className="w-5 h-5" />),
      getItem(<Link href="/leave">Leave</Link>, "/leave", <Calendar className="w-5 h-5" />),
      getItem("Workspace", "workspace", <MonitorPlay className="w-5 h-5" />, [
        getItem(<Link href="/workspace/blank-canvas">Blank Canvas</Link>, "/workspace/blank-canvas"),
        getItem(<Link href="/workspace/seating">Seating Arrangement</Link>, "/workspace/seating"),
        ...(user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "hr" ? [
          getItem(<Link href="/workspace/resource">Resource Management</Link>, "/workspace/resource")
        ] : []),
      ]),
      getItem(<Link href="/remarks">Remarks</Link>, "/remarks", <MessagesSquare className="w-5 h-5" />),
      getItem(<Link href="/review">Review</Link>, "/review", <Star className="w-5 h-5" />),
      getItem("Invoice", "invoice", <FileText className="w-5 h-5" />, [
        getItem(<Link href="/invoice">All Invoices</Link>, "/invoice"),
        getItem(<Link href="/invoice/create">Create Invoice</Link>, "/invoice/create"),
      ]),
      getItem(<Link href="/chat">Chat</Link>, "/chat", <MessagesSquare className="w-5 h-5" />),
      getItem("Work Management", "work-management", <Briefcase className="w-5 h-5" />, workManagementChildren),
      getItem(<Link href="/settings">Settings</Link>, "/settings", <Settings className="w-5 h-5" />),
    ];
  }, [user, settings, pathname]);

  // Helper to determine open keys and selected keys
  const getSelectedKeys = () => {
    if (pathname === "/") return ["/"];
    if (pathname.startsWith("/employees")) {
      if (pathname === "/employees/attendance") return ["/employees/attendance"];
      if (pathname === "/employees/documents") return ["/employees/documents"];
      return [pathname];
    }
    if (pathname.startsWith("/workspace")) return [pathname];
    if (pathname.startsWith("/leave")) return ["/leave"];
    if (pathname.startsWith("/attendance")) return ["/attendance"];
    if (pathname.startsWith("/task")) return ["/task"];
    if (pathname.startsWith("/remarks")) return ["/remarks"];
    if (pathname.startsWith("/review")) return ["/review"];
    if (pathname.startsWith("/invoice")) return [pathname];
    if (pathname.startsWith("/work-management")) return [pathname];
    if (pathname.startsWith("/chat")) return ["/chat"];
    if (pathname.startsWith("/recruitment")) return [pathname];
    if (pathname.startsWith("/payroll")) return [pathname];
    return [];
  };

  const getOpenKeys = () => {
    if (pathname.startsWith("/employees")) return ["employees-sub"];
    if (pathname.startsWith("/workspace")) return ["workspace"];
    if (pathname.startsWith("/invoice")) return ["invoice"];
    if (pathname.startsWith("/work-management")) return ["work-management"];
    if (pathname.startsWith("/recruitment")) return ["recruitment-sub"];
    if (pathname.startsWith("/payroll")) return ["payroll-sub"];
    return [];
  };
 
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 py-6 border-b border-sidebar-border shrink-0 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-sidebar-border/50">
            <ShieldHalf className="w-6 h-6 text-primary" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <div className="flex flex-col leading-tight">
              <span className="text-foreground font-extrabold text-[15px] tracking-tight">HariKrushn</span>
              <span className="text-primary font-bold text-[14px] -mt-1">DigiVerse LLP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 pb-4">
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={items}
          style={{ borderRight: 0, background: 'transparent' }}
          className="px-3 custom-sidebar-menu font-medium"
        />
      </div>
    </div>
  );
}
