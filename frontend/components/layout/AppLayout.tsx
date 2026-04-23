"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ReactNode } from "react";
import { Layout } from "antd";

const { Content } = Layout;

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (isAuthPage) {
    return <main className="flex-1 w-full h-screen bg-white">{children}</main>;
  }

  return (
    <Layout className="h-screen overflow-hidden w-full">
      <Sidebar />
      <Layout className="site-layout h-screen overflow-y-auto relative custom-scrollbar">
        <Header />
        <Content className="px-4 sm:px-6 lg:px-8 pb-8 mx-auto w-full max-w-[1600px]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

