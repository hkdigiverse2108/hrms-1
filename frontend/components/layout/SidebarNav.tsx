"use client";

import React from "react";
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
} from "lucide-react";

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

  const items: MenuItem[] = [
    getItem(<Link href="/">Dashboard</Link>, "/", <LayoutDashboard className="w-5 h-5" />),
    getItem("Employees", "employees-sub", <Users className="w-5 h-5" />, [
      getItem(<Link href="/employees">Employee List</Link>, "/employees"),
      getItem("Employee Attendance List", "/employees/attendance"),
      getItem(<Link href="/employees/add">Add Employee</Link>, "/employees/add"),
      getItem("Leave Requests", "/employees/leave"),
    ]),
    getItem("Attendance", "attendance", <Clock className="w-5 h-5" />),
    getItem("Leave", "leave", <Calendar className="w-5 h-5" />),
    getItem("Task", "task", <ClipboardList className="w-5 h-5" />),
    getItem("Workspace", "workspace", <MonitorPlay className="w-5 h-5" />, [
      getItem("Blank Canvas", "blank-canvas"),
      getItem("Seating Arrangement", "seating"),
      getItem("Resource Management", "resource"),
    ]),
    getItem("Settings", "settings", <Settings className="w-5 h-5" />),
  ];

  // Helper to determine open keys and selected keys
  const getSelectedKeys = () => {
    if (pathname === "/") return ["/"];
    if (pathname.startsWith("/employees")) return [pathname];
    return [];
  };

  const getOpenKeys = () => {
    if (pathname.startsWith("/employees")) return ["employees-sub"];
    if (pathname.startsWith("/workspace")) return ["workspace"];
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
            <div className="flex items-baseline gap-1">
              <span className="leading-tight text-slate-800 font-extrabold text-lg tracking-tight">HK</span>
              <span className="text-primary font-bold text-[0.95rem]">DigiVerse</span>
            </div>
            <span className="text-[0.5rem] text-slate-500 uppercase font-black tracking-[0.15em] leading-none opacity-80 mt-1">
              & IT Consultancy
            </span>
          </div>
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        items={items}
        style={{ borderRight: 0, background: 'transparent' }}
        className="flex-1 px-3 custom-sidebar-menu font-medium"
      />
    </div>
  );
}

