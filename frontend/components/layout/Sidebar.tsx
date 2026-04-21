"use client";

import { Layout } from "antd";
import { SidebarNav } from "./SidebarNav";

const { Sider } = Layout;

export function Sidebar() {
  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      theme="light"
      width={260}
      className="hidden lg:block border-r border-sidebar-border h-screen sticky top-0"
      style={{ background: '#EAF7F6' }}
    >
      <SidebarNav />
    </Sider>
  );
}

