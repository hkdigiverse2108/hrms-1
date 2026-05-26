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
  IndianRupee,
  GraduationCap,
  Landmark,
  Menu as MenuIcon,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { usePermissions } from "@/hooks/usePermissions";
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

export function SidebarNav({ collapsed = false, toggleCollapse }: { collapsed?: boolean; toggleCollapse?: () => void }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { checkPermission, isAdmin, permissions } = usePermissions();
  const [settings, setSettings] = useState<any>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

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

  const fetchUnreadChatCount = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_URL}/chat/unread-counts/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const total = Object.values(data).reduce((sum, val) => sum + (val || 0), 0);
        setUnreadChatCount(total);
      }
    } catch (err) {
      console.error("Error fetching unread chat count:", err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUnreadChatCount();
      const interval = setInterval(fetchUnreadChatCount, 4000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);



  const showClients = () => {
    if (isAdmin) return true;
    if (!settings) return true; // Show by default while loading
    if (!settings.clientVisibilityAdminOnly) return true;
    return false;
  };

  const items = React.useMemo(() => {
    const workManagementChildren: MenuItem[] = [];

    if (isAdmin || checkPermission('projects', 'canView')) {
      workManagementChildren.push(getItem(<Link href="/work-management/projects">Projects</Link>, "/work-management/projects"));
    }
    if (isAdmin || checkPermission('tasks', 'canView')) {
      workManagementChildren.push(getItem(<Link href="/work-management/tasks">Tasks</Link>, "/work-management/tasks"));
    }
    if (isAdmin || checkPermission('daily-progress', 'canView')) {
      workManagementChildren.push(getItem(<Link href="/work-management/daily-progress">Daily Progress</Link>, "/work-management/daily-progress"));
    }
    if (isAdmin || checkPermission('sales', 'canView')) {
      workManagementChildren.push(getItem(<Link href="/work-management/sales">Sales</Link>, "/work-management/sales"));
    }
    if (isAdmin || checkPermission('clients', 'canView')) {
      workManagementChildren.push(getItem(<Link href="/work-management/clients">Clients</Link>, "/work-management/clients"));
    }
    if (isAdmin || checkPermission('marketing', 'canView')) {
      workManagementChildren.push(getItem(<Link href="/work-management/marketing-reports">Marketing Reports</Link>, "/work-management/marketing-reports"));
    }

    const employeeChildren: MenuItem[] = [];
    if (isAdmin || checkPermission('employee-list', 'canView')) {
      employeeChildren.push(getItem(<Link href="/employees">Employee List</Link>, "/employees"));
    }
    if (isAdmin || checkPermission('org-structure', 'canView')) {
      employeeChildren.push(getItem(<Link href="/employees/organization/departments">Org Structure</Link>, "/employees/organization/departments"));
    }
    if (isAdmin || checkPermission('employee-attendance', 'canView')) {
      employeeChildren.push(getItem(<Link href="/employees/attendance">Employee Attendance List</Link>, "/employees/attendance"));
    }
    if (isAdmin || checkPermission('leave-requests', 'canView')) {
      employeeChildren.push(getItem(<Link href="/employees/leave">Leave Requests</Link>, "/employees/leave"));
    }
    if (isAdmin || checkPermission('employee-documents', 'canView')) {
      employeeChildren.push(getItem(<Link href="/employees/documents">Employee Documents</Link>, "/employees/documents"));
    }
    if (isAdmin || checkPermission('document-generator', 'canView')) {
      employeeChildren.push(getItem(<Link href="/employees/documents/generate">Document Generator</Link>, "/employees/documents/generate"));
    }

    const payrollChildren: MenuItem[] = [];
    if (isAdmin || checkPermission('salary-structure', 'canView')) {
      payrollChildren.push(getItem(<Link href="/payroll/salary-structure">Salary Structure</Link>, "/payroll/salary-structure"));
    }
    if (isAdmin || checkPermission('payroll-processing', 'canView')) {
      payrollChildren.push(getItem(<Link href="/payroll">Payroll Processing</Link>, "/payroll"));
    }
    if (isAdmin || checkPermission('payslips', 'canView')) {
      payrollChildren.push(getItem(<Link href="/payroll/payslips">Payslips</Link>, "/payroll/payslips"));
    }
    if (isAdmin || checkPermission('bonuses-deductions', 'canView')) {
      payrollChildren.push(getItem(<Link href="/payroll/bonuses">Bonuses & Deductions</Link>, "/payroll/bonuses"));
    }

    const recruitmentChildren: MenuItem[] = [];
    if (isAdmin || checkPermission('interviews', 'canView')) {
      recruitmentChildren.push(getItem(<Link href="/recruitment/hiring-board">Interviews</Link>, "/recruitment/hiring-board"));
    }
    if (isAdmin || checkPermission('hirings', 'canView')) {
      recruitmentChildren.push(getItem(<Link href="/recruitment">Hirings</Link>, "/recruitment"));
    }

    const menuItems: MenuItem[] = [
      getItem(<Link href="/">Dashboard</Link>, "/", <LayoutDashboard className="w-5 h-5" />),
    ];

    if (isAdmin || employeeChildren.length > 0) {
      menuItems.push(getItem("Employees", "employees-sub", <Users className="w-5 h-5" />, employeeChildren));
    }

    if (isAdmin || payrollChildren.length > 0) {
      menuItems.push(getItem("Payroll", "payroll-sub", <IndianRupee className="w-5 h-5" />, payrollChildren));
    }

    if (isAdmin || recruitmentChildren.length > 0) {
      menuItems.push(getItem("Recruitment", "recruitment-sub", <Briefcase className="w-5 h-5" />, recruitmentChildren));
    }

    if (isAdmin || checkPermission('attendance', 'canView')) {
      menuItems.push(getItem(<Link href="/attendance">Attendance</Link>, "/attendance", <Clock className="w-5 h-5" />));
    }

    if (isAdmin || checkPermission('leave', 'canView')) {
      menuItems.push(getItem(<Link href="/leave">Leave</Link>, "/leave", <Calendar className="w-5 h-5" />));
    }
    
    const workspaceChildren: MenuItem[] = [];
    if (isAdmin || checkPermission('blank-canvas', 'canView')) {
      workspaceChildren.push(getItem(<Link href="/workspace/blank-canvas">Blank Canvas</Link>, "/workspace/blank-canvas"));
    }
    if (isAdmin || checkPermission('seating-arrangement', 'canView')) {
      workspaceChildren.push(getItem(<Link href="/workspace/seating">Seating Arrangement</Link>, "/workspace/seating"));
    }
    if (isAdmin || checkPermission('resource-management', 'canView')) {
      workspaceChildren.push(getItem(<Link href="/workspace/resource">Resource Management</Link>, "/workspace/resource"));
    }

    if (isAdmin || workspaceChildren.length > 0) {
      menuItems.push(getItem("Workspace", "workspace", <MonitorPlay className="w-5 h-5" />, workspaceChildren));
    }
    
    if (user) {
      menuItems.push(getItem(<Link href="/remarks">Remarks</Link>, "/remarks", <MessagesSquare className="w-5 h-5" />));
    }

    if (isAdmin || checkPermission('review', 'canView')) {
      menuItems.push(getItem(<Link href="/review">Review</Link>, "/review", <Star className="w-5 h-5" />));
    }

    const invoiceChildren: MenuItem[] = [];
    if (isAdmin || checkPermission('invoice', 'canView')) {
      invoiceChildren.push(getItem(<Link href="/invoice">All Invoices</Link>, "/invoice"));
      invoiceChildren.push(getItem(<Link href="/invoice/create">Create Invoice</Link>, "/invoice/create"));
    }

    if (isAdmin || invoiceChildren.length > 0) {
      menuItems.push(getItem("Invoice", "invoice", <FileText className="w-5 h-5" />, invoiceChildren));
    }

    if (isAdmin || checkPermission('chat', 'canView')) {
      menuItems.push(getItem(
        <div className="flex items-center justify-between w-full">
          <Link href="/chat">Chat</Link>
          {unreadChatCount > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2 shrink-0">
              {unreadChatCount}
            </span>
          )}
        </div>,
        "/chat",
        <MessagesSquare className="w-5 h-5" />
      ));
    }

    if (isAdmin || workManagementChildren.length > 0) {
      menuItems.push(getItem("Work Management", "work-management", <Briefcase className="w-5 h-5" />, workManagementChildren));
    }

    if (isAdmin || checkPermission('settings', 'canView')) {
      menuItems.push(getItem(<Link href="/settings">Settings</Link>, "/settings", <Settings className="w-5 h-5" />));
    }

    return menuItems;
  }, [user, settings, pathname, permissions, checkPermission]);

  // Helper to determine open keys and selected keys
  const getSelectedKeys = () => {
    if (pathname === "/") return ["/"];
    if (pathname.startsWith("/employees")) {
      if (pathname === "/employees/attendance") return ["/employees/attendance"];
      if (pathname === "/employees/documents") return ["/employees/documents"];
      if (pathname === "/employees/documents/generate") return ["/employees/documents/generate"];
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
      <div className={`h-20 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-6'} py-6 border-b border-sidebar-border shrink-0 mb-6`}>
        {collapsed ? (
          <div className="flex items-center justify-center gap-1 w-full">
            <img src="/logo.png" alt="HK Icon" className="h-8 w-8 object-cover object-left shrink-0 rounded-lg" />
            <button onClick={toggleCollapse} className="text-slate-600 hover:text-brand-teal p-0.5 hover:bg-slate-100 rounded transition-all shrink-0">
              <MenuIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-2">
            <img src="/logo.png" alt="HariKrushn DigiVerse Logo" className="h-12 w-auto object-contain max-w-[160px]" />
            <button onClick={toggleCollapse} className="text-slate-600 hover:text-brand-teal p-1 hover:bg-slate-100/50 rounded-md transition-all shrink-0">
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 pb-4">
        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
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
