"use client";
 
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ReactNode } from "react";
import { Layout } from "antd";
import { useUserContext } from "@/context/UserContext";
 
const { Content } = Layout;
 
export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUserContext();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
 
  // Authentication Guard
  useEffect(() => {
    if (!isLoading && !user && !isAuthPage) {
      router.push("/login");
    }
  }, [user, isLoading, isAuthPage, router]);
 
  if (isAuthPage) {
    return <main className="flex-1 w-full h-screen bg-white">{children}</main>;
  }
 
  if (isLoading || (!user && !isAuthPage)) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white">
        <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
 
  return (
    <Layout hasSider className="h-screen overflow-hidden w-full">
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
