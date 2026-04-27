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
      className="border-r border-sidebar-border h-screen"
      style={{ background: '#EAF7F6' }}
    >
      <SidebarNav />
    </Sider>
  );
}

