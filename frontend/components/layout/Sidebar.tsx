"use client";

import { useState } from "react";
import { Layout } from "antd";
import { SidebarNav } from "./SidebarNav";

const { Sider } = Layout;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      breakpoint="lg"
      collapsedWidth={80}
      trigger={null}
      theme="light"
      width={260}
      className="hidden lg:block border-r border-sidebar-border h-screen"
      style={{ background: '#EAF7F6' }}
    >
      <SidebarNav collapsed={collapsed} toggleCollapse={() => setCollapsed(!collapsed)} />
    </Sider>
  );
}

