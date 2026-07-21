"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  CalendarDays,
  ClipboardList,
  MonitorPlay,
  Settings,
  ShieldHalf,
  MessagesSquare,
  Star,
  FileText,
  Files,
  Briefcase,
  IndianRupee,
  GraduationCap,
  Landmark,
  Menu as MenuIcon,
  Activity,
  BookOpen,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { usePermissions } from "@/hooks/usePermissions";
import { useChatContext } from "@/context/ChatContext";
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
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { checkPermission, isAdmin, permissions } = usePermissions();
  const { totalUnreadCount: unreadChatCount } = useChatContext();
  const [settings, setSettings] = useState<any>(() => {
    // Read cached settings instantly from localStorage (no network wait)
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('system-settings-cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    // Refresh settings in background (deferred to avoid competing with critical calls)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/system-settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          localStorage.setItem('system-settings-cache', JSON.stringify(data));
        }
      } catch (err) {
        console.error("Error fetching sidebar settings:", err);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);


  const isModuleEnabled = (moduleKey: string) => {
    if (isAdmin) return true;
    if (!settings) return true;
    if (!settings.enabledModules) return true;
    return settings.enabledModules.includes(moduleKey);
  };

  const showClients = () => {
    if (isAdmin) return true;
    if (!settings) return true; // Show by default while loading
    if (!settings.clientVisibilityAdminOnly) return true;
    return false;
  };

  const items = React.useMemo(() => {
    const workManagementChildren: MenuItem[] = [];

    if (isModuleEnabled('projects') && (isAdmin || checkPermission('projects', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/projects">Projects</Link>, "/work-management/projects"));
    }
    const isTL = Boolean(user && (user.role?.toLowerCase() === 'team leader' || user.designation?.toLowerCase() === 'team leader'));
    if (isModuleEnabled('tasks') && (isAdmin || isTL || checkPermission('tasks', 'canView') || checkPermission('development', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/development">Development</Link>, "/work-management/development"));
    }
    const isHRUser = user?.role === 'HR' || user?.department?.toLowerCase() === 'hr';
    if (isModuleEnabled('daily-progress') && (isAdmin || isHRUser || checkPermission('daily-progress', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/daily-progress">Daily Progress</Link>, "/work-management/daily-progress"));
    }
    if (isModuleEnabled('tasks') && (isAdmin || isHRUser)) {
      workManagementChildren.push(getItem(<Link href="/work-management/hr-tasks">HR Tasks</Link>, "/work-management/hr-tasks"));
    }
    if (isModuleEnabled('sales') && (isAdmin || checkPermission('sales', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/sales">Sales</Link>, "/work-management/sales"));
    }
    if (isModuleEnabled('work-logs') && (isAdmin || checkPermission('work-logs', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/work-logs">Work Logs</Link>, "/work-management/work-logs"));
    }
    if (isModuleEnabled('clients') && (isAdmin || checkPermission('clients', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/clients">Clients</Link>, "/work-management/clients"));
    }
    if (isModuleEnabled('marketing') && (isAdmin || checkPermission('marketing', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/digital-marketing">Digital Marketing</Link>, "/work-management/digital-marketing"));
    }
    if (isModuleEnabled('creative') && (isAdmin || user?.role === 'HR' || user?.role === 'Team Leader' || checkPermission('creative', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/smm">Social Media Management</Link>, "/work-management/smm"));
    }
    if (isModuleEnabled('research') && (isAdmin || checkPermission('research', 'canView'))) {
      workManagementChildren.push(getItem(<Link href="/work-management/research">Research</Link>, "/work-management/research"));
    }


    const employeeChildren: MenuItem[] = [];
    if (isModuleEnabled('employee-list') && (isAdmin || checkPermission('employee-list', 'canView'))) {
      employeeChildren.push(getItem(<Link href="/employees">Employee List</Link>, "/employees"));
    }
    if (isModuleEnabled('org-structure') && (isAdmin || checkPermission('org-structure', 'canView'))) {
      employeeChildren.push(getItem(<Link href="/employees/organization/departments">Org Structure</Link>, "/employees/organization/departments"));
    }
    if (isModuleEnabled('employee-attendance') && (isAdmin || checkPermission('employee-attendance', 'canView'))) {
      employeeChildren.push(getItem(<Link href="/employees/attendance">Employee Attendance List</Link>, "/employees/attendance"));
    }
    if (isModuleEnabled('leave-requests') && (isAdmin || checkPermission('leave-requests', 'canView'))) {
      employeeChildren.push(getItem(<Link href="/employees/leave">Leave Requests</Link>, "/employees/leave"));
    }

    const documentsChildren: MenuItem[] = [];
    if (isModuleEnabled('employee-documents') && (isAdmin || checkPermission('employee-documents', 'canView'))) {
      documentsChildren.push(getItem(<Link href="/employees/documents">Employee Documents</Link>, "/employees/documents"));
    }
    if (isModuleEnabled('document-generator') && (isAdmin || checkPermission('document-generator', 'canView'))) {
      documentsChildren.push(getItem(<Link href="/employees/documents/generate">Document Generator</Link>, "/employees/documents/generate"));
    }

    const payrollChildren: MenuItem[] = [];
    if (isModuleEnabled('salary-structure') && (isAdmin || checkPermission('salary-structure', 'canView'))) {
      payrollChildren.push(getItem(<Link href="/payroll/salary-structure">Salary Structure</Link>, "/payroll/salary-structure"));
    }
    if (isModuleEnabled('payroll-processing') && (isAdmin || checkPermission('payroll-processing', 'canView'))) {
      payrollChildren.push(getItem(<Link href="/payroll">Payroll Processing</Link>, "/payroll"));
    }
    if (isModuleEnabled('payslips') && (isAdmin || checkPermission('payslips', 'canView'))) {
      payrollChildren.push(getItem(<Link href="/payroll/payslips">Payslips</Link>, "/payroll/payslips"));
    }
    if (isModuleEnabled('bonuses-deductions') && (isAdmin || checkPermission('bonuses-deductions', 'canView'))) {
      payrollChildren.push(getItem(<Link href="/payroll/bonuses">Bonuses & Deductions</Link>, "/payroll/bonuses"));
    }

    const recruitmentChildren: MenuItem[] = [];
    if (isModuleEnabled('interviews') && (isAdmin || checkPermission('interviews', 'canView'))) {
      recruitmentChildren.push(getItem(<Link href="/recruitment/hiring-board">Interviews</Link>, "/recruitment/hiring-board"));
    }
    if (isModuleEnabled('hirings') && (isAdmin || checkPermission('hirings', 'canView'))) {
      recruitmentChildren.push(getItem(<Link href="/recruitment">Hirings</Link>, "/recruitment"));
    }

    const menuItems: MenuItem[] = [];
    if (isModuleEnabled('dashboard')) {
      menuItems.push(getItem(<Link href="/">Dashboard</Link>, "/", <LayoutDashboard className="w-5 h-5" />));
    }

    if (employeeChildren.length > 0) {
      menuItems.push(getItem("Employees", "employees-sub", <Users className="w-5 h-5" />, employeeChildren));
    }

    if (documentsChildren.length > 0) {
      menuItems.push(getItem("Documents", "documents-sub", <Files className="w-5 h-5" />, documentsChildren));
    }

    if (payrollChildren.length > 0) {
      menuItems.push(getItem("Payroll", "payroll-sub", <IndianRupee className="w-5 h-5" />, payrollChildren));
    }

    if (recruitmentChildren.length > 0) {
      menuItems.push(getItem("Recruitment", "recruitment-sub", <Briefcase className="w-5 h-5" />, recruitmentChildren));
    }

    if (isModuleEnabled('attendance') && (isAdmin || checkPermission('attendance', 'canView'))) {
      menuItems.push(getItem(<Link href="/attendance">Attendance</Link>, "/attendance", <Clock className="w-5 h-5" />));
    }

    if (isModuleEnabled('leave') && (isAdmin || checkPermission('leave', 'canView'))) {
      menuItems.push(getItem(<Link href="/leave">Leave</Link>, "/leave", <Calendar className="w-5 h-5" />));
    }

    if (isModuleEnabled('schedule') && (isAdmin || checkPermission('schedule', 'canView'))) {
      menuItems.push(getItem(<Link href="/schedule">Schedule</Link>, "/schedule", <CalendarDays className="w-5 h-5" />));
    }

    
    const workspaceChildren: MenuItem[] = [];
    if (isModuleEnabled('seating-arrangement') && (isAdmin || checkPermission('seating-arrangement', 'canView'))) {
      workspaceChildren.push(getItem(<Link href="/workspace/seating">Seating Arrangement</Link>, "/workspace/seating"));
    }
    if (isModuleEnabled('resource-management') && (isAdmin || checkPermission('resource-management', 'canView'))) {
      workspaceChildren.push(getItem(<Link href="/workspace/resource">Resource Management</Link>, "/workspace/resource"));
    }
    if (isModuleEnabled('gallery') && (isAdmin || checkPermission('gallery', 'canView'))) {
      workspaceChildren.push(getItem(<Link href="/workspace/gallery">Gallery</Link>, "/workspace/gallery"));
    }

    if (workspaceChildren.length > 0) {
      menuItems.push(getItem("Workspace", "workspace", <MonitorPlay className="w-5 h-5" />, workspaceChildren));
    }
    
    if (isModuleEnabled('remarks') && (isAdmin || checkPermission('remarks', 'canView'))) {
      menuItems.push(getItem(<Link href="/penalty">Penalty</Link>, "/penalty", <MessagesSquare className="w-5 h-5" />));
    }

    if (isModuleEnabled('review') && (isAdmin || checkPermission('review', 'canView'))) {
      menuItems.push(getItem(<Link href="/remarks">Remarks</Link>, "/remarks", <Star className="w-5 h-5" />));
    }

    if (isModuleEnabled('activity-tracker') && (isAdmin || checkPermission('activity-tracker', 'canView'))) {
      menuItems.push(getItem(<Link href="/activity-tracker">Activity Tracker</Link>, "/activity-tracker", <Activity className="w-5 h-5" />));
    }

    const invoiceChildren: MenuItem[] = [];
    if (isModuleEnabled('invoice') && (isAdmin || checkPermission('invoice', 'canView'))) {
      invoiceChildren.push(getItem(<Link href="/invoice">All Invoices</Link>, "/invoice"));
      invoiceChildren.push(getItem(<Link href="/invoice/ledger">Invoice Ledger</Link>, "/invoice/ledger"));
      invoiceChildren.push(getItem(<Link href="/invoice/create">Create Invoice</Link>, "/invoice/create"));
      invoiceChildren.push(getItem(<Link href="/invoice/create?type=Proforma">Create Proforma Invoice</Link>, "/invoice/create?type=Proforma"));
    }

    if (isAdmin || invoiceChildren.length > 0) {
      menuItems.push(getItem("Invoice", "invoice", <FileText className="w-5 h-5" />, invoiceChildren));
    }

    if (isModuleEnabled('chat') && (isAdmin || checkPermission('chat', 'canView'))) {
      menuItems.push(getItem(
        <Link href="/chat">Chat</Link>,
        "/chat",
        <MessagesSquare className="w-5 h-5" />
      ));
    }

    if (isAdmin || checkPermission('personal-tasks', 'canView') || checkPermission('tasks', 'canView')) {
      menuItems.push(getItem(
        <Link href="/tasks">Tasks</Link>,
        "/tasks",
        <ClipboardList className="w-5 h-5" />
      ));
    }

    if (workManagementChildren.length > 0) {
      menuItems.push(getItem("Work Management", "work-management", <Briefcase className="w-5 h-5" />, workManagementChildren));
    }

    const trainingChildren: MenuItem[] = [];
    
    if (isModuleEnabled('training') && (isAdmin || checkPermission('training', 'canView'))) {
      trainingChildren.push(getItem(<Link href="/training">Course Library</Link>, "/training"));
    }
    
    if (isModuleEnabled('admin-courses') && (isAdmin || checkPermission('admin-courses', 'canView'))) {
      trainingChildren.push(getItem(<Link href="/admin/courses">Manage Courses</Link>, "/admin/courses"));
    }

    if (trainingChildren.length > 0) {
      menuItems.push(getItem("Training & Courses", "training", <BookOpen className="w-5 h-5" />, trainingChildren));
    }

    if (isAdmin || checkPermission('settings', 'canView')) {
      menuItems.push(getItem(<Link href="/settings">Settings</Link>, "/settings", <Settings className="w-5 h-5" />));
    }

    if (isAdmin) {
      menuItems.push(getItem(<Link href="/restrictions">Restrictions</Link>, "/restrictions", <ShieldHalf className="w-5 h-5" />));
    }

    if (isModuleEnabled('activity-logs') && (isAdmin || checkPermission('activity-logs', 'canView'))) {
      menuItems.push(getItem(<Link href="/activity-logs">Activity Logs</Link>, "/activity-logs", <Activity className="w-5 h-5" />));
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
    if (pathname.startsWith("/schedule")) return ["/schedule"];
    if (pathname.startsWith("/tasks")) return ["/tasks"];
    if (pathname.startsWith("/penalty")) return ["/penalty"];
    if (pathname.startsWith("/remarks")) return ["/remarks"];
    if (pathname.startsWith("/activity-tracker")) return ["/activity-tracker"];
    if (pathname.startsWith("/invoice")) {
      if (pathname === "/invoice/create" && searchParams.get("type") === "Proforma") {
        return ["/invoice/create?type=Proforma"];
      }
      return [pathname];
    }
    if (pathname.startsWith("/work-management")) return [pathname];
    if (pathname.startsWith("/chat")) return ["/chat"];
    if (pathname.startsWith("/recruitment")) return [pathname];
    if (pathname.startsWith("/payroll")) return [pathname];
    if (pathname.startsWith("/restrictions")) return ["/restrictions"];
    if (pathname.startsWith("/activity-logs")) return ["/activity-logs"];
    if (pathname.startsWith("/training")) return ["/training"];
    if (pathname.startsWith("/admin/courses")) return ["/admin/courses"];
    return [];
  };

  const getOpenKeys = () => {
    if (pathname.startsWith("/employees/documents")) return ["documents-sub"];
    if (pathname.startsWith("/employees")) return ["employees-sub"];
    if (pathname.startsWith("/workspace")) return ["workspace"];
    if (pathname.startsWith("/invoice")) return ["invoice"];
    if (pathname.startsWith("/work-management")) return ["work-management"];
    if (pathname.startsWith("/recruitment")) return ["recruitment-sub"];
    if (pathname.startsWith("/payroll")) return ["payroll-sub"];
    if (pathname.startsWith("/training") || pathname.startsWith("/admin/courses")) return ["training"];
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
